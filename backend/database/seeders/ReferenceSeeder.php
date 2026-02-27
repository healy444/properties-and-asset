<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ReferenceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * IMPORTANT: Codes are IMMUTABLE after seeding.
     * Do not modify codes in production as they may be referenced in asset IDs.
     */
    public function run(): void
    {
        $divisionIds = $this->seedDivisions();
        $this->seedBranches($divisionIds);
        $this->seedCategories();
        $this->seedAssetTypes();
        $this->seedBrands();
        $this->seedSuppliers();
    }

    /**
     * Seed divisions.
     */
    private function seedDivisions(): array
    {
        $divisions = [
            ['code' => 'HO', 'name' => 'Head Office'],
            ['code' => 'NR', 'name' => 'North Region'],
            ['code' => 'SR', 'name' => 'South Region'],
            ['code' => 'CR', 'name' => 'Central Region'],
        ];

        $ids = [];
        foreach ($divisions as $division) {
            $id = \Illuminate\Support\Facades\DB::table('divisions')->insertGetId([
                'code' => $division['code'],
                'name' => $division['name'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $ids[$division['code']] = $id;
        }

        $this->command->info('✓ Divisions seeded (4 total)');

        return $ids;
    }

    /**
     * Seed branches with parent-child hierarchy.
     * Codes are FIXED and must not be changed.
     */
    private function seedBranches(array $divisionIds): void
    {
        // Main Office (Root)
        $mainOffice = \Illuminate\Support\Facades\DB::table('branches')->insertGetId([
            'division_id' => $divisionIds['HO'] ?? null,
            'parent_id' => null,
            'code' => 'HO',
            'name' => 'Head Office',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Regional Branches (Children of Main Office)
        $northRegion = \Illuminate\Support\Facades\DB::table('branches')->insertGetId([
            'division_id' => $divisionIds['NR'] ?? null,
            'parent_id' => $mainOffice,
            'code' => 'NR',
            'name' => 'North Region',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $southRegion = \Illuminate\Support\Facades\DB::table('branches')->insertGetId([
            'division_id' => $divisionIds['SR'] ?? null,
            'parent_id' => $mainOffice,
            'code' => 'SR',
            'name' => 'South Region',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $centralRegion = \Illuminate\Support\Facades\DB::table('branches')->insertGetId([
            'division_id' => $divisionIds['CR'] ?? null,
            'parent_id' => $mainOffice,
            'code' => 'CR',
            'name' => 'Central Region',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Sub-branches (Children of Regions)
        \Illuminate\Support\Facades\DB::table('branches')->insert([
            [
                'division_id' => $divisionIds['NR'] ?? null,
                'parent_id' => $northRegion,
                'code' => 'NR-B1',
                'name' => 'North Branch 1',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'division_id' => $divisionIds['NR'] ?? null,
                'parent_id' => $northRegion,
                'code' => 'NR-B2',
                'name' => 'North Branch 2',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'division_id' => $divisionIds['SR'] ?? null,
                'parent_id' => $southRegion,
                'code' => 'SR-B1',
                'name' => 'South Branch 1',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'division_id' => $divisionIds['CR'] ?? null,
                'parent_id' => $centralRegion,
                'code' => 'CR-B1',
                'name' => 'Central Branch 1',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $this->command->info('✓ Branches seeded (8 total with hierarchy)');
    }

    /**
     * Seed categories with FIXED approved codes.
     * These codes are immutable and used in asset ID generation.
     */
    private function seedCategories(): void
    {
        $categories = [
            ['code' => 'IT', 'name' => 'Information Technology'],
            ['code' => 'FUR', 'name' => 'Furniture & Fixtures'],
            ['code' => 'VEH', 'name' => 'Vehicles'],
            ['code' => 'EQP', 'name' => 'Equipment & Machinery'],
            ['code' => 'BLD', 'name' => 'Buildings & Structures'],
            ['code' => 'LND', 'name' => 'Land'],
            ['code' => 'OFF', 'name' => 'Office Supplies'],
        ];

        foreach ($categories as $category) {
            \Illuminate\Support\Facades\DB::table('categories')->insert([
                'code' => $category['code'],
                'name' => $category['name'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('✓ Categories seeded (7 total with fixed codes)');
    }

    /**
     * Seed initial asset types linked to categories.
     */
    private function seedAssetTypes(): void
    {
        // Get category IDs
        $itCat = \Illuminate\Support\Facades\DB::table('categories')->where('code', 'IT')->first();
        $furCat = \Illuminate\Support\Facades\DB::table('categories')->where('code', 'FUR')->first();
        $vehCat = \Illuminate\Support\Facades\DB::table('categories')->where('code', 'VEH')->first();
        $eqpCat = \Illuminate\Support\Facades\DB::table('categories')->where('code', 'EQP')->first();

        $assetTypes = [
            // IT Equipment
            ['category_id' => $itCat->id, 'code' => 'LT', 'name' => 'Laptop'],
            ['category_id' => $itCat->id, 'code' => 'DT', 'name' => 'Desktop Computer'],
            ['category_id' => $itCat->id, 'code' => 'PR', 'name' => 'Printer'],
            ['category_id' => $itCat->id, 'code' => 'SV', 'name' => 'Server'],
            ['category_id' => $itCat->id, 'code' => 'NT', 'name' => 'Network Equipment'],

            // Furniture
            ['category_id' => $furCat->id, 'code' => 'DSK', 'name' => 'Desk'],
            ['category_id' => $furCat->id, 'code' => 'CHR', 'name' => 'Chair'],
            ['category_id' => $furCat->id, 'code' => 'CAB', 'name' => 'Cabinet'],
            ['category_id' => $furCat->id, 'code' => 'TBL', 'name' => 'Table'],

            // Vehicles
            ['category_id' => $vehCat->id, 'code' => 'CAR', 'name' => 'Car'],
            ['category_id' => $vehCat->id, 'code' => 'VAN', 'name' => 'Van'],
            ['category_id' => $vehCat->id, 'code' => 'TRK', 'name' => 'Truck'],

            // Equipment
            ['category_id' => $eqpCat->id, 'code' => 'GEN', 'name' => 'Generator'],
            ['category_id' => $eqpCat->id, 'code' => 'AC', 'name' => 'Air Conditioner'],
            ['category_id' => $eqpCat->id, 'code' => 'PRJ', 'name' => 'Projector'],
        ];

        foreach ($assetTypes as $type) {
            \Illuminate\Support\Facades\DB::table('asset_types')->insert([
                'category_id' => $type['category_id'],
                'code' => $type['code'],
                'name' => $type['name'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('✓ Asset Types seeded (15 total across 4 categories)');
    }

    /**
     * Seed initial brands.
     */
    private function seedBrands(): void
    {
        $brands = [
            'Dell',
            'HP',
            'Lenovo',
            'Apple',
            'Asus',
            'Acer',
            'Canon',
            'Epson',
            'Brother',
            'Samsung',
            'LG',
            'Sony',
            'Microsoft',
            'Cisco',
            'Generic',
        ];

        foreach ($brands as $brand) {
            \Illuminate\Support\Facades\DB::table('brands')->insert([
                'name' => $brand,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('✓ Brands seeded (15 total)');
    }

    /**
     * Seed initial suppliers.
     */
    private function seedSuppliers(): void
    {
        $suppliers = [
            [
                'name' => 'PC Express',
                'contact_person' => 'Juan Dela Cruz',
                'email' => 'sales@pcexpress.com.ph',
                'phone' => '+63-2-1234-5678',
                'address' => '123 EDSA, Quezon City, Metro Manila',
            ],
            [
                'name' => 'Octagon Computer Superstore',
                'contact_person' => 'Maria Santos',
                'email' => 'info@octagon.com.ph',
                'phone' => '+63-2-8765-4321',
                'address' => '456 Ayala Avenue, Makati City, Metro Manila',
            ],
            [
                'name' => 'CDR-King',
                'contact_person' => 'Pedro Reyes',
                'email' => 'support@cdrking.com',
                'phone' => '+63-2-5555-1234',
                'address' => '789 Rizal Avenue, Manila',
            ],
            [
                'name' => 'Villman Computers',
                'contact_person' => 'Ana Garcia',
                'email' => 'sales@villman.com',
                'phone' => '+63-2-9999-8888',
                'address' => '321 Ortigas Avenue, Pasig City',
            ],
        ];

        foreach ($suppliers as $supplier) {
            \Illuminate\Support\Facades\DB::table('suppliers')->insert([
                'name' => $supplier['name'],
                'contact_person' => $supplier['contact_person'],
                'email' => $supplier['email'] ?? null,
                'phone' => $supplier['phone'] ?? null,
                'address' => $supplier['address'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('✓ Suppliers seeded (4 total)');
    }
}
