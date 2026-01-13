<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Polices handle this
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'branch_id' => 'required|exists:branches,id',
            'category_id' => 'required|exists:categories,id',
            'asset_type_id' => 'required|exists:asset_types,id',
            'brand_id' => 'nullable|exists:brands,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'model_number' => 'nullable|string',
            'serial_number' => 'nullable|string',
            'date_of_purchase' => 'required|date',
            'acquisition_cost' => 'required|numeric|min:0',
            'useful_life_months' => 'required|integer|min:1',
            'condition' => 'required|string',
            'remarks' => 'nullable|string',
            'assigned_to' => 'nullable|string',
            'is_draft' => 'boolean',
        ];
    }
}
