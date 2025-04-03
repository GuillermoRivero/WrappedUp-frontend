'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import BookSearch, { Book as SearchBook } from '@/components/BookSearch';
import Modal from '@/components/Modal';

interface AddToWishlistProps {
  onAddedToWishlist: () => void;
  onCancel: () => void;
}

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

export default function AddToWishlist({ onAddedToWishlist, onCancel }: AddToWishlistProps) {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState<WishlistBook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [priority, setPriority] = useState(2); // 1=low, 3=medium, 5=high
  
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
    
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/api/wishlist', {
        openLibraryKey: selectedBook.openLibraryKey,
        description: notes,
        priority: priority,
        isPublic: isPublic
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Failed to add book to wishlist');
      }

      onAddedToWishlist();
    } catch (err: any) {
      console.error('Error adding to wishlist:', err);
      setError(err.response?.data?.message || 'Failed to add book to wishlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onCancel}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-[#adbfc7]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e0e7e9]">
          <h2 className="text-2xl font-bold text-[#365f60]">Add to Wishlist</h2>
          <button
            onClick={onCancel}
            className="text-[#8aa4a9] hover:text-[#365f60] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content area */}
          <div className="p-6">
            {error && (
              <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-4 py-3 rounded-md mb-4">
                {error}
              </div>
            )}

            {/* Step 1: Book Search (visible when no book is selected) */}
            {!selectedBook && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-[#365f60] mb-3">
                  Search for a book to add
                </h3>
                <BookSearch 
                  onBookSelected={handleBookSelected}
                  selectedBook={null}
                  enableBarcode={true}
                  minSearchLength={2}
                  autoSearchLength={5}
                  placeholder="Search by title, author, or ISBN"
                  label="Search for a book"
                />
              </div>
            )}

            {/* Step 2: Book Selected - Show form fields with wishlist card style */}
            {selectedBook && (
              <div className="bg-white rounded-lg border border-[#e0e7e9] overflow-hidden shadow-sm">
                {/* Book cover and basic info section */}
                <div className="relative">
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#365f60]/20 to-white z-0 opacity-80"></div>
                  
                  {/* Layered content */}
                  <div className="relative z-10 flex flex-col md:flex-row p-6">
                    {/* Book cover with shadow and border */}
                    <div className="relative md:w-1/4 flex-shrink-0">
                      <div className="relative h-52 md:h-64 transform transition-transform hover:scale-105 shadow-lg rounded-lg overflow-hidden border-2 border-white">
                        {selectedBook.coverUrl ? (
                          <img 
                            src={selectedBook.coverUrl} 
                            alt={`Cover of ${selectedBook.title}`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#d1dfe2]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#8aa4a9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Book details with better spacing */}
                    <div className="md:w-3/4 pt-6 md:pt-0 md:pl-6 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-[#365f60] font-bold text-2xl mb-1 leading-tight" title={selectedBook.title}>
                            {selectedBook.title}
                          </h3>
                          <p className="text-[#6b8e92] text-lg mb-3" title={selectedBook.author}>
                            by {selectedBook.author}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedBook(null)}
                          className="p-2 text-[#6b8e92] hover:text-[#365f60] rounded-full hover:bg-[#f1f5f5] transition-colors h-10 w-10 flex items-center justify-center flex-shrink-0"
                          title="Change book"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                          </svg>
                        </button>
                      </div>

                      {/* Book metadata with improved styling */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedBook.firstPublishYear && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#e6f1f2] text-[#365f60] shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {selectedBook.firstPublishYear}
                          </span>
                        )}
                        {selectedBook.isbn && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#e6f1f2] text-[#365f60] shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            ISBN: {selectedBook.isbn}
                          </span>
                        )}
                      </div>
                      
                      {/* Description preview if available */}
                      {selectedBook.description && (
                        <div className="mb-3 mt-2">
                          <p className="text-[#4a6e70] text-sm italic line-clamp-3 bg-[#f8fafa] p-3 rounded-md border border-[#e0e7e9]">
                            "{selectedBook.description}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form fields for wishlist details */}
                <div className="p-6 border-t border-[#e0e7e9] bg-[#f8fafa] rounded-b-lg">
                  <h4 className="text-lg font-semibold text-[#365f60] mb-4">Wishlist Details</h4>
                  
                  {/* Description */}
                  <div className="mb-6">
                    <label className="text-sm font-medium text-[#365f60] mb-1 block">Personal Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What interests you about this book?"
                      className="w-full p-3 border border-[#d1dfe2] rounded-md text-sm focus:ring-2 focus:ring-[#365f60] focus:border-transparent transition-colors"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="text-xs text-[#8aa4a9] mt-1 text-right">{notes.length}/500</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Priority selection */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-[#365f60] mb-2 block">Reading Priority</label>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
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
                    </div>

                    {/* Visibility toggle */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-[#365f60] mb-2 block">Visibility</label>
                      <div className="flex items-center space-x-4">
                        <button
                          type="button"
                          onClick={() => setIsPublic(true)}
                          className={`px-4 py-2 rounded-md text-sm flex items-center transition-all ${
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
                          className={`px-4 py-2 rounded-md text-sm flex items-center transition-all ${
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
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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
    </Modal>
  );
} 