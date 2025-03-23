'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { wishlist } from '@/services/api';
import { useRouter } from 'next/navigation';
import BookSearch, { Book as SearchBook } from '@/components/BookSearch';

interface WishlistBook {
  id: string;
  title: string;
  author: string;
  openLibraryKey: string;
  coverUrl?: string;
  description?: string;
  firstPublishYear?: number;
  isbn?: string;
}

export default function AddToWishlistPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState<WishlistBook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [priority, setPriority] = useState(2); // 1=very low, 2=low, 3=medium, 4=high, 5=very high
  
  // Get background color for priority badge
  const getPriorityColor = (priority: number): string => {
    switch(priority) {
      case 1: return 'bg-gray-200 text-gray-800';
      case 2: return 'bg-blue-200 text-blue-800';
      case 3: return 'bg-yellow-200 text-yellow-800';
      case 4: return 'bg-orange-200 text-orange-800';
      case 5: return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  // Convert search book to wishlist book format
  const handleBookSelected = (book: SearchBook) => {
    console.log("Book selected in AddToWishlist:", book);
    const wishlistBook: WishlistBook = {
      id: book.id || '',
      title: book.title,
      author: book.author,
      openLibraryKey: book.openLibraryKey || '',
      coverUrl: book.coverUrl,
      description: book.description,
      firstPublishYear: book.firstPublishYear || book.releaseYear,
      isbn: book.isbn
    };
    setSelectedBook(wishlistBook);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBook) {
      setError('Please select a book first');
      return;
    }
    
    if (!selectedBook.openLibraryKey) {
      setError('The selected book does not have an Open Library key');
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      console.log("Page: Submitting wishlist data:", {
        openLibraryKey: selectedBook.openLibraryKey,
        description: notes,
        priority: priority,
        isPublic: isPublic
      });
      
      const response = await wishlist.addToWishlist({
        openLibraryKey: selectedBook.openLibraryKey,
        description: notes,
        priority: priority,
        isPublic: isPublic
      });
      
      console.log("Page: Wishlist response success:", response);

      // Redirigir al usuario a la página de wishlist
      router.push('/wishlist');
    } catch (err: any) {
      console.error('Page: Error adding to wishlist:', err);
      let errorMessage = 'Failed to add book to wishlist';
      
      if (err.response) {
        console.error('Page: Error response status:', err.response.status);
        console.error('Page: Error response data:', err.response.data);
        
        if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-[#e0e7e9]">
          <h2 className="text-2xl font-bold text-[#365f60]">Add to Wishlist</h2>
          <p className="text-[#8aa4a9] mt-1">Keep track of books you'd like to read</p>
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
              label="Search for a book to add to your wishlist"
            />
          </div>

          {/* Selected Book with Enhanced Styling */}
          {selectedBook && (
            <div className="transition-all duration-300 ease-in-out relative z-10">
              {/* Book cover and basic info section */}
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
                          <p className="text-white/90 text-lg">by {selectedBook.author}</p>
                          
                          <div className="flex flex-wrap gap-2 mt-3">
                            {selectedBook.firstPublishYear && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {selectedBook.firstPublishYear}
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
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedBook(null)}
                          className="text-white/80 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10 z-10"
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

                {/* Form fields for wishlist details */}
                <div className="p-6 border-t border-[#e0e7e9] bg-[#f8fafa] rounded-b-lg">
                  <h4 className="text-lg font-semibold text-[#365f60] mb-4">Wishlist Details</h4>
                  
                  {/* Description */}
                  <div className="mb-6 relative z-10">
                    <label htmlFor="notes" className="text-sm font-medium text-[#365f60] mb-1 block">Personal Notes (optional)</label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What interests you about this book?"
                      className="w-full p-3 border border-[#d1dfe2] rounded-md text-sm focus:ring-2 focus:ring-[#365f60] focus:border-transparent transition-colors z-10"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="text-xs text-[#8aa4a9] mt-1 text-right">{notes.length}/500</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {/* Priority selection */}
                    <fieldset className="mb-4 relative z-10">
                      <legend className="text-sm font-medium text-[#365f60] mb-2 block">Reading Priority</legend>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all relative z-10 ${
                              priority === p 
                              ? getPriorityColor(p) + ' font-bold shadow-md transform scale-110' 
                              : 'bg-[#f1f5f5] text-[#6b8e92] hover:bg-[#e6f1f2]'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-[#8aa4a9] mt-2">
                        Priority level: {
                          priority === 1 ? 'Very Low' :
                          priority === 2 ? 'Low' :
                          priority === 3 ? 'Medium' :
                          priority === 4 ? 'High' :
                          'Very High'
                        }
                      </div>
                    </fieldset>

                    {/* Visibility toggle */}
                    <fieldset className="mb-4 relative z-10">
                      <legend className="text-sm font-medium text-[#365f60] mb-2 block">Visibility</legend>
                      <div className="flex items-center space-x-4">
                        <button
                          type="button"
                          onClick={() => setIsPublic(true)}
                          className={`px-4 py-2 rounded-md text-sm flex items-center transition-all relative z-10 ${
                            isPublic ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'bg-[#f1f5f5] text-[#6b8e92] hover:bg-[#e6f1f2]'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          Public
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPublic(false)}
                          className={`px-4 py-2 rounded-md text-sm flex items-center transition-all relative z-10 ${
                            !isPublic ? 'bg-slate-100 text-slate-800 shadow-sm' : 'bg-[#f1f5f5] text-[#6b8e92] hover:bg-[#e6f1f2]'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Private
                        </button>
                      </div>
                      <div className="text-xs text-[#8aa4a9] mt-2">
                        {isPublic ? 
                          'Other users will be able to see this in your public wishlist' : 
                          'Only you will see this wishlist item'
                        }
                      </div>
                    </fieldset>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer with action buttons */}
          <div className="p-6 border-t border-[#e0e7e9] bg-[#f8fafa] relative z-10">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/wishlist')}
                className="btn-secondary relative z-10"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary relative z-10"
                disabled={loading || !selectedBook}
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add to Wishlist
                  </div>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 