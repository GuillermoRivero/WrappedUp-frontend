'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api, { auth } from '@/services/api';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, username?: string) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Function to check authentication status
  const checkAuth = async () => {
    console.log('Starting auth check...');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No auth token found in localStorage');
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      console.log('Token found in localStorage, length:', token.length);
      console.log('First 20 chars of token:', token.substring(0, 20) + '...');
      
      // Ensure the token is set in the Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Attempt to verify the token by calling getCurrentUser
      try {
        console.log('Verifying token by calling getCurrentUser');
        const userData = await auth.getCurrentUser();
        console.log('Auth check successful, user data:', userData);
        
        // Ensure the user state is updated
        if (JSON.stringify(userData) !== JSON.stringify(user)) {
          console.log('User data changed, updating state');
          setUser(userData);
        } else {
          console.log('User data unchanged');
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        // Clear invalid token
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      console.log('Auth check complete, setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Initial authentication check on component mount
  useEffect(() => {
    checkAuth();
    
    // Add storage event listener to sync auth state across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'token') {
        if (event.newValue) {
          // Token was added in another tab
          checkAuth();
        } else {
          // Token was removed in another tab
          setUser(null);
        }
      }
    };
    
    // Handle auth-specific events
    const handleAuthEvent = (event: Event) => {
      console.log('Auth event received:', event.type);
      
      if (event.type === 'auth-logout') {
        console.log('Auth logout event received, clearing user state');
        setUser(null);
        setIsLoading(false);
      } else if (event.type === 'auth-login-success' || event.type === 'auth-register-success') {
        console.log('Auth login/register event received, checking auth state');
        checkAuth();
      }
    };
    
    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-logout', handleAuthEvent);
    window.addEventListener('auth-login-success', handleAuthEvent);
    window.addEventListener('auth-register-success', handleAuthEvent);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-logout', handleAuthEvent);
      window.removeEventListener('auth-login-success', handleAuthEvent);
      window.removeEventListener('auth-register-success', handleAuthEvent);
    };
  }, []);

  // Efecto para manejar redirecciones basadas en autenticación
  useEffect(() => {
    if (!isLoading) {
      const isAuthRoute = pathname === '/login' || pathname === '/register';
      const isPublicWishlist = pathname.startsWith('/wishlist/') && pathname !== '/wishlist';
      const token = localStorage.getItem('token');

      console.log('Auth state check:', { 
        pathname, 
        isAuthRoute, 
        hasToken: !!token, 
        hasUser: !!user, 
        isLoading 
      });

      if (!token && !isAuthRoute && pathname !== '/' && !isPublicWishlist) {
        console.log('No token detected, redirecting to login');
        router.push('/login');
      } else if (token && user && isAuthRoute) {
        console.log('User is authenticated and on auth route, redirecting to home');
        router.push('/');
      }
    }
  }, [isLoading, user, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      setError(null); // Clear any previous errors
      setUser(null); // Clear current user
      localStorage.removeItem('token'); // Clear existing token
      setIsLoading(true); // Start loading
      
      console.log('Attempting login with email:', email);
      
      // Perform login request
      const userData = await auth.login(email, password);
      
      // Verify that token was actually set in localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Login failed: Token not set in localStorage after login');
        throw new Error('Login failed: Token not set in localStorage');
      }
      
      console.log('Login successful, setting user data:', userData);
      
      // Set user data and authorization header
      setUser(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Dispatch events to notify other components
      window.dispatchEvent(new Event('auth-login-success'));
      
      // Complete loading
      setIsLoading(false);
      
      return userData;
    } catch (error: any) {
      console.error('Login error:', error);
      setUser(null);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setIsLoading(false);
      setError(error);
      throw error;
    }
  };

  const register = async (email: string, password: string, username?: string) => {
    try {
      // First clear any existing user and token
      setUser(null);
      localStorage.removeItem('token');
      setIsLoading(true);
      
      console.log('Attempting registration with email:', email);
      const userData = await auth.register(email, password, username);
      
      // Verify that token was actually set in localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Registration failed: Token not set in localStorage after registration');
        throw new Error('Registration failed: Token not set in localStorage');
      }
      
      console.log('Registration successful, setting user data:', userData);
      
      // Set the user data and manually set the Authorization header
      setUser(userData);
      
      // Ensure headers are set correctly for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Important: Dispatch a custom event to notify other components
      window.dispatchEvent(new Event('auth-register-success'));
      window.dispatchEvent(new Event('storage'));
      
      // Small timeout to ensure state updates are processed
      setTimeout(() => {
        setIsLoading(false);
        console.log('Auth state after registration:', { userData, hasToken: !!token });
      }, 100);
      
      return userData;
    } catch (error) {
      console.error('Registration error:', error);
      setIsLoading(false);
      // Let the error propagate up to AuthForm for handling
      throw error;
    }
  };

  const logout = () => {
    console.log('Logging out, removing user data and token');
    auth.logout();
    setUser(null);
    
    // Force a redirect after logout
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-gray-500 text-sm">Loading authentication state...</div>
        <div className="text-gray-400 text-xs mt-2">
          Token: {localStorage.getItem('token') ? 'Present' : 'Not found'}
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, error }}>
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