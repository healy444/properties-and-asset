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
            'date_of_purchase' => 'nullable|date',
            'acquisition_cost' => 'required|numeric|min:0',
            'useful_life_months' => 'nullable|integer|min:1',
            'condition' => 'required|string',
            'asset_status' => 'nullable|in:active,inactive',
            'remarks' => 'nullable|string',
            'assigned_to' => 'nullable|string',
            'is_draft' => 'boolean',
            'submit_for_review' => 'sometimes|boolean',
        ];
    }
}
