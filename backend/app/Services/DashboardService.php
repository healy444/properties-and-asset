<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * Get all dashboard metrics.
     */
    public function getMetrics(?User $user = null): array
    {
        $branchId = $this->getBranchIdForUser($user);
        return [
            'totals' => $this->getTotals($branchId),
            'by_status' => $this->getByStatus($branchId),
            'by_branch' => $this->getByBranch($branchId),
            'by_category' => $this->getByCategory($branchId),
            'alerts' => $this->getConditionAlerts($branchId),
            'recent_activity' => $this->getRecentActivity($user),
        ];
    }

    private function getBranchIdForUser(?User $user): ?int
    {
        if (!$user || !$user->isBranchCustodian()) {
            return null;
        }

        return $user->getBranchId() ?? -1;
    }

    /**
     * Get total active counts and financial sums.
     */
    private function getTotals(?int $branchId = null): array
    {
        return [
            'active_assets' => Asset::where('is_draft', false)
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->count(),
            'total_cost' => (float) Asset::where('is_draft', false)
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->sum('acquisition_cost'),
            'total_monthly_depreciation' => (float) Asset::where('is_draft', false)
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->sum('monthly_depreciation'),
        ];
    }

    /**
     * Get asset counts by status.
     */
    private function getByStatus(?int $branchId = null): array
    {
        $drafts = Asset::where('is_draft', true)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->count();
        $active = Asset::where('is_draft', false)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->count();
        $pendingDeletion = Asset::where('delete_request_status', 'pending')
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->count();

        return [
            ['status' => 'Draft', 'count' => $drafts],
            ['status' => 'Active', 'count' => $active],
            ['status' => 'Pending Deletion', 'count' => $pendingDeletion],
        ];
    }

    /**
     * Get asset counts by branch.
     */
    private function getByBranch(?int $branchId = null): array
    {
        return Asset::select('branches.name as branch', DB::raw('count(*) as count'))
            ->join('branches', 'assets.branch_id', '=', 'branches.id')
            ->when($branchId, fn($q) => $q->where('assets.branch_id', $branchId))
            ->groupBy('branches.name')
            ->get()
            ->toArray();
    }

    /**
     * Get asset counts by category.
     */
    private function getByCategory(?int $branchId = null): array
    {
        return Asset::select('categories.name as category', DB::raw('count(*) as count'))
            ->join('categories', 'assets.category_id', '=', 'categories.id')
            ->when($branchId, fn($q) => $q->where('assets.branch_id', $branchId))
            ->groupBy('categories.name')
            ->get()
            ->toArray();
    }

    /**
     * Get counts for assets in Fair or Poor condition.
     */
    private function getConditionAlerts(?int $branchId = null): array
    {
        return [
            'fair' => Asset::where('condition', 'fair')
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->count(),
            'poor' => Asset::where('condition', 'poor')
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->count(),
        ];
    }

    /**
     * Get recent audit trails.
     */
    private function getRecentActivity(?User $user = null): array
    {
        if ($user && $user->isBranchCustodian()) {
            return AuditLog::with('user')
                ->where('user_id', $user->id)
                ->latest()
                ->limit(10)
                ->get()
                ->toArray();
        }

        return AuditLog::with('user')
            ->latest()
            ->limit(10)
            ->get()
            ->toArray();
    }
}
