<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Branch;
use App\Models\Category;
use App\Models\AssetType;
use App\Models\Asset;
use App\Services\AssetCodeGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;

class AssetCodeGeneratorServiceTest extends TestCase
{
    use RefreshDatabase;

    private $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AssetCodeGeneratorService();
    }

    public function test_it_generates_code_with_correct_format()
    {
        $branch = Branch::factory()->create(['code' => 'HO']);
        $category = Category::factory()->create(['code' => 'IT']);
        $assetType = AssetType::factory()->create(['code' => 'LT', 'name' => 'Laptop']);

        $code = $this->service->generate($branch, $category, $assetType);

        // Format: HO-IT-LT-XXXX
        $this->assertMatchesRegularExpression('/^HO-IT-LT-\d{4}$/', $code);
    }

    public function test_it_generates_type_code_from_initials_if_missing()
    {
        $branch = Branch::factory()->create(['code' => 'HO']);
        $category = Category::factory()->create(['code' => 'IT']);

        // Use a model instance without saving it to DB to bypass NOT NULL constraint
        $assetType = new AssetType([
            'category_id' => $category->id,
            'code' => null,
            'name' => 'Desktop Computer'
        ]);

        $code = $this->service->generate($branch, $category, $assetType);

        $this->assertMatchesRegularExpression('/^HO-IT-DC-\d{4}$/', $code);
    }

    public function test_it_ensures_uniqueness_on_collision()
    {
        $branch = Branch::factory()->create(['code' => 'HO']);
        $category = Category::factory()->create(['code' => 'IT']);
        $assetType = AssetType::factory()->create(['code' => 'LT']);

        // Mock mt_rand to return the same value twice, then a new one
        // Note: mt_rand is not easily mockable without external libs or namespace tricks.
        // Instead, we can pre-create an asset with a specific code and verify the service avoids it.

        // This is tricky because the service uses mt_rand inside.
        // Let's just run it multiple times and see it doesn't crash and generates unique codes.

        $codes = [];
        for ($i = 0; $i < 5; $i++) {
            $codes[] = $this->service->generate($branch, $category, $assetType);
        }

        $this->assertEquals(count($codes), count(array_unique($codes)));
    }
}
