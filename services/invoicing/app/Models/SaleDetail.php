<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleDetail extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public const CREATED_AT = null;

    public const UPDATED_AT = null;

    protected $table = 'sale_details';

    protected $fillable = [
        'id',
        'sale_id',
        'product_size_id',
        'color_id',
        'product_name_snapshot',
        'size_snapshot',
        'color_snapshot',
        'quantity',
        'unit_price',
        'subtotal',
    ];

    protected $casts = [
        'quantity'   => 'integer',
        'unit_price' => 'float',
        'subtotal'   => 'float',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
