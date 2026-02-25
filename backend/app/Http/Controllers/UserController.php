<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

use App\Models\User;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Services\AuditLogService;
use App\Imports\UserImport;
use App\Exports\UserImportTemplateExport;

class UserController extends Controller
{
    protected $userService;
    protected $auditLogService;

    public function __construct(\App\Services\UserService $userService, AuditLogService $auditLogService)
    {
        $this->userService = $userService;
        $this->auditLogService = $auditLogService;
        $this->authorizeResource(User::class, 'user');
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $users = User::query()
            ->when($request->search, function ($q, $search) {
                $q->where('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            })
            ->when($request->role, fn($q, $role) => $q->where('role', $role))
            ->latest()
            ->paginate($request->per_page ?? 15);

        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request)
    {
        $user = $this->userService->createUser($request->validated());

        return response()->json($user, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $updatedUser = $this->userService->updateUser($user, $request->validated());

        return response()->json($updatedUser);
    }

    /**
     * Reset user password.
     */
    public function resetPassword(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'password' => 'required|string|min:8',
        ]);

        $this->userService->resetPassword($user, $validated['password']);

        return response()->json(['message' => 'Password reset successful']);
    }

    /**
     * Toggle user status.
     */
    public function toggleStatus(User $user)
    {
        $this->authorize('update', $user);

        $updatedUser = $this->userService->toggleStatus($user);

        return response()->json($updatedUser);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        // We usually deactivate instead of delete, but policy handles it
        $user->delete();
        return response()->json(null, 204);
    }

    /**
     * Import users from a CSV/XLSX file.
     */
    public function import(Request $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,xls',
        ]);

        $user = $request->user();

        DB::transaction(function () use ($validated, $user) {
            Excel::import(new UserImport($this->userService, $user), $validated['file']);
        });

        $this->auditLogService->logImport('users', [
            'filename' => $validated['file']->getClientOriginalName() ?? null,
        ]);

        return response()->json(['message' => 'Users imported successfully']);
    }

    /**
     * Download user import template.
     */
    public function importTemplate(Request $request)
    {
        $this->authorize('create', User::class);

        $format = $request->input('format', 'csv');
        if (!in_array($format, ['csv', 'xlsx'], true)) {
            return response()->json(['message' => 'Invalid format'], 422);
        }

        $filename = 'users_import_template_' . now()->format('Ymd_His') . '.' . $format;

        return Excel::download(new UserImportTemplateExport(), $filename);
    }
}
