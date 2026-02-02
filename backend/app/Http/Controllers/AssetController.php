<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Services\AssetService;
use App\Services\AuditLogService;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\AssetImport;
use App\Exports\AssetImportTemplateExport;

class AssetController extends Controller
{
    protected $assetService;
    protected $auditLogService;

    public function __construct(AssetService $assetService, AuditLogService $auditLogService)
    {
        $this->assetService = $assetService;
        $this->auditLogService = $auditLogService;
        $this->authorizeResource(Asset::class, 'asset');
    }

    /**
     * Display a listing of assets.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Asset::class);

        $deletionView = $request->input('deletion_view');
        $isAdmin = in_array($request->user()?->role, ['admin', 'super_admin']);
        $user = $request->user();
        $branchId = $user?->isBranchCustodian() ? $user->getBranchId() : null;
        if ($user?->isBranchCustodian() && !$branchId) {
            return response()->json(['message' => 'Branch is not assigned'], 403);
        }

        $assetsQuery = Asset::with([
            'branch',
            'category',
            'assetType',
            'brand',
            'supplier',
            'creator',
            'deleteRequester',
            'deleteApprover',
        ])
            ->when($request->branch_id, fn($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->category_id, fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->status, function ($q) use ($request, $user, $isAdmin) {
                if ($request->status === 'draft') {
                    return $q->where('is_draft', true)
                        ->whereNull('submitted_for_review_at')
                        ->where('created_by', $user->id);
                }
                if ($request->status === 'pending_review') {
                    $q->where('is_draft', true)
                        ->whereNotNull('submitted_for_review_at');
                    if (!$isAdmin) {
                        $q->where('created_by', $user->id);
                    }
                    return $q;
                }
                if ($request->status === 'active') {
                    return $q->active()->whereIn('delete_request_status', ['none', 'rejected']);
                }
                if ($request->status === 'inactive') {
                    return $q->where('is_draft', false)->where('asset_status', 'inactive');
                }
                if ($request->status === 'pending_deletion') {
                    return $q->pendingDeletion();
                }
            })
            ->when($request->search, function ($q, $search) {
                $q->where(function ($sq) use ($search) {
                    $sq->where('asset_code', 'like', "%{$search}%")
                        ->orWhere('model_number', 'like', "%{$search}%")
                        ->orWhere('serial_number', 'like', "%{$search}%");
                });
            });

        if ($branchId) {
            $assetsQuery->where('branch_id', $branchId);
        }

        if ($deletionView === 'pending') {
            if (!$isAdmin) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            $assetsQuery->where('delete_request_status', 'pending');
        } elseif ($deletionView === 'all') {
            if (!$isAdmin) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            // Show all assets involved in deletion workflow OR any soft-deleted asset
            $assetsQuery->withTrashed()->where(function ($q) {
                $q->whereIn('delete_request_status', ['pending', 'approved', 'rejected'])
                    ->orWhereNotNull('deleted_at');
            });
        }

        $assets = $assetsQuery->latest()->paginate($request->per_page ?? 15);

        return response()->json($assets);
    }

    /**
     * Store a newly created asset.
     */
    public function store(StoreAssetRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        if ($user?->isBranchCustodian()) {
            $branchId = $user->getBranchId();
            if (!$branchId || (int) $validated['branch_id'] !== (int) $branchId) {
                return response()->json(['message' => 'Unauthorized branch access'], 403);
            }
            // Branch custodians can only create drafts for admin approval.
            $validated['is_draft'] = true;
            if ($request->boolean('submit_for_review')) {
                $validated['submitted_for_review_at'] = now();
            }
        }

        $asset = $this->assetService->createAsset($validated);

        return response()->json([
            'message' => 'Asset created successfully',
            'asset' => $asset
        ], 201);
    }

    /**
     * Display the specified asset.
     */
    public function show(Asset $asset): JsonResponse
    {
        // Re-fetch with trashed to be safe, then load relations.
        $model = Asset::withTrashed()->findOrFail($asset->id);
        $this->authorize('view', $model);
        $model->load([
            'branch',
            'category',
            'assetType',
            'brand',
            'supplier',
            'creator',
            'deleteRequester',
            'deleteApprover',
        ]);
        return response()->json($model);
    }

    /**
     * Update the specified asset.
     */
    public function update(UpdateAssetRequest $request, Asset $asset): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        if ($user?->isBranchCustodian() && array_key_exists('branch_id', $validated)) {
            $branchId = $user->getBranchId();
            if (!$branchId || (int) $validated['branch_id'] !== (int) $branchId) {
                return response()->json(['message' => 'Unauthorized branch access'], 403);
            }
        }
        if ($user?->isBranchCustodian() && $request->boolean('submit_for_review')) {
            $validated['submitted_for_review_at'] = now();
        }

        $asset = $this->assetService->updateAsset($asset, $validated);

