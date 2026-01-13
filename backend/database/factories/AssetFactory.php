<?php

namespace Database\Factories;

use App\Models\Asset;
use App\Models\Branch;
use App\Models\Category;
use App\Models\AssetType;
use App\Models\User;
use App\Models\Brand;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class AssetFactory extends Factory
{
    protected $model = Asset::class;

    public function definition(): array
    {
        return [
            'asset_code' => $this->faker->unique()->bothify('??-??-??-####'),
            'branch_id' => Branch::factory(),
            'category_id' => Category::factory(),
            'asset_type_id' => AssetType::factory(),
            'brand_id' => Brand::factory(),
            'supplier_id' => Supplier::factory(),
            'model_number' => $this->faker->word . '-' . $this->faker->numberBetween(100, 999),
            'acquisition_cost' => $this->faker->randomFloat(2, 5000, 500000),
            'useful_life_months' => $this->faker->numberBetween(12, 60),
            'monthly_depreciation' => 0,
            'date_of_purchase' => $this->faker->date(),
            'condition' => 'good',
            'is_draft' => false,
            'created_by' => User::factory(),
        ];
    }
}
