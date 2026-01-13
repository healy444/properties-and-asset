<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogService;

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
            $user = User::create([
                'last_name' => $data['last_name'],
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'suffix' => $data['suffix'] ?? null,
                'username' => $data['username'],
                'email' => $data['email'],
                'role' => $data['role'],
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
}
