<?php

use App\Services\SunatService;

it('consulta DNI y devuelve datos del servicio externo', function () {
    $this->mock(SunatService::class, function ($mock) {
        $mock->shouldReceive('dniConsultation')
            ->once()
            ->with('12345678')
            ->andReturn((object) [
                'nombres'         => 'JUAN',
                'apellidoPaterno' => 'PEREZ',
                'apellidoMaterno' => 'GARCIA',
            ]);
    });

    $this->getJson('/api/lookup/dni/12345678')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.nombres', 'JUAN');
});

it('consulta RUC y devuelve datos del servicio externo', function () {
    $this->mock(SunatService::class, function ($mock) {
        $mock->shouldReceive('rucConsultation')
            ->once()
            ->with('20123456789')
            ->andReturn((object) [
                'razonSocial' => 'EMPRESA DE PRUEBA SAC',
                'ruc'         => '20123456789',
            ]);
    });

    $this->getJson('/api/lookup/ruc/20123456789')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.razonSocial', 'EMPRESA DE PRUEBA SAC');
});

it('devuelve 422 cuando la consulta DNI falla', function () {
    $this->mock(SunatService::class, function ($mock) {
        $mock->shouldReceive('dniConsultation')
            ->once()
            ->andThrow(new Exception('DOC_NOT_FOUND'));
    });

    $this->getJson('/api/lookup/dni/00000000')
        ->assertStatus(422)
        ->assertJsonPath('success', false);
});
