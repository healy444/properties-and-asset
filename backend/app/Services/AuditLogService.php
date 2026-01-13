<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    /**
     * Log a generic action.
     */
    public function log(
        string $action,
        ?string $entityType = null,
        ?string $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null
    ): AuditLog {
        return AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => $metadata,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }

    /**
     * Log an asset update with diffs.
     */
    public function logAssetUpdate(Model $asset, array $oldValues, array $newValues): AuditLog
    {
        $diffOld = [];
        $diffNew = [];

        foreach ($newValues as $key => $value) {
            // Ignore timestamps and internal fields for diff
            if (in_array($key, ['created_at', 'updated_at', 'deleted_at']))
                continue;

            if (array_key_exists($key, $oldValues) && $oldValues[$key] != $value) {
                $diffOld[$key] = $oldValues[$key];
                $diffNew[$key] = $value;
            }
        }

        return $this->log(
            'UPDATE',
            'Asset',
            $asset->id,
            $diffOld,
            $diffNew
        );
    }

    /**
     * Log a user update with diffs.
     */
    public function logUserUpdate(Model $user, array $oldValues, array $newValues): AuditLog
    {
        $diffOld = [];
        $diffNew = [];

        foreach ($newValues as $key => $value) {
            // Ignore timestamps and internal fields for diff
            if (in_array($key, ['created_at', 'updated_at', 'deleted_at', 'password', 'remember_token']))
                continue;

            if (array_key_exists($key, $oldValues) && $oldValues[$key] != $value) {
                $diffOld[$key] = $oldValues[$key];
                $diffNew[$key] = $value;
            }
        }

        return $this->log(
            'UPDATE',
            'User',
            $user->id,
            $diffOld,
            $diffNew
        );
    }

    /**
     * Log export actions.
     */
    public function logExport(string $type, array $filters = []): AuditLog
    {
        return $this->log(
            'EXPORT',
            null,
            null,
            null,
            null,
            [
                'export_type' => $type,
                'filters' => $filters
            ]
        );
    }

    /**
     * Log security events (login/logout).
     */
    public function logSecurity(string $action, ?int $userId = null): AuditLog
    {
        return AuditLog::create([
            'user_id' => $userId ?? Auth::id(),
            'action' => $action,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }
}
