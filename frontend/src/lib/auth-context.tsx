'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api-client';
import type { User } from '@/types/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token') || 
        document.cookie.split('; ').find(c => c.startsWith('token='))?.split('=')[1];
      if (storedToken) {
        setToken(storedToken);
        localStorage.setItem('token', storedToken);
        try {
          const response = await api.get<User>('/api/v1/users/me');
          setUser(response.data);
        } catch {
          localStorage.removeItem('token');
          document.cookie = 'token=; path=/; max-age=0';
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
    if (user && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: User }>('/api/v1/auth/login', {
      email,
      password,
    });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('token', newToken);
    document.cookie = `token=${newToken}; path=/; max-age=86400`;
    setToken(newToken);
    setUser(newUser);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; max-age=0';
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}