<?php

use Tests\Support\CreatesInvoicingFixtures;

uses(CreatesInvoicingFixtures::class);

it('genera QR SVG para una boleta emitida', function () {
    $sale = $this->createIssuedSale();

    $response = $this->getJson("/api/invoices/{$sale->id}/qr");

    $response->assertOk()
        ->assertJsonStructure(['qr']);

    expect($response->json('qr'))->toBeString()->not->toBeEmpty();
});

it('devuelve 404 al solicitar QR de venta inexistente', function () {
    $this->getJson('/api/invoices/00000000-0000-4000-8000-000000000000/qr')
        ->assertNotFound();
});

it('descarga PDF para una boleta emitida', function () {
    $sale = $this->createIssuedSale();

    $this->get("/api/invoices/{$sale->id}/pdf")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
});
