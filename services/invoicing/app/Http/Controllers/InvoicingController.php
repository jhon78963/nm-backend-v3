<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Services\ElectronicDocumentService;
use App\Services\SunatQrService;
use App\Services\SunatService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvoicingController extends Controller
{
    public function __construct(
        private readonly ElectronicDocumentService $electronicDocumentService,
        private readonly SunatQrService            $sunatQrService,
        private readonly SunatService              $sunatService,
    ) {}

    /**
     * POST /api/invoices/{sale}/issue
     * Reserva correlativo y calcula IGV. Debe llamarse dentro de la TX de la venta.
     */
    public function issue(Request $request, Sale $sale): JsonResponse
    {
        $request->validate([
            'document_type' => ['required', 'string', 'in:FACTURA,BOLETA,TICKET_INTERNO'],
            'serie'         => ['required', 'string', 'max:4'],
        ]);

        $this->electronicDocumentService->issueDocument(
            $sale,
            $request->string('document_type')->value(),
            $request->string('serie')->value(),
        );

        return response()->json([
            'success'            => true,
            'full_invoice_number'=> $sale->full_invoice_number,
            'sunat_status'       => $sale->sunat_status,
        ]);
    }

    /**
     * POST /api/invoices/{sale}/send
     * Firma el XML, lo envía a SUNAT y persiste CDR. Llamar FUERA de la TX de venta.
     */
    public function send(Sale $sale): JsonResponse
    {
        $this->electronicDocumentService->sendDocument($sale);

        return response()->json([
            'success'      => true,
            'sunat_status' => $sale->sunat_status,
            'xml_path'     => $sale->xml_path,
            'cdr_path'     => $sale->cdr_path,
        ]);
    }

    /**
     * GET /api/invoices/{sale}/pdf
     * Genera el PDF del comprobante con DomPDF.
     */
    public function pdf(Sale $sale): Response
    {
        $sale->loadMissing(['details', 'customer']);

        $qrSvg   = $this->sunatQrService->generateQrSvg($sale);
        $xmlHash = $this->sunatQrService->getXmlHash($sale);

        $pdf = Pdf::loadView('sale.invoice-pdf', compact('sale', 'qrSvg', 'xmlHash'))
            ->setPaper('a4', 'portrait');

        $filename = ($sale->full_invoice_number ?? $sale->code) . '.pdf';

        return $pdf->download($filename);
    }

    /**
     * GET /api/invoices/{sale}/qr
     * Devuelve el QR SUNAT en formato SVG base64.
     */
    public function qr(Sale $sale): JsonResponse
    {
        $qr = $this->sunatQrService->generateQrSvg($sale);

        return response()->json(['qr' => $qr]);
    }

    /**
     * GET /api/lookup/dni/{dni}
     * Consulta datos de un DNI mediante apis.net.pe.
     */
    public function lookupDni(string $dni): JsonResponse
    {
        try {
            $data = $this->sunatService->dniConsultation($dni);
            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * GET /api/lookup/ruc/{ruc}
     * Consulta datos de un RUC mediante apis.net.pe.
     */
    public function lookupRuc(string $ruc): JsonResponse
    {
        try {
            $data = $this->sunatService->rucConsultation($ruc);
            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }
}
