<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        $now = Carbon::now();

        // 1. Total Assets
        $totalAssets = Asset::count();
        $activeAssets = Asset::where('is_draft', false)->count();
        $inactiveAssets = Asset::where('is_draft', true)->count(); // Assuming 'is_draft' means inactive/pending? Or strictly draft. 
        // User asked for "Active and Inactive". In this system, is_draft=false is Active. 

        // 2. Total Acquisition Cost
        $totalAcquisitionCost = Asset::where('is_draft', false)->sum('acquisition_cost');

        // 3. Montly Depreciation Expense (Current)
        // Sum of monthly_depreciation for all active assets that are NOT fully depreciated
        // We need to calculate if they are fully depreciated first. 
        // SQL: sum(monthly_depreciation) where TIMESTAMPDIFF(MONTH, date_of_purchase, NOW()) < useful_life_months
        $monthlyDepreciationExpense = Asset::where('is_draft', false)
            ->whereRaw('TIMESTAMPDIFF(MONTH, date_of_purchase, ?) < useful_life_months', [$now])
            ->sum('monthly_depreciation');

        // 4. Total Depreciation (All Time)
        // For each asset: min(months_passed, useful_life) * monthly_depreciation
        // This is hard to do with simple sum(), might need DB::raw or iteration.
        // DB::raw approach: 
        // SUM(LEAST(useful_life_months, TIMESTAMPDIFF(MONTH, date_of_purchase, NOW())) * monthly_depreciation)
        $totalDepreciation = Asset::where('is_draft', false)
            ->select(DB::raw('SUM(
                LEAST(useful_life_months, GREATEST(0, TIMESTAMPDIFF(MONTH, date_of_purchase, NOW()))) 
                * monthly_depreciation
             ) as total'))
            ->value('total');

        // 5. Assets Near End of Useful Life (e.g., within 3 months)
        // valid_until = purchase_date + useful_life months
        // where valid_until between NOW and NOW+3 months
        $nearEndOfLife = Asset::where('is_draft', false)
            ->whereRaw('DATE_ADD(date_of_purchase, INTERVAL useful_life_months MONTH) BETWEEN ? AND ?', [$now, $now->copy()->addMonths(3)])
            ->get();
        // Just return count for the card, maybe list for detail? User asked for "Assets near end...", implies list or count. I'll give count and maybe top 5.

        // 6. Fully Depreciated but Still Active
        // months_passed >= useful_life
        $fullyDepreciatedActive = Asset::where('is_draft', false)
            ->whereRaw('TIMESTAMPDIFF(MONTH, date_of_purchase, ?) >= useful_life_months', [$now])
            ->count();

        // 7. Assets by Condition
        $byCondition = Asset::where('is_draft', false)
            ->select('condition', DB::raw('count(*) as count'))
            ->groupBy('condition')
            ->get();

        // 8. Assets by Branch
        $byBranch = Asset::where('is_draft', false)
            ->with('branch:id,name') // Assuming Branch model has name
            ->select('branch_id', DB::raw('count(*) as count'))
            ->groupBy('branch_id')
            ->get()
            ->map(function ($item) {
                return ['name' => $item->branch->name ?? 'Unassigned', 'count' => $item->count];
            });

        // 9. Assets by Category
        $byCategory = Asset::where('is_draft', false)
            ->with('category:id,name')
            ->select('category_id', DB::raw('count(*) as count'))
            ->groupBy('category_id')
            ->get()
            ->map(function ($item) {
                return ['name' => $item->category->name ?? 'Uncategorized', 'count' => $item->count];
            });

        // 10. Top 3 Suppliers
        $topSuppliers = Asset::where('is_draft', false)
            ->with('supplier:id,name')
            ->select('supplier_id', DB::raw('count(*) as count'))
            ->groupBy('supplier_id')
            ->orderByDesc('count')
            ->limit(3)
            ->get()
            ->map(function ($item) {
                return ['name' => $item->supplier->name ?? 'Unknown Supplier', 'count' => $item->count];
            });

        // 11. Top Assigned To
        // assigned_to is a string field (name) based on model, not an ID relation to User? 
        // Checking model... `assigned_to` is a string mutator "Convert to uppercase".
        // Migration: $table->string('assigned_to')->nullable();
        // So it's just a name.
        $topAssigned = Asset::where('is_draft', false)
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
            'by_category' => $byCategory,
            'top_suppliers' => $topSuppliers,
            'top_assigned' => $topAssigned,
        ]);
    }
}
