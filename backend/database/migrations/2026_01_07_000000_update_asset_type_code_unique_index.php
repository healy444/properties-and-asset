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
        Schema::table('asset_types', function (Blueprint $table) {
            $table->dropUnique('asset_types_code_unique');
            $table->unique(['category_id', 'code'], 'asset_types_category_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('asset_types', function (Blueprint $table) {
            $table->dropUnique('asset_types_category_code_unique');
            $table->unique('code', 'asset_types_code_unique');
        });
    }
};
