'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import BookSearch, { Book as SearchBook } from '@/components/BookSearch';

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

export default function AddReviewPage() {
  const router = useRouter();
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

      router.push('/reviews');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-[#e0e7e9]">
          <h2 className="text-2xl font-bold text-[#365f60]">Write a Book Review</h2>
          <p className="text-[#8aa4a9] mt-1">Share your thoughts about books you've read</p>
        </div>

        <form onSubmit={handleSubmit} className="relative flex flex-col">
        {error && (
            <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] m-6 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

          {/* Book Search Section */}
          <div className="p-6 relative z-20">
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
            
          {/* Display prompt if no book is selected */}
          {!selectedBook && (
            <div className="text-center py-8 bg-gray-50 rounded-md border border-gray-200 mx-6 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-[#8aa4a9] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
              <p className="text-[#365f60] font-medium">Please search and select a book to review</p>
              <p className="text-[#8aa4a9] text-sm mt-1">The review form will appear once you've selected a book</p>
              </div>
            )}
            
          {/* Selected Book and Review Form */}
          {selectedBook && (
            <div className="transition-all duration-300 ease-in-out relative z-10">
              {/* Book cover and basic info section with gradient background */}
              <div className="relative">
                {/* Background gradient overlay */}
                <div className="bg-gradient-to-b from-[#365f60] to-[#63b4b7] text-white p-6 pb-8">
                  <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%239C92AC" fill-opacity="0.2" fill-rule="evenodd"%3E%3Ccircle cx="3" cy="3" r="3"/%3E%3Ccircle cx="13" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E")' }}></div>
                  
                  {/* Layered content */}
                  <div className="flex items-start gap-6 relative z-10">
                    {/* Book cover with shadow and border */}
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

                    {/* Book details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                          <h3 className="text-2xl font-bold mb-1">{selectedBook.title}</h3>
                          <p className="text-white/90 text-lg">by {selectedBook.author} {selectedBook.releaseYear && `(${selectedBook.releaseYear})`}</p>
                          
                          <div className="flex flex-wrap gap-2 mt-3">
                        {selectedBook.numberOfPages && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {selectedBook.numberOfPages} pages
                              </span>
                            )}
                            
                        {selectedBook.isbn && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                                ISBN: {selectedBook.isbn}
                              </span>
                            )}
                            
                            {selectedBook.publisher && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {selectedBook.publisher}
                              </span>
                            )}
                          </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBook(null)}
                          className="text-white/80 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-white/10 border border-white/20"
                      >
                          Change Book
                      </button>
                      </div>
                    </div>
                  </div>
                  
                  {selectedBook.description && (
                    <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-md p-3 max-h-24 overflow-y-auto text-sm">
                      <p className="line-clamp-3">{selectedBook.description}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Form Fields - Only shown after book selection */}
              <div className="p-6 border-t border-[#e0e7e9] bg-[#f8fafa] rounded-b-lg">
                <h4 className="text-lg font-semibold text-[#365f60] mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Your Review
                </h4>
                
                <div className="mb-6 relative z-10">
                <label htmlFor="rating" className="block text-sm font-medium text-[#365f60] mb-1">
                  Rating
                </label>
                  <select
                    id="rating"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                    className="w-full p-3 border border-[#d1dfe2] rounded-md shadow-sm focus:ring-2 focus:ring-[#365f60] focus:border-transparent transition-colors z-10"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
                    <option value="4">⭐⭐⭐⭐ (4 stars)</option>
                    <option value="3">⭐⭐⭐ (3 stars)</option>
                    <option value="2">⭐⭐ (2 stars)</option>
                    <option value="1">⭐ (1 star)</option>
                  </select>
                </div>

                <div className="mb-6 relative z-10">
                  <label htmlFor="review" className="block text-sm font-medium text-[#365f60] mb-1">
                    Review
                  </label>
                  <textarea
                    id="review"
                    rows={4}
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    placeholder="Write your review here..."
                    className="w-full p-3 border border-[#d1dfe2] rounded-md shadow-sm focus:ring-2 focus:ring-[#365f60] focus:border-transparent transition-colors z-10"
                    required
                  />
                  <div className="text-xs text-[#8aa4a9] mt-1 text-right">{formData.text.length}/2000</div>
              </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 relative z-10">
                  <div className="mb-4">
                  <label htmlFor="startDate" className="block text-sm font-medium text-[#365f60] mb-1">
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    Start Date
                      </span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full p-3 border border-[#d1dfe2] rounded-md shadow-sm focus:ring-2 focus:ring-[#365f60] focus:border-transparent transition-colors z-10"
                    required
                  />
                </div>

                  <div className="mb-4">
                  <label htmlFor="endDate" className="block text-sm font-medium text-[#365f60] mb-1">
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    End Date
                      </span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full p-3 border border-[#d1dfe2] rounded-md shadow-sm focus:ring-2 focus:ring-[#365f60] focus:border-transparent transition-colors z-10"
                    required
                  />
                  </div>
                </div>
              </div>

              {/* Footer with action buttons */}
              <div className="p-6 border-t border-[#e0e7e9] bg-[#f8fafa] relative z-10">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/reviews')}
                    className="px-4 py-2 border border-[#d1dfe2] rounded-md text-[#365f60] hover:bg-[#f1f5f5] transition-colors relative z-10"
                    disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
                    className="px-4 py-2 bg-[#365f60] border border-[#365f60] rounded-md text-white hover:bg-[#2b4c4d] transition-colors relative z-10 flex items-center"
                    disabled={loading}
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Submit Review
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Buttons shown when no book is selected */}
          {!selectedBook && (
            <div className="flex justify-end p-6">
              <button
                type="button"
                onClick={() => router.push('/reviews')}
                className="px-4 py-2 border border-[#d1dfe2] rounded-md text-[#365f60] hover:bg-[#f1f5f5] transition-colors relative z-10"
              >
                Cancel
            </button>
          </div>
          )}
        </form>
      </div>
    </div>
  );
} 