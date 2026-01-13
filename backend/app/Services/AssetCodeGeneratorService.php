<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Branch;
use App\Models\Category;
use App\Models\AssetType;
use Illuminate\Support\Str;

class AssetCodeGeneratorService
{
    /**
     * Generate a unique asset code.
     * Format: AST-{CATEGORY}-{TYPE}-{SUFFIX}
     *
     * @param Branch $branch
     * @param Category $category
     * @param AssetType $assetType
     * @return string
     */
    public function generate(Branch $branch, Category $category, AssetType $assetType): string
    {
        $categoryCode = strtoupper($category->code);
        $typeCode = $this->generateTypeCode($assetType);

        // All assets share the AST prefix (Asset), no longer using branch code
        $prefix = "AST-{$categoryCode}-{$typeCode}";

        return $this->generateUniqueCode($prefix);
    }

    /**
     * Generate type code from initials (2-4 letters).
     * 
     * @param AssetType $assetType
     * @return string
     */
    private function generateTypeCode(AssetType $assetType): string
    {
        // If the asset type already has a code, use it
        if ($assetType->code) {
            return strtoupper($assetType->code);
        }

        // Generate from initials: "Desktop Computer" -> "DC"
        $words = explode(' ', $assetType->name);
        $initials = '';

        foreach ($words as $word) {
            $initials .= substr($word, 0, 1);
        }

        $code = strtoupper($initials);

        // Ensure it's between 2 and 4 letters
        if (strlen($code) < 2) {
            $code = strtoupper(substr($assetType->name, 0, 2));
        } elseif (strlen($code) > 4) {
            $code = substr($code, 0, 4);
        }

        return $code;
    }

    /**
     * Append a random 4-digit suffix and ensure uniqueness.
     * 
     * @param string $prefix
     * @return string
     */
    private function generateUniqueCode(string $prefix): string
    {
        $maxAttempts = 100;
        $attempt = 0;

        do {
            $suffix = str_pad(mt_rand(0, 9999), 4, '0', STR_PAD_LEFT);
            $fullCode = "{$prefix}-{$suffix}";

            $exists = Asset::where('asset_code', $fullCode)->exists();
            $attempt++;

            if ($attempt >= $maxAttempts) {
                // Fallback to timestamp-based suffix if too many collisions
                $suffix = substr(time(), -4);
                $fullCode = "{$prefix}-{$suffix}";
                break;
            }
        } while ($exists);

        return $fullCode;
    }
}
