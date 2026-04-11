<?php

namespace App\Http\Requests;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAssetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'division_id' => 'sometimes|exists:divisions,id',
            'branch_id' => 'sometimes|exists:branches,id',
            'category_id' => 'sometimes|exists:categories,id',
            'asset_type_id' => 'sometimes|exists:asset_types,id',
            'quantity' => 'sometimes|nullable|integer|min:1',
            'brand_id' => 'nullable|exists:brands,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'model_number' => 'nullable|string',
            'serial_number' => 'nullable|string',
            'date_of_purchase' => 'sometimes|nullable|date',
            'acquisition_cost' => 'sometimes|numeric|min:0',
            'useful_life_months' => 'sometimes|nullable|integer|min:1',
            'condition' => 'sometimes|in:good,fair,poor,obsolete',
            'asset_status' => 'sometimes|in:active,inactive,retired',
            'remarks' => 'nullable|string',
            'assigned_to' => 'nullable|string',
            'is_draft' => 'boolean',
            'submit_for_review' => 'sometimes|boolean',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (!$this->has('quantity')) {
                return;
            }
            $quantity = $this->input('quantity');
            if ($quantity === null || $quantity === '') {
                return;
            }
            $categoryId = $this->input('category_id');
            if (!$categoryId) {
                $asset = $this->route('asset');
                $categoryId = $asset?->category_id;
            }
            if (!$categoryId) {
                return;
            }
            $category = Category::select('id', 'code')->find($categoryId);
            if (!$category || $category->code !== 'FUR') {
                $validator->errors()->add('quantity', 'Quantity is only allowed for Furniture & Fixtures assets.');
            }
        });
    }
}
