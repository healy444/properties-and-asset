<?php

namespace App\Imports;

use App\Models\AssetType;
use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Services\AssetService;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class AssetImport implements ToCollection, WithHeadingRow
{
    private AssetService $assetService;
    private $user;
    private ?int $branchId;

    public function __construct(AssetService $assetService, $user)
    {
        $this->assetService = $assetService;
        $this->user = $user;
        $this->branchId = $user?->isBranchCustodian() ? $user->getBranchId() : null;
    }

    public function collection(Collection $rows)
    {
        $errors = [];
        $isCustodian = $this->user?->isBranchCustodian();
        $isAdmin = $this->user && in_array($this->user->role, ['admin', 'super_admin'], true);
        $normalizeVal = function ($val) {
            return preg_replace('/[^a-z0-9]/', '', strtolower(trim((string) $val)));
        };

        $branchMap = Branch::all()->mapWithKeys(fn($branch) => [$normalizeVal($branch->name) => $branch->id]);
        $categoryMap = Category::all()->mapWithKeys(fn($category) => [$normalizeVal($category->name) => $category->id]);
        $typeMap = AssetType::all()->mapWithKeys(fn($type) => [$normalizeVal($type->name) => $type->id]);
        $brandMap = Brand::all()->mapWithKeys(fn($brand) => [$normalizeVal($brand->name) => $brand->id]);
        $supplierMap = \App\Models\Supplier::all()->mapWithKeys(fn($supplier) => [$normalizeVal($supplier->name) => $supplier->id]);

        foreach ($rows as $index => $row) {
            $rowErrors = [];
            $rowNumber = $index + 2; // Heading row is 1
            $hasValues = $row->filter(fn($value) => $value !== null && trim((string) $value) !== '')->isNotEmpty();
            if (!$hasValues) {
                continue;
            }

            $rowArray = $row->toArray();
            $normalized = [];
            $rawKeys = [];
            foreach ($rowArray as $key => $value) {
                $rawKeys[] = (string) $key;
                $rawKey = preg_replace('/^\xEF\xBB\xBF/', '', (string) $key);
                $normalizedKey = strtolower(preg_replace('/[^a-z0-9]/', '', $rawKey));
                if ($normalizedKey !== '') {
                    $normalized[$normalizedKey] = $value;
                }
            }

            // Fallback for CSVs with semicolon or other delimiters being read as one column
            if (count($normalized) === 1 && str_contains(array_key_first($normalized), ';')) {
                $rowErrors[] = "Row {$rowNumber}: Delimiter issue detected. Your CSV seems to use ';' instead of ','.";
                $errors = array_merge($errors, $rowErrors);
                continue;
            }

            $getValue = function (array $keys) use ($normalized) {
                foreach ($keys as $key) {
                    if (array_key_exists($key, $normalized)) {
                        return $normalized[$key];
                    }
                }
                return null;
            };

            $branchName = $normalizeVal($getValue(['branch', 'branchname', 'location', 'office']) ?? '');
            $categoryName = $normalizeVal($getValue(['category', 'categoryname', 'majorcategory']) ?? '');
            $typeName = $normalizeVal($getValue(['assettype', 'assettypename', 'type', 'asset_type', 'description']) ?? '');
            $brandName = $normalizeVal($getValue(['brand', 'brandname', 'make']) ?? '');
            $modelNumber = $getValue(['modelnumber', 'model', 'model_number']);
            $serialNumber = $getValue(['serialnumber', 'serial', 'serial_number']);
            $supplierName = $normalizeVal($getValue(['supplier', 'suppliername', 'vendor']) ?? '');
            $assignedTo = $getValue(['assignedto', 'assigned_to']);
            $remarks = $getValue(['remarks', 'remark', 'notes']);
            $acquisitionCost = $getValue(['acquisitioncost', 'cost', 'acquisition_cost']);
            $usefulLifeMonths = $getValue(['usefullife', 'usefullifemonths', 'usefullife_months', 'useful_life_months']);
            $condition = $normalizeVal($getValue(['condition']) ?? '');
            if ($condition === '') {
                $condition = 'good';
            }
            $dateValue = $getValue(['dateofpurchase', 'date_of_purchase', 'purchase_date']);
            $status = $normalizeVal($getValue(['status', 'assetstatus', 'asset_status']) ?? '');

            $branchId = $this->branchId;
            if (!$branchId) {
                if (!$branchName) {
                    $availableCols = implode('|', array_keys($normalized));
                    $rawKeysStr = implode('|', $rawKeys);
                    $rowErrors[] = "Row {$rowNumber}: Branch is required. (Keys: {$availableCols}) (Raw: {$rawKeysStr})";
                } elseif (!$branchMap->has($branchName)) {
                    $rowErrors[] = "Row {$rowNumber}: Branch '{$branchName}' not found.";
                } else {
                    $branchId = $branchMap->get($branchName);
                }
            }

            if (!$categoryName) {
                $rowErrors[] = "Row {$rowNumber}: Category is required.";
            } elseif (!$categoryMap->has($categoryName)) {
                $rowErrors[] = "Row {$rowNumber}: Category '{$categoryName}' not found.";
            }

            if (!$typeName) {
                $rowErrors[] = "Row {$rowNumber}: Type is required.";
            } elseif (!$typeMap->has($typeName)) {
                $rowErrors[] = "Row {$rowNumber}: Type '{$typeName}' not found.";
            }

            $brandId = null;
            if ($brandName !== '') {
                if (!$brandMap->has($brandName)) {
                    $rowErrors[] = "Row {$rowNumber}: Brand '{$brandName}' not found.";
                } else {
                    $brandId = $brandMap->get($brandName);
                }
            }

            $supplierId = null;
            if ($supplierName !== '') {
                if (!$supplierMap->has($supplierName)) {
                    $rowErrors[] = "Row {$rowNumber}: Supplier '{$supplierName}' not found.";
                } else {
                    $supplierId = $supplierMap->get($supplierName);
                }
            }

            if ($condition === '' || !in_array($condition, ['good', 'fair', 'poor'], true)) {
                $rowErrors[] = "Row {$rowNumber}: Condition must be Good, Fair, or Poor.";
            }

            if ($acquisitionCost === null || trim((string) $acquisitionCost) === '') {
                $rowErrors[] = "Row {$rowNumber}: Acquisition cost is required.";
            } elseif (!is_numeric($acquisitionCost) || (float) $acquisitionCost < 0) {
                $rowErrors[] = "Row {$rowNumber}: Acquisition cost must be a non-negative number.";
            }

            if ($usefulLifeMonths !== null && (!is_numeric($usefulLifeMonths) || (int) $usefulLifeMonths < 1)) {
                $rowErrors[] = "Row {$rowNumber}: Useful life months must be at least 1.";
            }

            $dateOfPurchase = null;
            if ($dateValue === null || trim((string) $dateValue) === '') {
                $dateOfPurchase = null;
            } else {
                try {
                    if (is_numeric($dateValue)) {
                        $dateOfPurchase = ExcelDate::excelToDateTimeObject($dateValue)->format('Y-m-d');
                    } else {
                        $dateOfPurchase = Carbon::parse($dateValue)->format('Y-m-d');
                    }
                } catch (\Throwable $e) {
                    $rowErrors[] = "Row {$rowNumber}: Invalid date of purchase.";
                }
            }

            if (!empty($rowErrors)) {
                $errors = array_merge($errors, $rowErrors);
                continue;
            }

            $isDraft = $status === 'draft';
            $assetStatus = $status === 'inactive' ? 'inactive' : 'active';
            $submittedForReviewAt = null;

            if ($isCustodian) {
                $isDraft = true;
                $submittedForReviewAt = now();
                $assetStatus = 'active';
            } elseif ($isAdmin) {
                $isDraft = false;
                $submittedForReviewAt = null;
                $assetStatus = 'active';
            }

            $this->assetService->createAsset([
                'branch_id' => $branchId,
                'category_id' => $categoryMap->get($categoryName),
                'asset_type_id' => $typeMap->get($typeName),
                'brand_id' => $brandId,
                'supplier_id' => $supplierId,
                'model_number' => $modelNumber ? trim((string) $modelNumber) : null,
                'serial_number' => $serialNumber ? trim((string) $serialNumber) : null,
                'assigned_to' => $assignedTo ? trim((string) $assignedTo) : null,
                'remarks' => $remarks ? trim((string) $remarks) : null,
                'date_of_purchase' => $dateOfPurchase,
                'acquisition_cost' => (float) $acquisitionCost,
                'useful_life_months' => $usefulLifeMonths !== null ? (int) $usefulLifeMonths : null,
                'condition' => $condition,
                'is_draft' => $isDraft,
                'submitted_for_review_at' => $submittedForReviewAt,
                'asset_status' => $assetStatus,
            ]);
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages(['file' => $errors]);
        }
    }
}
