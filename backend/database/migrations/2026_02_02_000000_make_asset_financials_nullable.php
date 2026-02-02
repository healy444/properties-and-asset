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
        Schema::table('assets', function (Blueprint $table) {
            $table->date('date_of_purchase')->nullable()->change();
            $table->decimal('acquisition_cost', 15, 2)->nullable()->change();
            $table->integer('useful_life_months')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->date('date_of_purchase')->nullable(false)->change();
            $table->decimal('acquisition_cost', 15, 2)->nullable(false)->change();
            $table->integer('useful_life_months')->nullable(false)->change();
        });
    }
};
