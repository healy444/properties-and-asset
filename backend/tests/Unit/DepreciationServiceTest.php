<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\DepreciationService;

class DepreciationServiceTest extends TestCase
{
    private $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new DepreciationService();
    }

    public function test_it_calculates_monthly_depreciation_correctly()
    {
        // 120,000 / 12 months = 10,000
        $depreciation = $this->service->calculateMonthlyDepreciation(120000, 12);
        $this->assertEquals(10000, $depreciation);

        // 100,000 / 36 months = 2777.78
        $depreciation = $this->service->calculateMonthlyDepreciation(100000, 36);
        $this->assertEquals(2777.78, $depreciation);
    }
}
