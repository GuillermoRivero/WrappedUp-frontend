'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import ReadingTimeline from '@/components/ReadingTimeline';
import dynamic from 'next/dynamic';

// Dynamically import WordCloud with no SSR to avoid hydration issues
const WordCloud = dynamic(() => import('@isoterik/react-word-cloud').then(mod => mod.WordCloud), { ssr: false });

// Function to get a color based on rating
const getRatingColor = (rating: number): string => {
  switch (Math.round(rating)) {
    case 1: return 'bg-red-400';
    case 2: return 'bg-orange-400';
    case 3: return 'bg-yellow-400';
    case 4: return 'bg-green-400';
    case 5: return 'bg-emerald-500';
    default: return 'bg-gray-400';
  }
};

// Function to format date for display
const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface Review {
  id: string;
  user_id: string;
  text: string;
  rating: number;
  start_date: string;
  end_date: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string;
    releaseYear: number;
    platform: string;
    pages?: number;
    subjects?: string[];
    medium?: {
      pages?: number;
    };
    numberOfPagesMedian?: number;
    number_of_pages_median?: number;
  };
}

export default function ReadingWraps() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'month' | 'year' | 'all'>('year');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    console.log('useEffect running, user:', user);
    if (!user) {
      console.log('No user found, skipping API call');
      return;
    }

    const fetchReviews = async () => {
      console.log('Fetching reviews...');
      setLoading(true);
      try {
        console.log('Making API call to /api/reviews/me');
        const response = await api.get('/api/reviews/me');
        console.log('API Response status:', response.status);
        console.log('API Response data:', response.data);
        
        if (Array.isArray(response.data)) {
          console.log('Response data is an array with length:', response.data.length);
          setReviews(response.data);
        } else if (response.data && typeof response.data === 'object') {
          // Check if the data might be nested in a property
          console.log('Response data is an object with keys:', Object.keys(response.data));
          
          // Try to find an array in the response
          const possibleArrays = Object.values(response.data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            console.log('Found array in response with length:', possibleArrays[0].length);
            setReviews(possibleArrays[0]);
          } else {
            console.log('No array found in response, setting empty reviews array');
            setReviews([]);
          }
        } else {
          console.log('Response data is not an array or object:', typeof response.data);
          setReviews([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
        setReviews([]);
        setError('Failed to load reviews. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  // Add a useEffect to log reviews state changes
  useEffect(() => {
    console.log('Reviews state updated:', reviews);
    if (reviews.length > 0) {
      // Log the structure of the first review to see all available fields
      console.log('First review structure:', JSON.stringify(reviews[0], null, 2));
    }
  }, [reviews]);

  // Filter reviews based on selected time period and ensure no future reviews
  const filteredReviews = useMemo(() => {
    console.log('Filtering reviews:', reviews);
    
    // Include all reviews, even those with future end dates
    const validReviews = reviews.filter(review => {
      if (!review.start_date || !review.end_date) {
        console.log('Review missing dates, skipping:', review.id);
        return false;
      }
      
      try {
        // Just check that dates are valid
        new Date(review.start_date);
        new Date(review.end_date);
        return true;
      } catch (error) {
        console.error('Error parsing date for review:', review.id, error);
        return false;
      }
    });
    
    // Then apply the time filter
    return validReviews.filter(review => {
      try {
        const startDate = new Date(review.start_date);
        const endDate = new Date(review.end_date);
        
        console.log('Review start date:', startDate);
        console.log('Review end date:', endDate);
        console.log('Selected date:', selectedDate);
        console.log('Time filter:', timeFilter);
        
        if (timeFilter === 'all') {
          return true;
        } else if (timeFilter === 'month') {
          // Check if there's an overlap between the review period and the selected month
          const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
          
          // Check for overlap: not (review ends before month starts OR review starts after month ends)
          return !(endDate < monthStart || startDate > monthEnd);
        } else { // year
          // Check if there's an overlap between the review period and the selected year
          const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
          const yearEnd = new Date(selectedDate.getFullYear(), 11, 31);
          
          // Check for overlap: not (review ends before year starts OR review starts after year ends)
          return !(endDate < yearStart || startDate > yearEnd);
        }
      } catch (error) {
        console.error('Error parsing date for review:', review.id, error);
        return false;
      }
    });
  }, [reviews, timeFilter, selectedDate]);
  
  console.log('Filtered reviews count:', filteredReviews.length);

  // Calculate statistics
  const calculateStats = () => {
    if (filteredReviews.length === 0) {
      return {
        booksRead: 0,
        pagesRead: 0,
        avgPagesPerDay: 0,
        totalReadingDays: 0,
        avgDaysPerBook: 0,
        avgRating: 0
      };
    }

    const booksRead = filteredReviews.length;
    
    // Calculate pages read
    const pagesRead = filteredReviews.reduce((total, review) => {
      // Try to get pages from all possible fields
      const pages = review.book?.numberOfPagesMedian || 
                   review.book?.number_of_pages_median || 
                   review.book?.medium?.pages || 
                   review.book?.pages || 
                   0;
      console.log(`Book: ${review.book.title}, Pages: ${pages}, Fields:`, {
        numberOfPagesMedian: review.book?.numberOfPagesMedian,
        number_of_pages_median: review.book?.number_of_pages_median,
        mediumPages: review.book?.medium?.pages,
        pages: review.book?.pages
      });
      return total + pages;
    }, 0);
    
    // Calculate total reading days (without overlaps)
    let readingDays = new Set<string>();
    filteredReviews.forEach(review => {
      const start = new Date(review.start_date);
      const end = new Date(review.end_date);
      
      // Add each day between start and end to the set
      for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
        readingDays.add(day.toISOString().split('T')[0]);
      }
    });
    
    const totalReadingDays = readingDays.size;
    
    // Calculate average days per book
    const avgDaysPerBook = filteredReviews.reduce((total, review) => {
      const start = new Date(review.start_date);
      const end = new Date(review.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0) / booksRead;
    
    // Calculate average rating
    const avgRating = filteredReviews.reduce((total, review) => {
      return total + review.rating;
    }, 0) / booksRead;
    
    // Calculate average pages per day
    const avgPagesPerDay = totalReadingDays > 0 ? pagesRead / totalReadingDays : 0;
    
    return {
      booksRead,
      pagesRead,
      avgPagesPerDay,
      totalReadingDays,
      avgDaysPerBook,
      avgRating
    };
  };

  const stats = calculateStats();

  // Calculate time range based on filtered reviews and time filter
  useEffect(() => {
    if (filteredReviews.length === 0) {
      setTimeRange(null);
      return;
    }

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (timeFilter === 'all') {
      // For all time: from first review start date to current date
      const allStartDates = filteredReviews.map(review => new Date(review.start_date));
      
      startDate = new Date(Math.min(...allStartDates.map(d => d.getTime())));
      endDate = now; // Always use current date as end date for "all time"
    } else if (timeFilter === 'year') {
      // For yearly: always show from January 1st to December 31st of the selected year
      startDate = new Date(selectedDate.getFullYear(), 0, 1);
      
      // For end date, use December 31st of the selected year
      // If it's the current year, cap it to the current date
      const isCurrentYear = selectedDate.getFullYear() === now.getFullYear();
      if (isCurrentYear) {
        endDate = now;
      } else {
        endDate = new Date(selectedDate.getFullYear(), 11, 31);
      }
    } else { // month
      // For monthly: always show the entire month
      startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      
      // Check if we're in the current month
      const isCurrentMonth = selectedDate.getFullYear() === now.getFullYear() && 
                             selectedDate.getMonth() === now.getMonth();
      
      // Get the end of the month
      const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      if (isCurrentMonth && now < monthEnd) {
        // If we're in the current month and the current date is before the end of the month,
        // set end date to the end of the current week
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysUntilEndOfWeek = 6 - dayOfWeek; // Days until Saturday
        
        // Create a new date for the end of the week
        endDate = new Date(now);
        endDate.setDate(now.getDate() + daysUntilEndOfWeek);
        
        // If that would go into the next month, cap it to the end of the month
        if (endDate > monthEnd) {
          endDate = monthEnd;
        }
      } else {
        // If not the current month or we're already past the end of the month, show the entire month
        endDate = monthEnd;
      }
    }

    console.log('Setting time range:', { startDate, endDate });
    setTimeRange({ start: startDate, end: endDate });
    
    // Reset zoom level when changing time filter
    setZoomLevel(1);
  }, [filteredReviews, timeFilter, selectedDate]);

  const handleTimeFilterChange = (filter: 'month' | 'year' | 'all') => {
    setTimeFilter(filter);
    // Reset zoom level when changing time filter
    setZoomLevel(1);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  // Format date for display
  const formatDate = () => {
    if (timeFilter === 'month') {
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (timeFilter === 'year') {
      return selectedDate.getFullYear().toString();
    } else {
      return 'All Time';
    }
  };

  // Organize reviews into rows to avoid overlaps
  const organizedTimelineRows = useMemo(() => {
    if (filteredReviews.length === 0) return [];

    // Sort reviews by start date
    const sortedReviews = [...filteredReviews].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    // Function to check if two reviews overlap
    const overlaps = (review1: Review, review2: Review) => {
      const start1 = new Date(review1.start_date).getTime();
      const end1 = new Date(review1.end_date).getTime();
      const start2 = new Date(review2.start_date).getTime();
      const end2 = new Date(review2.end_date).getTime();
      
      return (start1 <= end2 && start2 <= end1);
    };

    // Organize reviews into rows
    const rows: Review[][] = [];
    
    sortedReviews.forEach(review => {
      // Try to find a row where this review doesn't overlap with any existing review
      let rowIndex = rows.findIndex(row => !row.some(existingReview => overlaps(existingReview, review)));
      
      // If no suitable row found, create a new row
      if (rowIndex === -1) {
        rows.push([review]);
      } else {
        // Add to existing row
        rows[rowIndex].push(review);
      }
    });

    return rows;
  }, [filteredReviews]);

  // Calculate top subjects and authors for word clouds
  const { topSubjects, topAuthors } = useMemo(() => {
    if (filteredReviews.length === 0) {
      return { topSubjects: [], topAuthors: [] };
    }

    // Count subjects
    const subjectCounts: Record<string, number> = {};
    filteredReviews.forEach(review => {
      if (review.book.subjects && Array.isArray(review.book.subjects)) {
        review.book.subjects.forEach(subject => {
          if (subject) {
            subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
          }
        });
      }
    });

    // Count authors
    const authorCounts: Record<string, number> = {};
    filteredReviews.forEach(review => {
      if (review.book.author) {
        authorCounts[review.book.author] = (authorCounts[review.book.author] || 0) + 1;
      }
    });

    // Convert to word cloud format and get top 10
    const topSubjects = Object.entries(subjectCounts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const topAuthors = Object.entries(authorCounts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { topSubjects, topAuthors };
  }, [filteredReviews]);

  // Word cloud options
  const wordCloudOptions = {
    colors: ['#365f60', '#4d797e', '#6b8e92', '#8aa4a9', '#adbfc7'],
    fontFamily: 'Inter, sans-serif',
    fontSizes: [20, 60],
    fontWeight: 'normal',
    rotations: 0,
    rotationAngles: [0, 0],
    transitionDuration: 500,
    enableTooltip: true,
    deterministic: true
  };

  // Format wordcloud props to match @isoterik/react-word-cloud API
  const getWordCloudProps = (words: { text: string; value: number }[]) => {
    return {
      words,
      width: 400,
      height: 250,
      font: 'Inter, sans-serif',
      fontWeight: 'normal' as const,
      fontSize: (word: { text: string; value: number }) => 
        Math.max(20, Math.min(60, 20 + word.value * 5)),
      rotate: () => 0,
      fill: (_: any, i: number) => wordCloudOptions.colors[i % wordCloudOptions.colors.length],
      padding: 2,
      enableTooltip: true,
      transition: '0.5s ease',
      spiral: 'archimedean' as const,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl md:text-4xl font-bold text-[#365f60] mb-8 border-b border-[#adbfc7] pb-4">Reading Wraps</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 shadow-sm">
          {error}
        </div>
      )}

      {/* Time Period Filter */}
      <div className="bg-[#f8fafa] rounded-lg shadow-lg p-6 border border-[#adbfc7] mb-8 transition-all duration-300 hover:shadow-xl">
        <h2 className="text-xl md:text-2xl font-semibold text-[#365f60] mb-6 border-b border-[#e5eaec] pb-2">
          Time Period
        </h2>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start">
          <div className="flex flex-wrap gap-4 mb-6 md:mb-0">
            <button 
              onClick={() => handleTimeFilterChange('all')}
              className={`px-4 py-2 rounded-md transition-colors ${
                timeFilter === 'all' 
                  ? 'bg-[#365f60] text-white' 
                  : 'bg-gray-100 text-[#365f60] hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
            <button 
              onClick={() => handleTimeFilterChange('year')}
              className={`px-4 py-2 rounded-md transition-colors ${
                timeFilter === 'year' 
                  ? 'bg-[#365f60] text-white' 
                  : 'bg-gray-100 text-[#365f60] hover:bg-gray-200'
              }`}
            >
              Year
            </button>
            <button 
              onClick={() => handleTimeFilterChange('month')}
              className={`px-4 py-2 rounded-md transition-colors ${
                timeFilter === 'month' 
                  ? 'bg-[#365f60] text-white' 
                  : 'bg-gray-100 text-[#365f60] hover:bg-gray-200'
              }`}
            >
              Month
            </button>
          </div>
          
          {timeFilter !== 'all' && (
            <div className="md:ml-auto">
              <div className="flex items-center">
                <label className="text-sm font-medium text-[#365f60] mr-3">
                  Select {timeFilter === 'month' ? 'Month' : 'Year'}:
                </label>
                <button 
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (timeFilter === 'month') {
                      newDate.setMonth(newDate.getMonth() - 1);
                    } else {
                      newDate.setFullYear(newDate.getFullYear() - 1);
                    }
                    handleDateChange(newDate);
                  }}
                  className="p-2 rounded-md hover:bg-gray-100 text-[#365f60]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="mx-4 text-lg font-medium text-[#365f60]">
                  {formatDate()}
                </span>
                <button 
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (timeFilter === 'month') {
                      newDate.setMonth(newDate.getMonth() + 1);
                    } else {
                      newDate.setFullYear(newDate.getFullYear() + 1);
                    }
                    handleDateChange(newDate);
                  }}
                  className="p-2 rounded-md hover:bg-gray-100 text-[#365f60]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reading Stats */}
      <div className="bg-[#f8fafa] rounded-lg shadow-lg p-6 border border-[#adbfc7] mb-8 transition-all duration-300 hover:shadow-xl">
        <h2 className="text-xl md:text-2xl font-semibold text-[#365f60] mb-6 border-b border-[#e5eaec] pb-2">
          Reading Stats
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#365f60]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Books Read */}
            <div className="bg-[#f0f5f5] rounded-lg p-4 border border-[#adbfc7] shadow-sm">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#365f60] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-sm font-medium text-[#365f60]">Books Read</h3>
              </div>
              <p className="text-3xl font-bold text-[#365f60]">{stats.booksRead}</p>
            </div>
            
            {/* Pages Read */}
            <div className="bg-[#f0f5f5] rounded-lg p-4 border border-[#adbfc7] shadow-sm">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#365f60] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-sm font-medium text-[#365f60]">Pages Read</h3>
              </div>
              <p className="text-3xl font-bold text-[#365f60]">{stats.pagesRead}</p>
            </div>
            
            {/* Total Reading Days */}
            <div className="bg-[#f0f5f5] rounded-lg p-4 border border-[#adbfc7] shadow-sm">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#365f60] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-sm font-medium text-[#365f60]">Reading Days</h3>
              </div>
              <p className="text-3xl font-bold text-[#365f60]">{stats.totalReadingDays}</p>
            </div>
            
            {/* Average Days per Book */}
            <div className="bg-[#f0f5f5] rounded-lg p-4 border border-[#adbfc7] shadow-sm">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#365f60] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-medium text-[#365f60]">Avg. Days per Book</h3>
              </div>
              <p className="text-3xl font-bold text-[#365f60]">{stats.avgDaysPerBook.toFixed(1)}</p>
            </div>
            
            {/* Average Pages per Day */}
            <div className="bg-[#f0f5f5] rounded-lg p-4 border border-[#adbfc7] shadow-sm">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#365f60] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-sm font-medium text-[#365f60]">Avg. Pages per Day</h3>
              </div>
              <p className="text-3xl font-bold text-[#365f60]">{stats.avgPagesPerDay.toFixed(1)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Reading Timeline */}
      <ReadingTimeline 
        reviews={filteredReviews}
        timeFilter={timeFilter}
        selectedDate={selectedDate}
        timeRange={timeRange}
        loading={loading}
      />

      {/* Word Clouds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Subjects Word Cloud */}
        <div className="bg-[#f8fafa] rounded-lg shadow-lg p-6 border border-[#adbfc7] transition-all duration-300 hover:shadow-xl">
          <h2 className="text-xl md:text-2xl font-semibold text-[#365f60] mb-6 border-b border-[#e5eaec] pb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#365f60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Top Subjects
          </h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#365f60]"></div>
            </div>
          ) : topSubjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#8aa4a9]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-[#adbfc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium mb-2">No subjects found</p>
              <p>Add books with subjects to see this word cloud</p>
            </div>
          ) : (
            <div className="h-64">
              <WordCloud {...getWordCloudProps(topSubjects)} />
            </div>
          )}
        </div>
        
        {/* Authors Word Cloud */}
        <div className="bg-[#f8fafa] rounded-lg shadow-lg p-6 border border-[#adbfc7] transition-all duration-300 hover:shadow-xl">
          <h2 className="text-xl md:text-2xl font-semibold text-[#365f60] mb-6 border-b border-[#e5eaec] pb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#365f60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Top Authors
          </h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#365f60]"></div>
            </div>
          ) : topAuthors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#8aa4a9]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-[#adbfc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-lg font-medium mb-2">No authors found</p>
              <p>Add books to see this word cloud</p>
            </div>
          ) : (
            <div className="h-64">
              <WordCloud {...getWordCloudProps(topAuthors)} />
            </div>
          )}
        </div>
      </div>

      {/* Book List */}
      <div className="bg-[#f8fafa] rounded-lg shadow-lg p-6 border border-[#adbfc7] transition-all duration-300 hover:shadow-xl">
        <h2 className="text-xl md:text-2xl font-semibold text-[#365f60] mb-6 border-b border-[#e5eaec] pb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#365f60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Books Read
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#365f60]"></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#8aa4a9]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-[#adbfc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-lg font-medium mb-2">No books found</p>
            <p>No books read during this period</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredReviews.map((review) => (
              <div 
                key={review.id} 
                className="bg-[#f8fafa] rounded-lg border border-[#adbfc7] shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]"
              >
                <div className="relative h-48 overflow-hidden bg-[#e5eaec]">
                  {review.book.coverUrl ? (
                    <img 
                      src={review.book.coverUrl} 
                      alt={`Cover of ${review.book.title}`} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#d1dfe2]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#8aa4a9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <div className={`${getRatingColor(review.rating)} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                      {review.rating.toFixed(1)}
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="text-[#365f60] font-semibold text-lg mb-1 line-clamp-2" title={review.book.title}>
                    {review.book.title}
                  </h3>
                  <p className="text-[#6b8e92] text-sm mb-3" title={review.book.author}>
                    {review.book.author}
                  </p>
                  
                  <div className="flex justify-between items-center text-xs text-[#8aa4a9] mt-2 pt-2 border-t border-[#e5eaec]">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDateShort(review.start_date)} - {formatDateShort(review.end_date)}</span>
                    </div>
                    
                    {(review.book.pages || review.book.numberOfPagesMedian || review.book.number_of_pages_median || review.book.medium?.pages) && (
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>
                          {review.book.pages || 
                           review.book.numberOfPagesMedian || 
                           review.book.number_of_pages_median || 
                           review.book.medium?.pages || 
                           '?'} pages
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 