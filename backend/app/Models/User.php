<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Branch;
use App\Models\Division;

/**
 * @property int $id
 * @property string $role
 */
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'last_name',
        'first_name',
        'middle_name',
        'suffix',
        'date_of_birth',
        'username',
        'role',
        'division_id',
        'branch',
        'email',
        'password',
        'is_active',
        'profile_photo_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_of_birth' => 'date',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Relationships
     */

    public function createdAssets()
    {
        return $this->hasMany(Asset::class, 'created_by');
    }

    public function deleteRequestedAssets()
    {
        return $this->hasMany(Asset::class, 'delete_requested_by');
    }

    public function deleteApprovedAssets()
    {
        return $this->hasMany(Asset::class, 'delete_approved_by');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'user_id');
    }

    /**
     * Helper Methods
     */

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['super_admin', 'admin']);
    }

    public function isBranchCustodian(): bool
    {
        return $this->role === 'branch_custodian';
    }

    public function getFullNameAttribute(): string
    {
        $name = trim("{$this->first_name} {$this->middle_name} {$this->last_name}");
        return $this->suffix ? "{$name} {$this->suffix}" : $name;
    }

    public function getBranchId(): ?int
    {
        if (!$this->branch) {
            return null;
        }

        static $branchIdCache = [];
        if (array_key_exists($this->branch, $branchIdCache)) {
            return $branchIdCache[$this->branch];
        }

        $branchIdCache[$this->branch] = Branch::where('name', $this->branch)->value('id');

        return $branchIdCache[$this->branch];
    }

    public function getDivisionId(): ?int
    {
        if ($this->division_id) {
            return (int) $this->division_id;
        }

        $branchId = $this->getBranchId();
        if (!$branchId) {
            return null;
        }

        return Branch::where('id', $branchId)->value('division_id');
    }

    public function division()
    {
        return $this->belongsTo(Division::class);
    }
}
