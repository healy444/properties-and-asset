<?php

namespace App\Imports;

use App\Models\User;
use App\Services\UserService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class UserImport implements ToCollection, WithHeadingRow
{
    private UserService $userService;
    private $user;

    public function __construct(UserService $userService, $user)
    {
        $this->userService = $userService;
        $this->user = $user;
    }

    public function collection(Collection $rows)
    {
        $errors = [];
        $roleAllowed = ['super_admin', 'admin', 'branch_custodian'];
        if ($this->user && $this->user->role === 'admin') {
            $roleAllowed = ['branch_custodian'];
        }

        $seenEmails = [];
        $seenUsernames = [];

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

            $firstName = $getValue(['firstname', 'first_name', 'first']);
            $lastName = $getValue(['lastname', 'last_name', 'last']);
            $username = $getValue(['username', 'user_name']);
            $email = $getValue(['email', 'emailaddress', 'email_address']);
            $password = $getValue(['initialpassword', 'password', 'initial_password']);
            $roleRaw = $getValue(['role', 'userrole', 'user_role']);
            $branchRaw = $getValue(['branch', 'branchname', 'office', 'location']);

            $firstName = $firstName ? trim((string) $firstName) : '';
            $lastName = $lastName ? trim((string) $lastName) : '';
            $username = $username ? trim((string) $username) : '';
            $email = $email ? trim((string) $email) : '';
            $password = $password ? trim((string) $password) : '';
            $roleRaw = $roleRaw ? trim((string) $roleRaw) : '';
            $branchRaw = $branchRaw ? trim((string) $branchRaw) : '';

            if ($firstName === '') {
                $rowErrors[] = "Row {$rowNumber}: First name is required.";
            }
            if ($lastName === '') {
                $rowErrors[] = "Row {$rowNumber}: Last name is required.";
            }
            if ($username === '') {
                $rowErrors[] = "Row {$rowNumber}: Username is required.";
            }
            if ($email === '') {
                $rowErrors[] = "Row {$rowNumber}: Email is required.";
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $rowErrors[] = "Row {$rowNumber}: Email must be a valid email address.";
            }
            if ($password === '') {
                $rowErrors[] = "Row {$rowNumber}: Initial password is required.";
            } elseif (strlen($password) < 8) {
                $rowErrors[] = "Row {$rowNumber}: Initial password must be at least 8 characters.";
            }

            $normalizedRole = strtolower(str_replace([' ', '-'], '_', $roleRaw));
            $normalizedRole = preg_replace('/[^a-z_]/', '', $normalizedRole ?? '');
            if ($normalizedRole === 'superadmin') {
                $normalizedRole = 'super_admin';
            }
            if ($normalizedRole === 'branchcustodian') {
                $normalizedRole = 'branch_custodian';
            }

            if ($normalizedRole === '') {
                $rowErrors[] = "Row {$rowNumber}: Role is required.";
            } elseif (!in_array($normalizedRole, $roleAllowed, true)) {
                $rowErrors[] = "Row {$rowNumber}: Role '{$roleRaw}' is not allowed.";
            }

            if ($email !== '') {
                $emailKey = strtolower($email);
                if (in_array($emailKey, $seenEmails, true)) {
                    $rowErrors[] = "Row {$rowNumber}: Duplicate email in import file.";
                } else {
                    $seenEmails[] = $emailKey;
                }
                if (User::where('email', $email)->exists()) {
                    $rowErrors[] = "Row {$rowNumber}: Email '{$email}' already exists.";
                }
            }

            if ($username !== '') {
                $usernameKey = strtolower($username);
                if (in_array($usernameKey, $seenUsernames, true)) {
                    $rowErrors[] = "Row {$rowNumber}: Duplicate username in import file.";
                } else {
                    $seenUsernames[] = $usernameKey;
                }
                if (User::where('username', $username)->exists()) {
                    $rowErrors[] = "Row {$rowNumber}: Username '{$username}' already exists.";
                }
            }

            $branch = $branchRaw !== '' ? $branchRaw : null;
            if ($normalizedRole === 'branch_custodian') {
                $branch = $branch ?: $this->user?->branch;
                if (!$branch) {
                    $rowErrors[] = "Row {$rowNumber}: Branch is required for branch custodians and your account has no branch assigned.";
                }
            } elseif (in_array($normalizedRole, ['admin', 'super_admin'], true)) {
                $branch = $branch ?: 'Head Office';
            }

            if (!empty($rowErrors)) {
                $errors = array_merge($errors, $rowErrors);
                continue;
            }

            $this->userService->createUser([
                'first_name' => $firstName,
                'last_name' => $lastName,
                'username' => $username,
                'email' => $email,
                'password' => $password,
                'role' => $normalizedRole,
                'branch' => $branch,
            ]);
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages(['file' => $errors]);
        }
    }
}
