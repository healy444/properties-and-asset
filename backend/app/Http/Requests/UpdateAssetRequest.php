<?php

namespace App\Http\Requests;

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
            'branch_id' => 'sometimes|exists:branches,id',
            'category_id' => 'sometimes|exists:categories,id',
            'asset_type_id' => 'sometimes|exists:asset_types,id',
            'brand_id' => 'nullable|exists:brands,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'model_number' => 'nullable|string',
            'serial_number' => 'nullable|string',
            'date_of_purchase' => 'sometimes|nullable|date',
            'acquisition_cost' => 'sometimes|numeric|min:0',
            'useful_life_months' => 'sometimes|nullable|integer|min:1',
            'condition' => 'sometimes|string',
            'asset_status' => 'sometimes|in:active,inactive',
            'remarks' => 'nullable|string',
            'assigned_to' => 'nullable|string',
            'is_draft' => 'boolean',
            'submit_for_review' => 'sometimes|boolean',
        ];
    }
}
