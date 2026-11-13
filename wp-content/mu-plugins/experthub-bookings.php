<?php
/**
 * WooCommerce Bookings Integration for ExpertHub
 * Handles booking lifecycle events and exposes availability REST endpoints.
 */

// ─── Booking confirmation → notify Node.js microservice ──────────────────────
add_action( 'woocommerce_booking_confirmed', function( $booking_id ) {
    $booking     = get_wc_booking( $booking_id );
    $expert_id   = get_post_meta( $booking->product_id, '_expert_id', true );
    $customer_id = $booking->customer_id;

    $microservice_url = defined( 'EXPERTHUB_MICROSERVICE_URL' )
        ? EXPERTHUB_MICROSERVICE_URL
        : ( get_option( 'experthub_microservice_url' ) ?: 'http://localhost:3001' );

    wp_remote_post( $microservice_url . '/webhooks/booking-confirmed', array(
        'method'  => 'POST',
        'headers' => array( 'Content-Type' => 'application/json' ),
        'body'    => wp_json_encode( array(
            'booking_id'     => $booking_id,
            'expert_id'      => $expert_id,
            'customer_id'    => $customer_id,
            'scheduled_time' => $booking->start,
            'duration'       => $booking->duration,
        ) ),
        'timeout' => 10,
    ) );
} );

// ─── Booking cancellation → notify Node.js microservice ──────────────────────
add_action( 'woocommerce_booking_cancelled', function( $booking_id ) {
    $booking = get_wc_booking( $booking_id );

    $microservice_url = defined( 'EXPERTHUB_MICROSERVICE_URL' )
        ? EXPERTHUB_MICROSERVICE_URL
        : ( get_option( 'experthub_microservice_url' ) ?: 'http://localhost:3001' );

    wp_remote_post( $microservice_url . '/webhooks/booking-cancelled', array(
        'method'  => 'POST',
        'headers' => array( 'Content-Type' => 'application/json' ),
        'body'    => wp_json_encode( array(
            'booking_id'  => $booking_id,
            'customer_id' => $booking->customer_id,
        ) ),
        'timeout' => 10,
    ) );
} );

// ─── REST: GET expert availability slots ─────────────────────────────────────
// GET /wp-json/experthub/v1/experts/{id}/availability?date=YYYY-MM-DD
add_action( 'rest_api_init', function() {
    register_rest_route( 'experthub/v1', '/experts/(?P<id>\d+)/availability', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'args'                => array(
            'date' => array(
                'required' => true,
                'type'     => 'string',
                'pattern'  => '^\d{4}-\d{2}-\d{2}$',
            ),
        ),
        'callback'            => function( $request ) {
            $expert_id = (int) $request->get_param( 'id' );
            $date      = sanitize_text_field( $request->get_param( 'date' ) );

            // Pull all confirmed/paid bookings for this expert on the given date
            $bookings = get_posts( array(
                'post_type'      => 'wc_booking',
                'posts_per_page' => -1,
                'meta_query'     => array(
                    array( 'key' => '_expert_id',  'value' => $expert_id ),
                    array( 'key' => '_booking_date', 'value' => $date ),
                ),
            ) );

            $booked_hours = array();
            foreach ( $bookings as $b ) {
                $start_ts = (int) get_post_meta( $b->ID, '_booking_start', true );
                $end_ts   = (int) get_post_meta( $b->ID, '_booking_end',   true );
                if ( $start_ts && $end_ts ) {
                    $booked_hours[] = array( 'start' => $start_ts, 'end' => $end_ts );
                }
            }

            // Generate hourly slots 09:00 – 17:00
            $available = array();
            for ( $h = 9; $h < 17; $h++ ) {
                $slot_ts  = strtotime( $date . ' ' . sprintf( '%02d', $h ) . ':00:00' );
                $slot_end = $slot_ts + 3600;
                $blocked  = false;

                foreach ( $booked_hours as $bh ) {
                    if ( $slot_ts < $bh['end'] && $slot_end > $bh['start'] ) {
                        $blocked = true;
                        break;
                    }
                }

                if ( ! $blocked ) {
                    $available[] = array(
                        'time'    => gmdate( 'Y-m-d H:i:s', $slot_ts ),
                        'display' => sprintf( '%02d:00 – %02d:00', $h, $h + 1 ),
                    );
                }
            }

            return rest_ensure_response( $available );
        },
    ) );
} );

// ─── REST: POST create a booking ─────────────────────────────────────────────
// POST /wp-json/experthub/v1/bookings
add_action( 'rest_api_init', function() {
    register_rest_route( 'experthub/v1', '/bookings', array(
        'methods'             => 'POST',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function( $request ) {
            $params = $request->get_json_params();

            if ( ! function_exists( 'create_wc_booking' ) ) {
                return new WP_Error( 'woocommerce_bookings_missing', 'WooCommerce Bookings is not active', array( 'status' => 500 ) );
            }

            $product_id = (int) ( $params['product_id'] ?? 0 );
            $start_date = sanitize_text_field( $params['start_date'] ?? '' );
            $start_time = sanitize_text_field( $params['start_time'] ?? '' );

            if ( ! $product_id || ! $start_date || ! $start_time ) {
                return new WP_Error( 'missing_fields', 'product_id, start_date, and start_time are required.', array( 'status' => 400 ) );
            }

            $start_ts = strtotime( $start_date . ' ' . $start_time );
            $duration = (int) get_post_meta( $product_id, '_booking_duration', true ) ?: 60;
            $end_ts   = $start_ts + ( $duration * 60 );

            $booking_data = array(
                'product_id'  => $product_id,
                'customer_id' => get_current_user_id(),
                'start_date'  => gmdate( 'Y-m-d H:i:s', $start_ts ),
                'end_date'    => gmdate( 'Y-m-d H:i:s', $end_ts ),
                'status'      => 'unpaid',
            );

            $booking_id = create_wc_booking( $product_id, $booking_data );

            return rest_ensure_response( array(
                'success'    => true,
                'booking_id' => $booking_id,
                'start'      => gmdate( 'Y-m-d H:i:s', $start_ts ),
                'end'        => gmdate( 'Y-m-d H:i:s', $end_ts ),
                'message'    => 'Booking created. Proceed to payment.',
            ) );
        },
    ) );
} );
