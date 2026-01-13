<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tables = ['branches', 'categories', 'asset_types', 'brands', 'suppliers'];
        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->boolean('is_active')->default(true)->after('name');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = ['branches', 'categories', 'asset_types', 'brands', 'suppliers'];
        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        }
    }
};
