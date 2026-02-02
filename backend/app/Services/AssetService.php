<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Branch;
use App\Models\Category;
use App\Models\AssetType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class AssetService
{
    protected $codeGenerator;
    protected $depreciationService;
    protected $auditLogService;

    public function __construct(
        AssetCodeGeneratorService $codeGenerator,
        DepreciationService $depreciationService,
        AuditLogService $auditLogService
    ) {
        $this->codeGenerator = $codeGenerator;
        $this->depreciationService = $depreciationService;
        $this->auditLogService = $auditLogService;
    }

    /**
     * Create a new asset.
     */
    public function createAsset(array $data): Asset
    {
        return DB::transaction(function () use ($data) {
            $branch = Branch::findOrFail($data['branch_id']);
            $category = Category::findOrFail($data['category_id']);
            $assetType = AssetType::findOrFail($data['asset_type_id']);

            // Calculate depreciation when cost and life are provided.
            if (!empty($data['acquisition_cost']) && !empty($data['useful_life_months'])) {
                $data['monthly_depreciation'] = $this->depreciationService->calculateMonthlyDepreciation(
                    $data['acquisition_cost'],
                    $data['useful_life_months']
                );
            } else {
                $data['monthly_depreciation'] = 0;
            }

            $isDraft = (bool) ($data['is_draft'] ?? false);
            $data['asset_status'] = $data['asset_status'] ?? 'active';

            if (!$isDraft) {
                $data['asset_code'] = $this->codeGenerator->generate($branch, $category, $assetType);
            }

            $data['created_by'] = Auth::id();

            $asset = Asset::create($data);

            // Audit Log
            $this->auditLogService->log(
                'CREATE',
                'Asset',
                $asset->id,
                null,
                $asset->toArray()
            );

            return $asset;
        });
    }

    /**
     * Update an asset.
     */
    public function updateAsset(Asset $asset, array $data): Asset
    {
        return DB::transaction(function () use ($asset, $data) {
            $oldValues = $asset->toArray();

            if ($asset->isActive()) {
                // Rule: If Active, only status (condition), remarks, assigned_to editable.
                // Branch can be reassigned for active assets per latest requirements.
                // Added: serial/model/brand/supplier for corrections.
                $allowedFields = [
                    'condition',
                    'remarks',
                    'assigned_to',
                    'branch_id',
                    'serial_number',
                    'model_number',
                    'brand_id',
                    'supplier_id',
                    'asset_status'
                ];
                $data = array_intersect_key($data, array_flip($allowedFields));
            } else {
                // Draft: creator can edit all fields.
                // But we should recalculate depreciation if cost or life changed
                if (array_key_exists('acquisition_cost', $data) || array_key_exists('useful_life_months', $data)) {
                    $cost = $data['acquisition_cost'] ?? $asset->acquisition_cost;
                    $life = $data['useful_life_months'] ?? $asset->useful_life_months;
                    if (!empty($cost) && !empty($life)) {
                        $data['monthly_depreciation'] = $this->depreciationService->calculateMonthlyDepreciation($cost, $life);
                    } else {
                        $data['monthly_depreciation'] = 0;
                    }
                }

                // Transition Draft -> Active
                if (isset($data['is_draft']) && $data['is_draft'] == false) {
                    if (!$asset->asset_code) {
                        $branch = Branch::find($data['branch_id'] ?? $asset->branch_id);
                        $category = Category::find($data['category_id'] ?? $asset->category_id);
                        $assetType = AssetType::find($data['asset_type_id'] ?? $asset->asset_type_id);
                        $data['asset_code'] = $this->codeGenerator->generate($branch, $category, $assetType);
                    }
                }
            }

            $asset->update($data);

            // Audit Log diffs
            $this->auditLogService->logAssetUpdate($asset, $oldValues, $asset->fresh()->toArray());

            return $asset;
        });
    }

    /**
     * Request asset deletion.
     */
    public function requestDelete(Asset $asset, string $reason): Asset
    {
        if ($asset->delete_request_status === 'pending') {
            throw new \Exception('Deletion request already pending for this asset.');
        }
        if ($asset->isDraft()) {
            throw new \Exception('Draft assets cannot be requested for deletion.');
        }

        return DB::transaction(function () use ($asset, $reason) {
            $oldValues = $asset->toArray();

            $asset->update([
                'delete_request_status' => 'pending',
                'delete_requested_by' => Auth::id(),
                'delete_requested_at' => now(),
                'delete_request_reason' => $reason,
                'pre_delete_asset_status' => $asset->asset_status,
            ]);

            $this->auditLogService->log(
                'DELETE_REQUEST',
                'Asset',
                $asset->id,
                $oldValues,
                $asset->fresh()->toArray()
            );

            return $asset;
        });
    }

    /**
     * Approve asset deletion.
     */
    public function approveDelete(Asset $asset, ?string $reason = null): bool
    {
        return DB::transaction(function () use ($asset, $reason) {
            $oldValues = $asset->toArray();

            $asset->update([
                'delete_request_status' => 'approved',
                'delete_approved_by' => Auth::id(),
                'delete_approved_at' => now(),
                'delete_request_reason' => $reason ?? $asset->delete_request_reason,
            ]);

            $this->auditLogService->log(
                'DELETE_APPROVED',
                'Asset',
                $asset->id,
                $oldValues,
                $asset->fresh()->toArray()
            );

            return $asset->delete(); // Soft delete
        });
    }

    /**
     * Reject asset deletion.
     */
    public function rejectDelete(Asset $asset): Asset
    {
        return DB::transaction(function () use ($asset) {
            $oldValues = $asset->toArray();
            $priorStatus = $asset->pre_delete_asset_status ?: $asset->asset_status;

            $asset->update([
                'delete_request_status' => 'none',
                'delete_requested_by' => null,
                'delete_requested_at' => null,
                'delete_request_reason' => null,
                'pre_delete_asset_status' => null,
                'asset_status' => $priorStatus,
            ]);

            $this->auditLogService->log(
                'DELETE_REJECTED',

                'Asset',
                $asset->id,
                $oldValues,
                $asset->fresh()->toArray()
            );

            return $asset;
        });
    }

    /**
     * Restore a soft-deleted asset.
     */
    public function restoreAsset(Asset $asset): Asset
    {
        return DB::transaction(function () use ($asset) {
            $oldValues = $asset->toArray(); // Will show deleted_at

            $asset->restore();
            $asset->update([
                'delete_request_status' => 'none',
                'delete_requested_by' => null,
                'delete_requested_at' => null,
                'delete_request_reason' => null,
                'pre_delete_asset_status' => null,
                'delete_approved_by' => null,
                'delete_approved_at' => null,
            ]);

            $this->auditLogService->log(
                'RESTORE',
                'Asset',
                $asset->id,
                $oldValues,
                $asset->fresh()->toArray()
            );

            return $asset;
        });
    }
}
