<?php

use App\Models\Sale;
use App\Services\ElectronicDocumentService;
use Tests\Support\CreatesInvoicingFixtures;

uses(CreatesInvoicingFixtures::class);

it('envía comprobante pendiente delegando al servicio fiscal', function () {
    $sale = $this->createIssuedSale();

    $this->mock(ElectronicDocumentService::class, function ($mock) use ($sale) {
        $mock->shouldReceive('sendDocument')
            ->once()
            ->withArgs(function (Sale $passedSale) use ($sale) {
                return $passedSale->id === $sale->id;
            });
    });

    $this->postJson("/api/invoices/{$sale->id}/send")
        ->assertOk()
        ->assertJsonPath('success', true);
});

it('devuelve 404 al enviar una venta inexistente', function () {
    $this->postJson('/api/invoices/00000000-0000-4000-8000-000000000000/send')
        ->assertNotFound();
});
