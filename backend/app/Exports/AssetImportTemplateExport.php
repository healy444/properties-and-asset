<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AssetImportTemplateExport implements FromCollection, WithHeadings
{
    public function collection(): Collection
    {
        return collect([]);
    }

    public function headings(): array
    {
        return [
            'DIVISION',
            'BRANCH',
            'CATEGORY',
            'ASSET TYPE',
            'BRAND',
            'MODEL NUMBER',
            'SERIAL NUMBER',
            'QUANTITY',
            'DATE OF PURCHASE',
            'ACQUISITION COST',
            'USEFUL LIFE',
            'CONDITION',
            'ASSIGNED TO',
            'SUPPLIER',
            'REMARKS',
        ];
    }
}
