<?php

namespace App\Exports;

use App\Models\Asset;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class AssetExport implements FromQuery, WithHeadings, WithMapping
{
    protected $filters;
    protected array $columns;

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;
        $this->columns = $this->normalizeColumns($filters['columns'] ?? null);
    }

    public function query()
    {
        return Asset::query()
            ->with(['division', 'branch', 'category', 'assetType', 'brand', 'supplier'])
            ->when($this->filters['division_id'] ?? null, function ($q, $id) {
                $q->where(function ($sq) use ($id) {
                    $sq->where('division_id', $id)
                        ->orWhereHas('branch', fn($b) => $b->where('division_id', $id));
                });
            })
            ->when($this->filters['branch_id'] ?? null, function ($q, $id) {
                if (!empty($this->filters['include_child_branches'])) {
                    return $q->where(function ($sq) use ($id) {
                        $sq->where('branch_id', $id)
                            ->orWhereHas('branch', fn($b) => $b->where('parent_id', $id));
                    });
                }
                return $q->where('branch_id', $id);
            })
            ->when($this->filters['category_id'] ?? null, fn($q, $id) => $q->where('category_id', $id))
            ->when($this->filters['status'] ?? null, function ($q, $status) {
                if ($status === 'draft') {
                    return $q->draft();
                }
                if ($status === 'active') {
                    return $q->active();
                }
                if ($status === 'retired') {
                    return $q->where('is_draft', false)->where('asset_status', 'retired');
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
        $definitions = $this->columnDefinitions();
        return array_map(fn($key) => $definitions[$key]['label'], $this->columns);
    }

    public function map($asset): array
    {
        $definitions = $this->columnDefinitions();
        return array_map(fn($key) => ($definitions[$key]['value'])($asset), $this->columns);
    }

    private function columnDefinitions(): array
    {
        return [
            'asset_code' => [
                'label' => 'Asset Code',
                'value' => fn($asset) => $asset->asset_code,
            ],
            'division' => [
                'label' => 'Division',
                'value' => fn($asset) => $asset->division->name ?? '',
            ],
            'branch' => [
                'label' => 'Branch',
                'value' => fn($asset) => $asset->branch->name ?? '',
            ],
            'category' => [
                'label' => 'Category',
                'value' => fn($asset) => $asset->category->name ?? '',
            ],
            'type' => [
                'label' => 'Type',
                'value' => fn($asset) => $asset->assetType->name ?? '',
            ],
            'brand' => [
                'label' => 'Brand',
                'value' => fn($asset) => $asset->brand->name ?? '',
            ],
            'model_number' => [
                'label' => 'Model',
                'value' => fn($asset) => $asset->model_number,
            ],
            'serial_number' => [
                'label' => 'Serial Number',
                'value' => fn($asset) => $asset->serial_number,
            ],
            'quantity' => [
                'label' => 'Quantity',
                'value' => fn($asset) => $asset->quantity,
            ],
            'acquisition_cost' => [
                'label' => 'Acquisition Cost',
                'value' => fn($asset) => $asset->acquisition_cost,
            ],
            'accumulated_depreciation' => [
                'label' => 'Accumulated Depreciation',
                'value' => fn($asset) => $asset->accumulated_depreciation,
            ],
            'book_value' => [
                'label' => 'Book Value',
                'value' => fn($asset) => $asset->book_value,
            ],
            'useful_life_months' => [
                'label' => 'Useful Life (Months)',
                'value' => fn($asset) => $asset->useful_life_months,
            ],
            'monthly_depreciation' => [
                'label' => 'Monthly Depreciation',
                'value' => fn($asset) => $asset->monthly_depreciation,
            ],
            'condition' => [
                'label' => 'Condition',
                'value' => fn($asset) => $asset->condition,
            ],
            'date_of_purchase' => [
                'label' => 'Date of Purchase',
                'value' => fn($asset) => $asset->date_of_purchase,
            ],
            'status' => [
                'label' => 'Status',
                'value' => fn($asset) => $asset->is_draft ? 'Draft' : ucfirst($asset->asset_status ?? 'active'),
            ],
        ];
    }

    private function normalizeColumns($columns): array
    {
        $available = array_keys($this->columnDefinitions());
        if (!$columns) {
            return $available;
        }
        if (is_string($columns)) {
            $columns = array_filter(explode(',', $columns));
        }
        if (!is_array($columns)) {
            return $available;
        }
        $columns = array_values(array_intersect($available, $columns));
        return $columns ?: $available;
    }
}
