<?php

namespace App\Imports;

use App\Models\AssetType;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Supplier;
use App\Models\Division;
use App\Services\ReferenceService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ReferenceImport implements ToCollection, WithHeadingRow
{
    private ReferenceService $referenceService;
    private string $type;

    public function __construct(ReferenceService $referenceService, string $type)
    {
        $this->referenceService = $referenceService;
        $this->type = $type;
    }

    public function collection(Collection $rows)
    {
        $errors = [];
        $normalizeKey = fn($key) => strtolower(preg_replace('/[^a-z0-9]/', '', (string) $key));
        $normalizeVal = fn($val) => strtolower(preg_replace('/[^a-z0-9]/', '', (string) $val));
        $generateBaseCode = function (?string $name) {
            if (!$name) {
                return '';
            }
            $cleaned = trim(preg_replace('/\s+/', ' ', $name));
            if ($cleaned === '') {
                return '';
            }
            $words = array_filter(explode(' ', $cleaned));
            $initials = '';
            foreach ($words as $word) {
                $initials .= strtoupper($word[0]);
            }
            $initials = substr($initials, 0, 4);
            if (strlen($initials) >= 2) {
                return $initials;
            }
            $alnum = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $cleaned));
            return substr($alnum, 0, 4);
        };
        $ensureUniqueCode = function (string $baseCode, array $seenCodes, array $existingCodes) {
            if ($baseCode === '') {
                return '';
            }
            $candidate = strtoupper(substr($baseCode, 0, 4));
            $suffix = 1;
            while (in_array($candidate, $seenCodes, true) || in_array($candidate, $existingCodes, true)) {
                $suffixStr = (string) $suffix;
                $availableLength = max(1, 4 - strlen($suffixStr));
                $candidate = strtoupper(substr($baseCode, 0, $availableLength) . $suffixStr);
                $suffix += 1;
            }
            return $candidate;
        };

        $parentBranchByName = null;
        $parentBranchByCode = null;
        $divisionByName = null;
        $divisionByCode = null;
        $categoryByName = null;
        $categoryByCode = null;

        if ($this->type === 'divisions') {
            $divisionByName = Division::all()->mapWithKeys(fn($division) => [$normalizeVal($division->name) => $division->id]);
            $divisionByCode = Division::all()->mapWithKeys(fn($division) => [$normalizeVal($division->code) => $division->id]);
        }

        if ($this->type === 'branches') {
            $parentBranchByName = Branch::all()->mapWithKeys(fn($branch) => [$normalizeVal($branch->name) => $branch->id]);
            $parentBranchByCode = Branch::all()->mapWithKeys(fn($branch) => [$normalizeVal($branch->code) => $branch->id]);
            $divisionByName = Division::all()->mapWithKeys(fn($division) => [$normalizeVal($division->name) => $division->id]);
            $divisionByCode = Division::all()->mapWithKeys(fn($division) => [$normalizeVal($division->code) => $division->id]);
        }

        if ($this->type === 'asset-types') {
            $categoryByName = Category::all()->mapWithKeys(fn($category) => [$normalizeVal($category->name) => $category->id]);
            $categoryByCode = Category::all()->mapWithKeys(fn($category) => [$normalizeVal($category->code) => $category->id]);
        }

        $seenCodes = [];
        $seenNames = [];
        $seenAssetTypeCodes = [];

        foreach ($rows as $index => $row) {
            $rowErrors = [];
            $rowNumber = $index + 2;
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
                $normalizedKey = $normalizeKey($rawKey);
                if ($normalizedKey !== '') {
                    $normalized[$normalizedKey] = $value;
                }
            }

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

            $name = $getValue(['name']);
            $code = $getValue(['code']);
            $name = $name ? trim((string) $name) : '';
            $code = $code ? trim((string) $code) : '';

            if ($name === '') {
                $rowErrors[] = "Row {$rowNumber}: Name is required.";
            }

            if (in_array($this->type, ['divisions', 'branches', 'categories'], true) && $code === '') {
                $rowErrors[] = "Row {$rowNumber}: Code is required.";
            }

            if ($name !== '') {
                $nameKey = strtolower($name);
                if (in_array($nameKey, $seenNames, true)) {
                    $rowErrors[] = "Row {$rowNumber}: Duplicate name in import file.";
                } else {
                    $seenNames[] = $nameKey;
                }
            }

            if ($code !== '' && in_array($this->type, ['divisions', 'branches', 'categories', 'asset-types'], true)) {
                $codeKey = strtolower($code);
                if (in_array($codeKey, $seenCodes, true) && $this->type !== 'asset-types') {
                    $rowErrors[] = "Row {$rowNumber}: Duplicate code in import file.";
                } else {
                    $seenCodes[] = $codeKey;
                }
            }

            if ($this->type === 'divisions') {
                if ($code !== '' && Division::where('code', $code)->exists()) {
                    $rowErrors[] = "Row {$rowNumber}: Code '{$code}' already exists.";
                }

                if (!empty($rowErrors)) {
                    $errors = array_merge($errors, $rowErrors);
                    continue;
                }

                $this->referenceService->create($this->type, [
                    'name' => $name,
                    'code' => $code,
                ]);
                continue;
            }

            if ($this->type === 'branches') {
                if ($code !== '' && Branch::where('code', $code)->exists()) {
                    $rowErrors[] = "Row {$rowNumber}: Code '{$code}' already exists.";
                }

                $divisionRaw = $getValue(['division', 'divisionname', 'division_name', 'divisioncode', 'division_code']);
                $divisionRaw = $divisionRaw ? trim((string) $divisionRaw) : '';
                $divisionId = null;
                if ($divisionRaw === '') {
                    $rowErrors[] = "Row {$rowNumber}: Division is required.";
                } else {
                    $divisionKey = $normalizeVal($divisionRaw);
                    $divisionId = $divisionByName?->get($divisionKey) ?? $divisionByCode?->get($divisionKey);
                    if (!$divisionId) {
                        $rowErrors[] = "Row {$rowNumber}: Division '{$divisionRaw}' not found.";
                    }
                }

                $parentRaw = $getValue(['parent', 'parentname', 'parent_name', 'parentcode', 'parent_code']);
                $parentRaw = $parentRaw ? trim((string) $parentRaw) : '';
                $parentId = null;
                if ($parentRaw !== '') {
                    $parentKey = $normalizeVal($parentRaw);
                    $parentId = $parentBranchByName?->get($parentKey) ?? $parentBranchByCode?->get($parentKey);
                    if (!$parentId) {
                        $rowErrors[] = "Row {$rowNumber}: Parent branch '{$parentRaw}' not found.";
                    }
                }

                if (!empty($rowErrors)) {
                    $errors = array_merge($errors, $rowErrors);
                    continue;
                }

                $this->referenceService->create($this->type, [
                    'name' => $name,
                    'code' => $code,
                    'division_id' => $divisionId,
                    'parent_id' => $parentId,
                ]);
                continue;
            }

            if ($this->type === 'categories') {
                if ($code !== '' && Category::where('code', $code)->exists()) {
                    $rowErrors[] = "Row {$rowNumber}: Code '{$code}' already exists.";
                }

                if (!empty($rowErrors)) {
                    $errors = array_merge($errors, $rowErrors);
                    continue;
                }

                $this->referenceService->create($this->type, [
                    'name' => $name,
                    'code' => $code,
                ]);
                continue;
            }

            if ($this->type === 'asset-types') {
                $categoryRaw = $getValue(['category', 'categoryname', 'category_name', 'categorycode', 'category_code']);
                $categoryRaw = $categoryRaw ? trim((string) $categoryRaw) : '';
                $categoryId = null;
                if ($categoryRaw === '') {
                    $rowErrors[] = "Row {$rowNumber}: Category is required.";
                } else {
                    $categoryKey = $normalizeVal($categoryRaw);
                    $categoryId = $categoryByName?->get($categoryKey) ?? $categoryByCode?->get($categoryKey);
                    if (!$categoryId) {
                        $rowErrors[] = "Row {$rowNumber}: Category '{$categoryRaw}' not found.";
                    }
                }

                $baseCode = $generateBaseCode($name);
                if ($baseCode === '') {
                    $rowErrors[] = "Row {$rowNumber}: Unable to generate code from name.";
                }

                $existingCodes = [];
                if ($categoryId) {
                    $existingCodes = AssetType::where('category_id', $categoryId)
                        ->pluck('code')
                        ->map(fn($value) => strtoupper((string) $value))
                        ->toArray();
                }

                $seenCodesForCategory = [];
                foreach ($seenAssetTypeCodes as $entry) {
                    [$seenCategory, $seenCode] = explode('|', $entry, 2);
                    if ((int) $seenCategory === (int) $categoryId) {
                        $seenCodesForCategory[] = strtoupper($seenCode);
                    }
                }

                $code = $categoryId ? $ensureUniqueCode($baseCode, $seenCodesForCategory, $existingCodes) : '';
                if ($code !== '' && $categoryId) {
                    $assetTypeKey = strtolower($categoryId . '|' . $code);
                    $seenAssetTypeCodes[] = $assetTypeKey;
                }

                if (!empty($rowErrors)) {
                    $errors = array_merge($errors, $rowErrors);
                    continue;
                }

                $this->referenceService->create($this->type, [
                    'name' => $name,
                    'code' => $code,
                    'category_id' => $categoryId,
                ]);
                continue;
            }

            if ($this->type === 'brands') {
                if (!empty($rowErrors)) {
                    $errors = array_merge($errors, $rowErrors);
                    continue;
                }

                $this->referenceService->create($this->type, [
                    'name' => $name,
                ]);
                continue;
            }

            if ($this->type === 'suppliers') {
                $contact = $getValue(['contact_person', 'contactperson', 'contact']);
                $email = $getValue(['email', 'emailaddress', 'email_address']);
                $phone = $getValue(['phone', 'phone_number', 'telephone']);
                $address = $getValue(['address', 'location']);
                $contact = $contact ? trim((string) $contact) : null;
                $email = $email ? trim((string) $email) : null;
                $phone = $phone ? trim((string) $phone) : null;
                $address = $address ? trim((string) $address) : null;

                if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $rowErrors[] = "Row {$rowNumber}: Email must be a valid email address.";
                }

                if (!empty($rowErrors)) {
                    $errors = array_merge($errors, $rowErrors);
                    continue;
                }

                $this->referenceService->create($this->type, [
                    'name' => $name,
                    'contact_person' => $contact,
                    'email' => $email,
                    'phone' => $phone,
                    'address' => $address,
                ]);
                continue;
            }
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages(['file' => $errors]);
        }
    }
}
