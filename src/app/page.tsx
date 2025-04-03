'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { userProfile, wishlist as wishlistApi } from '@/services/api';
import api from '@/services/api';
import OnboardingWizard from '@/components/OnboardingWizard';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { BookOpenIcon, PencilIcon, StarIcon, BookmarkIcon } from '@heroicons/react/24/outline';

interface UserProfile {
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

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  releaseYear?: number;
  platform?: string;
  pages?: number;
  subjects?: string[];
  medium?: {
    pages?: number;
  };
  numberOfPagesMedian?: number;
  number_of_pages_median?: number;
}

interface Review {
  id: string;
  user_id: string;
  text: string;
  rating: number;
  start_date: string;
  end_date: string;
  book: Book;
}

interface WishlistItem {
  id: string;
  user: {
    id: string;
    username: string;
  };
  book: Book;
  description?: string;
  priority: number;
  public: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  booksRead: number;
  pagesRead: number;
  reviewsWritten: number;
  wishlistItems: number;
  favoriteGenre: string | null;
  currentlyReading: Array<{
    id: string;
    title: string;
    author: string;
    coverImage?: string;
  }>;
  recentReviews: Array<{
    id: string;
    title: string;
    author: string;
    rating: number;
  }>;
}

export default function Home() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [stats, setStats] = useState<UserStats>({
    booksRead: 0,
    pagesRead: 0,
    reviewsWritten: 0,
    wishlistItems: 0,
    favoriteGenre: null,
    currentlyReading: [],
    recentReviews: []
  });

  // Animation for counting numbers
  useEffect(() => {
    const controls = {
      pagesRead: animate(0, stats.pagesRead, {
        duration: 0.5,
        ease: "easeOut",
        onUpdate: (value) => setPagesCount(Math.round(value))
      }),
      reviewsWritten: animate(0, stats.reviewsWritten, {
        duration: 0.5,
        ease: "easeOut",
        onUpdate: (value) => setReviewsCount(Math.round(value))
      }),
      wishlistItems: animate(0, stats.wishlistItems, {
        duration: 0.5,
        ease: "easeOut",
        onUpdate: (value) => setWishlistCount(Math.round(value))
      })
    };

    return () => {
      controls.pagesRead.stop();
      controls.reviewsWritten.stop();
      controls.wishlistItems.stop();
    };
  }, [stats.pagesRead, stats.reviewsWritten, stats.wishlistItems]);

  const [pagesCount, setPagesCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const userProfileData = await userProfile.getUserProfile();
          setProfile(userProfileData);
          
          // Simplify: A user is new if they haven't set their fullName
          const isNewUser = !userProfileData.fullName;
          setIsFirstTimeUser(isNewUser);
        } catch (error) {
          console.error('Error fetching profile:', error);
          // If we can't fetch a profile, assume it's a new user
          setIsFirstTimeUser(true);
        }
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

  // Fetch user reading data and statistics
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || isFirstTimeUser) return;
      
      try {
        // Fetch reviews
        const reviewsResponse = await api.get('/api/reviews/me');
        const userReviews = Array.isArray(reviewsResponse.data) ? reviewsResponse.data : [];
        setReviews(userReviews);
        
        // Fetch wishlist
        const wishlistResponse = await wishlistApi.getUserWishlist();
        const userWishlist = Array.isArray(wishlistResponse) ? wishlistResponse : [];
        setWishlistItems(userWishlist);
        
        // Calculate statistics
        calculateStats(userReviews, userWishlist);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, [user, isFirstTimeUser]);
  
  // Calculate user statistics based on reviews and wishlist
  const calculateStats = (userReviews: Review[], userWishlist: WishlistItem[]) => {
    // Calculate books read
    const booksRead = userReviews.length;
    
    // Calculate pages read
    const pagesRead = userReviews.reduce((total, review) => {
      // Try to get pages from all possible fields
      const pages = review.book?.numberOfPagesMedian || 
                   review.book?.number_of_pages_median || 
                   review.book?.medium?.pages || 
                   review.book?.pages || 
                   300; // Default to 300 pages if not specified
      return total + pages;
    }, 0);
    
    // Get currently reading - most recent review if end_date is today or in the future
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
    
    const currentlyReading = userReviews
      .filter(review => {
        // Consider a book as "currently reading" if it has an end date in the future
        // or if it was started within the last month (for books without proper end dates)
        const endDate = review.end_date ? new Date(review.end_date) : null;
        const startDate = review.start_date ? new Date(review.start_date) : null;
        
        const isEndDateInFuture = endDate && endDate >= now;
        const isRecentlyStarted = startDate && ((now.getTime() - startDate.getTime()) < (30 * 24 * 60 * 60 * 1000));
        
        return isEndDateInFuture || isRecentlyStarted;
      })
      .map(review => ({
        id: review.id,
        title: review.book.title,
        author: review.book.author,
        coverImage: review.book.coverUrl
      }))
      .slice(0, 1); // Just take the first one for now
    
    // Get recent reviews - all reviews sorted by end date, including those with no end date
    const recentReviews = [...userReviews]
      .sort((a, b) => {
        // If no end date, sort by start date
        const dateA = a.end_date ? new Date(a.end_date) : a.start_date ? new Date(a.start_date) : new Date(0);
        const dateB = b.end_date ? new Date(b.end_date) : b.start_date ? new Date(b.start_date) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .map(review => ({
        id: review.id,
        title: review.book.title,
        author: review.book.author,
        rating: review.rating
      }))
      .slice(0, 3); // Get top 3 recent reviews
    
    // Determine favorite genre from reviewed books
    const genreCounts: Record<string, number> = {};
    userReviews.forEach(review => {
      if (review.book.subjects && Array.isArray(review.book.subjects)) {
        review.book.subjects.forEach(subject => {
          genreCounts[subject] = (genreCounts[subject] || 0) + 1;
        });
      }
    });
    
    // Get the genre with the highest count
    let favoriteGenre: string | null = null;
    let maxCount = 0;
    
    Object.entries(genreCounts).forEach(([genre, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteGenre = genre;
      }
    });
    
    // If no genres found in books, use the user's favorite genre from profile
    if (!favoriteGenre && profile?.favoriteGenres && profile.favoriteGenres.length > 0) {
      favoriteGenre = profile.favoriteGenres[0];
    }
    
    setStats({
      booksRead,
      pagesRead,
      reviewsWritten: booksRead, // Same as books read for now
      wishlistItems: userWishlist.length,
      favoriteGenre,
      currentlyReading,
      recentReviews
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#365f60]"></div>
      </div>
    );
  }

  if (!user) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-[#365f60]">
            Welcome to WrappedUp
          </h1>
          <p className="text-lg text-[#8aa4a9] max-w-2xl">
            Your personal reading tracker. Keep track of what you read and love.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isFirstTimeUser) {
    return <OnboardingWizard username={user.username} />;
  }

  // Calculate progress percentage
  const readingGoal = profile?.readingGoal || 12;
  const progressPercentage = Math.min(100, (stats.booksRead / readingGoal) * 100);
  
  // Decide on encouragement message based on progress
  let encouragementMessage = "";
  if (progressPercentage === 0) {
    encouragementMessage = "Time to start your reading journey!";
  } else if (progressPercentage < 25) {
    encouragementMessage = "Great start! Keep reading!";
  } else if (progressPercentage < 50) {
    encouragementMessage = "You're making good progress!";
  } else if (progressPercentage < 75) {
    encouragementMessage = "You're over halfway there!";
  } else if (progressPercentage < 100) {
    encouragementMessage = "Almost at your goal!";
  } else {
    encouragementMessage = "You've reached your goal! Amazing!";
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  // Returning user view with animations and progress bars
  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="text-center mb-12"
          variants={itemVariants}
        >
          <h1 className="text-4xl font-bold text-[#365f60]">
            Welcome back, {profile?.fullName || user.username}!
          </h1>
          <p className="text-lg text-[#8aa4a9] mt-2">
            {encouragementMessage}
          </p>
        </motion.div>
        
        {/* Reading Progress Section */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12"
          variants={itemVariants}
        >
          {/* Main Reading Goal Progress */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-[#365f60]">Your Reading Goal</h2>
              <span className="text-lg font-medium text-[#365f60]">
                {stats.booksRead} of {readingGoal} books
              </span>
            </div>
            
            {/* Animated progress bar - simplified */}
            <div className="h-6 bg-gray-200 rounded-full overflow-hidden mb-3">
              <motion.div 
                className="h-full bg-[#63b4b7] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ 
                  duration: 0.8,
                  ease: "easeOut"
                }}
              />
            </div>
            
            {/* Reading stats grid with counting animations */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="flex justify-center">
                  <BookOpenIcon className="h-8 w-8 text-[#8aa4a9]" />
                </div>
                <motion.p 
                  className="text-2xl font-bold text-[#365f60] mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {pagesCount.toLocaleString()}
                </motion.p>
                <p className="text-sm text-[#8aa4a9]">Pages Read</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center">
                  <PencilIcon className="h-8 w-8 text-[#8aa4a9]" />
                </div>
                <motion.p 
                  className="text-2xl font-bold text-[#365f60] mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {reviewsCount}
                </motion.p>
                <p className="text-sm text-[#8aa4a9]">Reviews</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center">
                  <BookmarkIcon className="h-8 w-8 text-[#8aa4a9]" />
                </div>
                <motion.p 
                  className="text-2xl font-bold text-[#365f60] mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {wishlistCount}
                </motion.p>
                <p className="text-sm text-[#8aa4a9]">Wishlist</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Recent Activity and Genre Analysis */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          variants={itemVariants}
        >
          {/* Recent Reviews */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-[#365f60] mb-4">Recent Reviews</h2>
            {stats.recentReviews.length > 0 ? (
              <div>
                {stats.recentReviews.map((review) => (
                  <div key={review.id} className="mb-3 pb-3 border-b border-gray-100">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-[#365f60]">{review.title}</h3>
                      <div className="flex items-center">
                        <span className="text-sm mr-1">{review.rating}</span>
                        <StarIcon className="h-4 w-4 text-yellow-500 inline" />
                      </div>
                    </div>
                    <p className="text-sm text-[#8aa4a9]">{review.author}</p>
                  </div>
                ))}
                <Link href="/reviews" className="text-sm text-[#63b4b7] hover:underline">
                  View all reviews
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <PencilIcon className="h-12 w-12 text-[#8aa4a9] mx-auto mb-2" />
                <p className="text-[#8aa4a9]">No reviews yet</p>
                <Link href="/reviews/add" className="text-sm text-[#63b4b7] hover:underline mt-2 inline-block">
                  Write your first review
                </Link>
        </div>
      )}
          </div>
          
          {/* Reading Profile */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-[#365f60] mb-4">Reading Profile</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#8aa4a9] mb-1">Favorite Genre</p>
                <p className="font-medium text-[#365f60]">{stats.favoriteGenre || 'Not enough data'}</p>
              </div>
              <div>
                <p className="text-sm text-[#8aa4a9] mb-1">Preferred Language</p>
                <p className="font-medium text-[#365f60]">{profile?.preferredLanguage || 'English'}</p>
              </div>
              <div>
                <p className="text-sm text-[#8aa4a9] mb-1">Reading Pace</p>
                <p className="font-medium text-[#365f60]">
                  {stats.booksRead > 0 
                    ? `${Math.round(stats.pagesRead / Math.max(1, stats.booksRead))} pages per book on average` 
                    : 'Not enough data'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/profile" className="text-sm text-[#63b4b7] hover:underline">
                Update your profile
              </Link>
            </div>
          </div>
        </motion.div>
        
        {/* Quick Actions */}
        <motion.div 
          className="text-center mb-4 bg-white rounded-lg shadow-md p-6"
          variants={itemVariants}
        >
          <h2 className="text-xl font-semibold text-[#365f60] mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/reviews/add" className="btn-primary flex items-center">
              <PencilIcon className="h-5 w-5 mr-2" />
              Write a Review
            </Link>
            <Link href="/wishlist" className="btn-secondary flex items-center">
              <BookmarkIcon className="h-5 w-5 mr-2" />
              Update Wishlist
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
