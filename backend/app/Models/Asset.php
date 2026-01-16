<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

/**
 * @property int $id
 * @property string|null $asset_code
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
        'remarks',
        'assigned_to',
        'is_draft',
        'created_by',
        'delete_request_status',
        'delete_requested_by',
        'delete_requested_at',
        'delete_request_reason',
        'delete_approved_by',
        'delete_approved_at',
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
        return $query->where('is_draft', false);
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
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('draft_visibility', function ($builder) {
            if (auth()->check()) {
                $user = auth()->user();
                // Admins see all. Managers see all active + their own drafts.
                if (!in_array($user->role, ['admin', 'super_admin'])) {
                    $builder->where(function ($query) use ($user) {
                        $query->where('is_draft', false)
                            ->orWhere(function ($q) use ($user) {
                                $q->where('is_draft', true)
                                    ->where('created_by', $user->id);
                            });
                    });
                }
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
