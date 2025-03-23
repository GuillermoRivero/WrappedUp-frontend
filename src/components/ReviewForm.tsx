'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import BookSearch, { Book as SearchBook } from '@/components/BookSearch';

interface ReviewFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

interface ReviewBook {
  id: string;
  title: string;
  author: string;
  releaseYear: number;
  coverUrl: string;
  description?: string;
  isbn?: string;
  language?: string;
  publisher?: string;
  numberOfPages?: number;
  openLibraryKey: string;
}

export default function ReviewForm({ onSubmit, onCancel }: ReviewFormProps) {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState<ReviewBook | null>(null);
  const [formData, setFormData] = useState({
    text: '',
    rating: 5,
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Convert search book to review book
  const handleBookSelected = (book: SearchBook) => {
    const reviewBook: ReviewBook = {
      id: book.id || '',
      title: book.title,
      author: book.author,
      releaseYear: book.releaseYear || book.firstPublishYear || 0,
      coverUrl: book.coverUrl || '',
      description: book.description,
      isbn: book.isbn,
      publisher: book.publisher,
      numberOfPages: book.numberOfPages,
      openLibraryKey: book.openLibraryKey || '',
    };
    setSelectedBook(reviewBook);
    
    // Set default dates if they're not already set
    if (!formData.startDate || !formData.endDate) {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prevData => ({
        ...prevData,
        endDate: today,
        startDate: prevData.startDate || today
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) {
      setError('Please select a book first');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/api/reviews', {
        open_library_key: selectedBook.openLibraryKey,
        text: formData.text,
        rating: formData.rating,
        start_date: formData.startDate,
        end_date: formData.endDate,
      });

      if (response.status !== 200) {
        throw new Error('Failed to submit review');
      }

      onSubmit();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  // Function to generate rating stars display
  const renderRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => setFormData({ ...formData, rating: i })}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            formData.rating >= i 
              ? 'bg-amber-100 text-amber-600 shadow-sm transform scale-105'
              : 'bg-[#f1f5f5] text-[#8aa4a9] hover:bg-amber-50 hover:text-amber-500'
          }`}
        >
          ★
        </button>
      );
    }
    return stars;
  };

  // Function to get rating text
  const getRatingText = (rating: number): string => {
    switch (rating) {
      case 1: return 'Did not like it';
      case 2: return 'It was ok';
      case 3: return 'Liked it';
      case 4: return 'Really liked it';
      case 5: return 'Loved it';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b border-[#e0e7e9]">
        <h2 className="text-2xl font-bold text-[#365f60]">Write a Book Review</h2>
        <p className="text-[#8aa4a9] mt-1">Share your thoughts about a book you've read</p>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] m-6 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Book Search Section */}
        <div className="p-6">
          <BookSearch 
            onBookSelected={handleBookSelected}
            selectedBook={selectedBook as SearchBook}
            enableBarcode={true}
            minSearchLength={2}
            autoSearchLength={5}
            placeholder="Search by title, author, or ISBN"
            label="Search for a book to review"
          />
        </div>

        {/* Selected Book with Enhanced Styling */}
        {selectedBook && (
          <div className="overflow-hidden transition-all duration-300 ease-in-out">
            <div className="relative bg-gradient-to-b from-[#365f60] to-[#63b4b7] text-white p-6 pb-8">
              <div className="absolute inset-0 opacity-20 bg-pattern" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%239C92AC" fill-opacity="0.2" fill-rule="evenodd"%3E%3Ccircle cx="3" cy="3" r="3"/%3E%3Ccircle cx="13" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E")' }}></div>
              
              <div className="flex items-start gap-6 relative z-10">
                <div className="flex-shrink-0">
                  <div className="w-28 h-40 rounded-md shadow-md overflow-hidden border-4 border-white transition-transform duration-300 transform hover:scale-105 hover:shadow-lg">
                    {selectedBook.coverUrl ? (
                      <img 
                        src={selectedBook.coverUrl} 
                        alt={`Cover of ${selectedBook.title}`}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#d1dfe2]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#8aa4a9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{selectedBook.title}</h3>
                      <p className="text-white/90 text-lg">by {selectedBook.author}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedBook.releaseYear && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {selectedBook.releaseYear}
                          </span>
                        )}
                        
                        {selectedBook.isbn && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            ISBN: {selectedBook.isbn}
                          </span>
                        )}
                        
                        {selectedBook.numberOfPages && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {selectedBook.numberOfPages} pages
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBook(null)}
                      className="text-white/80 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10"
                    >
                      Change Book
                    </button>
                  </div>
                  
                  {selectedBook.description && (
                    <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-md p-3 max-h-24 overflow-y-auto text-sm">
                      <p className="line-clamp-3">{selectedBook.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Review Form Fields */}
            <div className="p-6 border-t border-[#e0e7e9] bg-[#f8fafa] rounded-b-lg">
              <h4 className="text-lg font-semibold text-[#365f60] mb-4">Your Review</h4>
              
              {/* Rating */}
              <div className="mb-6">
                <label className="text-sm font-medium text-[#365f60] mb-2 block">Your Rating</label>
                <div className="flex space-x-2 mb-2">
                  {renderRatingStars(formData.rating)}
                </div>
                <div className="text-sm text-[#8aa4a9]">
                  {getRatingText(formData.rating)}
                </div>
              </div>
              
              {/* Review Text */}
              <div className="mb-6">
                <label htmlFor="review" className="text-sm font-medium text-[#365f60] mb-1 block">
                  Your Review
                </label>
                <textarea
                  id="review"
                  rows={4}
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="What did you think about this book? Write your detailed review here..."
                  className="w-full p-3 border border-[#d1dfe2] rounded-md text-sm focus:ring-2 focus:ring-[#365f60] focus:border-transparent transition-colors"
                  required
                />
              </div>
              
              {/* Reading Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="text-sm font-medium text-[#365f60] mb-1 block">
                    Start Reading Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8aa4a9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="date"
                      id="startDate"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full py-2 pl-10 pr-3 border border-[#d1dfe2] rounded-md focus:ring-2 focus:ring-[#365f60] focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="endDate" className="text-sm font-medium text-[#365f60] mb-1 block">
                    Finish Reading Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8aa4a9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="date"
                      id="endDate"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full py-2 pl-10 pr-3 border border-[#d1dfe2] rounded-md focus:ring-2 focus:ring-[#365f60] focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with action buttons */}
        <div className="p-6 border-t border-[#e0e7e9] bg-[#f8fafa]">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !selectedBook}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Review
                </div>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 