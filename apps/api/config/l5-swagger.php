<?php

return [
    'api' => [
        'title' => 'PoesyLiang Blog API',
    ],

    'routes' => [
        'api'             => 'documentation',
        'docs'            => 'docs',
        'oauth2_callback' => 'api/oauth2-callback',
        'middleware' => [
            'api'             => [],
            'asset'           => [],
            'docs'            => [],
            'oauth2_callback' => [],
        ],
    ],

    'paths' => [
        'docs'       => storage_path('api-docs'),
        'docs_json'  => 'api-docs.json',
        'docs_yaml'  => 'api-docs.yaml',
        'annotations' => [
            base_path('app'),
        ],
        'views'      => base_path('resources/views/vendor/l5-swagger'),
        'base'       => env('L5_SWAGGER_BASE_PATH', null),
        'swagger_ui_assets_path' => env('L5_SWAGGER_UI_ASSETS_PATH', 'vendor/swagger-api/swagger-ui/dist/'),
        'excludes'   => [],
    ],

    'security' => [],

    'generate_always'    => env('L5_SWAGGER_GENERATE_ALWAYS', false),
    'generate_yaml_copy' => env('L5_SWAGGER_GENERATE_YAML_COPY', false),
    'swagger_version'    => env('SWAGGER_VERSION', '3.0'),
    'proxy'              => false,
    'additional_config_url' => null,
    'operations_sort'    => env('L5_SWAGGER_OPERATIONS_SORT', null),
    'validator_url'      => null,

    'constants' => [
        'L5_SWAGGER_CONST_HOST' => env('L5_SWAGGER_CONST_HOST', 'http://poesyliang.net/api'),
    ],
];
