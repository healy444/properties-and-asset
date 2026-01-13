<?php

namespace App\Providers;

use App\Models\Asset;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Allow route model binding to include soft-deleted assets (needed for viewing/restoring).
        //
    }
}
