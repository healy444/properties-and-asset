<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Division;
use Illuminate\Database\Eloquent\Factories\Factory;

class BranchFactory extends Factory
{
    protected $model = Branch::class;

    public function definition(): array
    {
        return [
            'division_id' => Division::factory(),
            'code' => $this->faker->unique()->lexify('??'),
            'name' => $this->faker->company . ' Branch',
        ];
    }
}
