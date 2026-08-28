<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public const CREATED_AT = 'creation_time';

    public const UPDATED_AT = null;

    protected $table = 'sales';

    protected $fillable = [
        'id',
        'code',
        'warehouse_id',
        'customer_id',
        'total_amount',
        'payment_method',
        'status',
        'document_type',
        'serie',
        'correlativo',
        'full_invoice_number',
        'taxable_base',
        'igv',
        'sunat_status',
        'xml_path',
        'cdr_path',
        'created_by_id',
        'is_deleted',
        'creation_time',
    ];

    protected $casts = [
        'total_amount'  => 'float',
        'taxable_base'  => 'float',
        'igv'           => 'float',
        'creation_time' => 'datetime',
        'is_deleted'    => 'boolean',
    ];

    public function getIgvAmountAttribute(): ?float
    {
        return isset($this->attributes['igv']) ? (float) $this->attributes['igv'] : null;
    }

    public function setIgvAmountAttribute(float $value): void
    {
        $this->attributes['igv'] = $value;
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(SaleDetail::class);
    }
}
