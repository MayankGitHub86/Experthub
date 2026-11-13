<?php
/**
 * Stripe Multi-Vendor Integration for ExpertHub
 * Handles Connect OAuth flow and automatic 80/20 payouts on order completion.
 */

// ─── Define Stripe constants (add these to wp-config.php in production) ──────
if ( ! defined( 'STRIPE_SECRET_KEY' ) ) {
    define( 'STRIPE_SECRET_KEY', getenv( 'STRIPE_SECRET_KEY' ) ?: '' );
}
if ( ! defined( 'STRIPE_CLIENT_ID' ) ) {
    define( 'STRIPE_CLIENT_ID', getenv( 'STRIPE_CLIENT_ID' ) ?: '' );
}

// ─── REST: Connect expert Stripe account (OAuth callback) ────────────────────
// POST /wp-json/experthub/v1/stripe/connect  { code: "ac_..." }
add_action( 'rest_api_init', function() {
    register_rest_route( 'experthub/v1', '/stripe/connect', array(
        'methods'             => 'POST',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function( $request ) {
            $code    = sanitize_text_field( $request->get_param( 'code' ) );
            $user_id = get_current_user_id();

            if ( ! $code ) {
                return new WP_Error( 'missing_code', 'OAuth code is required.', array( 'status' => 400 ) );
            }

            $response = wp_remote_post( 'https://connect.stripe.com/oauth/token', array(
                'method' => 'POST',
                'body'   => array(
                    'client_id'  => STRIPE_CLIENT_ID,
                    'code'       => $code,
                    'grant_type' => 'authorization_code',
                    'client_secret' => STRIPE_SECRET_KEY,
                ),
            ) );

            if ( is_wp_error( $response ) ) {
                return new WP_Error( 'stripe_connection_failed', $response->get_error_message(), array( 'status' => 500 ) );
            }

            $body = json_decode( wp_remote_retrieve_body( $response ), true );

            if ( ! empty( $body['stripe_user_id'] ) ) {
                update_user_meta( $user_id, 'stripe_account_id', $body['stripe_user_id'] );
                return rest_ensure_response( array(
                    'success'          => true,
                    'stripe_account'   => $body['stripe_user_id'],
                    'message'          => 'Stripe account connected successfully.',
                ) );
            }

            $error_msg = $body['error_description'] ?? 'Failed to connect Stripe account.';
            return new WP_Error( 'stripe_oauth_error', $error_msg, array( 'status' => 400 ) );
        },
    ) );

    // ─── GET Stripe Connect OAuth URL ────────────────────────────────────────
    // GET /wp-json/experthub/v1/stripe/connect-url
    register_rest_route( 'experthub/v1', '/stripe/connect-url', array(
        'methods'             => 'GET',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function( $request ) {
            $redirect_uri = admin_url( 'admin.php?page=experthub-stripe-callback' );
            $oauth_url = 'https://connect.stripe.com/oauth/authorize?' . http_build_query( array(
                'response_type' => 'code',
                'client_id'     => STRIPE_CLIENT_ID,
                'scope'         => 'read_write',
                'redirect_uri'  => $redirect_uri,
                'state'         => wp_create_nonce( 'stripe_connect_' . get_current_user_id() ),
            ) );

            return rest_ensure_response( array( 'url' => $oauth_url ) );
        },
    ) );
} );

// ─── Process automatic payout on WooCommerce order payment ───────────────────
add_action( 'woocommerce_payment_complete', function( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) return;

    foreach ( $order->get_items() as $item ) {
        $product_id = $item->get_product_id();
        $expert_id  = get_post_meta( $product_id, '_expert_id', true );

        if ( ! $expert_id ) continue;

        $stripe_account = get_user_meta( $expert_id, 'stripe_account_id', true );
        if ( ! $stripe_account ) continue;

        $total          = (float) $order->get_total();
        $platform_fee   = $total * 0.20;          // Platform keeps 20 %
        $expert_payout  = $total * 0.80;           // Expert receives 80 %
        $amount_cents   = (int) round( $expert_payout * 100 );

        // Create transfer to expert's connected Stripe account
        $response = wp_remote_post( 'https://api.stripe.com/v1/transfers', array(
            'method'  => 'POST',
            'headers' => array(
                'Authorization' => 'Bearer ' . STRIPE_SECRET_KEY,
                'Content-Type'  => 'application/x-www-form-urlencoded',
            ),
            'body'    => array(
                'amount'                  => $amount_cents,
                'currency'                => strtolower( get_woocommerce_currency() ),
                'destination'             => $stripe_account,
                'transfer_group'          => 'ORDER_' . $order_id,
                'metadata[order_id]'      => $order_id,
                'metadata[expert_id]'     => $expert_id,
                'metadata[platform_fee]'  => number_format( $platform_fee, 2 ),
            ),
        ) );

        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        // Record transfer details on the order
        if ( ! empty( $body['id'] ) ) {
            update_post_meta( $order_id, '_stripe_transfer_id',   $body['id'] );
            update_post_meta( $order_id, '_platform_fee',         $platform_fee );
            update_post_meta( $order_id, '_expert_payout',        $expert_payout );
            update_post_meta( $order_id, '_expert_stripe_account', $stripe_account );

            $order->add_order_note( sprintf(
                'Stripe payout of %s sent to expert #%d (account: %s). Transfer ID: %s',
                wc_price( $expert_payout ),
                $expert_id,
                $stripe_account,
                $body['id']
            ) );
        }
    }
} );

// ─── REST: Get expert payout summary ─────────────────────────────────────────
// GET /wp-json/experthub/v1/stripe/payouts  (authenticated as expert)
add_action( 'rest_api_init', function() {
    register_rest_route( 'experthub/v1', '/stripe/payouts', array(
        'methods'             => 'GET',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function() {
            $user_id        = get_current_user_id();
            $stripe_account = get_user_meta( $user_id, 'stripe_account_id', true );

            $orders = wc_get_orders( array(
                'meta_key'   => '_expert_stripe_account',
                'meta_value' => $stripe_account,
                'status'     => array( 'wc-completed' ),
                'limit'      => 20,
            ) );

            $payouts = array_map( function( $order ) {
                return array(
                    'order_id'       => $order->get_id(),
                    'date'           => $order->get_date_completed() ? $order->get_date_completed()->format( 'Y-m-d' ) : null,
                    'total'          => (float) $order->get_total(),
                    'expert_payout'  => (float) get_post_meta( $order->get_id(), '_expert_payout',  true ),
                    'platform_fee'   => (float) get_post_meta( $order->get_id(), '_platform_fee',   true ),
                    'transfer_id'    => get_post_meta( $order->get_id(), '_stripe_transfer_id', true ),
                );
            }, $orders );

            return rest_ensure_response( array(
                'stripe_account' => $stripe_account,
                'payouts'        => $payouts,
                'total_earned'   => array_sum( array_column( $payouts, 'expert_payout' ) ),
            ) );
        },
    ) );
} );
