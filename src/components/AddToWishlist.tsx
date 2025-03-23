'use client';

import { useState, useEffect, useRef } from 'react';
import { Book, WishlistAddRequest, WishlistItem } from '@/types/wishlist';
import { books, wishlist } from '@/services/api';
import Modal from '@/components/Modal';
import { useDebounce } from '@/hooks/useDebounce';

interface AddToWishlistProps {
  onClose: () => void;
  onAdd: (item: WishlistItem) => void;
  refreshWishlist: () => Promise<void>;
}

export default function AddToWishlist({ onClose, onAdd, refreshWishlist }: AddToWishlistProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(3); // Default priority
  const [isPublic, setIsPublic] = useState(true); // Default to public
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  // Add debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  // Add a reference to track if the search was cancelled
  const searchCancelled = useRef(false);
  // Add a reference to the current AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update character count when description changes
  useEffect(() => {
    setCharCount(description.length);
  }, [description]);

  // Clear selection when search query changes
  useEffect(() => {
    if (searchQuery.length === 0) {
      setSelectedBook(null);
    }
  }, [searchQuery]);

  // Add an effect to trigger search when the debounced query changes
  useEffect(() => {
    // Only auto-search if query is at least 5 characters long
    if (debouncedSearchQuery.length >= 5 && !isSearching) {
      handleSearch();
    } else if (debouncedSearchQuery.length === 0) {
      setSearchResults([]);
      setSelectedBook(null);
    }
    
    // Cleanup function to cancel any in-flight request when debounce changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearchQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending request when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Function to cancel the current search
  const cancelSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    searchCancelled.current = true;
    setIsSearching(false);
  };

  // Function to handle searching for books
  const handleSearch = async () => {
    if (searchQuery.trim() === '' || isSearching) return;
    
    // Cancel any previous request
    cancelSearch();
    
    // Create a new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsSearching(true);
    searchCancelled.current = false; // Reset cancellation flag
    setError(null);
    
    try {
      // Pass the AbortSignal to the searchBooks method
      const response = await books.searchBooks(searchQuery.trim(), controller.signal);
      
      if (!searchCancelled.current) {
        setSearchResults(response || []);
        if (response.length === 0) {
          setError('No books found. Try a different search term.');
        }
      }
    } catch (err: any) {
      // Check if this is an abort error
      if (err.name === 'AbortError' || err.name === 'CanceledError' || searchCancelled.current) {
        console.log('Search was cancelled');
      } else if (!searchCancelled.current) {
        console.error('Error searching books:', err);
        setError('Failed to search for books. Please try again.');
        setSearchResults([]);
      }
    } finally {
      if (!searchCancelled.current) {
        setIsSearching(false);
      }
      // Clean up the abort controller reference if this is the current one
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBook) {
      setError('Please select a book to add to your wishlist.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Check for token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to add books to your wishlist. Please log in and try again.');
        setIsSubmitting(false);
        return;
      }
      
      const wishlistData: WishlistAddRequest = {
        description: description.trim() || undefined,
        priority,
        isPublic
      };
      
      // Add either bookId or openLibraryKey based on what's available
      if (selectedBook.id) {
        wishlistData.bookId = selectedBook.id;
      } else if (selectedBook.openLibraryKey) {
        wishlistData.openLibraryKey = selectedBook.openLibraryKey;
      } else {
        throw new Error('Book is missing both id and openLibraryKey');
      }
      
      const addedItem = await wishlist.addToWishlist(wishlistData);
      onAdd(addedItem);
      await refreshWishlist();
      onClose();
    } catch (err) {
      console.error('Failed to add to wishlist:', err);
      setError('Failed to add book to wishlist. Please try again. If the problem persists, try logging out and back in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // We no longer need the manual handleKeyPress function since the search is triggered by the debounced value
  // But keep it for Enter key functionality
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.length >= 2) {
        if (isSearching) {
          cancelSearch();
        } else {
          handleSearch();
        }
      }
    }
  };

  // Get priority color based on value
  const getPriorityColor = (value: number): string => {
    switch(value) {
      case 1: return 'bg-gray-200 text-gray-800';
      case 2: return 'bg-blue-200 text-blue-800';
      case 3: return 'bg-yellow-200 text-yellow-800';
      case 4: return 'bg-orange-200 text-orange-800';
      case 5: return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-[#e0e7e9]">
          <h2 className="text-xl font-semibold text-[#365f60]">Add to Wishlist</h2>
          <button 
            onClick={onClose}
            className="text-[#8aa4a9] hover:text-[#365f60] p-1 rounded-full hover:bg-[#f1f5f5] transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {/* Search section */}
          <div className="mb-6">
            <label htmlFor="search" className="block text-sm font-medium text-[#365f60] mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search for a book
            </label>
            <div className="flex relative">
              <input
                type="text"
                id="search"
                className="flex-grow px-3 py-2 pl-10 border border-[#d1dfe2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#365f60] focus:border-[#365f60]"
                placeholder="Search by title, author, or ISBN"
                value={searchQuery}
                onChange={(e) => {
                  // Always cancel existing searches when typing
                  if (isSearching || abortControllerRef.current) {
                    cancelSearch();
                  }
                  setSearchQuery(e.target.value);
                }}
                onKeyPress={handleKeyPress}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8aa4a9]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-[110px] top-1/2 transform -translate-y-1/2 text-[#8aa4a9] hover:text-[#365f60] p-1 rounded-full hover:bg-[#f1f5f5] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={isSearching ? cancelSearch : handleSearch}
                disabled={searchQuery.length < 2}
                className="px-4 py-2 bg-[#365f60] text-white rounded-r-md hover:bg-[#4d797e] transition-colors disabled:bg-[#adbfc7] disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {isSearching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cancel
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <p className="text-xs text-[#6b8e92] mt-1">Type at least 2 characters to search</p>
            )}
            {searchQuery.length >= 2 && searchQuery.length < 5 && !isSearching && (
              <p className="text-xs text-[#6b8e92] mt-1">Type at least 5 characters for auto-search or click Search</p>
            )}
          </div>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Loading indicator when searching */}
          {isSearching && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#365f60]"></div>
            </div>
          )}
          
          {/* Search results */}
          {!isSearching && searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-[#365f60] mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-[#365f60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Search Results
              </h3>
              <div className="max-h-60 overflow-y-auto border border-[#d1dfe2] rounded-md divide-y divide-[#e0e7e9]">
                {searchResults.map((book) => (
                  <div
                    key={book.id || book.openLibraryKey}
                    className={`p-3 flex items-start cursor-pointer hover:bg-[#f8fafa] transition-colors ${
                      selectedBook && 
                      ((selectedBook.id && book.id && selectedBook.id === book.id) || 
                       (selectedBook.openLibraryKey && book.openLibraryKey && selectedBook.openLibraryKey === book.openLibraryKey))
                        ? 'bg-[#e5eaec] border-l-4 border-[#365f60]'
                        : ''
                    }`}
                    onClick={() => setSelectedBook(book)}
                  >
                    <div className="flex-shrink-0 w-12 h-16 bg-[#d1dfe2] mr-3 overflow-hidden rounded shadow-sm">
                      {book.coverUrl ? (
                        <img 
                          src={book.coverUrl} 
                          alt={`Cover of ${book.title}`}
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#8aa4a9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-[#365f60] font-medium line-clamp-2">{book.title}</h4>
                      <p className="text-sm text-[#6b8e92]">{book.author}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {book.firstPublishYear && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#f1f5f5] text-[#6b8e92]">
                            {book.firstPublishYear}
                          </span>
                        )}
                        {book.numberOfPagesMedian && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#f1f5f5] text-[#6b8e92]">
                            {book.numberOfPagesMedian} pages
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedBook && 
                     ((selectedBook.id && book.id && selectedBook.id === book.id) || 
                      (selectedBook.openLibraryKey && book.openLibraryKey && selectedBook.openLibraryKey === book.openLibraryKey)) && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#365f60] ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Book details and form */}
          {selectedBook && (
            <form onSubmit={handleSubmit}>
              <div className="mb-6 p-4 border border-[#d1dfe2] rounded-md bg-[#f8fafa]">
                <h3 className="text-lg font-medium text-[#365f60] mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add to Wishlist: {selectedBook.title}
                </h3>
                
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-[#365f60] mb-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    className="w-full px-3 py-2 border border-[#d1dfe2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#365f60] text-sm"
                    rows={3}
                    placeholder="Why do you want to read this book?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                  />
                  <div className="text-xs text-[#8aa4a9] mt-1 text-right">{charCount}/500 characters</div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="priority" className="block text-sm font-medium text-[#365f60] mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Priority
                  </label>
                  <div className="flex space-x-2 mb-2">
                    {[1, 2, 3, 4, 5].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          priority === p ? getPriorityColor(p) + ' font-bold' : 'bg-[#f1f5f5] text-[#6b8e92] hover:bg-[#e5eaec]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-[#8aa4a9]">
                    {priority === 1 && "Low priority - might read someday"}
                    {priority === 2 && "Somewhat interested in reading"}
                    {priority === 3 && "Medium priority - plan to read soon"}
                    {priority === 4 && "High priority - eager to read"}
                    {priority === 5 && "Top priority - must read next!"}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#365f60] mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Visibility
                  </label>
                  <div className="flex items-center space-x-4 mb-2">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`px-3 py-1 rounded-md text-sm flex items-center ${
                        isPublic ? 'bg-emerald-100 text-emerald-800' : 'bg-[#f1f5f5] text-[#6b8e92]'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`px-3 py-1 rounded-md text-sm flex items-center ${
                        !isPublic ? 'bg-slate-100 text-slate-800' : 'bg-[#f1f5f5] text-[#6b8e92]'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Private
                    </button>
                  </div>
                  <p className="text-xs text-[#8aa4a9]">
                    {isPublic 
                      ? 'This item will be visible on your public wishlist' 
                      : 'This item will be private and only visible to you'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-[#365f60] border border-[#d1dfe2] rounded-md hover:bg-[#f8fafa] transition-colors flex items-center"
                  disabled={isSubmitting}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#365f60] text-white rounded-md hover:bg-[#4d797e] transition-colors flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add to Wishlist
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
} 