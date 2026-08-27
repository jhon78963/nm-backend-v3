<?php

use App\Http\Controllers\InvoicingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — invoicing-service
|--------------------------------------------------------------------------
*/

Route::prefix('invoices')->group(function () {
    Route::post('/{sale}/issue', [InvoicingController::class, 'issue']);
    Route::post('/{sale}/send',  [InvoicingController::class, 'send']);
    Route::get('/{sale}/pdf',    [InvoicingController::class, 'pdf']);
    Route::get('/{sale}/qr',     [InvoicingController::class, 'qr']);
});

Route::prefix('lookup')->group(function () {
    Route::get('/dni/{dni}', [InvoicingController::class, 'lookupDni']);
    Route::get('/ruc/{ruc}', [InvoicingController::class, 'lookupRuc']);
});

Route::get('/health', fn () => response()->json([
    'status'  => 'ok',
    'service' => 'invoicing-service',
]));
