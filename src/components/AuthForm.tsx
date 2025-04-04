'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { login, register, error: contextError, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: mode === 'register' ? '' : undefined,
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Display any errors from the auth context
  useEffect(() => {
    if (contextError) {
      setLocalError(contextError.message || 'Authentication failed. Please try again.');
    }
  }, [contextError]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      console.log(`Starting ${mode} process...`);
      
      if (mode === 'login') {
        await login(formData.email, formData.password);
        console.log('Login successful, will redirect automatically');
      } else {
        if (formData.name) {
          await register(formData.email, formData.password, formData.name);
          console.log('Registration successful, will redirect automatically');
        } else {
          setLocalError('Name is required');
          setLoading(false);
          return;
        }
      }
      
      // No need to redirect here - the AuthContext will handle it
      
    } catch (err: any) {
      console.error('Authentication error details:', err);
      
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        console.error('Server response:', status, data);
        
        // Handle specific error messages from the backend
        if (status === 401) {
          setLocalError('Invalid email or password. Please try again.');
        } else if (status === 400 && data?.message) {
          setLocalError(data.message);
        } else {
          setLocalError(err.message || 'Authentication failed. Please try again.');
        }
      } else {
        setLocalError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Display the error message if there is one
  const errorMessage = localError || (contextError ? contextError.message : null);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="card">
          <div>
            <h2 className="text-center text-3xl font-extrabold text-[#365f60]">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-center text-sm text-[#8aa4a9]">
              {mode === 'login' 
                ? 'Sign in to continue to WrappedUp' 
                : 'Join WrappedUp to track your content'}
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-4 py-3 rounded-md flex items-start" role="alert">
                <svg className="h-5 w-5 text-[#dc2626] mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-3a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  <path d="M10 6a1 1 0 00-1 1v4a1 1 0 002 0V7a1 1 0 00-1-1z" />
                </svg>
                <span className="block">{errorMessage}</span>
              </div>
            )}
            <div className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#365f60] mb-1">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#365f60] mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#365f60] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="input-field pr-10"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8aa4a9] hover:text-[#365f60] transition-colors"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <Link
              href={mode === 'login' ? '/register' : '/login'}
              className="text-sm text-[#8aa4a9] hover:text-[#63b4b7] transition-colors duration-200"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 