<?php
/**
 * WooCommerce Configuration for ExpertHub
 */

// Add expert info to product
add_action( 'woocommerce_product_options_general_product_data', function() {
    woocommerce_wp_text_input( array(
        'id' => '_expert_id',
        'label' => 'Expert ID',
        'desc_tip' => 'Assign this service to an expert',
        'type' => 'text',
    ));

    woocommerce_wp_select( array(
        'id' => '_service_type',
        'label' => 'Service Type',
        'options' => array(
            '' => 'Select...',
            'consultation' => '1-on-1 Consultation',
            'course' => 'Online Course',
            'group_training' => 'Group Training',
            'workshop' => 'Workshop',
        ),
    ));
});

// Save expert info
add_action( 'woocommerce_process_product_meta', function( $post_id ) {
    $expert_id = isset( $_POST['_expert_id'] ) ? sanitize_text_field( $_POST['_expert_id'] ) : '';
    update_post_meta( $post_id, '_expert_id', $expert_id );

    $service_type = isset( $_POST['_service_type'] ) ? sanitize_text_field( $_POST['_service_type'] ) : '';
    update_post_meta( $post_id, '_service_type', $service_type );
});

// Custom order emails
add_filter( 'woocommerce_email_classes', function( $emails ) {
    $emails['WC_Email_Expert_Booking'] = include( get_template_directory() . '/includes/emails/class-wc-email-expert-booking.php' );
    return $emails;
});

// Enable booking functionality
add_filter( 'woocommerce_bookings_resource_cache_expiry', function() {
    return 86400; // Cache for 24 hours
});
