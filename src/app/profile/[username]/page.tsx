'use client';

import { useState, useEffect } from 'react';
import { userProfile } from '@/services/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserProfileData {
  username: string;
  email: string;
  fullName?: string;
  bio?: string;
  userImageUrl?: string;
  favoriteGenres?: string[];
  readingGoal?: number;
  preferredLanguage?: string;
  isPublicProfile: boolean;
  socialLinks?: Record<string, string>;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function fetchPublicProfile() {
      try {
        setLoading(true);
        const data = await userProfile.getPublicProfile(username);
        setProfile(data);
      } catch (err: any) {
        console.error('Error fetching public profile:', err);
        if (err.response?.status === 404) {
          setError('Profile not found or not public');
        } else {
          setError('An error occurred while loading the profile');
        }
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      fetchPublicProfile();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 text-center">Profile Not Available</h1>
          <p className="text-gray-600 text-center mb-6">
            {error || 'This profile is either set to private or does not exist.'}
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => router.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get user's initial for the avatar fallback
  const userInitial = (profile.fullName || profile.username || 'U').charAt(0).toUpperCase();
  const hasValidImage = profile.userImageUrl && !imageError;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col items-center mb-6 sm:flex-row sm:items-start">
          <div className="w-32 h-32 rounded-full overflow-hidden flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
            {hasValidImage ? (
              <img 
                src={profile.userImageUrl} 
                alt={`${profile.username}'s profile`} 
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-800 text-4xl font-bold">
                {userInitial}
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.fullName || profile.username}
            </h1>
            <p className="text-gray-500 mb-2">@{profile.username}</p>
            {profile.location && (
              <p className="text-gray-500 mb-4">
                <span className="inline-block mr-1">📍</span>
                {profile.location}
              </p>
            )}
          </div>
        </div>

        {profile.bio && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Bio</h2>
            <p className="text-gray-600">{profile.bio}</p>
          </div>
        )}

        {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Favorite Genres</h2>
            <div className="flex flex-wrap gap-2">
              {profile.favoriteGenres.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {profile.readingGoal && (
            <div>
              <h2 className="text-lg font-semibold mb-2 text-gray-800">Annual Reading Goal</h2>
              <p className="text-gray-600">{profile.readingGoal} books</p>
            </div>
          )}

          {profile.preferredLanguage && (
            <div>
              <h2 className="text-lg font-semibold mb-2 text-gray-800">Preferred Language</h2>
              <p className="text-gray-600">{profile.preferredLanguage}</p>
            </div>
          )}
        </div>

        {profile.socialLinks && Object.entries(profile.socialLinks).some(([_, value]) => value) && (
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Connect</h2>
            <div className="flex flex-wrap gap-3">
              {profile.socialLinks.twitter && (
                <a 
                  href={profile.socialLinks.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Twitter
                </a>
              )}
              {profile.socialLinks.instagram && (
                <a 
                  href={profile.socialLinks.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Instagram
                </a>
              )}
              {profile.socialLinks.goodreads && (
                <a 
                  href={profile.socialLinks.goodreads} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Goodreads
                </a>
              )}
              {profile.socialLinks.linkedin && (
                <a 
                  href={profile.socialLinks.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  LinkedIn
                </a>
              )}
              {profile.socialLinks.website && (
                <a 
                  href={profile.socialLinks.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Website
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Back
          </button>
          
          <Link 
            href={`/wishlist/${profile.username}`} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Wishlist
          </Link>
        </div>
      </div>
    </div>
  );
} 