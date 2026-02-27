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
        if (Schema::hasColumn('audit_logs', 'ip_address')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->dropColumn('ip_address');
            });
        }

        if (Schema::hasColumn('users', 'ip_address')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('ip_address');
            });
        }

        if (Schema::hasColumn('sessions', 'ip_address')) {
            Schema::table('sessions', function (Blueprint $table) {
                $table->dropColumn('ip_address');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('audit_logs', 'ip_address')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->string('ip_address')->nullable()->after('metadata');
            });
        }

        if (!Schema::hasColumn('users', 'ip_address')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('ip_address', 45)->nullable()->after('remember_token');
            });
        }

        if (!Schema::hasColumn('sessions', 'ip_address')) {
            Schema::table('sessions', function (Blueprint $table) {
                $table->string('ip_address', 45)->nullable();
            });
        }
    }
};
