<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleDetail extends Model
{
    protected $table = 'sale_details';

    protected $fillable = [
        'id',
        'sale_id',
        'product_id',
        'product_name_snapshot',
        'sku_snapshot',
        'size_name_snapshot',
        'color_name_snapshot',
        'quantity',
        'unit_price',
    ];

    protected $casts = [
        'quantity'   => 'float',
        'unit_price' => 'float',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
