<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

/**
 * @property int $id
 * @property string|null $asset_code
 * @property int|null $division_id
 * @property int $branch_id
 * @property int $category_id
 * @property int $asset_type_id
 * @property float $acquisition_cost
 * @property int $useful_life_months
 * @property float $monthly_depreciation
 * @property string $delete_request_status
 * @property string|null $delete_request_reason
 * @property bool $is_draft
 */
class Asset extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'asset_code',
        'division_id',
        'branch_id',
        'category_id',
        'asset_type_id',
        'brand_id',
        'supplier_id',
        'model_number',
        'serial_number',
        'date_of_purchase',
        'acquisition_cost',
        'useful_life_months',
        'monthly_depreciation',
        'condition',
        'asset_status',
        'remarks',
        'assigned_to',
        'is_draft',
        'submitted_for_review_at',
        'created_by',
        'delete_request_status',
        'delete_requested_by',
        'delete_requested_at',
        'delete_request_reason',
        'delete_approved_by',
        'delete_approved_at',
        'pre_delete_asset_status',
    ];

    protected $appends = [
        'accumulated_depreciation',
        'book_value',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_purchase' => 'date',
            'acquisition_cost' => 'decimal:2',
            'monthly_depreciation' => 'decimal:2',
            'is_draft' => 'boolean',
            'submitted_for_review_at' => 'datetime',
            'delete_requested_at' => 'datetime',
            'delete_approved_at' => 'datetime',
        ];
    }

    /**
     * Mutators - Convert to uppercase
     */

    protected function setModelNumberAttribute($value): void
    {
        $this->attributes['model_number'] = $value ? strtoupper($value) : null;
    }

    protected function setAssignedToAttribute($value): void
    {
        $this->attributes['assigned_to'] = $value ? strtoupper($value) : null;
    }

    /**
     * Relationships
     */

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function division()
    {
        return $this->belongsTo(Division::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function assetType()
    {
        return $this->belongsTo(AssetType::class)->withTrashed();
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deleteRequester()
    {
        return $this->belongsTo(User::class, 'delete_requested_by');
    }

    public function deleteApprover()
    {
        return $this->belongsTo(User::class, 'delete_approved_by');
    }

    /**
     * Scopes
     */

    public function scopeActive($query)
    {
        return $query->where('is_draft', false)->where('asset_status', 'active');
    }

    public function scopeDraft($query)
    {
        return $query->where('is_draft', true);
    }

    public function scopePendingDeletion($query)
    {
        return $query->where('delete_request_status', 'pending');
    }

    /**
     * Calculated fields
     */

    public function getAccumulatedDepreciationAttribute(): ?float
    {
        if (!$this->date_of_purchase || $this->monthly_depreciation === null || $this->useful_life_months === null) {
            return null;
        }

        $purchaseDate = $this->date_of_purchase instanceof Carbon
            ? $this->date_of_purchase
            : Carbon::parse($this->date_of_purchase);

        $asOf = now();
        // Full months only: subtract one if current day hasn't reached purchase day.
        $monthsElapsed = ($asOf->year - $purchaseDate->year) * 12 + ($asOf->month - $purchaseDate->month);
        if ($asOf->day < $purchaseDate->day) {
            $monthsElapsed -= 1;
        }
        $monthsElapsed = max($monthsElapsed, 0);

        $cappedMonths = min($monthsElapsed, (int) $this->useful_life_months);

        return round($cappedMonths * (float) $this->monthly_depreciation, 2);
    }

    public function getBookValueAttribute(): ?float
    {
        if ($this->acquisition_cost === null) {
            return null;
        }

        $accumulated = $this->accumulated_depreciation;
        if ($accumulated === null) {
            return null;
        }

        $value = (float) $this->acquisition_cost - (float) $accumulated;
        return round(max($value, 0), 2);
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('draft_visibility', function ($builder) {
            if (auth()->check()) {
                $user = auth()->user();
                $builder->where(function ($query) use ($user) {
                    $query->where('is_draft', false)
                        ->orWhere(function ($q) use ($user) {
                            $q->where('is_draft', true)
                                ->where(function ($dq) use ($user) {
                                    $dq->where('created_by', $user->id);
                                    if (in_array($user->role, ['admin', 'super_admin'])) {
                                        $dq->orWhereNotNull('submitted_for_review_at');
                                    }
                                });
                        });
                });
            } else {
                // Unauthenticated (shouldn't happen for API routes) see nothing or only active?
                // For safety, only active.
                $builder->where('is_draft', false);
            }
        });
    }

    /**
     * Helper Methods
     */

    public function isDraft(): bool
    {
        return (bool) $this->is_draft;
    }

    public function isActive(): bool
    {
        return !$this->isDraft();
    }

    public function hasPendingDeletionRequest(): bool
    {
        return $this->delete_request_status === 'pending';
    }
}
