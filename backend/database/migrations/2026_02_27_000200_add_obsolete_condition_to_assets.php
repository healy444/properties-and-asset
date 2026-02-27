<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("UPDATE assets SET `condition` = 'good' WHERE `condition` IN ('excellent', 'very_good')");
        DB::statement("ALTER TABLE assets MODIFY `condition` ENUM('good','fair','poor','obsolete') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE assets MODIFY `condition` ENUM('excellent','very_good','good','fair','poor') NOT NULL");
    }
};
