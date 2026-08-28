<?php

use Tests\Support\CreatesInvoicingFixtures;

uses(CreatesInvoicingFixtures::class);

it('responde ok en el health check', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertJson([
            'status'  => 'ok',
            'service' => 'invoicing-service',
        ]);
});

it('responde ok en el endpoint up de Laravel', function () {
    $this->get('/up')->assertOk();
});
