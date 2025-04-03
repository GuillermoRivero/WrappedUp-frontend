'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userProfile } from '@/services/api';
import { BookOpenIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface OnboardingWizardProps {
  username: string;
}

interface FormData {
  fullName: string;
  bio: string;
  favoriteGenres: string[];
  readingGoal: number;
  preferredLanguage: string;
}

const steps = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'personal', title: 'About You' },
  { id: 'genres', title: 'Favorite Genres' },
  { id: 'goals', title: 'Reading Goals' },
  { id: 'complete', title: 'All Set!' },
];

// Pre-defined genre options
const genreOptions = [
  'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 
  'Thriller', 'Romance', 'Historical Fiction', 'Biography', 'Self-Help',
  'Business', 'Poetry', 'Horror', 'Young Adult', 'Children\'s Books'
];

// Animation variants
const pageVariants = {
  hidden: { opacity: 0, x: 100 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 }
};

export default function OnboardingWizard({ username }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    bio: '',
    favoriteGenres: [],
    readingGoal: 12,
    preferredLanguage: 'English',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(true);

  // Load user profile data on mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const profileData = await userProfile.getUserProfile();
        if (profileData && profileData.fullName) {
          // If the user already has a profile with a name, consider it complete
          setFormData({
            fullName: profileData.fullName || '',
            bio: profileData.bio || '',
            favoriteGenres: profileData.favoriteGenres || [],
            readingGoal: profileData.readingGoal || 12,
            preferredLanguage: profileData.preferredLanguage || 'English',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfileData();
  }, []);

  // Check if current step is valid
  const isCurrentStepValid = (): boolean => {
    switch(currentStep) {
      case 0: // Welcome screen - always valid
        return true;
      case 1: // Personal information
        return !!formData.fullName.trim();
      case 2: // Genres
        return formData.favoriteGenres.length > 0;
      case 3: // Reading goals - always valid as it has a default
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleGenreToggle = (genre: string) => {
    if (formData.favoriteGenres.includes(genre)) {
      setFormData({
        ...formData,
        favoriteGenres: formData.favoriteGenres.filter(g => g !== genre)
      });
    } else {
      setFormData({
        ...formData,
        favoriteGenres: [...formData.favoriteGenres, genre]
      });
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    try {
      await userProfile.updateProfile({
        fullName: formData.fullName,
        bio: formData.bio,
        favoriteGenres: formData.favoriteGenres,
        readingGoal: formData.readingGoal,
        preferredLanguage: formData.preferredLanguage,
      });
      // Go to the final step
      setCurrentStep(steps.length - 1);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle finishing the wizard (Get Started button)
  const handleFinishWizard = () => {
    // Hide the wizard
    setShowWizard(false);
    
    // Reload the page to refresh the profile state in the parent component
    window.location.reload();
  };

  // If wizard should be hidden, don't render anything
  if (!showWizard) {
    return null;
  }
  
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Progress bar */}
      <div className="w-full max-w-3xl mb-8">
        <div className="relative h-20">
          {/* Progress bar positioned exactly in the middle of the circles */}
          <div className="absolute inset-x-0 top-3 h-3 overflow-hidden rounded bg-gray-200 z-0">
            <div 
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              className="h-full bg-[#365f60] transition-all duration-500 ease-in-out"
            ></div>
          </div>
          
          {/* Step circles and labels positioned on top of progress bar */}
          <div className="absolute inset-x-0 top-0 flex justify-between z-10">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className="flex flex-col items-center"
                onClick={() => {
                  if (index < currentStep) {
                    setCurrentStep(index);
                  }
                }}
              >
                <div 
                  className={`
                    flex items-center justify-center w-9 h-9 rounded-full border-2 border-white
                    ${index <= currentStep ? 'bg-[#365f60] text-white' : 'bg-gray-200 text-gray-500'} 
                    cursor-pointer transition-all duration-300 shadow-md
                  `}
                >
                  {index < currentStep ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className={`text-xs mt-1 ${index <= currentStep ? 'text-[#365f60]' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="bg-white shadow-xl rounded-lg p-4 md:p-8 w-full max-w-3xl min-h-[400px] relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={pageVariants}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.5 }}
            className="absolute inset-0 p-4 md:p-8 flex flex-col"
          >
            {/* Step 1: Welcome */}
            {currentStep === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 md:space-y-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <BookOpenIcon className="h-16 w-16 md:h-24 md:w-24 text-[#365f60]" />
                </motion.div>
                <motion.h2 
                  className="text-2xl md:text-3xl font-bold text-[#365f60]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  Welcome to WrappedUp, {username}!
                </motion.h2>
                <motion.p 
                  className="text-base md:text-lg text-[#8aa4a9] max-w-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  Are you ready to track your reading journey and discover new books?
                </motion.p>
              </div>
            )}
            
            {/* Step 2: Personal Information */}
            {currentStep === 1 && (
              <div className="flex flex-col h-full">
                <h2 className="text-xl md:text-2xl font-bold text-[#365f60] mb-4 md:mb-6">Tell us about yourself</h2>
                <div className="space-y-3 md:space-y-4 flex-grow">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-[#8aa4a9]">
                      What should we call you? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#365f60] focus:border-[#365f60]"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-[#8aa4a9]">
                      Share a bit about yourself and your reading interests
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={3}
                      value={formData.bio}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#365f60] focus:border-[#365f60]"
                      placeholder="I love reading because..."
                    />
                  </div>
                  <div>
                    <label htmlFor="preferredLanguage" className="block text-sm font-medium text-[#8aa4a9]">
                      Preferred reading language
                    </label>
                    <select
                      id="preferredLanguage"
                      name="preferredLanguage"
                      value={formData.preferredLanguage}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#365f60] focus:border-[#365f60]"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Japanese">Japanese</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 md:mt-4"><span className="text-red-500">*</span> Required field</p>
                </div>
              </div>
            )}
            
            {/* Step 3: Favorite Genres */}
            {currentStep === 2 && (
              <div className="flex flex-col h-full">
                <h2 className="text-xl md:text-2xl font-bold text-[#365f60] mb-4 md:mb-6">What types of books do you enjoy? <span className="text-red-500">*</span></h2>
                <p className="text-xs md:text-sm text-[#8aa4a9] mb-3 md:mb-4">Select your favorite genres to help us personalize your experience. Please select at least one.</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreToggle(genre)}
                      className={`
                        px-2 py-1 md:px-3 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200
                        ${formData.favoriteGenres.includes(genre)
                          ? 'bg-[#365f60] text-white' 
                          : 'bg-gray-100 text-[#8aa4a9] hover:bg-gray-200'}
                      `}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <p className="text-xs md:text-sm text-[#8aa4a9]">
                    Selected: {formData.favoriteGenres.length ? formData.favoriteGenres.join(', ') : 'None'}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2 md:mt-4"><span className="text-red-500">*</span> Required field</p>
              </div>
            )}
            
            {/* Step 4: Reading Goals */}
            {currentStep === 3 && (
              <div className="flex flex-col h-full">
                <h2 className="text-xl md:text-2xl font-bold text-[#365f60] mb-3 md:mb-6">Set your reading goals</h2>
                <p className="text-xs md:text-sm text-[#8aa4a9] mb-4 md:mb-6">
                  Setting a goal can help motivate your reading journey. How many books would you like to read this year?
                </p>
                
                {/* Slider for reading goal selection */}
                <div className="mt-2 md:mt-4 space-y-4">
                  <div className="flex justify-center">
                    <div className="text-center">
                      <div className="text-3xl md:text-4xl font-bold text-[#365f60]">
                        {formData.readingGoal >= 100 ? "100+" : formData.readingGoal}
                      </div>
                      <div className="text-xs md:text-sm text-[#8aa4a9]">books per year</div>
                    </div>
                  </div>
                  
                  <div className="w-full px-2">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={formData.readingGoal > 100 ? 100 : formData.readingGoal}
                      onChange={(e) => setFormData({...formData, readingGoal: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#365f60]"
                    />
                    <div className="flex justify-between text-xs text-[#8aa4a9] mt-1">
                      <span>1</span>
                      <span>25</span>
                      <span>50</span>
                      <span>75</span>
                      <span>100+</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 md:mt-8">
                  <div className="text-xs md:text-sm text-[#8aa4a9] mb-2">That's about:</div>
                  <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                    <div className="bg-gray-100 p-2 md:p-3 rounded-lg">
                      <div className="font-medium text-sm md:text-base text-[#365f60]">{Math.ceil(formData.readingGoal / 12)}</div>
                      <div className="text-[10px] md:text-xs text-[#8aa4a9]">per month</div>
                    </div>
                    <div className="bg-gray-100 p-2 md:p-3 rounded-lg">
                      <div className="font-medium text-sm md:text-base text-[#365f60]">
                        {Math.round(365 / formData.readingGoal)}
                      </div>
                      <div className="text-[10px] md:text-xs text-[#8aa4a9]">days per book</div>
                    </div>
                    <div className="bg-gray-100 p-2 md:p-3 rounded-lg">
                      <div className="font-medium text-sm md:text-base text-[#365f60]">{Math.ceil(formData.readingGoal * 20)}</div>
                      <div className="text-[10px] md:text-xs text-[#8aa4a9]">pages/week*</div>
                    </div>
                  </div>
                  <p className="text-[10px] md:text-xs text-[#8aa4a9] mt-1 md:mt-2">*Based on average book length of 300 pages</p>
                </div>
              </div>
            )}
            
            {/* Step 5: Complete */}
            {currentStep === 4 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 md:space-y-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-full bg-green-100 p-2 md:p-3"
                >
                  <CheckCircleIcon className="h-12 w-12 md:h-16 md:w-16 text-green-500" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#365f60]">You're all set!</h2>
                <p className="text-base md:text-lg text-[#8aa4a9] max-w-md">
                  Thank you for completing your profile. Your reading journey starts now!
                </p>
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  onClick={handleFinishWizard}
                  className="mt-4 md:mt-6 px-4 py-2 md:px-6 md:py-3 bg-[#365f60] text-white rounded-md font-medium hover:bg-[#2a4b4c] shadow-md"
                >
                  Get Started
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation buttons - MOVED COMPLETELY OUTSIDE THE CARD */}
      <div className="mt-4 md:mt-6 flex justify-between w-full max-w-3xl">
        {/* Back button */}
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 0 || currentStep === steps.length - 1}
          className={`
            px-4 py-2 md:px-6 md:py-3 rounded-md text-xs md:text-sm font-bold shadow-md
            ${currentStep > 0 && currentStep < steps.length - 1 
              ? 'bg-white text-[#365f60] hover:bg-gray-100 cursor-pointer border border-[#365f60]' 
              : 'opacity-0 cursor-default pointer-events-none'}
          `}
        >
          ← Back
        </button>
        
        {/* Next button */}
        {currentStep < steps.length - 2 && (
          <button
            type="button"
            onClick={handleNextStep}
            disabled={!isCurrentStepValid()}
            className={`
              px-4 py-2 md:px-6 md:py-3 rounded-md text-xs md:text-sm font-bold shadow-md
              ${isCurrentStepValid() 
                ? 'bg-[#365f60] text-white hover:bg-[#2a4b4c] cursor-pointer active:bg-[#1d3536]' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
            `}
          >
            Next →
          </button>
        )}
        
        {/* Complete button (now "Next" for consistency) */}
        {currentStep === steps.length - 2 && (
          <button
            type="button"
            onClick={handleCompleteOnboarding}
            disabled={isLoading || !isCurrentStepValid()}
            className={`
              px-4 py-2 md:px-6 md:py-3 rounded-md text-xs md:text-sm font-bold flex items-center shadow-md
              ${isCurrentStepValid() && !isLoading
                ? 'bg-[#365f60] text-white hover:bg-[#2a4b4c] cursor-pointer active:bg-[#1d3536]' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 md:h-4 md:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Next →'
            )}
          </button>
        )}
      </div>
    </div>
  );
} 