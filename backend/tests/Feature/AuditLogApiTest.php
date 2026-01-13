<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class AuditLogApiTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'super_admin']);
        $this->manager = User::factory()->create(['role' => 'branch_custodian']);
    }

    public function test_super_admin_can_list_audit_logs()
    {
        AuditLog::create([
            'user_id' => $this->manager->id,
            'action' => 'TEST_ACTION',
            'ip_address' => '127.0.0.1'
        ]);

        Sanctum::actingAs($this->admin);
        $response = $this->getJson('/api/audit-logs');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_branch_custodian_cannot_list_audit_logs()
    {
        Sanctum::actingAs($this->manager);
        $response = $this->getJson('/api/audit-logs');

        $response->assertStatus(403);
    }

    public function test_super_admin_can_filter_audit_logs()
    {
        AuditLog::create([
            'user_id' => $this->manager->id,
            'action' => 'CREATE',
        ]);
        AuditLog::create([
            'user_id' => $this->admin->id,
            'action' => 'DELETE',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/audit-logs?action=CREATE');
        $response->assertStatus(200)->assertJsonCount(1, 'data');

        $response = $this->getJson('/api/audit-logs?user_id=' . $this->admin->id);
        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }
}
