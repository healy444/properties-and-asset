<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Asset;
use App\Models\Branch;
use App\Models\Category;
use App\Models\AssetType;
use App\Models\Brand;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class AssetApiTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $manager;
    protected $branch;
    protected $category;
    protected $assetType;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->manager = User::factory()->create(['role' => 'branch_custodian']);

        $this->branch = Branch::factory()->create(['code' => 'HO']);
        $this->category = Category::factory()->create(['code' => 'IT']);
        $this->assetType = AssetType::factory()->create([
            'category_id' => $this->category->id,
            'code' => 'LT'
        ]);
    }

    public function test_manager_can_list_assets()
    {
        Sanctum::actingAs($this->manager);
        Asset::factory()->count(3)->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
        ]);

        $response = $this->getJson('/api/assets');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_manager_cannot_see_others_drafts()
    {
        $otherManager = User::factory()->create(['role' => 'branch_custodian']);

        // Active asset (visible to all)
        Asset::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'is_draft' => false,
            'created_by' => $otherManager->id,
        ]);

        // Draft asset by other manager (hidden)
        Asset::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'is_draft' => true,
            'created_by' => $otherManager->id,
        ]);

        // Draft asset by current manager (visible)
        Asset::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'is_draft' => true,
            'created_by' => $this->manager->id,
        ]);

        Sanctum::actingAs($this->manager);
        $response = $this->getJson('/api/assets');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data'); // 1 Active + 1 Own Draft
    }

    public function test_admin_can_see_all_drafts()
    {
        Asset::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'is_draft' => true,
            'created_by' => $this->manager->id,
        ]);

        Sanctum::actingAs($this->admin);
        $response = $this->getJson('/api/assets');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_manager_can_create_asset_as_draft()
    {
        Sanctum::actingAs($this->manager);

        $data = [
            'division_id' => $this->branch->division_id,
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'brand_id' => Brand::factory()->create()->id,
            'supplier_id' => Supplier::factory()->create()->id,
            'model_number' => 'MDL-123',
            'acquisition_cost' => 100000,
            'useful_life_months' => 24,
            'date_of_purchase' => '2025-01-01',
            'condition' => 'good',
            'is_draft' => true,
        ];

        $response = $this->postJson('/api/assets', $data);

        $response->assertStatus(201)
            ->assertJsonPath('asset.is_draft', true)
            ->assertJsonPath('asset.asset_code', null);
    }

    public function test_manager_can_create_active_asset_with_auto_code()
    {
        Sanctum::actingAs($this->manager);

        $data = [
            'division_id' => $this->branch->division_id,
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'brand_id' => Brand::factory()->create()->id,
            'supplier_id' => Supplier::factory()->create()->id,
            'model_number' => 'MDL-456',
            'acquisition_cost' => 100000,
            'useful_life_months' => 24,
            'date_of_purchase' => '2025-01-01',
            'condition' => 'good',
            'is_draft' => false,
        ];

        $response = $this->postJson('/api/assets', $data);

        $response->assertStatus(201)
            ->assertJsonPath('asset.is_draft', false);

        $assetCode = $response->json('asset.asset_code');
        $this->assertNotEmpty($assetCode);
        $this->assertStringContainsString('HO-IT-LT', $assetCode);

        // Verify Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'CREATE',
            'entity_type' => 'Asset',
        ]);
    }

    public function test_active_asset_update_restrictions()
    {
        Sanctum::actingAs($this->manager);

        $asset = Asset::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'is_draft' => false,
            'acquisition_cost' => 100000,
        ]);

        $updateData = [
            'acquisition_cost' => 200000, // Restricted
            'condition' => 'poor',       // Allowed (was 'damaged' which is not in enum)
            'remarks' => 'Dropped it',  // Allowed
        ];

        $response = $this->putJson("/api/assets/{$asset->id}", $updateData);

        $response->assertStatus(200);
        $asset->refresh();

        $this->assertEquals(100000, (float) $asset->acquisition_cost); // Should not change
        $this->assertEquals('poor', $asset->condition);           // Should change
        $this->assertEquals('Dropped it', $asset->remarks);          // Should change

        // Verify Audit Log diff
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'UPDATE',
            'entity_type' => 'Asset',
            'entity_id' => $asset->id,
        ]);
    }

    public function test_manager_can_request_deletion()
    {
        Sanctum::actingAs($this->manager);
        $asset = Asset::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
        ]);

        $response = $this->postJson("/api/assets/{$asset->id}/request-delete", [
            'reason' => 'Asset is broken beyond repair'
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('asset.delete_request_status', 'pending');
    }

    public function test_admin_can_approve_deletion()
    {
        $asset = Asset::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'delete_request_status' => 'pending'
        ]);

        Sanctum::actingAs($this->admin);
        $response = $this->postJson("/api/assets/{$asset->id}/approve-delete");

        $response->assertStatus(200);
        $this->assertSoftDeleted('assets', ['id' => $asset->id]);
    }

    public function test_manager_cannot_approve_deletion()
    {
        $asset = Asset::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'delete_request_status' => 'pending'
        ]);

        Sanctum::actingAs($this->manager);
        $response = $this->postJson("/api/assets/{$asset->id}/approve-delete");

        $response->assertStatus(403);
    }

    public function test_manager_can_finalize_draft()
    {
        Sanctum::actingAs($this->manager);

        $asset = Asset::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
            'is_draft' => true,
            'created_by' => $this->manager->id,
        ]);

        $response = $this->postJson("/api/assets/{$asset->id}/finalize-draft");

        $response->assertStatus(200)
            ->assertJsonPath('asset.is_draft', false);

        $this->assertNotEmpty($response->json('asset.asset_code'));
    }

    public function test_admin_can_export_assets()
    {
        Sanctum::actingAs($this->admin);

        Asset::factory()->count(2)->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'asset_type_id' => $this->assetType->id,
        ]);

        $response = $this->get("/api/assets/export?format=csv");

        $response->assertStatus(200);
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
    }
}
