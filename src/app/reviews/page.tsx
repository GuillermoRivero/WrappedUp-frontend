'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import { formatDate, normalizeReviewDates } from '@/utils/dateUtils';

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
  };
}

interface Filters {
  search: string;
  rating: string;
  startDate: string;
  endDate: string;
  sortBy: 'rating' | 'date' | 'title';
  sortOrder: 'asc' | 'desc';
}

export default function BooksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 9;
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    rating: '',
    startDate: '',
    endDate: '',
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  const fetchReviews = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/reviews/me');
      
      // Normalize the date fields in the response
      const normalizedReviews = response.data.map((review: any) => normalizeReviewDates(review));
      
      setReviews(normalizedReviews);
      setFilteredReviews(normalizedReviews);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      
      if (err.response?.status === 401) {
        router.push('/login');
        return;
      }
      
      setError(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [user, router]);

  useEffect(() => {
    if (!reviews) return;

    let filtered = [...reviews];

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(review => 
        review.book.title.toLowerCase().includes(searchTerm) ||
        review.book.author.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.rating) {
      filtered = filtered.filter(review => 
        review.rating === parseInt(filters.rating)
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter(review => 
        new Date(review.start_date) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(review => 
        new Date(review.end_date) <= new Date(filters.endDate)
      );
    }

    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          return filters.sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating;
        case 'date':
          return filters.sortOrder === 'desc' 
            ? new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
            : new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        case 'title':
          return filters.sortOrder === 'desc'
            ? b.book.title.localeCompare(a.book.title)
            : a.book.title.localeCompare(b.book.title);
        default:
          return 0;
      }
    });

    setFilteredReviews(filtered);
    setCurrentPage(1);
  }, [reviews, filters]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      rating: '',
      startDate: '',
      endDate: '',
      sortBy: 'rating',
      sortOrder: 'desc',
    });
  };

  const handleSort = (sortBy: Filters['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = filteredReviews.slice(indexOfFirstReview, indexOfLastReview);

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-[#365f60]">Sign in to track your reviews</h2>
          <p className="text-[#8aa4a9] mt-2">Track and review the books you've read</p>
          <div className="flex gap-4 justify-center mt-4">
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

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-[#365f60]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-[#365f60] mb-2 sm:mb-0">My Book Reviews</h1>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <button
                onClick={() => setFiltersVisible(!filtersVisible)}
                className={`flex items-center justify-center px-3 py-2 rounded-md transition-colors ${
                  filtersVisible 
                    ? 'bg-[#365f60] text-white' 
                    : 'bg-[#f8fafc] text-[#365f60] hover:bg-[#dfe7ec]'
                }`}
                title="Toggle filters"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-sm font-medium">Filters</span>
                {Object.values(filters).some(value => value !== '' && value !== 'rating' && value !== 'desc') && (
                  <span className="ml-2 bg-[#63b4b7] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {Object.values(filters).filter(value => value !== '' && value !== 'rating' && value !== 'desc').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/reviews/add')}
                className="btn-primary flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Review</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
          <p className="text-[#8aa4a9] text-sm md:text-base">Track and review the books you've read</p>
        </div>

        <div 
          className={`bg-white rounded-lg shadow-md border border-[#adbfc7] mb-6 overflow-hidden transition-all duration-300 ease-in-out ${
            filtersVisible ? 'max-h-[800px] opacity-100 p-4 sm:p-6' : 'max-h-0 opacity-0 p-0 border-0'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-[#365f60] mb-1">
                Search by Title or Author
              </label>
              <input
                type="text"
                id="search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search..."
                className="input-field w-full"
              />
            </div>
            
            <div>
              <label htmlFor="rating" className="block text-sm font-medium text-[#365f60] mb-1">
                Filter by Rating
              </label>
              <select
                id="rating"
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="input-field w-full"
              >
                <option value="">All Ratings</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
                <option value="4">⭐⭐⭐⭐ (4 stars)</option>
                <option value="3">⭐⭐⭐ (3 stars)</option>
                <option value="2">⭐⭐ (2 stars)</option>
                <option value="1">⭐ (1 star)</option>
              </select>
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-[#365f60] mb-1">
                Start Date From
              </label>
              <input
                type="date"
                id="startDate"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="input-field w-full"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-[#365f60] mb-1">
                End Date To
              </label>
              <input
                type="date"
                id="endDate"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 border-t pt-4 border-[#f0f0f0]">
            <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-0">
              <span className="text-sm font-medium text-[#365f60]">Sort by:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSort('rating')}
                  className={`px-3 py-1 rounded text-sm ${
                    filters.sortBy === 'rating'
                      ? 'bg-[#365f60] text-white'
                      : 'bg-[#f8fafc] text-[#365f60] hover:bg-[#dfe7ec]'
                  }`}
                >
                  Rating {filters.sortBy === 'rating' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                </button>
                <button
                  onClick={() => handleSort('date')}
                  className={`px-3 py-1 rounded text-sm ${
                    filters.sortBy === 'date'
                      ? 'bg-[#365f60] text-white'
                      : 'bg-[#f8fafc] text-[#365f60] hover:bg-[#dfe7ec]'
                  }`}
                >
                  Date {filters.sortBy === 'date' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                </button>
                <button
                  onClick={() => handleSort('title')}
                  className={`px-3 py-1 rounded text-sm ${
                    filters.sortBy === 'title'
                      ? 'bg-[#365f60] text-white'
                      : 'bg-[#f8fafc] text-[#365f60] hover:bg-[#dfe7ec]'
                  }`}
                >
                  Title {filters.sortBy === 'title' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                </button>
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-[#365f60] hover:text-[#63b4b7] flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
          </div>
        </div>

        {!filtersVisible && (Object.values(filters).some(value => value !== '' && value !== 'rating' && value !== 'desc')) && (
          <div className="bg-[#f8fafc] rounded-lg p-3 mb-6 flex flex-wrap items-center justify-between">
            <div className="text-sm text-[#365f60] flex flex-wrap items-center">
              <span className="font-medium mr-2">Active filters:</span>
              {(() => {
                const activeFilters = [];
                if (filters.search) activeFilters.push({ type: 'search', value: filters.search });
                if (filters.rating) activeFilters.push({ type: 'rating', value: filters.rating });
                if (filters.startDate) activeFilters.push({ type: 'startDate', value: filters.startDate });
                if (filters.endDate) activeFilters.push({ type: 'endDate', value: filters.endDate });
                
                const visibleFilters = activeFilters.slice(0, window.innerWidth < 640 ? 2 : 3);
                const remainingCount = activeFilters.length - visibleFilters.length;
                
                return (
                  <>
                    {visibleFilters.map((filter, index) => (
                      <span key={filter.type} className="ml-1 bg-[#dfe7ec] px-2 py-1 rounded mr-1 mb-1 flex items-center text-xs sm:text-sm">
                        {filter.type === 'search' && filter.value}
                        {filter.type === 'rating' && '⭐'.repeat(parseInt(filter.value))}
                        {filter.type === 'startDate' && `From: ${filter.value}`}
                        {filter.type === 'endDate' && `To: ${filter.value}`}
                      </span>
                    ))}
                    {remainingCount > 0 && (
                      <span className="ml-1 bg-[#dfe7ec] px-2 py-1 rounded mr-1 mb-1 text-xs sm:text-sm">
                        +{remainingCount} more
                      </span>
                    )}
                    <span className="ml-1 bg-[#dfe7ec] px-2 py-1 rounded mb-1 flex items-center text-xs sm:text-sm">
                      <span className="font-medium mr-1">Sort:</span> {filters.sortBy} {filters.sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  </>
                );
              })()}
            </div>
            <button
              onClick={clearFilters}
              className="text-xs sm:text-sm text-[#365f60] hover:text-[#63b4b7] flex items-center mt-2 sm:mt-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          </div>
        )}

        {error ? (
          <div className="text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] p-4 rounded-md text-sm">
            {error}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 border border-[#adbfc7] text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-[#365f60] mb-4">
              {reviews.length === 0 ? "No book reviews yet" : "No reviews match your filters"}
            </h2>
            <p className="text-[#8aa4a9] mb-6 text-sm sm:text-base">
              {reviews.length === 0 
                ? "Start tracking your reading journey by adding your first book review!"
                : "Try adjusting your filters to see more reviews."}
            </p>
            {reviews.length === 0 && (
              <Link
                href="/reviews/add"
                className="btn-primary"
              >
                Add Your First Review
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {currentReviews.map((review) => (
                <Link
                  href={`/reviews/review/${review.id}`}
                  key={review.id}
                  className="bg-white rounded-lg shadow-md border border-[#adbfc7] overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer flex flex-col h-full"
                >
                  <div className="p-4 sm:p-5 flex flex-col h-full">
                    <div className="flex gap-3 sm:gap-4 mb-3">
                      <div className="flex-shrink-0">
                        {review.book.coverUrl ? (
                          <img
                            src={review.book.coverUrl}
                            alt={review.book.title}
                            className="w-16 sm:w-20 h-24 sm:h-28 object-cover rounded-md shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100x150?text=No+Cover';
                              (e.target as HTMLImageElement).onerror = null;
                            }}
                          />
                        ) : (
                          <div className="w-16 sm:w-20 h-24 sm:h-28 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-xs text-center">
                            No Cover Available
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-[#365f60] mb-1 truncate">{review.book.title}</h3>
                        <p className="text-xs sm:text-sm text-[#8aa4a9] mb-2 truncate">by {review.book.author}</p>
                        <div className="text-[#63b4b7] text-sm">
                          {'⭐'.repeat(review.rating)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3 sm:mb-4 flex-grow">
                      <p className="text-[#746a64] text-xs sm:text-sm line-clamp-3">{review.text}</p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 mt-auto border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        {formatDate(review.start_date)} - {formatDate(review.end_date)}
                      </div>
                      <span 
                        className="text-xs font-medium text-[#365f60] hover:underline"
                      >
                        View Details
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center mt-6 sm:mt-8">
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${
                      currentPage === 1
                        ? 'bg-[#f8fafc] text-[#adbfc7]'
                        : 'bg-[#f8fafc] text-[#365f60] hover:bg-[#dfe7ec]'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {(() => {
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                    const pageNumbers = [];
                    
                    if (isMobile && totalPages > 5) {
                      if (currentPage <= 3) {
                        for (let i = 1; i <= 3; i++) pageNumbers.push(i);
                        pageNumbers.push('ellipsis');
                        pageNumbers.push(totalPages);
                      } else if (currentPage >= totalPages - 2) {
                        pageNumbers.push(1);
                        pageNumbers.push('ellipsis');
                        for (let i = totalPages - 2; i <= totalPages; i++) pageNumbers.push(i);
                      } else {
                        pageNumbers.push(1);
                        pageNumbers.push('ellipsis');
                        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
                        pageNumbers.push('ellipsis');
                        pageNumbers.push(totalPages);
                      }
                    } else {
                      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
                    }
                    
                    return pageNumbers.map((page, index) => {
                      if (page === 'ellipsis') {
                        return (
                          <span key={`ellipsis-${index}`} className="px-2 py-1 text-[#8aa4a9]">
                            ...
                          </span>
                        );
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page as number)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-xs sm:text-sm ${
                            currentPage === page
                              ? 'bg-[#365f60] text-white'
                              : 'bg-[#f8fafc] text-[#365f60] hover:bg-[#dfe7ec]'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${
                      currentPage === totalPages
                        ? 'bg-[#f8fafc] text-[#adbfc7]'
                        : 'bg-[#f8fafc] text-[#365f60] hover:bg-[#dfe7ec]'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="fixed bottom-6 right-6 z-10">
        <Link
          href="/reviews/add"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[#365f60] text-white shadow-lg hover:bg-[#2a4a4b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#365f60] transition-colors"
          aria-label="Add review"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}