'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-[#365f60] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center" onClick={closeMenu}>
              <span className="text-xl font-bold">WrappedUp</span>
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {user ? (
              <>
                <Link 
                  href="/reviews" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/reviews') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                >
                  Reviews
                </Link>
                <Link 
                  href="/wraps" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/wraps') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                >
                  Wraps
                </Link>
                <button 
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-[#2a4a4b] hover:text-white flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/login') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/register') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                >
                  Register
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-[#2a4a4b] focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {user ? (
              <>
                <Link 
                  href="/reviews" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/reviews') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  Reviews
                </Link>
                <Link 
                  href="/wraps" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/wraps') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  Wraps
                </Link>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[#2a4a4b] hover:text-white flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/login') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/register') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 