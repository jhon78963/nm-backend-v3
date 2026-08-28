<?php

namespace Tests\Support;

use App\Models\Customer;
use App\Models\DocumentSeries;
use App\Models\Sale;
use App\Models\SaleDetail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait CreatesInvoicingFixtures
{
    protected function warehouseId(): string
    {
        return (string) DB::table('warehouses')->value('id');
    }

    protected function userId(): string
    {
        return (string) DB::table('users')->value('id');
    }

    protected function createDocumentSeries(
        string $documentType = 'BOLETA',
        string $serie = 'B001',
        int $currentNumber = 0,
    ): DocumentSeries {
        return DocumentSeries::query()->create([
            'id'             => (string) Str::uuid(),
            'warehouse_id'   => $this->warehouseId(),
            'document_type'  => $documentType,
            'serie'          => $serie,
            'current_number' => $currentNumber,
        ]);
    }

    protected function createCustomer(
        string $documentType = 'DNI',
        string $documentNumber = '12345678',
        string $name = 'Cliente Prueba',
    ): Customer {
        return Customer::query()->create([
            'id'              => (string) Str::uuid(),
            'warehouse_id'    => $this->warehouseId(),
            'document_type'   => $documentType,
            'document_number' => $documentNumber,
            'name'            => $name,
            'is_deleted'      => false,
        ]);
    }

    protected function createSale(array $overrides = []): Sale
    {
        $sale = Sale::query()->create(array_merge([
            'id'             => (string) Str::uuid(),
            'code'           => 'TEST-'.Str::upper(Str::random(8)),
            'warehouse_id'   => $this->warehouseId(),
            'customer_id'    => null,
            'total_amount'   => 118.00,
            'payment_method' => 'CASH',
            'status'         => 'COMPLETED',
            'created_by_id'  => $this->userId(),
            'is_deleted'     => false,
            'creation_time'  => now(),
        ], $overrides));

        SaleDetail::query()->create([
            'id'                    => (string) Str::uuid(),
            'sale_id'               => $sale->id,
            'product_size_id'       => $this->productSizeId(),
            'color_id'              => $this->colorId(),
            'product_name_snapshot' => 'Producto Test',
            'size_snapshot'         => 'M',
            'color_snapshot'        => 'Negro',
            'quantity'              => 1,
            'unit_price'            => 118.00,
            'subtotal'              => 118.00,
        ]);

        return $sale->fresh(['details', 'customer']);
    }

    protected function createIssuedSale(array $overrides = []): Sale
    {
        $this->createDocumentSeries();

        $sale = $this->createSale($overrides);

        $sale->update([
            'document_type'       => 'BOLETA',
            'serie'               => 'B001',
            'correlativo'         => 1,
            'full_invoice_number' => 'B001-000001',
            'taxable_base'        => 100.00,
            'igv'                 => 18.00,
            'sunat_status'        => 'PENDING',
        ]);

        return $sale->fresh(['details', 'customer']);
    }

    private function productSizeId(): string
    {
        return (string) DB::table('product_size')->value('id');
    }

    private function colorId(): string
    {
        return (string) DB::table('colors')->value('id');
    }
}
