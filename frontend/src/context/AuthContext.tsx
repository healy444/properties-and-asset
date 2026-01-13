import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api/axios';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const response = await api.get('/me');
            console.log('AuthContext: User refreshed', response.data);
            setUser(response.data);
        } catch (error) {
            console.error('AuthContext: Refresh user failed', error);
            localStorage.removeItem('auth_token');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        console.log('AuthContext: Mounting');
        refreshUser();
    }, []);

    const login = async (credentials: any) => {
        const response = await api.post('/login', credentials);
        const token = response.data?.token;
        const loggedInUser = response.data?.user ?? response.data ?? null;
        if (token) {
            localStorage.setItem('auth_token', token);
        }
        setUser(loggedInUser);
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            console.error('AuthContext: Logout failed', error);
        } finally {
            localStorage.removeItem('auth_token');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
