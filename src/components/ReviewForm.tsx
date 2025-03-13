'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/services/api';
import { useZxing } from 'react-zxing';

interface ReviewFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

interface Book {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    text: '',
    rating: 5,
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Function to search by ISBN
  const searchByISBN = async (isbn: string) => {
    if (!isbn) return;
    
    console.log("Searching for ISBN:", isbn);
    setSearching(true);
    setSearchResults([]); // Clear previous results
    
    try {
      const response = await api.get(`/api/books/search?query=${encodeURIComponent(isbn)}`);
      console.log("ISBN search results:", response.data);
      setSearchResults(response.data);
    } catch (err) {
      console.error('ISBN search failed:', err);
      setSearchResults([]);
      setError('Failed to search for ISBN. Please try again or search manually.');
    } finally {
      setSearching(false);
    }
  };

  // Debounce search query with 500ms delay
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Barcode scanner setup
  const { ref } = useZxing({
    onDecodeResult(result: { getText: () => string }) {
      const isbn = result.getText();
      console.log("Barcode detected:", isbn);
      
      // Close the scanner after successful scan
      setShowScanner(false);
      
      // Set the search query
      setSearchQuery(isbn);
      
      // Immediately search for the ISBN without waiting for debounce
      searchByISBN(isbn);
    },
    onError(error: unknown) {
      console.error("Scanner error:", error);
      setCameraError("Error accessing camera: " + (error instanceof Error ? error.message : String(error)));
    },
    constraints: {
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    },
    paused: !showScanner, // Only activate camera when scanner is shown
  });

  // Effect for handling search
  useEffect(() => {
    const searchBooks = async () => {
      if (debouncedSearchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      setSearchResults([]); // Clear previous results when starting a new search
      try {
        const response = await api.get(`/api/books/search?query=${encodeURIComponent(debouncedSearchQuery)}`);
        
        // Calculate similarity score between two strings
        const calculateSimilarity = (bookTitle: string, searchTerm: string) => {
          const title = bookTitle.toLowerCase();
          const term = searchTerm.toLowerCase();
          
          // Exact match gets highest score
          if (title === term) return 1;
          
          // Starting with search term gets high score
          if (title.startsWith(term)) return 0.8;
          
          // Contains exact search term gets medium score
          if (title.includes(term)) return 0.6;
          
          // Contains parts of search term gets lower score
          const words = term.split(' ');
          const matchingWords = words.filter(word => title.includes(word));
          if (matchingWords.length > 0) {
            return 0.4 * (matchingWords.length / words.length);
          }
          
          return 0;
        };

        // Sort results: books with covers first, then by title similarity
        const sortedResults = [...response.data].sort((a, b) => {
          // First, sort by presence of cover image
          if (a.coverUrl && !b.coverUrl) return -1;
          if (!a.coverUrl && b.coverUrl) return 1;
          
          // Then, sort by title similarity
          const similarityA = calculateSimilarity(a.title, debouncedSearchQuery);
          const similarityB = calculateSimilarity(b.title, debouncedSearchQuery);
          
          return similarityB - similarityA;
        });

        setSearchResults(sortedResults);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    searchBooks();
  }, [debouncedSearchQuery]);

  // Update search input without triggering immediate search
  const handleSearchInput = (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]); // Clear results when input is too short
    }
  };

  // Function to handle camera access
  const handleOpenScanner = () => {
    setCameraError(null);
    
    // Check if we're in a secure context (HTTPS or localhost)
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError("Camera access requires a secure connection (HTTPS). Please use HTTPS to enable the barcode scanner.");
      setShowScanner(true); // Still show the scanner UI with the error message
      return;
    }
    
