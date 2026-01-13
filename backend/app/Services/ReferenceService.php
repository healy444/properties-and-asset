<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use App\Models\Branch;
use App\Models\Category;
use App\Models\AssetType;
use App\Models\Brand;
use App\Models\Supplier;
use App\Services\AuditLogService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ReferenceService
{
    protected $auditLogService;

    public function __construct(AuditLogService $auditLogService)
    {
        $this->auditLogService = $auditLogService;
    }

    /**
     * Map type string to Model class.
     */
    public function getModelClass(string $type): string
    {
        return match ($type) {
            'branches' => Branch::class,
            'categories' => Category::class,
            'asset-types' => AssetType::class,
            'brands' => Brand::class,
            'suppliers' => Supplier::class,
            default => throw new Exception("Invalid reference type: {$type}"),
        };
    }

    /**
     * Get all records for a type.
     */
    public function getAll(string $type, bool $onlyActive = false)
    {
        $cacheKey = "references_{$type}_" . ($onlyActive ? 'active' : 'all');

        return Cache::remember($cacheKey, 30, function () use ($type, $onlyActive) {
            $class = $this->getModelClass($type);
            $query = $class::query();

            if ($onlyActive) {
                $query->where('is_active', true);
            }

            // Sorting
            $query->orderBy('name');

            // Special handling for relationships
            if ($type === 'asset-types') {
                $query->with('category');
            } elseif ($type === 'branches') {
                $query->with('parent');
            }

            return $query->get();
        });
    }

    /**
     * Create a new reference record.
     */
    public function create(string $type, array $data): Model
    {
        $data = $this->normalizeReferenceData($type, $data);
        return DB::transaction(function () use ($type, $data) {
            $class = $this->getModelClass($type);
            $record = $class::create($data);
            $this->clearCache($type);

            $this->auditLogService->log(
                'CREATE',
                ucfirst(str_replace('-', ' ', $type)),
                $record->id,
                null,
                $record->toArray()
            );

            return $record;
        });
    }

    /**
     * Update an existing reference record.
     */
    public function update(string $type, int $id, array $data): Model
    {
        $data = $this->normalizeReferenceData($type, $data);
        return DB::transaction(function () use ($type, $id, $data) {
            $class = $this->getModelClass($type);
            $record = $class::findOrFail($id);
            $oldValues = $record->toArray();

            $record->update($data);
            $this->clearCache($type);

            $this->auditLogService->log(
                'UPDATE',
                ucfirst(str_replace('-', ' ', $type)),
                $record->id,
                $oldValues,
                $record->fresh()->toArray()
            );

            return $record;
        });
    }

    /**
     * Toggle active status.
     */
    public function toggleStatus(string $type, int $id): Model
    {
        return DB::transaction(function () use ($type, $id) {
            $class = $this->getModelClass($type);
            $record = $class::findOrFail($id);
            $oldValues = $record->toArray();

            $record->update(['is_active' => !$record->is_active]);
            $this->clearCache($type);

            $this->auditLogService->log(
                $record->is_active ? 'ACTIVATE' : 'DEACTIVATE',
                ucfirst(str_replace('-', ' ', $type)),
                $record->id,
                $oldValues,
                $record->fresh()->toArray()
            );

            return $record;
        });
    }

    /**
     * Clear cache for a type.
     */
    protected function clearCache(string $type): void
    {
        Cache::forget("references_{$type}_active");
        Cache::forget("references_{$type}_all");
    }

    /**
     * Normalize input data for consistency.
     */
    protected function normalizeReferenceData(string $type, array $data): array
    {
        if (isset($data['name']) && in_array($type, ['branches', 'categories', 'asset-types'])) {
            $name = trim(preg_replace('/\s+/', ' ', $data['name']));
            $data['name'] = ucwords(strtolower($name));
        }

        return $data;
    }
}
