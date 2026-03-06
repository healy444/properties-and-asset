<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ReferenceImportTemplateExport implements FromCollection, WithHeadings
{
    private string $type;

    public function __construct(string $type)
    {
        $this->type = $type;
    }

    public function collection(): Collection
    {
        return collect([]);
    }

    public function headings(): array
    {
        return match ($this->type) {
            'divisions' => ['NAME'],
            'branches' => ['NAME', 'DIVISION', 'PARENT'],
            'categories' => ['NAME'],
            'asset-types' => ['NAME', 'CATEGORY'],
            'brands' => ['NAME'],
            'suppliers' => ['NAME', 'CONTACT PERSON', 'EMAIL', 'PHONE', 'ADDRESS'],
            default => ['NAME'],
        };
    }
}
