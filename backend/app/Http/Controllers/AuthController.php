<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\AuditLogService;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $loginField = $request->has('login') ? 'login' : 'username';

        $request->validate([
            $loginField => ['required'],
            'password' => ['required'],
        ]);

        $login = $request->input($loginField);
        $password = $request->input('password');

        if (
            Auth::attempt(['username' => $login, 'password' => $password]) ||
            Auth::attempt(['email' => $login, 'password' => $password])
        ) {
            $request->session()->regenerate();
            $user = Auth::user();

            if (!$user->is_active) {
                Auth::logout();
                return response()->json(['message' => 'Account is deactivated'], 403);
            }

            $token = $user->createToken('auth_token')->plainTextToken;
            $audit = app(AuditLogService::class);
            $audit->log('LOGIN', 'User', Auth::id(), null, ['ip' => $request->ip()]);

            return response()->json(['user' => $user, 'token' => $token]);
        }

        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    public function logout(Request $request)
    {
        $audit = app(AuditLogService::class);
        $audit->log('LOGOUT', 'User', Auth::id(), null, ['ip' => $request->ip()]);

        $request->user()?->currentAccessToken()?->delete();
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return $request->user();
    }
}
