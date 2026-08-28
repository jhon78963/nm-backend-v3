<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public const CREATED_AT = null;

    public const UPDATED_AT = null;

    protected $table = 'customers';

    protected $fillable = [
        'id',
        'document_type',
        'document_number',
        'name',
        'warehouse_id',
        'is_deleted',
    ];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];
}
