<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(\App\Services\VersioningService::class, function ($app) {
            return new \App\Services\VersioningService();
        });

        $this->app->singleton(\App\Services\WpPostService::class, function ($app) {
            return new \App\Services\WpPostService();
        });
    }

    public function boot()
    {
        //
    }
}
