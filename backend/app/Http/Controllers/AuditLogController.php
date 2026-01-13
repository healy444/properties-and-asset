<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditLogController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(AuditLog::class, 'audit_log');
    }

    /**
     * Display a listing of audit logs.
     */
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::with('user')
            ->when($request->user_id, fn($q, $id) => $q->where('user_id', $id))
            ->when($request->action, fn($q, $action) => $q->where('action', $action))
            ->when($request->entity_type, fn($q, $type) => $q->where('entity_type', $type))
            ->when($request->entity_id, fn($q, $id) => $q->where('entity_id', $id))
            ->when($request->start_date, fn($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($request->end_date, fn($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->latest()
            ->paginate($request->per_page ?? 25);

        return response()->json($logs);
    }

    /**
     * Display the specified audit log.
     */
    public function show(AuditLog $auditLog): JsonResponse
    {
        $auditLog->load('user');
        return response()->json($auditLog);
    }
}
