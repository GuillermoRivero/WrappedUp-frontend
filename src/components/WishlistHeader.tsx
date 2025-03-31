'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { userProfile } from '@/services/api';

interface WishlistHeaderProps {
  username: string;
  isPersonal: boolean;
  itemCount: number;
  sortBy: 'priority' | 'date' | 'title';
  sortDirection: 'asc' | 'desc';
  onSortChange: (sortBy: 'priority' | 'date' | 'title', sortDirection: 'asc' | 'desc') => void;
  onAddClick?: () => void;
}

export default function WishlistHeader({
  username,
  isPersonal,
  itemCount,
  sortBy,
  sortDirection,
  onSortChange,
  onAddClick
}: WishlistHeaderProps) {
  const [copySuccess, setCopySuccess] = useState('');
  const shareUrlRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string>('');
  const [profileName, setProfileName] = useState<string>('');

  // Fetch profile info for both personal and public wishlist
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        let profile;
        if (isPersonal) {
          profile = await userProfile.getUserProfile();
        } else {
          profile = await userProfile.getPublicProfile(username);
        }
        
        if (profile) {
          // Set profile image if available
          if (profile.userImageUrl) {
            setProfileImage(profile.userImageUrl);
          }
          
          // Set profile name if available, otherwise use username
          if (profile.fullName) {
            setProfileName(profile.fullName);
          } else {
            setProfileName(username);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        // Fall back to username if profile fetch fails
        setProfileName(username);
      }
    };
    
    fetchUserProfile();
  }, [isPersonal, username]);

  // Get the public share URL for this wishlist
  const getShareUrl = (): string => {
    if (!username) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/wishlist/${username}`;
  };

  // Copy share URL to clipboard
  const copyShareUrl = () => {
    if (shareUrlRef.current) {
      shareUrlRef.current.select();
      document.execCommand('copy');
      setCopySuccess('Copied!');
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setCopySuccess('');
      }, 3000);
    }
  };

  // Render sort button with current state indication
  const renderSortButton = (value: 'priority' | 'date' | 'title', label: string) => (
    <button
      onClick={() => {
        if (sortBy === value) {
          onSortChange(value, sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
          onSortChange(value, 'desc'); // Default to descending for new sort
        }
      }}
      className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center ${
        sortBy === value 
          ? 'bg-[#365f60] text-white' 
          : 'bg-[#f1f5f5] text-[#365f60] hover:bg-[#e5eaec]'
      }`}
    >
      {label}
      {sortBy === value && (
        <span className="ml-1">
          {sortDirection === 'desc' ? '▼' : '▲'}
        </span>
      )}
    </button>
  );

  // Get user's initial for fallback avatar
  const getUserInitial = (): string => {
    // Use profile name if available, otherwise use username
    const nameToUse = profileName || username;
    return nameToUse.charAt(0).toUpperCase();
  };

  return (
    <>
      {/* Header with user info */}
      <div className="flex items-center mb-6">
        {/* Only show avatar for public wishlist */}
        {!isPersonal && (
          <div className="flex-shrink-0 mr-4">
            {profileImage ? (
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img 
                  src={profileImage} 
                  alt={`${profileName || username}'s profile`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    if (img.parentElement) {
                      img.parentElement.classList.add('bg-[#365f60]', 'text-white', 'flex', 'items-center', 'justify-center', 'text-xl', 'font-bold');
                      img.parentElement.textContent = getUserInitial();
                    }
                  }}
                />
              </div>
            ) : (
              <div className="bg-[#365f60] text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
                {getUserInitial()}
              </div>
            )}
          </div>
        )}
        <div className="flex-grow">
          <h1 className="text-2xl font-bold text-[#365f60]">
            {isPersonal ? 'My Wishlist' : `${profileName || username}'s Wishlist`}
          </h1>
          <p className="text-[#6b8e92]">
            {isPersonal
              ? 'Keep track of books you want to read'
              : `Books that ${profileName || username} wants to read`}
          </p>
        </div>
        
        {/* Add to Wishlist button (only for personal wishlist) */}
        {isPersonal && (
          <Link
            href="/wishlist/add"
            className="inline-flex items-center px-4 py-2 bg-[#365f60] text-white rounded-md hover:bg-[#4d797e] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add to Wishlist
          </Link>
        )}
      </div>
      
      {/* Share section (only for personal wishlist) */}
      {isPersonal && (
        <div className="bg-[#f8fafa] border border-[#e0e7e9] rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex-grow mb-3 sm:mb-0">
              <h2 className="text-[#365f60] font-medium text-sm mb-1">Share your wishlist</h2>
              <p className="text-[#6b8e92] text-sm">
                Share your public wishlist items with friends and family
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center">
              <div className="relative flex-grow mr-2">
                <input
                  ref={shareUrlRef}
                  type="text"
                  value={getShareUrl()}
                  readOnly
                  className="w-full py-2 px-3 border border-[#d1dfe2] rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#365f60]"
                />
              </div>
              <button
                onClick={copyShareUrl}
                className="p-2 bg-[#365f60] text-white rounded-md hover:bg-[#4d797e] transition-colors"
                title="Copy link"
              >
                {copySuccess ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sort and filter section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div className="mb-3 sm:mb-0">
          <p className="text-[#6b8e92]">
            {itemCount} {itemCount === 1 ? 'book' : 'books'} in wishlist
          </p>
        </div>
        <div className="flex space-x-2">
          <div className="text-[#6b8e92] mr-2 flex items-center">Sort by:</div>
          {renderSortButton('priority', 'Priority')}
          {renderSortButton('date', 'Date Added')}
          {renderSortButton('title', 'Title')}
        </div>
      </div>
    </>
  );
} 