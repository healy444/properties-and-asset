<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
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
        $roleAllowed = ['super_admin', 'admin', 'branch_custodian'];
        if ($this->user() && $this->user()->role === 'admin') {
            $roleAllowed = ['branch_custodian'];
        }

        return [
            'username' => 'required|string|unique:users,username|max:255',
            'email' => 'required|email|unique:users,email|max:255',
            'password' => 'required|string|min:8',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'suffix' => 'nullable|string|max:10',
            'role' => ['required', 'string', Rule::in($roleAllowed)],
            'branch' => ['nullable', 'string', 'max:255', Rule::requiredIf(fn () => $this->input('role') === 'branch_custodian')],
        ];
    }
}
