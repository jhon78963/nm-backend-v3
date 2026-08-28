<?php

use App\Models\Sale;
use Tests\Support\CreatesInvoicingFixtures;

uses(CreatesInvoicingFixtures::class);

it('emite boleta reservando correlativo y calculando IGV', function () {
    $this->createDocumentSeries('BOLETA', 'B001', 0);
    $sale = $this->createSale();

    $this->postJson("/api/invoices/{$sale->id}/issue", [
        'document_type' => 'BOLETA',
        'serie'         => 'B001',
    ])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('sunat_status', 'PENDING')
        ->assertJsonPath('full_invoice_number', 'B001-000001');

    $sale->refresh();

    expect($sale->document_type)->toBe('BOLETA')
        ->and($sale->serie)->toBe('B001')
        ->and($sale->correlativo)->toBe(1)
        ->and((float) $sale->taxable_base)->toBe(100.0)
        ->and((float) $sale->igv_amount)->toBe(18.0);
});

it('rechaza factura sin cliente con RUC', function () {
    $this->createDocumentSeries('FACTURA', 'F001', 0);
    $sale = $this->createSale();

    $this->postJson("/api/invoices/{$sale->id}/issue", [
        'document_type' => 'FACTURA',
        'serie'         => 'F001',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['document_type']);
});

it('emite factura cuando el cliente tiene RUC válido', function () {
    $this->createDocumentSeries('FACTURA', 'F001', 0);
    $customer = $this->createCustomer('RUC', '20123456789', 'EMPRESA SAC');
    $sale = $this->createSale(['customer_id' => $customer->id]);

    $this->postJson("/api/invoices/{$sale->id}/issue", [
        'document_type' => 'FACTURA',
        'serie'         => 'F001',
    ])
        ->assertOk()
        ->assertJsonPath('full_invoice_number', 'F001-000001')
        ->assertJsonPath('sunat_status', 'PENDING');
});

it('valida campos requeridos al emitir', function () {
    $sale = $this->createSale();

    $this->postJson("/api/invoices/{$sale->id}/issue", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['document_type', 'serie']);
});

it('devuelve 404 si la venta no existe', function () {
    $this->postJson('/api/invoices/00000000-0000-4000-8000-000000000000/issue', [
        'document_type' => 'BOLETA',
        'serie'         => 'B001',
    ])->assertNotFound();
});
