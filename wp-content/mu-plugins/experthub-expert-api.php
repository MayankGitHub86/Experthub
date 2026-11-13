<?php
/**
 * Expert Profile REST API
 * GET/POST /wp-json/experthub/v1/experts
 */

add_action( 'rest_api_init', function() {

    // ─── GET all verified experts ────────────────────────────────────────────
    register_rest_route( 'experthub/v1', '/experts', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function( $request ) {
            $users = get_users( array(
                'role'       => 'expert',
                'meta_query' => array(
                    array( 'key' => 'expert_verification_badge', 'value' => true ),
                ),
            ) );

            $experts = array();
            foreach ( $users as $user ) {
                $reviews = get_posts( array(
                    'post_author'    => $user->ID,
                    'post_type'      => 'product_review',
                    'posts_per_page' => -1,
                ) );

                $rating = 0;
                if ( count( $reviews ) > 0 ) {
                    $total = array_sum( array_map( function( $r ) {
                        return (int) get_post_meta( $r->ID, 'rating', true );
                    }, $reviews ) );
                    $rating = $total / count( $reviews );
                }

                $experts[] = array(
                    'id'           => $user->ID,
                    'name'         => $user->display_name,
                    'email'        => $user->user_email,
                    'bio'          => get_user_meta( $user->ID, 'expert_bio', true ),
                    'avatar'       => get_avatar_url( $user->ID ),
                    'hourly_rate'  => (float) get_user_meta( $user->ID, 'expert_hourly_rate', true ),
                    'specialties'  => (array) get_user_meta( $user->ID, 'expert_specialties', true ),
                    'rating'       => $rating,
                    'review_count' => count( $reviews ),
                    'verified'     => (bool) get_user_meta( $user->ID, 'expert_verification_badge', true ),
                );
            }

            return rest_ensure_response( $experts );
        },
    ) );

    // ─── GET single expert ───────────────────────────────────────────────────
    register_rest_route( 'experthub/v1', '/experts/(?P<id>\d+)', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function( $request ) {
            $expert_id = $request->get_param( 'id' );
            $user      = get_user_by( 'ID', $expert_id );

            if ( ! $user ) {
                return new WP_Error( 'not_found', 'Expert not found', array( 'status' => 404 ) );
            }

            // Bookings count
            $bookings = get_posts( array(
                'post_type'  => 'wc_booking',
                'meta_query' => array(
                    array( 'key' => '_expert_id', 'value' => $expert_id ),
                ),
            ) );

            // Products (service packages)
            $products = function_exists( 'wc_get_products' )
                ? wc_get_products( array( 'meta_key' => '_expert_id', 'meta_value' => $expert_id ) )
                : array();

            $services = array_map( function( $p ) {
                return array(
                    'id'          => $p->get_id(),
                    'name'        => $p->get_name(),
                    'description' => $p->get_description(),
                    'price'       => $p->get_price(),
                    'duration'    => get_post_meta( $p->get_id(), '_booking_duration', true ),
                );
            }, $products );

            return rest_ensure_response( array(
                'id'                  => $user->ID,
                'name'                => $user->display_name,
                'bio'                 => get_user_meta( $user->ID, 'expert_bio', true ),
                'avatar'              => get_avatar_url( $user->ID ),
                'hourly_rate'         => (float) get_user_meta( $user->ID, 'expert_hourly_rate', true ),
                'specialties'         => (array) get_user_meta( $user->ID, 'expert_specialties', true ),
                'availability'        => get_user_meta( $user->ID, 'expert_availability', true ),
                'services'            => $services,
                'total_consultations' => count( $bookings ),
                'response_time'       => '< 1 hour',
            ) );
        },
    ) );

    // ─── POST update own profile ─────────────────────────────────────────────
    register_rest_route( 'experthub/v1', '/experts/profile', array(
        'methods'             => 'POST',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function( $request ) {
            $user_id = get_current_user_id();
            $params  = $request->get_json_params();

            if ( isset( $params['bio'] ) ) {
                update_user_meta( $user_id, 'expert_bio', sanitize_textarea_field( $params['bio'] ) );
            }
            if ( isset( $params['hourly_rate'] ) ) {
                update_user_meta( $user_id, 'expert_hourly_rate', floatval( $params['hourly_rate'] ) );
            }
            if ( isset( $params['specialties'] ) && is_array( $params['specialties'] ) ) {
                update_user_meta( $user_id, 'expert_specialties', array_map( 'sanitize_text_field', $params['specialties'] ) );
            }
            if ( isset( $params['availability'] ) ) {
                update_user_meta( $user_id, 'expert_availability', sanitize_textarea_field( $params['availability'] ) );
            }

            return rest_ensure_response( array( 'success' => true, 'message' => 'Profile updated successfully.' ) );
        },
    ) );
} );
