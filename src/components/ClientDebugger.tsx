'use client';

import { useEffect } from 'react';

export default function ClientDebugger() {
  // Add debugging for page loads/refreshes
  useEffect(() => {
    console.log('Root layout mounted - page loaded/refreshed');
    
    // Check if there's a token in localStorage on page load
    const token = localStorage.getItem('token');
    console.log('Initial auth check - token exists:', !!token);
    
    // Listen for auth-related events
    const handleAuthEvent = (event: Event) => {
      console.log('Auth event detected:', event.type);
    };
    
    window.addEventListener('auth-login-success', handleAuthEvent);
    window.addEventListener('auth-register-success', handleAuthEvent);
    window.addEventListener('storage', handleAuthEvent);
    
    return () => {
      window.removeEventListener('auth-login-success', handleAuthEvent);
      window.removeEventListener('auth-register-success', handleAuthEvent);
      window.removeEventListener('storage', handleAuthEvent);
    };
  }, []);
  
  // Return nothing visible - this component just sets up event listeners
  return null;
} 