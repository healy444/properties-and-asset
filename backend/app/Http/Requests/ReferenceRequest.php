<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReferenceRequest extends FormRequest
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
        $type = $this->route('type');
        $id = $this->route('id');

        $rules = [
            'name' => 'required|string|max:255',
            'is_active' => 'boolean',
        ];

        if (in_array($type, ['divisions', 'branches', 'categories', 'asset-types'])) {
            $table = str_replace('-', '_', $type);
            if ($type === 'asset-types') {
                $categoryId = $this->input('category_id');
                $rules['code'] = [
                    'required',
                    'string',
                    'max:50',
                    Rule::unique($table, 'code')
                        ->ignore($id)
                        ->where(fn ($query) => $query->where('category_id', $categoryId)),
                ];
            } else {
                $rules['code'] = 'required|string|max:50|unique:' . $table . ',code' . ($id ? ',' . $id : '');
            }
        }

        if ($type === 'branches') {
            $rules['parent_id'] = 'nullable|exists:branches,id';
            $rules['division_id'] = 'required|exists:divisions,id';
        }

        if ($type === 'asset-types') {
            $rules['category_id'] = 'required|exists:categories,id';
        }

        if ($type === 'suppliers') {
            $rules['contact_person'] = 'nullable|string|max:255';
            $rules['email'] = 'nullable|email|max:255';
            $rules['phone'] = 'nullable|string|max:50';
            $rules['address'] = 'nullable|string';
        }

        return $rules;
    }
}
