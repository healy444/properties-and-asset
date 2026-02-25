<?php

namespace App\Http\Controllers;

use App\Services\ReferenceService;
use App\Http\Requests\ReferenceRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\ReferenceImport;
use App\Exports\ReferenceImportTemplateExport;
use App\Services\AuditLogService;
use Exception;

class ReferenceController extends Controller
{
    protected $referenceService;
    protected $auditLogService;

    public function __construct(ReferenceService $referenceService, AuditLogService $auditLogService)
    {
        $this->referenceService = $referenceService;
        $this->auditLogService = $auditLogService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(string $type, Request $request)
    {
        try {
            $onlyActive = $request->boolean('active', false);
            $data = $this->referenceService->getAll($type, $onlyActive);
            return response()->json($data);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(string $type, ReferenceRequest $request)
    {
        try {
            $record = $this->referenceService->create($type, $request->validated());
            return response()->json($record, 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(string $type, int $id, ReferenceRequest $request)
    {
        try {
            $record = $this->referenceService->update($type, $id, $request->validated());
            return response()->json($record);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Toggle status.
     */
    public function toggleStatus(string $type, int $id)
    {
        try {
            $record = $this->referenceService->toggleStatus($type, $id);
            return response()->json($record);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Import reference data for a type.
     */
    public function import(string $type, Request $request)
    {
        try {
            $this->referenceService->getModelClass($type);
            $request->validate([
                'file' => 'required|file|mimes:csv,xlsx,xls',
            ]);

            DB::transaction(function () use ($type, $request) {
                Excel::import(new ReferenceImport($this->referenceService, $type), $request->file('file'));
            });

            $this->auditLogService->logImport('references', [
                'reference_type' => $type,
                'filename' => $request->file('file')?->getClientOriginalName(),
            ]);

            return response()->json(['message' => 'Reference data imported successfully']);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Download reference import template for a type.
     */
    public function importTemplate(string $type, Request $request)
    {
        try {
            $this->referenceService->getModelClass($type);
            $format = $request->input('format', 'csv');
            if (!in_array($format, ['csv', 'xlsx'], true)) {
                return response()->json(['error' => 'Invalid format'], 422);
            }

            $filename = "{$type}_import_template_" . now()->format('Ymd_His') . ".{$format}";

            return Excel::download(new ReferenceImportTemplateExport($type), $filename);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

}
