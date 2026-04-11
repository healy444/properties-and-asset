<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE assets SET asset_status = 'retired' WHERE asset_status = 'inactive'");
        DB::statement("UPDATE assets SET pre_delete_asset_status = 'retired' WHERE pre_delete_asset_status = 'inactive'");

        DB::statement("ALTER TABLE assets MODIFY `asset_status` ENUM('active','retired') NOT NULL DEFAULT 'active'");
        DB::statement("ALTER TABLE assets MODIFY `pre_delete_asset_status` ENUM('active','retired') NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE assets MODIFY `asset_status` ENUM('active','inactive','retired') NOT NULL DEFAULT 'active'");
        DB::statement("ALTER TABLE assets MODIFY `pre_delete_asset_status` ENUM('active','inactive','retired') NULL");
    }
};
