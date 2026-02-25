<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditLogController extends Controller
{
    protected AuditLogService $auditLogService;

    public function __construct()
    {
        $this->auditLogService = app(AuditLogService::class);
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
     * Export audit logs (CSV).
     */
    public function export(Request $request)
    {
        $this->authorize('viewAny', AuditLog::class);

        $logsQuery = AuditLog::with('user')
            ->when($request->user_id, fn($q, $id) => $q->where('user_id', $id))
            ->when($request->action, fn($q, $action) => $q->where('action', $action))
            ->when($request->entity_type, fn($q, $type) => $q->where('entity_type', $type))
            ->when($request->entity_id, fn($q, $id) => $q->where('entity_id', $id))
            ->when($request->start_date, fn($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($request->end_date, fn($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->latest();

        $filters = $request->only(['user_id', 'action', 'entity_type', 'entity_id', 'start_date', 'end_date']);
        $this->auditLogService->logExport('audit_logs', $filters);

        $filename = 'audit_logs_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($logsQuery) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Timestamp',
                'Action',
                'User ID',
                'Username',
                'User Name',
                'Entity Type',
                'Entity ID',
                'IP Address',
                'Old Values',
                'New Values',
                'Metadata',
            ]);

            $logsQuery->chunk(500, function ($logs) use ($handle) {
                foreach ($logs as $log) {
                    $userName = $log->user ? trim("{$log->user->first_name} {$log->user->last_name}") : '';
                    fputcsv($handle, [
                        $log->created_at?->format('Y-m-d H:i:s'),
                        $log->action,
                        $log->user_id,
                        $log->user?->username,
                        $userName,
                        $log->entity_type,
                        $log->entity_id,
                        $log->ip_address,
                        $log->old_values ? json_encode($log->old_values) : null,
                        $log->new_values ? json_encode($log->new_values) : null,
                        $log->metadata ? json_encode($log->metadata) : null,
                    ]);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
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