    // Check if the browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Your browser doesn't support camera access. Please try using a modern browser like Chrome, Firefox, or Safari.");
      setShowScanner(true); // Still show the scanner UI with the error message
      return;
    }
    
    // Attempt to get camera permissions
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        // Permission granted, now show the scanner
        setShowScanner(true);
        console.log("Camera permission granted, activating scanner");
      })
      .catch((err) => {
        console.error("Camera permission error:", err);
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
        setShowScanner(true); // Still show the scanner UI with the error message
      });
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-[#adbfc7]">
      <h2 className="text-2xl font-bold text-[#365f60] mb-4">Write a Book Review</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Book Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-[#365f60] mb-1">
            Search for a book
          </label>
          <div className="relative">
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search for a book..."
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={handleOpenScanner}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#365f60] hover:text-[#8aa4a9] transition-colors"
              title="Scan ISBN barcode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} />
              </svg>
            </button>
          </div>
          
          {searchResults.length > 0 && !selectedBook && (
            <div className="mt-2 border border-[#adbfc7] rounded-md max-h-96 overflow-y-auto">
              {searching ? (
                <div className="p-4 text-center text-[#8aa4a9]">
                  Searching...
                </div>
              ) : (
                searchResults.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => {
                      setSelectedBook(book);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-4 hover:bg-[#dfe7ec] focus:bg-[#dfe7ec] flex gap-4 items-start border-b border-[#adbfc7] last:border-b-0"
                  >
                    {book.coverUrl && (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-16 h-auto rounded shadow-sm"
                      />
                    )}
                    <div>
                      <div className="font-medium text-[#365f60]">{book.title}</div>
                      <div className="text-sm text-[#8aa4a9]">by {book.author} ({book.releaseYear})</div>
                      {book.publisher && (
                        <div className="text-sm text-[#8aa4a9]">Publisher: {book.publisher}</div>
                      )}
                      {book.numberOfPages && (
                        <div className="text-sm text-[#8aa4a9]">{book.numberOfPages} pages</div>
                      )}
                      {book.isbn && (
                        <div className="text-sm text-[#8aa4a9]">ISBN: {book.isbn}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedBook && (
            <div className="mt-2 p-4 border border-[#adbfc7] rounded-md bg-[#dfe7ec]">
              <div className="flex gap-4">
                {selectedBook.coverUrl && (
                  <img
                    src={selectedBook.coverUrl}
                    alt={selectedBook.title}
                    className="w-32 h-auto rounded shadow-md"
                  />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-[#365f60] text-lg">{selectedBook.title}</div>
                      <div className="text-[#8aa4a9]">by {selectedBook.author} ({selectedBook.releaseYear})</div>
                      {selectedBook.publisher && (
                        <div className="text-sm text-[#8aa4a9] mt-1">Publisher: {selectedBook.publisher}</div>
                      )}
                      {selectedBook.numberOfPages && (
                        <div className="text-sm text-[#8aa4a9]">{selectedBook.numberOfPages} pages</div>
                      )}
                      {selectedBook.isbn && (
                        <div className="text-sm text-[#8aa4a9]">ISBN: {selectedBook.isbn}</div>
                      )}
                      {selectedBook.description && (
                        <div className="text-sm text-[#746a64] mt-2 line-clamp-3">{selectedBook.description}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBook(null)}
                      className="text-[#8aa4a9] hover:text-[#365f60] ml-4"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="rating" className="block text-sm font-medium text-[#365f60] mb-1">
            Rating
          </label>
          <select
            id="rating"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
            className="input-field"
          >
            <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
            <option value="4">⭐⭐⭐⭐ (4 stars)</option>
            <option value="3">⭐⭐⭐ (3 stars)</option>
            <option value="2">⭐⭐ (2 stars)</option>
            <option value="1">⭐ (1 star)</option>
          </select>
        </div>

        <div>
          <label htmlFor="review" className="block text-sm font-medium text-[#365f60] mb-1">
            Review
          </label>
          <textarea
            id="review"
            rows={4}
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            placeholder="Write your review here..."
            className="input-field"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-[#365f60] mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-[#365f60] mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="input-field"
              required
            />
          </div>
        </div>

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
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>

      {/* Barcode Scanner */}
      {showScanner && (
        <div className="mt-4 relative">
          <div className="absolute top-2 right-2 z-10">
            <button
              type="button"
              onClick={() => setShowScanner(false)}
              className="bg-white rounded-full p-1 shadow-md text-[#365f60] hover:text-[#8aa4a9]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="rounded-lg overflow-hidden border-2 border-[#365f60] relative">
            {cameraError ? (
              <div className="w-full h-64 flex items-center justify-center bg-gray-100 text-red-500 p-4 text-center">
                <div>
                  <p className="font-medium mb-2">Camera access error</p>
                  <p className="text-sm">{cameraError}</p>
                  <p className="text-sm mt-2">
                    Please make sure you've granted camera permissions and are using a secure connection (HTTPS).
                    <br />
                    If using Chrome, check the camera icon in the address bar to manage permissions.
                  </p>
                  <div className="mt-3 flex justify-center space-x-3">
                    <button 
                      onClick={() => {
                        setCameraError(null);
                        // First close the scanner to release resources
                        setShowScanner(false);
                        // Use setTimeout to ensure state updates before reopening
                        setTimeout(() => handleOpenScanner(), 100);
                      }}
                      className="px-4 py-2 bg-[#365f60] text-white rounded-md hover:bg-[#2a4a4b] transition-colors"
                    >
                      Try Again
                    </button>
                    <button 
                      onClick={() => setShowScanner(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <video ref={ref as React.LegacyRef<HTMLVideoElement>} className="w-full h-64 object-cover" autoPlay playsInline muted />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-1/2 border-2 border-[#365f60] opacity-70"></div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-[#365f60] bg-opacity-70 text-white text-center py-2">
                  Position the ISBN barcode within the frame
                </div>
              </>
            )}
          </div>
          <div className="mt-2 text-sm text-[#8aa4a9] text-center">
            Make sure you have good lighting and hold the camera steady
          </div>
        </div>
      )}
    </div>
  );
} 