<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $table = 'sales';

    protected $fillable = [
        'id',
        'code',
        'warehouse_id',
        'customer_id',
        'total_amount',
        'document_type',
        'serie',
        'correlativo',
        'full_invoice_number',
        'taxable_base',
        'igv_amount',
        'sunat_status',
        'xml_path',
        'cdr_path',
        'creation_time',
    ];

    protected $casts = [
        'total_amount'  => 'float',
        'taxable_base'  => 'float',
        'igv_amount'    => 'float',
        'creation_time' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(SaleDetail::class);
    }
}
