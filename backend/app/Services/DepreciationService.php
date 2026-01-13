<?php

namespace App\Services;

class DepreciationService
{
    /**
     * Calculate monthly depreciation.
     * Formula: (Acquisition Cost) / Useful Life (Months)
     */
    public function calculateMonthlyDepreciation(float $acquisitionCost, int $usefulLifeMonths): float
    {
        if ($usefulLifeMonths <= 0) {
            return 0;
        }

        return round($acquisitionCost / $usefulLifeMonths, 2);
    }
}
