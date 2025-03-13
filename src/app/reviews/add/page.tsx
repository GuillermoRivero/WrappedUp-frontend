'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/services/api';
import { useZxing } from 'react-zxing';
import { useRouter } from 'next/navigation';

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

export default function AddReviewPage() {
  const router = useRouter();
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
  const [isScanning, setIsScanning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

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
      setIsScanning(false);
      
      // Set the search query
      setSearchQuery(isbn);
      
      // Immediately search for the ISBN without waiting for debounce
      searchByISBN(isbn);
    },
    onError(error: unknown) {
      console.error("Scanner error:", error);
      setCameraError("Error accessing camera: " + (error instanceof Error ? error.message : String(error)));
      setIsScanning(false);
    },
    constraints: {
      video: {
        facingMode: selectedCamera ? undefined : "environment",
        deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 1.777778 },
        frameRate: { ideal: 15 } // Lower framerate for better performance
      }
    },
    timeBetweenDecodingAttempts: 200, // Slightly longer time between attempts for better performance
    paused: !showScanner, // Only activate camera when scanner is shown
  });

  // Effect to handle zoom and torch
  useEffect(() => {
    if (!ref.current || !showScanner) return;
    
    // Try to apply zoom and torch if supported
    const applyConstraints = async () => {
      try {
        const track = ref.current?.srcObject instanceof MediaStream 
          ? ref.current.srcObject.getVideoTracks()[0] 
          : null;
          
        if (track && typeof track.getConstraints === 'function') {
          console.log("Current constraints:", track.getConstraints());
          console.log("Capabilities:", track.getCapabilities ? track.getCapabilities() : "Not supported");
          
          // Some browsers support these constraints
          if (track.getCapabilities && track.applyConstraints) {
            // Use type assertion for extended capabilities
            const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
              zoom?: { min: number; max: number; step: number };
              torch?: boolean;
            };
            
            const newConstraints: any = {};
            
            if (capabilities.zoom) {
              newConstraints.zoom = zoomLevel;
            }
            
            if (capabilities.torch) {
              newConstraints.torch = torchEnabled;
            }
            
            if (Object.keys(newConstraints).length > 0) {
              await track.applyConstraints(newConstraints);
              console.log("Applied constraints:", newConstraints);
            }
          }
        }
      } catch (err) {
        console.error("Error applying video constraints:", err);
      }
    };
    
    applyConstraints();
  }, [ref, zoomLevel, torchEnabled, showScanner]);

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

  // Function to get available cameras
  const getAvailableCameras = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error("enumerateDevices() not supported.");
        return;
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log("Available cameras:", videoDevices);
      setAvailableCameras(videoDevices);
      
      // If there are cameras and none is selected, select the first one
      if (videoDevices.length > 0 && !selectedCamera) {
        // Try to find a back camera first
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('trasera') ||
          device.label.toLowerCase().includes('rear')
        );
        
        if (backCamera) {
          setSelectedCamera(backCamera.deviceId);
        } else {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      }
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  };

  // Function to handle camera access
  const handleOpenScanner = () => {
    // If scanner is already open, close it and return
    if (showScanner) {
      setShowScanner(false);
      return;
    }
    
    setCameraError(null);
    setIsScanning(false);
    
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
    
    // Get available cameras
    getAvailableCameras();
    
    // Attempt to get camera permissions
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    })
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

  // Handle click on search input
  const handleSearchInputClick = () => {
    if (showScanner) {
      setShowScanner(false);
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

      // Redirect to reviews page after successful submission
      router.push('/reviews');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-[#f8fafa] rounded-lg shadow-lg p-6 border border-[#adbfc7]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#365f60]">Add Book Review</h1>
          <button
            type="button"
            onClick={() => router.push('/reviews')}
            className="text-[#8aa4a9] hover:text-[#365f60] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                onClick={handleSearchInputClick}
                placeholder="Search for a book..."
                className="w-full px-4 py-2 border border-[#adbfc7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#365f60] focus:border-transparent"
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
            
            {/* Barcode Scanner */}
            {showScanner && (
              <div className="mt-4 p-4 border border-[#adbfc7] rounded-md bg-[#f0f5f5]">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-[#365f60]">ISBN Barcode Scanner</h3>
                  <button
                    type="button"
                    onClick={() => setShowScanner(false)}
                    className="text-[#8aa4a9] hover:text-[#365f60]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {cameraError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-2">
                    {cameraError}
                  </div>
                ) : (
                  <>
                    <div className="relative aspect-video overflow-hidden rounded-md border border-[#adbfc7] bg-black">
                      <video 
                        ref={ref as React.RefObject<HTMLVideoElement>} 
                        className="w-full h-full object-cover" 
                        autoPlay
                        playsInline
                        muted
                      />
                      {/* Smaller, more focused scanning area */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-1/2 h-1/4">
                          {/* Horizontal lines */}
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#365f60]"></div>
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#365f60]"></div>
                          
                          {/* Vertical lines */}
                          <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-[#365f60]"></div>
                          <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-[#365f60]"></div>
                          
                          {/* Corner accents */}
                          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#365f60]"></div>
                          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#365f60]"></div>
                          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#365f60]"></div>
                          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#365f60]"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Camera controls */}
                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                      {/* Torch toggle */}
                      <button
                        onClick={() => setTorchEnabled(!torchEnabled)}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                          torchEnabled ? 'bg-yellow-400 text-yellow-800' : 'bg-white text-[#365f60]'
                        } shadow-sm`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {torchEnabled ? 'Turn off flash' : 'Turn on flash'}
                      </button>
                      
                      {/* Camera selector */}
                      {availableCameras.length > 1 && (
                        <div className="flex items-center bg-white rounded-full px-2 py-1 shadow-sm">
                          <select
                            value={selectedCamera || ''}
                            onChange={(e) => setSelectedCamera(e.target.value)}
                            className="text-xs text-[#365f60] bg-transparent border-none focus:ring-0 p-0 pr-5"
                          >
                            {availableCameras.map((camera) => (
                              <option key={camera.deviceId} value={camera.deviceId}>
                                {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <p className="text-sm text-[#8aa4a9] mt-3">
                  Point your camera at the book's ISBN barcode. Make sure it's well-lit and centered in the frame.
                </p>
                <div className="mt-2 text-xs text-[#8aa4a9]">
                  <strong>Troubleshooting:</strong> If scanning doesn't work, try the following:
                  <ul className="list-disc pl-4 mt-1">
                    <li>Make sure the barcode is well-lit and not blurry</li>
                    <li>Hold the camera steady and center the barcode in the scanning frame</li>
                    <li>Try different angles or distances</li>
                    <li>Use the flash in low-light environments</li>
                    <li>Clean your camera lens if it appears dirty</li>
                  </ul>
                </div>
              </div>
            )}
            
            {/* Search Results */}
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

            {/* Selected Book */}
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

          {/* Review Form Fields */}
          {selectedBook && (
            <>
              {/* Rating */}
              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-[#365f60] mb-1">
                  Rating
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="text-2xl focus:outline-none"
                    >
                      <span className={star <= formData.rating ? "text-yellow-400" : "text-gray-300"}>★</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reading Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-[#365f60] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-[#adbfc7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#365f60] focus:border-transparent"
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
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-[#adbfc7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#365f60] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label htmlFor="text" className="block text-sm font-medium text-[#365f60] mb-1">
                  Your Review
                </label>
                <textarea
                  id="text"
                  name="text"
                  value={formData.text}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Write your review here..."
                  className="w-full px-4 py-2 border border-[#adbfc7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#365f60] focus:border-transparent"
                  required
                ></textarea>
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/reviews')}
              className="px-4 py-2 border border-[#adbfc7] rounded-md text-[#365f60] hover:bg-[#dfe7ec] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedBook}
              className={`px-4 py-2 rounded-md text-white ${
                loading || !selectedBook
                  ? 'bg-[#8aa4a9] cursor-not-allowed'
                  : 'bg-[#365f60] hover:bg-[#2a4a4b] transition-colors'
              }`}
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 