<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    protected $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Get dashboard metrics.
     */
    public function getMetrics(Request $request): JsonResponse
    {
        // Both Admins and Asset Managers can view the dashboard
        return response()->json($this->dashboardService->getMetrics($request->user()));
    }
}
