<?php
/**
 * ExpertHub Custom Database Schema
 * Add expert-specific fields to WordPress
 */

// Register custom post type for Experts
add_action( 'init', function() {
    register_post_type( 'expert', array(
        'label' => 'Experts',
        'public' => true,
        'has_archive' => true,
        'hierarchical' => false,
        'supports' => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ),
        'rewrite' => array( 'slug' => 'expert' ),
        'rest_base' => 'experts',
        'show_in_rest' => true,
    ));

    register_post_type( 'service_package', array(
        'label' => 'Service Packages',
        'public' => true,
        'supports' => array( 'title', 'editor', 'thumbnail' ),
        'rewrite' => array( 'slug' => 'service' ),
        'rest_base' => 'services',
        'show_in_rest' => true,
    ));
});

// Register custom taxonomies
add_action( 'init', function() {
    register_taxonomy( 'expertise', 'expert', array(
        'label' => 'Expertise Areas',
        'hierarchical' => true,
        'rewrite' => array( 'slug' => 'expertise' ),
        'show_in_rest' => true,
    ));

    register_taxonomy( 'service_category', 'service_package', array(
        'label' => 'Service Category',
        'hierarchical' => true,
        'rewrite' => array( 'slug' => 'service-category' ),
        'show_in_rest' => true,
    ));
});

// Register custom user meta
add_action( 'init', function() {
    register_meta( 'user', 'expert_bio', array(
        'type' => 'string',
        'single' => true,
        'show_in_rest' => true,
    ));

    register_meta( 'user', 'expert_hourly_rate', array(
        'type' => 'number',
        'single' => true,
        'show_in_rest' => true,
    ));

    register_meta( 'user', 'expert_verification_badge', array(
        'type' => 'boolean',
        'single' => true,
        'show_in_rest' => true,
    ));

    register_meta( 'user', 'expert_specialties', array(
        'type' => 'array',
        'single' => true,
        'show_in_rest' => true,
    ));

    register_meta( 'user', 'expert_availability', array(
        'type' => 'string',
        'single' => true,
        'show_in_rest' => true,
    ));

    register_meta( 'user', 'stripe_account_id', array(
        'type' => 'string',
        'single' => true,
        'show_in_rest' => false, // Hide from REST for security
    ));
});
