<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use App\Models\Branch;
use App\Models\Category;
use App\Models\AssetType;
use App\Models\Brand;
use App\Models\Supplier;
use App\Models\Division;
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
            'divisions' => Division::class,
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
                $query->with(['parent', 'division']);
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
        if ($this->shouldAutoGenerateCode($type, $data)) {
            $data['code'] = $this->generateReferenceCode($type, $data['name'] ?? '');
        }
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
        if (isset($data['name']) && in_array($type, ['divisions', 'branches', 'categories', 'asset-types'])) {
            $name = trim(preg_replace('/\s+/', ' ', $data['name']));
            $data['name'] = ucwords(strtolower($name));
        }

        if (array_key_exists('code', $data)) {
            $code = trim((string) $data['code']);
            if ($code === '') {
                unset($data['code']);
            } else {
                $data['code'] = strtoupper($code);
            }
        }

        return $data;
    }

    protected function shouldAutoGenerateCode(string $type, array $data): bool
    {
        return in_array($type, ['divisions', 'branches', 'categories'], true)
            && (!array_key_exists('code', $data) || $data['code'] === null);
    }

    protected function generateReferenceCode(string $type, string $name): string
    {
        $length = $type === 'categories' ? 3 : 2;
        $class = $this->getModelClass($type);
        $existing = $class::query()
            ->pluck('code')
            ->filter()
            ->map(fn ($code) => strtoupper((string) $code))
            ->all();
        $existingLookup = array_fill_keys($existing, true);

        $candidates = $this->buildCodeCandidates($name, $length);
        foreach ($candidates as $candidate) {
            if (!isset($existingLookup[$candidate])) {
                return $candidate;
            }
        }

        $alphabet = range('A', 'Z');
        if ($length === 2) {
            foreach ($alphabet as $a) {
                foreach ($alphabet as $b) {
                    $candidate = $a . $b;
                    if (!isset($existingLookup[$candidate])) {
                        return $candidate;
                    }
                }
            }
        }

        foreach ($alphabet as $a) {
            foreach ($alphabet as $b) {
                foreach ($alphabet as $c) {
                    $candidate = $a . $b . $c;
                    if (!isset($existingLookup[$candidate])) {
                        return $candidate;
                    }
                }
            }
        }

        throw new Exception('Unable to generate a unique reference code.');
    }

    protected function buildCodeCandidates(string $name, int $length): array
    {
        $clean = preg_replace('/[^A-Za-z ]+/', ' ', $name);
        $clean = trim(preg_replace('/\s+/', ' ', $clean ?? ''));
        $words = $clean === '' ? [] : explode(' ', $clean);
        $letters = strtoupper(preg_replace('/[^A-Za-z]/', '', $clean));

        $initials = '';
        foreach ($words as $word) {
            $word = preg_replace('/[^A-Za-z]/', '', $word);
            if ($word !== '') {
                $initials .= strtoupper($word[0]);
            }
        }

        $consonants = preg_replace('/[AEIOU]/', '', $letters);
        $candidates = [];
        $seen = [];
        $add = function (?string $candidate) use (&$candidates, &$seen, $length): void {
            if (!$candidate || strlen($candidate) !== $length) {
                return;
            }
            if (isset($seen[$candidate])) {
                return;
            }
            $seen[$candidate] = true;
            $candidates[] = $candidate;
        };

        $add(strlen($initials) >= $length ? substr($initials, 0, $length) : null);
        $add(strlen($consonants) >= $length ? substr($consonants, 0, $length) : null);

        if ($length === 2 && strlen($letters) >= 2) {
            $add($letters[0] . $letters[strlen($letters) - 1]);
        }

        if ($length === 3 && strlen($letters) >= 2) {
            $middle = '';
            if (strlen($consonants) >= 1) {
                $middle = $consonants[0];
            } elseif (strlen($letters) >= 2) {
                $middle = $letters[1];
            }
            if ($middle !== '') {
                $add($letters[0] . $middle . $letters[strlen($letters) - 1]);
            }
        }

        foreach ([$initials, $consonants] as $base) {
            $baseLen = strlen($base);
            for ($i = 0; $i <= $baseLen - $length; $i++) {
                $add(substr($base, $i, $length));
            }
        }

        $lettersLen = strlen($letters);
        $limit = 200;
        $count = 0;
        if ($length === 2 && $lettersLen >= 2) {
            for ($i = 0; $i < $lettersLen - 1; $i++) {
                for ($j = $i + 1; $j < $lettersLen; $j++) {
                    $add($letters[$i] . $letters[$j]);
                    $count++;
                    if ($count >= $limit) {
                        break 2;
                    }
                }
            }
        }

        if ($length === 3 && $lettersLen >= 3) {
            for ($i = 0; $i < $lettersLen - 2; $i++) {
                for ($j = $i + 1; $j < $lettersLen - 1; $j++) {
                    for ($k = $j + 1; $k < $lettersLen; $k++) {
                        $add($letters[$i] . $letters[$j] . $letters[$k]);
                        $count++;
                        if ($count >= $limit) {
                            break 3;
                        }
                    }
                }
            }
        }

        return $candidates;
    }
}
