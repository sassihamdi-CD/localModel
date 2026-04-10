"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';

// User type definition
interface User {
    id: number;
    email: string;
    name: string;
    department?: string;
    status: string;
    roles?: string[];
    permissions?: string[];
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (tokens: { access_token: string; refresh_token: string }) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Load user on start
    useEffect(() => {
        async function loadUser() {
            const accessToken = localStorage.getItem('access_token');

            if (accessToken) {
                try {
                    // Verify token and get user details
                    const response = await api.get('/users/me');
                    setUser(response.data);
                } catch (error) {
                    console.error('Failed to load user:', error);
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                }
            }

            setIsLoading(false);
        }

        loadUser();
    }, []);

    // Login function
    const login = async (tokens: { access_token: string; refresh_token: string }) => {
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);

        try {
            const response = await api.get('/users/me');
            setUser(response.data);
            toast.success('Login successful!');
            // Navigate after the current render cycle so the updated user state
            // is committed before the dashboard layout checks it.
            setTimeout(() => router.push('/dashboard'), 0);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            toast.error('Login failed. Please try again.');
        }
    };

    // Logout function
    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                // Call backend logout asynchronously but don't wait for it
                api.post('/auth/logout', { refresh_token: refreshToken }).catch(console.error);
            }
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
            router.push('/login');
            toast.info('Logged out successfully.');
        }
    };

    const value = {
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
