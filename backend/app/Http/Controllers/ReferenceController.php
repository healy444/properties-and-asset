<?php

namespace App\Http\Controllers;

use App\Services\ReferenceService;
use App\Http\Requests\ReferenceRequest;
use Illuminate\Http\Request;
use Exception;

class ReferenceController extends Controller
{
    protected $referenceService;

    public function __construct(ReferenceService $referenceService)
    {
        $this->referenceService = $referenceService;
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

}
