<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
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
        $userId = $this->route('user')->id;
        $roleAllowed = ['super_admin', 'admin', 'branch_custodian'];
        if ($this->user() && $this->user()->role === 'admin') {
            $roleAllowed = ['admin', 'branch_custodian'];
        }
        return [
            'username' => 'sometimes|string|max:255|unique:users,username,' . $userId,
            'email' => 'sometimes|email|unique:users,email,' . $userId . '|max:255',
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'suffix' => 'nullable|string|max:10',
            'role' => ['sometimes', 'string', Rule::in($roleAllowed)],
            'branch' => ['nullable', 'string', 'max:255', Rule::requiredIf(fn () => $this->input('role') === 'branch_custodian')],
        ];
    }
}
