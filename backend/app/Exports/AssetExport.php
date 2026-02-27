<?php

namespace App\Exports;

use App\Models\Asset;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class AssetExport implements FromQuery, WithHeadings, WithMapping
{
    protected $filters;

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;
    }

    public function query()
    {
        return Asset::query()
            ->with(['division', 'branch', 'category', 'assetType', 'brand', 'supplier'])
            ->when($this->filters['division_id'] ?? null, fn($q, $id) => $q->where('division_id', $id))
            ->when($this->filters['branch_id'] ?? null, fn($q, $id) => $q->where('branch_id', $id))
            ->when($this->filters['category_id'] ?? null, fn($q, $id) => $q->where('category_id', $id))
            ->when($this->filters['status'] ?? null, function ($q, $status) {
                if ($status === 'draft') {
                    return $q->draft();
                }
                if ($status === 'active') {
                    return $q->active();
                }
                if ($status === 'inactive') {
                    return $q->where('is_draft', false)->where('asset_status', 'inactive');
                }
                if ($status === 'pending_deletion') {
                    return $q->pendingDeletion();
                }
            })
            ->when($this->filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($sq) use ($search) {
                    $sq->where('asset_code', 'like', "%{$search}%")
                        ->orWhere('model_number', 'like', "%{$search}%")
                        ->orWhere('serial_number', 'like', "%{$search}%");
                });
            });
    }

    public function headings(): array
    {
        return [
            'Asset Code',
            'Division',
            'Branch',
            'Category',
            'Type',
            'Brand',
            'Model',
            'Serial Number',
            'Acquisition Cost',
            'Accumulated Depreciation',
            'Book Value',
            'Useful Life (Months)',
            'Monthly Depreciation',
            'Condition',
            'Date of Purchase',
            'Status',
        ];
    }

    public function map($asset): array
    {
        return [
            $asset->asset_code,
            $asset->division->name ?? '',
            $asset->branch->name ?? '',
            $asset->category->name ?? '',
            $asset->assetType->name ?? '',
            $asset->brand->name ?? '',
            $asset->model_number,
            $asset->serial_number,
            $asset->acquisition_cost,
            $asset->accumulated_depreciation,
            $asset->book_value,
            $asset->useful_life_months,
            $asset->monthly_depreciation,
            $asset->condition,
            $asset->date_of_purchase,
            $asset->is_draft ? 'Draft' : 'Active',
        ];
    }
}
