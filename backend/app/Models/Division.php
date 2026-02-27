<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Division extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'is_active',
    ];

    /**
     * Relationships
     */

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    public function assets()
    {
        return $this->hasMany(Asset::class);
    }
}
