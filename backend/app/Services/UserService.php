<?php

namespace App\Services;

use App\Models\User;
use App\Models\Branch;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogService;
use Illuminate\Validation\ValidationException;

class UserService
{
    protected $auditLogService;

    public function __construct(AuditLogService $auditLogService)
    {
        $this->auditLogService = $auditLogService;
    }

    /**
     * Create a new user.
     */
    public function createUser(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $this->validateBranchDivision($data);

            $user = User::create([
                'last_name' => $data['last_name'],
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'suffix' => $data['suffix'] ?? null,
                'username' => $data['username'],
                'email' => $data['email'],
                'role' => $data['role'],
                'division_id' => $data['division_id'] ?? null,
                'branch' => $data['branch'] ?? null,
                'password' => Hash::make($data['password']),
                'is_active' => true,
            ]);

            $this->auditLogService->log('CREATE', 'User', $user->id, null, $user->toArray());

            return $user;
        });
    }

    /**
     * Update an existing user.
     */
    public function updateUser(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            $oldValues = $user->toArray();

            $this->validateBranchDivision([
                'division_id' => $data['division_id'] ?? $user->division_id,
                'branch' => $data['branch'] ?? $user->branch,
                'role' => $data['role'] ?? $user->role,
            ]);

            $user->update($data);

            $newValues = $user->fresh()->toArray();

            $this->auditLogService->logUserUpdate($user, $oldValues, $newValues);

            return $user;
        });
    }

    /**
     * Reset a user's password.
     */
    public function resetPassword(User $user, string $newPassword): User
    {
        return DB::transaction(function () use ($user, $newPassword) {
            $user->update([
                'password' => Hash::make($newPassword)
            ]);

            $this->auditLogService->log('RESET_PASSWORD', 'User', $user->id, null, null, ['target_username' => $user->username]);

            return $user;
        });
    }

    /**
     * Toggle user active status.
     */
    public function toggleStatus(User $user): User
    {
        return DB::transaction(function () use ($user) {
            $user->update([
                'is_active' => !$user->is_active
            ]);

            $action = $user->is_active ? 'ACTIVATE' : 'DEACTIVATE';
            $this->auditLogService->log($action, 'User', $user->id);

            return $user;
        });
    }

    private function validateBranchDivision(array $data): void
    {
        $role = $data['role'] ?? null;
        $branchName = $data['branch'] ?? null;
        $divisionId = $data['division_id'] ?? null;

        if (!$branchName) {
            throw ValidationException::withMessages(['branch' => 'Branch is required.']);
        }

        $branch = Branch::where('name', $branchName)->first();
        if (!$branch) {
            throw ValidationException::withMessages(['branch' => 'Branch not found.']);
        }

        if ($divisionId && $branch->division_id && (int) $branch->division_id !== (int) $divisionId) {
            throw ValidationException::withMessages(['division_id' => 'Branch does not belong to the selected division.']);
        }
    }
}
