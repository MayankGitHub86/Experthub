<?php
/**
 * JWT Authentication for ExpertHub
 * Allows React frontend to authenticate with WordPress REST API
 */

add_filter( 'jwt_auth_token_before_sign', function( $token ) {
    $user = wp_get_current_user();
    
    // Add custom claims
    $token['user_id'] = $user->ID;
    $token['user_email'] = $user->user_email;
    $token['user_role'] = $user->roles;
    $token['expert_id'] = get_user_meta( $user->ID, 'expert_id', true );
    $token['is_expert'] = in_array( 'expert', $user->roles );
    
    return $token;
});

// REST API authentication endpoint
add_action( 'rest_api_init', function() {
    register_rest_route( 'experthub/v1', '/auth/login', array(
        'methods' => 'POST',
        'callback' => function( $request ) {
            $email = $request->get_param( 'email' );
            $password = $request->get_param( 'password' );

            $user = get_user_by( 'email', $email );

            if ( ! $user || ! wp_check_password( $password, $user->user_pass, $user->ID ) ) {
                return new WP_Error( 'invalid_credentials', 'Invalid email or password', array( 'status' => 401 ) );
            }

            // Generate JWT token
            $token = wp_create_jwt_token( $user->ID );

            return rest_ensure_response( array(
                'token' => $token,
                'user' => array(
                    'id' => $user->ID,
                    'email' => $user->user_email,
                    'name' => $user->display_name,
                    'is_expert' => in_array( 'expert', $user->roles ),
                ),
            ));
        },
        'permission_callback' => '__return_true',
    ));
});
