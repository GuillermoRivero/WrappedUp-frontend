'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { userProfile } from '@/services/api';

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch user profile image when user is available
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (user) {
        try {
          const profileData = await userProfile.getUserProfile();
          setProfileImageUrl(profileData.userImageUrl || '');
        } catch (error) {
          console.error('Failed to fetch profile image:', error);
        }
      }
    };
    
    fetchProfileImage();
  }, [user]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
    setDropdownOpen(false);
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const closeDropdown = () => {
    setDropdownOpen(false);
  };

  // Generate user's initials for avatar fallback
  const getUserInitial = () => {
    if (!user) return '';
    return (user.username || 'U').charAt(0).toUpperCase();
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
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Reviews
                  </span>
                </Link>
                <Link 
                  href="/wraps" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/wraps') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Wraps
                  </span>
                </Link>
                <Link 
                  href="/wishlist" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/wishlist') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Wishlist
                  </span>
                </Link>
                
                {/* Profile dropdown */}
                <div className="relative ml-3">
                  <div>
                    <button
                      onClick={toggleDropdown}
                      className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2a4a4b] focus:ring-white"
                      id="user-menu"
                      aria-expanded="false"
                      aria-haspopup="true"
                    >
                      <span className="sr-only">Open user menu</span>
                      {profileImageUrl ? (
                        <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-white">
                          <img
                            className="h-full w-full object-cover"
                            src={profileImageUrl}
                            alt={user?.username || 'User'}
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              if (img.nextElementSibling instanceof HTMLElement) {
                                img.style.display = 'none';
                                img.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div 
                            className="h-full w-full flex items-center justify-center bg-white text-[#365f60] text-sm font-medium"
                            style={{ display: 'none' }}
                          >
                            {getUserInitial()}
                          </div>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-white bg-white text-[#365f60] flex items-center justify-center text-sm font-medium">
                          {getUserInitial()}
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu"
                    >
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                        <p className="font-medium">{user?.username}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={closeDropdown}
                      >
                        Your Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/login') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login
                  </span>
                </Link>
                <Link 
                  href="/register" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/register') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Register
                  </span>
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
                {/* User info for mobile */}
                <div className="px-3 py-2 flex items-center space-x-3 border-b border-[#2a4a4b] pb-2 mb-2">
                  {profileImageUrl ? (
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white">
                      <img
                        className="h-full w-full object-cover"
                        src={profileImageUrl}
                        alt={user?.username || 'User'}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (img.nextElementSibling instanceof HTMLElement) {
                            img.style.display = 'none';
                            img.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                      <div 
                        className="h-full w-full flex items-center justify-center bg-white text-[#365f60] text-sm font-medium"
                        style={{ display: 'none' }}
                      >
                        {getUserInitial()}
                      </div>
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white bg-white text-[#365f60] flex items-center justify-center text-sm font-medium">
                      {getUserInitial()}
                    </div>
                  )}
                  <div className="text-white">
                    <p className="font-medium text-sm">{user?.username}</p>
                    <p className="text-xs text-gray-300 truncate">{user?.email}</p>
                  </div>
                </div>
                <Link 
                  href="/reviews" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/reviews') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Reviews
                  </span>
                </Link>
                <Link 
                  href="/wraps" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/wraps') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Wraps
                  </span>
                </Link>
                <Link 
                  href="/wishlist" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/wishlist') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Wishlist
                  </span>
                </Link>
                <Link 
                  href="/profile" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/profile') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Your Profile
                  </span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[#2a4a4b] hover:text-white flex items-center text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/login') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login
                  </span>
                </Link>
                <Link 
                  href="/register" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/register') ? 'bg-[#2a4a4b] text-white' : 'hover:bg-[#2a4a4b] hover:text-white'}`}
                  onClick={closeMenu}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Register
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 