<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentSeries extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public const CREATED_AT = null;

    public const UPDATED_AT = null;

    protected $table = 'document_series';

    protected $fillable = [
        'id',
        'warehouse_id',
        'document_type',
        'serie',
        'current_number',
    ];

    protected $casts = [
        'current_number' => 'integer',
    ];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
}
