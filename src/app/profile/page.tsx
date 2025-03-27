'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userProfile } from '@/services/api';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

// CSS for toggle switch
import './profile.css';

// Define interface for form data
interface ProfileFormData {
  fullName: string;
  bio: string;
  imageUrl: string;
  readingGoal: number | string;
  isPublicProfile: boolean;
  preferredLanguage: string;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  
  // Initial form data
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    bio: '',
    imageUrl: '',
    readingGoal: '',
    isPublicProfile: false,
    preferredLanguage: ''
  });

  // State for tracking character count
  const [bioCharCount, setBioCharCount] = useState(0);

  // Update character count when bio changes
  useEffect(() => {
    setBioCharCount(formData.bio.length);
  }, [formData.bio]);

  // Fetch profile data when component mounts
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchProfile();
      }
    }
  }, [user, authLoading, router]);

  // Fetch profile data from API
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const profileData = await userProfile.getUserProfile();
      
      setFormData({
        fullName: profileData.fullName || '',
        bio: profileData.bio || '',
        imageUrl: profileData.userImageUrl || '',
        readingGoal: profileData.readingGoal || '',
        isPublicProfile: profileData.isPublicProfile,
        preferredLanguage: profileData.preferredLanguage || ''
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs specially
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
      return;
    }
    
    // If URL changes, reset the image error state
    if (name === 'imageUrl') {
      setImageError(null);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Create data object for API
      const profileData = {
        fullName: formData.fullName,
        bio: formData.bio,
        userImageUrl: formData.imageUrl,
        readingGoal: formData.readingGoal === '' ? undefined : Number(formData.readingGoal),
        isPublicProfile: formData.isPublicProfile,
        preferredLanguage: formData.preferredLanguage
      };
      
      await userProfile.updateProfile(profileData);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get user's initial for the avatar
  const userInitial = (formData.fullName || user?.username || 'U').charAt(0).toUpperCase();
  const hasValidImage = formData.imageUrl && !imageError;

  // If loading show spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md form-card">
        <div className="flex items-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#365f60] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Profile updated successfully!</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 section-heading">Basic Information</h2>
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  {/* Profile Image Preview */}
                  <div className="w-32 h-32 rounded-full overflow-hidden flex-shrink-0 border-2 border-[#365f60]/20">
                    {hasValidImage ? (
                      <img 
                        src={formData.imageUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={() => setImageError('Failed to load image')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#365f60]/10 text-[#365f60] text-4xl font-bold">
                        {userInitial}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full">
                    <div>
                      <label htmlFor="fullName" className="flex items-center text-sm font-medium text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#365f60] focus:ring-[#365f60]"
                      />
                    </div>
                    
                    <div className="mt-4">
                      <label htmlFor="imageUrl" className="flex items-center text-sm font-medium text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Profile Image URL
                      </label>
                      <input
                        type="text"
                        id="imageUrl"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        placeholder="https://example.com/your-image.jpg"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#365f60] focus:ring-[#365f60]"
                      />
                      {imageError && (
                        <p className="mt-1 text-sm text-red-500">{imageError}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="bio" className="flex items-center text-sm font-medium text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Bio
                  </label>
                  <div className="relative mt-1">
                    <textarea
                      id="bio"
                      name="bio"
                      rows={3}
                      maxLength={500}
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Tell us about yourself as a reader..."
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#365f60] focus:ring-[#365f60]"
                    />
                    <div className="char-counter">
                      {bioCharCount}/500
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Reading Preferences */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 section-heading">Reading Preferences</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div>
                  <label htmlFor="readingGoal" className="flex items-center text-sm font-medium text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Annual Reading Goal: <span className="ml-2 font-semibold text-[#365f60]">{formData.readingGoal || 1} books</span>
                  </label>
                  
                  <div className="mt-2 px-1">
                    <input
                      type="range"
                      id="readingGoal"
                      name="readingGoal"
                      value={formData.readingGoal || 1}
                      onChange={handleChange}
                      min="1"
                      max="100"
                      step="1"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#365f60]"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                      <span>1</span>
                      <span>20</span>
                      <span>40</span>
                      <span>60</span>
                      <span>80</span>
                      <span>100</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Set a goal for how many books you want to read this year</p>
                </div>
              </div>
            </div>
            
            {/* Social Features */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 section-heading">Social Features</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <label htmlFor="isPublicProfile" className="block text-sm font-medium text-gray-700">
                        Profile Visibility
                      </label>
                    </div>
                    <div className="relative inline-block w-12 mr-2 align-middle select-none">
                      <input 
                        type="checkbox" 
                        id="isPublicProfile" 
                        name="isPublicProfile" 
                        checked={formData.isPublicProfile}
                        onChange={handleChange}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#365f60]"
                      />
                      <label 
                        htmlFor="isPublicProfile" 
                        className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.isPublicProfile ? 'bg-[#365f60]' : 'bg-gray-300'}`}
                      ></label>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {formData.isPublicProfile 
                      ? "Your profile is public and can be viewed by anyone" 
                      : "Your profile is private and only visible to you"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#365f60]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#365f60] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="small" color="#ffffff" />
                  <span className="ml-2">Saving...</span>
                </>
              ) : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 