        return response()->json([
            'message' => 'Asset updated successfully',
            'asset' => $asset
        ]);
    }

    /**
     * Remove the specified asset (Request Deletion).
     * Soft delete happens after approval.
     */
    public function destroy(Asset $asset): JsonResponse
    {
        // Actually, destroy is usually for permanent delete or direct delete.
        // But for this project, we have a "Request Delete" flow.
        // I'll keep this as a simple delete for now or refer to requestDelete.
        return response()->json(['message' => 'Use request-delete endpoint'], 405);
    }

    /**
     * Custom: Request Deletion
     */
    public function requestDelete(Request $request, Asset $asset): JsonResponse
    {
        $this->authorize('requestDelete', $asset);

        $request->validate(['reason' => 'required|string|min:5']);

        $asset = $this->assetService->requestDelete($asset, $request->reason);

        return response()->json([
            'message' => 'Deletion request submitted',
            'asset' => $asset
        ]);
    }

    /**
     * Custom: Approve Deletion
     */
    public function approveDelete(Request $request, Asset $asset): JsonResponse
    {
        $this->authorize('approveDelete', $asset);

        $validated = $request->validate([
            'reason' => 'required|string|min:5',
        ]);

        $this->assetService->approveDelete($asset, $validated['reason']);

        return response()->json([
            'message' => 'Asset deleted successfully'
        ]);
    }

    /**
     * Custom: Reject Deletion
     */
    public function rejectDelete(Asset $asset): JsonResponse
    {
        $this->authorize('rejectDelete', $asset);

        $asset = $this->assetService->rejectDelete($asset);

        return response()->json([
            'message' => 'Deletion request rejected',
            'asset' => $asset
        ]);
    }

    /**
     * Custom: Finalize Draft
     */
    public function finalizeDraft(Asset $asset): JsonResponse
    {
        $this->authorize('update', $asset);
        $user = request()->user();
        if (!$user || !in_array($user->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Only admins can finalize drafts'], 403);
        }

        $asset = $this->assetService->updateAsset($asset, ['is_draft' => false, 'submitted_for_review_at' => null]);

        return response()->json([
            'message' => 'Asset draft finalized and code generated',
            'asset' => $asset
        ]);
    }

    /**
     * Custom: Reject Draft Review (return to draft)
     */
    public function rejectReview(Asset $asset): JsonResponse
    {
        $this->authorize('update', $asset);
        $user = request()->user();
        if (!$user || !in_array($user->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Only admins can reject reviews'], 403);
        }

        $asset = $this->assetService->updateAsset($asset, [
            'is_draft' => true,
            'submitted_for_review_at' => null,
        ]);

        return response()->json([
            'message' => 'Review rejected; draft returned to custodian',
            'asset' => $asset
        ]);
    }

    /**
     * Custom: Export Assets
     */
    public function export(Request $request)
    {
        $this->authorize('viewAny', Asset::class);

        $format = $request->format ?? 'csv';
        $filename = 'assets_export_' . now()->format('Ymd_His') . '.' . $format;
        $filters = $request->all();
        $user = $request->user();
        if ($user?->isBranchCustodian()) {
            $branchId = $user->getBranchId();
            if (!$branchId) {
                return response()->json(['message' => 'Branch is not assigned'], 403);
            }
            $filters['branch_id'] = $branchId;
        }

        $this->auditLogService->logExport('assets', $filters);

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\AssetExport($filters),
            $filename
        );
    }

    /**
     * Custom: Import Assets
     */
    public function import(Request $request): JsonResponse
    {
        $this->authorize('create', Asset::class);

        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,xls',
        ]);

        $user = $request->user();
        if ($user?->isBranchCustodian() && !$user->getBranchId()) {
            return response()->json(['message' => 'Branch is not assigned'], 403);
        }

        DB::transaction(function () use ($validated, $user) {
            Excel::import(new AssetImport($this->assetService, $user), $validated['file']);
        });

        $this->auditLogService->logImport('assets', [
            'filename' => $validated['file']->getClientOriginalName() ?? null,
        ]);

        return response()->json(['message' => 'Assets imported successfully']);
    }

    /**
     * Custom: Download import template
     */
    public function importTemplate(Request $request)
    {
        $this->authorize('create', Asset::class);

        $format = $request->input('format', 'csv');
        if (!in_array($format, ['csv', 'xlsx'], true)) {
            return response()->json(['message' => 'Invalid format'], 422);
        }

        $filename = 'assets_import_template_' . now()->format('Ymd_His') . '.' . $format;

        return Excel::download(new AssetImportTemplateExport(), $filename);
    }

    /**
     * Custom: Restore soft-deleted asset (Super Admin only).
     */
    public function restore(Asset $asset): JsonResponse
    {
        // $asset is already resolved withTrashed() due to route definition
        $this->authorize('restore', $asset);

        if ($asset->trashed()) {
            $restoredAsset = $this->assetService->restoreAsset($asset);

            return response()->json([
                'message' => 'Asset restored successfully',
                'asset' => $restoredAsset
            ]);
        }

        return response()->json(['message' => 'Asset is not deleted'], 400);
    }
}
