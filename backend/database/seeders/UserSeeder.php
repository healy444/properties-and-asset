<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get admin password from .env or use default
        $adminPassword = env('ADMIN_DEFAULT_PASSWORD', 'Admin@2026');
        $managerPassword = env('MANAGER_DEFAULT_PASSWORD', 'Manager@2026');

        // Super Admin User
        \App\Models\User::create([
            'last_name' => 'Administrator',
            'first_name' => 'System',
            'middle_name' => null,
            'suffix' => null,
            'date_of_birth' => '1990-01-01',
            'username' => 'admin',
            'email' => 'admin@coop.local',
            'password' => \Illuminate\Support\Facades\Hash::make($adminPassword),
            'role' => 'super_admin',
            'is_active' => true,
            'profile_photo_path' => null,
        ]);

        // Branch Custodian User
        \App\Models\User::create([
            'last_name' => 'Manager',
            'first_name' => 'Asset',
            'middle_name' => 'M.',
            'suffix' => null,
            'date_of_birth' => '1992-05-15',
            'username' => 'manager',
            'email' => 'manager@coop.local',
            'password' => \Illuminate\Support\Facades\Hash::make($managerPassword),
            'role' => 'branch_custodian',
            'is_active' => true,
            'profile_photo_path' => null,
        ]);

        $this->command->info('✓ Users seeded successfully');
        $this->command->info("  Super Admin credentials: admin / {$adminPassword}");
        $this->command->info("  Branch Custodian credentials: manager / {$managerPassword}");
    }
}
