'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { books } from '@/services/api';
import { useZxing } from 'react-zxing';

// Define the Book interface to include all required properties
export interface Book {
  id?: string;
  title: string;
  author: string;
  releaseYear?: number;
  coverUrl?: string;
  description?: string;
  isbn?: string;
  language?: string;
  publisher?: string;
  numberOfPages?: number;
  openLibraryKey?: string;
  firstPublishYear?: number;
}

interface BookSearchProps {
  onBookSelected: (book: Book) => void;
  selectedBook: Book | null;
  enableBarcode?: boolean;
  minSearchLength?: number;
  autoSearchLength?: number;
  debounceDelay?: number;
  placeholder?: string;
  label?: string;
}

export default function BookSearch({
  onBookSelected,
  selectedBook,
  enableBarcode = false,
  minSearchLength = 2,
  autoSearchLength = 5,
  debounceDelay = 500,
  placeholder = "Search by title, author, or ISBN",
  label = "Search for a book"
}: BookSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isBarcodeScanned, setIsBarcodeScanned] = useState(false);
  
  // Add debounced search query and references for cancellation
  const debouncedSearchQuery = useDebounce(searchQuery, debounceDelay);
  const searchCancelled = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to search by ISBN
  const searchByISBN = async (isbn: string) => {
    if (!isbn) return;
    
    console.log("Searching for ISBN:", isbn);
    
    // Ensure barcode scanned flag is true during search
    setIsBarcodeScanned(true);
    
    // Cancel any existing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Create a new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsSearching(true);
    searchCancelled.current = false;
    setSearchResults([]); // Clear previous results
    
    try {
      const response = await books.searchBooks(isbn, controller.signal);
      
      if (!searchCancelled.current) {
        console.log("ISBN search results:", response);
        
        // Type assertion to treat response as an array of Book objects
        const typedResponse = response as unknown as Book[];
        
        // If we got exactly one result from an ISBN search, select it automatically
        if (typedResponse.length === 1 && isbn.length >= 10) {
          const book = typedResponse[0];
          console.log("Automatically selecting single ISBN result:", book);
          onBookSelected(book);
          setSearchQuery('');
          setSearchResults([]);
        } else {
          setSearchResults(typedResponse);
          
          if (typedResponse.length === 0) {
            setError('No books found with this ISBN. Try a different search term or scan again.');
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'CanceledError' || searchCancelled.current) {
        console.log('ISBN search was cancelled');
      } else if (!searchCancelled.current) {
        console.error('ISBN search failed:', err);
        setSearchResults([]);
        setError('Failed to search for ISBN. Please try again or search manually.');
      }
    } finally {
      if (!searchCancelled.current) {
        setIsSearching(false);
      }
      // Clean up the abort controller reference if this is the current one
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      
      // Reset the barcode scanned flag after a delay to ensure complete operation
      setTimeout(() => setIsBarcodeScanned(false), 1500);
    }
  };

  // Barcode scanner setup
  const { ref } = useZxing({
    onDecodeResult(result: { getText: () => string }) {
      const isbn = result.getText();
      console.log("Barcode detected:", isbn);
      
      // Close the scanner after successful scan
      setShowScanner(false);
      
      // Set flag to prevent search cancellation in onChange handler
      setIsBarcodeScanned(true);
      
      // Show a temporary success message
      setError(null);
      const scanElement = document.createElement('div');
      scanElement.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 animate-fade-in-out flex items-center';
      scanElement.innerHTML = `
        <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Barcode detected: ${isbn}</span>
      `;
      document.body.appendChild(scanElement);
      setTimeout(() => {
        scanElement.classList.add('fade-out');
        setTimeout(() => document.body.removeChild(scanElement), 500);
      }, 3000);
      
      // Directly call function with the ISBN instead of updating state
      // This bypasses the normal input onChange handling completely
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

  // Function to cancel the current search
  const cancelSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    searchCancelled.current = true;
    setIsSearching(false);
  };

  // Effect for handling search
  useEffect(() => {
    // Only auto-search if query is at least autoSearchLength characters long
    if (debouncedSearchQuery.length >= autoSearchLength && !isSearching) {
      handleSearch();
    } else if (debouncedSearchQuery.length === 0) {
      setSearchResults([]);
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
    setSearchResults([]); // Clear previous results when starting a new search
    
    try {
      // Pass the AbortSignal to the searchBooks method
      const response = await books.searchBooks(searchQuery.trim(), controller.signal);
      
      if (!searchCancelled.current) {
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

        // Type assertion to treat response as an array of Book objects
        const typedResponse = response as unknown as Book[];

        // Sort results: books with covers first, then by title similarity
        const sortedResults = [...typedResponse].sort((a, b) => {
          // First, sort by presence of cover image
          if (a.coverUrl && !b.coverUrl) return -1;
          if (!a.coverUrl && b.coverUrl) return 1;
          
          // Then, sort by title similarity
          const similarityA = calculateSimilarity(a.title, searchQuery.trim());
          const similarityB = calculateSimilarity(b.title, searchQuery.trim());
          
          return similarityB - similarityA;
        });

        setSearchResults(sortedResults);
        
        if (sortedResults.length === 0) {
          setError('No books found. Try a different search term.');
        }
      }
    } catch (err: any) {
      // Check if this is an abort error
      if (err.name === 'AbortError' || err.name === 'CanceledError' || searchCancelled.current) {
        console.log('Search was cancelled');
      } else if (!searchCancelled.current) {
        console.error('Search failed:', err);
        setSearchResults([]);
        setError('Failed to search for books. Please try again.');
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

  // Function to handle keypress in search input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.length >= minSearchLength) {
        if (isSearching) {
          cancelSearch();
        } else {
          handleSearch();
        }
      }
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

  // Clear search results when a book is selected
  const handleSelectBook = (book: Book) => {
    console.log("Book selected in BookSearch component:", book);
    onBookSelected(book);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="relative">
      <label htmlFor="search" className="block text-sm font-medium text-[#365f60] mb-2 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {label}
      </label>
      <div className="flex relative">
        <div className="relative flex-grow">
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => {
              const newValue = e.target.value;
              
              // Only cancel existing searches when typing manually, not when setting via barcode scan
              if (!isBarcodeScanned && (isSearching || abortControllerRef.current)) {
                cancelSearch();
              }
              
              setSearchQuery(newValue);
            }}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className="w-full px-3 py-2 pl-10 pr-10 border border-[#d1dfe2] rounded-l-md focus:outline-none focus:ring-1 focus:ring-[#365f60] focus:border-[#365f60]"
            role="searchbox"
            aria-label={`Search for a book by ${placeholder}`}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8aa4a9] pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* Clear button - now inside the input field */}
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8aa4a9] hover:text-[#365f60] p-1 rounded-full hover:bg-[#f1f5f5] transition-colors z-10"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Search button */}
        <button
          type="button"
          onClick={isSearching ? cancelSearch : handleSearch}
          disabled={searchQuery.length < minSearchLength}
          className={`px-4 py-2 rounded-r-md transition-colors flex items-center justify-center min-w-[100px] z-10 ${
            isSearching 
              ? 'bg-[#f44336] hover:bg-[#d32f2f] text-white'
              : 'bg-[#365f60] hover:bg-[#4d797e] text-white disabled:bg-[#adbfc7] disabled:cursor-not-allowed'
          }`}
          aria-label={isSearching ? "Cancel search" : "Search for books"}
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
        
        {/* Barcode scanner button */}
        {enableBarcode && (
          <button
            type="button"
            onClick={handleOpenScanner}
            className="ml-2 px-3 py-2 rounded-md text-[#365f60] hover:bg-[#f1f5f5] transition-colors flex items-center justify-center z-10"
            title="Scan ISBN barcode"
            aria-label="Scan book barcode"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="4" y1="7" x2="4" y2="17" />
              <line x1="7" y1="7" x2="7" y2="17" />
              <line x1="10" y1="7" x2="10" y2="17" />
              <line x1="13" y1="7" x2="13" y2="17" />
              <line x1="16" y1="7" x2="16" y2="17" />
              <line x1="19" y1="7" x2="19" y2="17" />
              <line x1="5" y1="7" x2="5" y2="17" stroke-width="1" />
              <line x1="9" y1="7" x2="9" y2="17" stroke-width="1" />
              <line x1="14" y1="7" x2="14" y2="17" stroke-width="1" />
              <line x1="18" y1="7" x2="18" y2="17" stroke-width="1" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Helper text for search requirements */}
      {searchQuery.length > 0 && searchQuery.length < minSearchLength && (
        <p className="text-xs text-[#6b8e92] mt-1">Type at least {minSearchLength} characters to search</p>
      )}
      {searchQuery.length >= minSearchLength && searchQuery.length < autoSearchLength && !isSearching && (
        <p className="text-xs text-[#6b8e92] mt-1">Type at least {autoSearchLength} characters for auto-search or click Search</p>
      )}
      
      {error && (
        <div className="mb-4 mt-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading indicator when searching */}
      {isSearching && !showScanner && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#365f60]"></div>
        </div>
      )}

      {/* Search results */}
      {!isSearching && searchResults.length > 0 && (
        <div className="mb-6 mt-4 relative z-30">
          <h3 className="text-lg font-medium text-[#365f60] mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-[#365f60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Search Results
          </h3>
          <div className="max-h-60 overflow-y-auto border border-[#d1dfe2] rounded-md divide-y divide-[#e0e7e9] bg-white shadow-lg">
            {searchResults.map((book, index) => (
              <button
                key={index}
                className="w-full p-3 flex items-start cursor-pointer hover:bg-[#f8fafa] transition-colors text-left"
                onClick={() => handleSelectBook(book)}
                type="button"
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
                    {(book.releaseYear || book.firstPublishYear) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#f1f5f5] text-[#6b8e92]">
                        {book.releaseYear || book.firstPublishYear}
                      </span>
                    )}
                    {book.numberOfPages && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#f1f5f5] text-[#6b8e92]">
                        {book.numberOfPages} pages
                      </span>
                    )}
                    {book.isbn && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#f1f5f5] text-[#6b8e92]">
                        ISBN: {book.isbn}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      {showScanner && (
        <div className="mt-4 relative z-40">
          <div className="absolute top-2 right-2 z-50">
            <button
              type="button"
              onClick={() => setShowScanner(false)}
              className="bg-white rounded-full p-1 shadow-md text-[#365f60] hover:text-[#8aa4a9]"
              aria-label="Close scanner"
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