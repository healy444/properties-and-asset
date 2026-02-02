<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $now = Carbon::now();
        $user = $request->user();
        $isAdmin = in_array($user?->role, ['admin', 'super_admin'], true);
        $isBranchCustodian = $user?->role === 'branch_custodian';
        $branchId = $isBranchCustodian ? $user?->getBranchId() : null;
        if ($isBranchCustodian && !$branchId) {
            return response()->json(['message' => 'Branch is not assigned'], 403);
        }

        $assetBaseQuery = Asset::query()
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId));

        // 1. Total Assets
        $totalAssets = (clone $assetBaseQuery)->where('is_draft', false)->count();
        $activeAssets = (clone $assetBaseQuery)->where('is_draft', false)->where('asset_status', 'active')->count();
        $inactiveAssets = (clone $assetBaseQuery)->where('is_draft', false)->where('asset_status', 'inactive')->count();
        // User asked for "Active and Inactive" based on asset_status, excluding drafts.

        // 2. Total Acquisition Cost
        $totalAcquisitionCost = (clone $assetBaseQuery)->where('is_draft', false)->where('asset_status', 'active')->sum('acquisition_cost');

        // 3. Montly Depreciation Expense (Current)
        // Sum of monthly_depreciation for all active assets that are NOT fully depreciated
        // We need to calculate if they are fully depreciated first. 
        // SQL: sum(monthly_depreciation) where TIMESTAMPDIFF(MONTH, date_of_purchase, NOW()) < useful_life_months
        $monthlyDepreciationExpense = (clone $assetBaseQuery)->where('is_draft', false)
            ->where('asset_status', 'active')
            ->whereRaw('TIMESTAMPDIFF(MONTH, date_of_purchase, ?) < useful_life_months', [$now])
            ->sum('monthly_depreciation');

        // 4. Total Depreciation (All Time)
        // For each asset: min(months_passed, useful_life) * monthly_depreciation
        // This is hard to do with simple sum(), might need DB::raw or iteration.
        // DB::raw approach: 
        // SUM(LEAST(useful_life_months, TIMESTAMPDIFF(MONTH, date_of_purchase, NOW())) * monthly_depreciation)
        $totalDepreciation = (clone $assetBaseQuery)->where('is_draft', false)
            ->where('asset_status', 'active')
            ->select(DB::raw('SUM(
                LEAST(useful_life_months, GREATEST(0, TIMESTAMPDIFF(MONTH, date_of_purchase, NOW()))) 
                * monthly_depreciation
             ) as total'))
            ->value('total');

        // 5. Assets Near End of Useful Life (e.g., within 3 months)
        // valid_until = purchase_date + useful_life months
        // where valid_until between NOW and NOW+3 months
        $nearEndOfLife = (clone $assetBaseQuery)->where('is_draft', false)
            ->where('asset_status', 'active')
            ->whereRaw('DATE_ADD(date_of_purchase, INTERVAL useful_life_months MONTH) BETWEEN ? AND ?', [$now, $now->copy()->addMonths(3)])
            ->get();
        // Just return count for the card, maybe list for detail? User asked for "Assets near end...", implies list or count. I'll give count and maybe top 5.

        // 6. Fully Depreciated but Still Active
        // months_passed >= useful_life
        $fullyDepreciatedActive = (clone $assetBaseQuery)->where('is_draft', false)
            ->where('asset_status', 'active')
            ->whereRaw('TIMESTAMPDIFF(MONTH, date_of_purchase, ?) >= useful_life_months', [$now])
            ->count();

        // 7. Assets by Condition
        $byCondition = (clone $assetBaseQuery)->where('is_draft', false)
            ->where('asset_status', 'active')
            ->select('condition', DB::raw('count(*) as count'))
            ->groupBy('condition')
            ->get();

        // 8. Assets by Branch
        $byBranchStacked = [];
        if ($isAdmin) {
            $branches = Branch::select('id', 'name', 'parent_id')->get();
            $countsByBranch = (clone $assetBaseQuery)->where('is_draft', false)
                ->where('asset_status', 'active')
                ->select('branch_id', DB::raw('count(*) as count'))
                ->groupBy('branch_id')
                ->pluck('count', 'branch_id');

            $parentMap = $branches->keyBy('id')->map(fn($branch) => $branch->parent_id)->toArray();
            $nameMap = $branches->pluck('name', 'id')->toArray();
            $rootCache = [];
            $getRoot = function ($branchId) use (&$getRoot, &$parentMap, &$rootCache) {
                if (isset($rootCache[$branchId])) {
                    return $rootCache[$branchId];
                }
                $parentId = $parentMap[$branchId] ?? null;
                if (!$parentId) {
                    $rootCache[$branchId] = $branchId;
                    return $branchId;
                }
                $rootCache[$branchId] = $getRoot($parentId);
                return $rootCache[$branchId];
            };

            $totalsByRoot = [];
            foreach ($branches as $branch) {
                $count = (int) ($countsByBranch[$branch->id] ?? 0);
                $rootId = $getRoot($branch->id);
                $totalsByRoot[$rootId] = ($totalsByRoot[$rootId] ?? 0) + $count;
                if ($count > 0) {
                    $byBranchStacked[] = [
                        'parent' => $nameMap[$rootId] ?? 'Unassigned',
                        'branch' => $branch->name ?? 'Unassigned',
                        'count' => $count,
                    ];
                }
            }

            $byBranch = collect($totalsByRoot)
                ->map(function ($count, $rootId) use ($nameMap) {
                    return [
                        'name' => $nameMap[$rootId] ?? 'Unassigned',
                        'count' => $count,
                    ];
                })
                ->values();
        } else {
            $byBranch = (clone $assetBaseQuery)->where('is_draft', false)
                ->where('asset_status', 'active')
                ->with('branch:id,name')
                ->select('branch_id', DB::raw('count(*) as count'))
                ->groupBy('branch_id')
                ->get()
                ->map(function ($item) {
                    return ['name' => $item->branch->name ?? 'Unassigned', 'count' => $item->count];
                });
        }

        // 9. Assets by Category
        $byCategory = (clone $assetBaseQuery)->where('is_draft', false)
            ->where('asset_status', 'active')
            ->with('category:id,name')
            ->select('category_id', DB::raw('count(*) as count'))
            ->groupBy('category_id')
            ->get()
            ->map(function ($item) {
                return ['name' => $item->category->name ?? 'Uncategorized', 'count' => $item->count];
            });

        // 10. Top 5 Suppliers
        $topSuppliers = (clone $assetBaseQuery)->where('is_draft', false)
            ->where('asset_status', 'active')
            ->with('supplier:id,name')
            ->select('supplier_id', DB::raw('count(*) as count'))
            ->groupBy('supplier_id')
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                return ['name' => $item->supplier->name ?? 'Unknown Supplier', 'count' => $item->count];
            });

        // 11. Top Assigned To
        // assigned_to is a string field (name) based on model, not an ID relation to User? 
        // Checking model... `assigned_to` is a string mutator "Convert to uppercase".
        // Migration: $table->string('assigned_to')->nullable();
        // So it's just a name.
        $topAssigned = (clone $assetBaseQuery)->where('is_draft', false)
            ->where('asset_status', 'active')
            ->whereNotNull('assigned_to')
            ->select('assigned_to', DB::raw('count(*) as count'))
            ->groupBy('assigned_to')
            ->orderByDesc('count')
            ->limit(5) // Giving top 5
            ->get();

        return response()->json([
            'total_assets' => $totalAssets,
            'active_assets' => $activeAssets,
            'inactive_assets' => $inactiveAssets,
            'acquisition_cost' => $totalAcquisitionCost,
            'total_depreciation' => $totalDepreciation,
            'monthly_depreciation_expense' => $monthlyDepreciationExpense,
            'fully_depreciated_active' => $fullyDepreciatedActive,
            'near_end_of_life_count' => $nearEndOfLife->count(),
            'near_end_of_life_list' => $nearEndOfLife->take(5), // Sample
            'by_condition' => $byCondition,
            'by_branch' => $byBranch,
            'by_branch_stacked' => $byBranchStacked,
            'by_category' => $byCategory,
            'top_suppliers' => $topSuppliers,
            'top_assigned' => $topAssigned,
        ]);
    }
}
