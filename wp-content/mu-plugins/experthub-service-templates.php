<?php
/**
 * Service Package Templates for ExpertHub
 * Provides template definitions and a REST endpoint for the React frontend.
 */

// Service template definitions
function experthub_get_service_templates() {
    return array(
        'consultation' => array(
            'name'          => '1-on-1 Consultation',
            'description'   => 'Private one-on-one consultation session with the expert.',
            'duration'      => 60,
            'default_price' => 150,
            'icon'          => 'chat-bubble',
        ),
        'course' => array(
            'name'          => 'Online Course',
            'description'   => 'Self-paced online course with structured materials and exercises.',
            'duration'      => null,
            'default_price' => 299,
            'icon'          => 'book',
        ),
        'group_training' => array(
            'name'          => 'Group Training',
            'description'   => 'Interactive group training session (up to 10 participants).',
            'duration'      => 120,
            'default_price' => 500,
            'icon'          => 'users',
        ),
        'workshop' => array(
            'name'          => 'Workshop',
            'description'   => 'Full-day or multi-day intensive workshop with hands-on exercises.',
            'duration'      => 480,
            'default_price' => 1500,
            'icon'          => 'briefcase',
        ),
        'quick_call' => array(
            'name'          => '30-Min Quick Call',
            'description'   => 'Fast 30-minute call for focused advice on a specific problem.',
            'duration'      => 30,
            'default_price' => 75,
            'icon'          => 'phone',
        ),
        'full_day' => array(
            'name'          => 'Full-Day Intensive',
            'description'   => 'Full-day (8 hours) private intensive session with the expert.',
            'duration'      => 480,
            'default_price' => 1000,
            'icon'          => 'sun',
        ),
    );
}

// REST endpoint: GET /wp-json/experthub/v1/service-templates
add_action( 'rest_api_init', function() {
    register_rest_route( 'experthub/v1', '/service-templates', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function() {
            return rest_ensure_response( experthub_get_service_templates() );
        },
    ) );
} );

// REST endpoint: POST /wp-json/experthub/v1/services  — create a service product from a template
add_action( 'rest_api_init', function() {
    register_rest_route( 'experthub/v1', '/services', array(
        'methods'             => 'POST',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function( $request ) {
            if ( ! function_exists( 'wc_create_product' ) ) {
                return new WP_Error( 'woocommerce_missing', 'WooCommerce is not active', array( 'status' => 500 ) );
            }

            $params      = $request->get_json_params();
            $template_id = sanitize_text_field( $params['template'] ?? '' );
            $templates   = experthub_get_service_templates();

            if ( ! array_key_exists( $template_id, $templates ) ) {
                return new WP_Error( 'invalid_template', 'Invalid service template', array( 'status' => 400 ) );
            }

            $tpl     = $templates[ $template_id ];
            $user_id = get_current_user_id();

            $product = new WC_Product_Simple();
            $product->set_name( sanitize_text_field( $params['name'] ?? $tpl['name'] ) );
            $product->set_description( sanitize_textarea_field( $params['description'] ?? $tpl['description'] ) );
            $product->set_price( floatval( $params['price'] ?? $tpl['default_price'] ) );
            $product->set_regular_price( floatval( $params['price'] ?? $tpl['default_price'] ) );
            $product->set_status( 'publish' );
            $product_id = $product->save();

            update_post_meta( $product_id, '_expert_id', $user_id );
            update_post_meta( $product_id, '_service_type', $template_id );
            update_post_meta( $product_id, '_booking_duration', $tpl['duration'] );

            return rest_ensure_response( array(
                'success'    => true,
                'product_id' => $product_id,
                'message'    => 'Service package created successfully.',
            ) );
        },
    ) );
} );
