<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'division_id',
        'parent_id',
        'code',
        'name',
        'is_active',
    ];

    /**
     * Relationships
     */

    public function parent()
    {
        return $this->belongsTo(Branch::class, 'parent_id');
    }

    public function division()
    {
        return $this->belongsTo(Division::class);
    }

    public function children()
    {
        return $this->hasMany(Branch::class, 'parent_id');
    }

    public function assets()
    {
        return $this->hasMany(Asset::class);
    }

    /**
     * Helper Methods
     */

    public function isRoot(): bool
    {
        return $this->parent_id === null;
    }

    public function hasChildren(): bool
    {
        return $this->children()->count() > 0;
    }
}
