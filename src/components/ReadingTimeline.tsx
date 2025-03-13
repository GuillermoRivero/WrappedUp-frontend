import { useState, useMemo, useEffect } from 'react';

// Function to get a color based on rating
const getRatingColor = (rating: number): string => {
  switch (Math.round(rating)) {
    case 1: return 'bg-[#e57373]'; // Rojo suave
    case 2: return 'bg-[#ffb74d]'; // Naranja suave
    case 3: return 'bg-[#81c784]'; // Verde suave
    case 4: return 'bg-[#64b5f6]'; // Azul suave
    case 5: return 'bg-[#365f60]'; // Verde azulado (color principal de la web)
    default: return 'bg-gray-400';
  }
};

// Function to format date for display
const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface Book {
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
}

export interface Review {
  id: string;
  user_id: string;
  text: string;
  rating: number;
  start_date: string;
  end_date: string;
  book: Book;
}

interface TimeRange {
  start: Date;
  end: Date;
}

interface ReadingTimelineProps {
  reviews: Review[];
  timeFilter: 'month' | 'year' | 'all';
  selectedDate: Date;
  timeRange: TimeRange | null;
  loading: boolean;
}

export default function ReadingTimeline({ 
  reviews, 
  timeFilter, 
  selectedDate, 
  timeRange, 
  loading 
}: ReadingTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTooltip, setActiveTooltip] = useState<{review: Review, x: number, y: number} | null>(null);
  const [containerWidth, setContainerWidth] = useState(768);

  // Reset zoom level when time filter changes or when selected date changes
  useEffect(() => {
    // Reset zoom to 1 when filter or date changes
    setZoomLevel(1);
    
    // After resetting, we'll calculate the appropriate zoom in the next effect
  }, [timeFilter, selectedDate]);

  // Adjust zoom level for annual and monthly views based on current date
  useEffect(() => {
    // Small delay to ensure the reset happens first
    const timer = setTimeout(() => {
      const currentDate = new Date();
      
      if (timeFilter === 'year') {
        const endOfSelectedYear = new Date(selectedDate.getFullYear(), 11, 31);
        
        // If current date is before the end of the selected year and we're in the current year
        if (currentDate < endOfSelectedYear && 
            currentDate.getFullYear() === selectedDate.getFullYear()) {
          
          // Calculate which quarter we're in (0-3)
          const currentQuarter = Math.floor(currentDate.getMonth() / 3);
          
          // Calculate zoom level to show from start of year to end of current quarter
          // For Q1 (showing 25% of year): zoom = 4
          // For Q2 (showing 50% of year): zoom = 2
          // For Q3 (showing 75% of year): zoom = 1.33
          // For Q4 (showing 100% of year): zoom = 1
          const quarterFraction = (currentQuarter + 1) / 4;
          const newZoomLevel = Math.min(6, Math.max(1, 1 / quarterFraction));
          
          setZoomLevel(newZoomLevel);
        }
      } else if (timeFilter === 'month') {
        const endOfSelectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        
        // If current date is before the end of the selected month and we're in the current month
        if (currentDate < endOfSelectedMonth && 
            currentDate.getFullYear() === selectedDate.getFullYear() && 
            currentDate.getMonth() === selectedDate.getMonth()) {
          
          // Calculate which week of the month we're in (0-indexed)
          const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          const dayOfMonth = currentDate.getDate();
          const totalDaysInMonth = endOfSelectedMonth.getDate();
          
          // Calculate the current week (0-indexed, assuming 4 weeks per month)
          const currentWeek = Math.min(3, Math.floor((dayOfMonth - 1) / 7));
          
          // Calculate zoom level to show from start of month to end of current week
          // For week 1 (showing 25% of month): zoom = 4
          // For week 2 (showing 50% of month): zoom = 2
          // For week 3 (showing 75% of month): zoom = 1.33
          // For week 4 (showing 100% of month): zoom = 1
          const weekFraction = (currentWeek + 1) / 4;
          const newZoomLevel = Math.min(3, Math.max(1, 1 / weekFraction));
          
          setZoomLevel(newZoomLevel);
        }
      }
    }, 50); // Small delay to ensure reset happens first
    
    return () => clearTimeout(timer);
  }, [timeFilter, selectedDate]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Update container width based on window size
      setContainerWidth(Math.max(768, window.innerWidth * 0.9));
    };

    // Set initial width
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle zoom changes
  const handleZoomIn = () => {
    setZoomLevel(prevZoom => {
      // Allow higher zoom levels for year and all time views
      const maxZoom = timeFilter === 'year' || timeFilter === 'all' ? 6 : 3;
      return Math.min(maxZoom, prevZoom + 0.5);
    });
  };

  const handleZoomOut = () => {
    setZoomLevel(prevZoom => Math.max(1, prevZoom - 0.5));
  };

  // Organize reviews into rows to avoid overlaps
  const organizedTimelineRows = useMemo(() => {
    if (reviews.length === 0) return [];

    // Sort reviews by start date
    const sortedReviews = [...reviews].sort((a, b) => 
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
  }, [reviews]);

  // Handle mouse events for tooltip
  const handleMouseEnter = (event: React.MouseEvent, review: Review) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Get the timeline container
    const timelineContainer = event.currentTarget.closest('.timeline-container');
    
    // Calculate position relative to the viewport
    const xPos = rect.left + (rect.width / 2);
    const yPos = rect.top;
    
    setActiveTooltip({
      review,
      x: xPos,
      y: yPos
    });
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  // Calculate reading duration in days
  const calculateReadingDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-[#adbfc7] mb-8 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-xl md:text-2xl font-semibold text-[#365f60] mb-6 border-b border-[#e5eaec] pb-2 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#365f60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Reading Timeline
      </h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#365f60]"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center text-[#8aa4a9] py-12 bg-[#f0f5f5] rounded-lg border border-[#adbfc7]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-[#adbfc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium mb-2">No reading activity found for this period.</p>
          <p>Add some book reviews to see your reading timeline!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Zoom Controls and Time Range Display */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-[#8aa4a9] bg-[#f8fafa] px-3 py-1.5 rounded-md border border-[#e5eaec]">
              {timeRange && (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-[#365f60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {timeFilter === 'year' ? (
                    // For yearly view, always show the full year range
                    `Showing: Jan 1, ${selectedDate.getFullYear()} to Dec 31, ${selectedDate.getFullYear()}`
                  ) : timeFilter === 'month' ? (
                    // For monthly view, always show the full month range
                    `Showing: ${new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to ${new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  ) : (
                    // For all time view, show the actual time range
                    `Showing: ${timeRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to ${timeRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center bg-[#f8fafa] rounded-lg p-1.5 border border-[#e5eaec] shadow-sm">
              <button 
                onClick={handleZoomOut}
                className="p-1.5 rounded-md hover:bg-white text-[#365f60] transition-colors duration-200"
                title="Zoom out"
                disabled={zoomLevel <= 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${zoomLevel <= 1 ? 'text-gray-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="mx-2 text-sm font-medium text-[#365f60] bg-white px-2 py-0.5 rounded-md">{zoomLevel.toFixed(1)}x</span>
              <button 
                onClick={handleZoomIn}
                className="p-1.5 rounded-md hover:bg-white text-[#365f60] transition-colors duration-200"
                title={`Zoom in (max ${timeFilter === 'year' || timeFilter === 'all' ? '6x' : '3x'})`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Timeline Container with Custom Scrollbar Styles */}
          <div className="timeline-wrapper" style={{ position: 'relative' }}>
            <style jsx>{`
              /* Custom scrollbar styles */
              .timeline-container::-webkit-scrollbar {
                height: 8px;
                background-color: #f0f5f5;
              }
              
              .timeline-container::-webkit-scrollbar-thumb {
                background-color: #adbfc7;
                border-radius: 4px;
              }
              
              .timeline-container::-webkit-scrollbar-thumb:hover {
                background-color: #8aa4a9;
              }
              
              .timeline-container {
                scrollbar-width: thin;
                scrollbar-color: #adbfc7 #f0f5f5;
              }
            `}</style>
            
            <div 
              className="timeline-container overflow-x-scroll" 
              style={{ 
                minWidth: '100%',
                width: '100%',
                maxWidth: '100%',
                overflowY: 'hidden',
                paddingBottom: '12px', /* Add padding to ensure scrollbar is visible */
              }}
            >
              <div style={{ 
                minWidth: `${containerWidth * zoomLevel}px`,
                position: 'relative'
              }}>
                {/* Timeline Header */}
                <div className="flex items-center mb-4">
                  <div className="w-full relative">
                    {/* Eliminamos el contenido anterior y lo moveremos a la parte inferior */}
                  </div>
                </div>
                
                {/* Timeline Background Grid */}
                <div className="relative mb-2 h-8 w-full">
                  <div className="absolute inset-0">
                    {timeFilter === 'month' && timeRange && (
                      <div className="grid grid-cols-4 h-full">
                        {Array.from({ length: 4 }, (_, i) => (
                          <div key={i} className={`h-full ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-r border-gray-100`}></div>
                        ))}
                      </div>
                    )}
                    {timeFilter === 'year' && (
                      <div className="grid grid-cols-4 h-full">
                        {Array.from({ length: 4 }, (_, i) => (
                          <div key={i} className={`h-full ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-r border-gray-100`}></div>
                        ))}
                      </div>
                    )}
                    {timeFilter === 'all' && timeRange && (
                      <div className="grid h-full" 
                           style={{ 
                             gridTemplateColumns: `repeat(${Math.ceil((timeRange.end.getFullYear() - timeRange.start.getFullYear() + 1) / 0.25)}, 1fr)` 
                           }}>
                        {Array.from(
                          { length: Math.ceil((timeRange.end.getFullYear() - timeRange.start.getFullYear() + 1) / 0.25) }, 
                          (_, i) => i
                        ).map((i) => (
                          <div key={i} className={`h-full ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-r border-gray-100`}></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Timeline Rows */}
                <div className="space-y-4">
                  {organizedTimelineRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="relative h-12 flex">
                      {/* Timeline Grid and Bars */}
                      <div className="w-full relative">
                        {/* Background Grid */}
                        <div className="absolute inset-0 w-full">
                          {timeFilter === 'month' && (
                            <div className="grid grid-cols-4 h-full">
                              {Array.from({ length: 4 }, (_, i) => (
                                <div key={i} className={`h-full ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-r border-gray-100`}></div>
                              ))}
                            </div>
                          )}
                          {timeFilter === 'year' && (
                            <div className="grid grid-cols-4 h-full">
                              {Array.from({ length: 4 }, (_, i) => (
                                <div key={i} className={`h-full ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-r border-gray-100`}></div>
                              ))}
                            </div>
                          )}
                          {timeFilter === 'all' && timeRange && (
                            <div className="grid h-full" 
                                 style={{ 
                                   gridTemplateColumns: `repeat(${Math.ceil((timeRange.end.getFullYear() - timeRange.start.getFullYear() + 1) / 0.25)}, 1fr)` 
                                 }}>
                              {Array.from(
                                { length: Math.ceil((timeRange.end.getFullYear() - timeRange.start.getFullYear() + 1) / 0.25) }, 
                                (_, i) => i
                              ).map((i) => (
                                <div key={i} className={`h-full ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-r border-gray-100`}></div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Books in this row */}
                        {row.map((review) => {
                          // Calculate position and width for timeline bars
                          let startPosition = 0;
                          let barWidth = 100;
                          
                          const startDate = new Date(review.start_date);
                          const endDate = new Date(review.end_date);
                          
                          if (timeFilter === 'month' && timeRange) {
                            // For month view, position is based on days within the month
                            const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                            const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
                            
                            // Calculate total days in the month
                            const totalDays = monthEnd.getDate();
                            
                            // Calculate days from month start (0-indexed)
                            const startDay = Math.max(0, Math.min(totalDays - 1, startDate.getDate() - 1));
                            const endDay = Math.max(0, Math.min(totalDays - 1, endDate.getDate() - 1));
                            
                            // Convert to percentage of total month
                            startPosition = (startDay / totalDays) * 100;
                            barWidth = ((endDay - startDay + 1) / totalDays) * 100;
                          } else if (timeFilter === 'year' && timeRange) {
                            // For year view, position is based on days within the year
                            const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
                            const yearEnd = new Date(selectedDate.getFullYear(), 11, 31);
                            
                            // Calculate total days in the year
                            const totalDays = (yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
                            
                            // Calculate days from year start
                            const startDayOfYear = Math.max(0, Math.min(totalDays - 1, 
                              Math.floor((startDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24))));
                            const endDayOfYear = Math.max(0, Math.min(totalDays - 1, 
                              Math.floor((endDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24))));
                            
                            // Convert to percentage of total year
                            startPosition = (startDayOfYear / totalDays) * 100;
                            barWidth = ((endDayOfYear - startDayOfYear + 1) / totalDays) * 100;
                          } else if (timeFilter === 'all' && timeRange) {
                            // For all time view, position is based on years and quarters
                            const totalYears = timeRange.end.getFullYear() - timeRange.start.getFullYear() + 1;
                            const totalQuarters = totalYears * 4;
                            
                            // Calculate start quarter
                            const startYear = startDate.getFullYear();
                            const startQuarter = Math.floor(startDate.getMonth() / 3);
                            const startYearOffset = startYear - timeRange.start.getFullYear();
                            const startQuarterAbsolute = Math.max(0, Math.min(totalQuarters - 1, (startYearOffset * 4) + startQuarter));
                            
                            // Calculate end quarter
                            const endYear = endDate.getFullYear();
                            const endQuarter = Math.floor(endDate.getMonth() / 3);
                            const endYearOffset = endYear - timeRange.start.getFullYear();
                            const endQuarterAbsolute = Math.max(0, Math.min(totalQuarters - 1, (endYearOffset * 4) + endQuarter));
                            
                            // Calculate position within quarter for more precise positioning
                            const startQuarterStart = new Date(startYear, startQuarter * 3, 1);
                            const startQuarterEnd = new Date(startYear, startQuarter * 3 + 3, 0);
                            const startQuarterDuration = startQuarterEnd.getTime() - startQuarterStart.getTime();
                            const startPositionInQuarter = Math.max(0, Math.min(1, 
                              (startDate.getTime() - startQuarterStart.getTime()) / startQuarterDuration));
                            
                            const endQuarterStart = new Date(endYear, endQuarter * 3, 1);
                            const endQuarterEnd = new Date(endYear, endQuarter * 3 + 3, 0);
                            const endQuarterDuration = endQuarterEnd.getTime() - endQuarterStart.getTime();
                            const endPositionInQuarter = Math.max(0, Math.min(1, 
                              (endDate.getTime() - endQuarterStart.getTime()) / endQuarterDuration));
                            
                            // Calculate final position and width
                            startPosition = ((startQuarterAbsolute + startPositionInQuarter) / totalQuarters) * 100;
                            const endPosition = ((endQuarterAbsolute + endPositionInQuarter) / totalQuarters) * 100;
                            barWidth = Math.max(0.5, endPosition - startPosition);
                          }
                          
                          // Calculate reading duration for the tooltip
                          const readingDuration = calculateReadingDuration(review.start_date, review.end_date);
                          
                          return (
                            <div 
                              key={review.id}
                              className={`absolute h-9 ${getRatingColor(review.rating)} hover:h-11 transition-all duration-150 cursor-pointer overflow-hidden border border-white/20 hover:border-white/30`}
                              style={{ 
                                left: `${startPosition}%`, 
                                width: `${barWidth}%`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.12)',
                                borderRadius: '4px'
                              }}
                              onMouseEnter={(e) => handleMouseEnter(e, review)}
                              onMouseLeave={handleMouseLeave}
                            >
                              <div className="flex items-center h-full w-full pl-2 pr-1">
                                {/* Book title - always show and align left */}
                                <div className="flex-1 overflow-hidden">
                                  <span className="text-xs text-white font-medium truncate block leading-tight">
                                    {review.book.title}
                                  </span>
                                  
                                  {/* Only show author if bar is wide enough */}
                                  {barWidth > 15 && (
                                    <span className="text-[10px] text-white/90 truncate block leading-tight">
                                      {review.book.author}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Show duration if bar is wide enough */}
                                {barWidth > 20 && (
                                  <div className="flex-shrink-0 ml-1 bg-black/20 rounded-sm px-1.5 py-0.5">
                                    <span className="text-[10px] text-white font-medium whitespace-nowrap">
                                      {readingDuration}d
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Add a subtle gradient overlay for better text readability */}
                              <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none"></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Categories at the bottom */}
                <div className="relative mt-4 h-12 w-full border-t border-gray-200">
                  <div className="absolute inset-0 flex">
                    {timeFilter === 'month' && timeRange && (
                      <div className="w-full grid grid-cols-4">
                        {Array.from({ length: 4 }, (_, i) => {
                          // Calculate the date for each week marker
                          const weekDate = new Date(timeRange.start);
                          weekDate.setDate(weekDate.getDate() + (i * 7));
                          
                          // Format the date
                          const weekNumber = Math.floor(i) + 1;
                          const dateLabel = `Week ${weekNumber}`;
                          const dateDetail = weekDate.toLocaleDateString('en-US', { 
                            day: 'numeric',
                            month: 'short'
                          });
                          
                          return (
                            <div key={i} className="flex flex-col items-center justify-center">
                              <div className="h-3 w-px bg-[#adbfc7] mb-1"></div>
                              <div className="text-xs font-medium text-[#365f60]">{dateLabel}</div>
                              <div className="text-xs text-[#8aa4a9]">{dateDetail}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {timeFilter === 'year' && (
                      <div className="w-full grid grid-cols-4">
                        {Array.from({ length: 4 }, (_, i) => {
                          const quarterLabel = `Q${i + 1}`;
                          const monthStart = i * 3;
                          const startMonth = new Date(selectedDate.getFullYear(), monthStart, 1)
                            .toLocaleDateString('en-US', { month: 'short' });
                          const endMonth = new Date(selectedDate.getFullYear(), monthStart + 2, 1)
                            .toLocaleDateString('en-US', { month: 'short' });
                          
                          return (
                            <div key={i} className="flex flex-col items-center justify-center">
                              <div className="h-3 w-px bg-[#adbfc7] mb-1"></div>
                              <div className="text-xs font-medium text-[#365f60]">{quarterLabel}</div>
                              <div className="text-xs text-[#8aa4a9]">{startMonth} - {endMonth}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {timeFilter === 'all' && timeRange && (
                      <div className="w-full flex">
                        {Array.from(
                          { length: timeRange.end.getFullYear() - timeRange.start.getFullYear() + 1 }, 
                          (_, yearIndex) => {
                            const year = timeRange.start.getFullYear() + yearIndex;
                            
                            return (
                              <div 
                                key={yearIndex} 
                                className="flex-1 flex"
                              >
                                {Array.from({ length: 4 }, (_, quarterIndex) => {
                                  const quarterLabel = `Q${quarterIndex + 1}`;
                                  
                                  return (
                                    <div key={`${year}-${quarterIndex}`} className="flex-1 flex flex-col items-center justify-center">
                                      <div className="h-3 w-px bg-[#adbfc7] mb-1"></div>
                                      <div className="text-xs font-medium text-[#365f60]">{quarterLabel}</div>
                                      <div className="text-xs text-[#8aa4a9]">{year}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-6 border-t border-[#e5eaec] pt-4">
                  <div className="text-sm font-medium text-[#365f60] mb-3">Rating Legend:</div>
                  <div className="flex flex-wrap gap-3 bg-[#f8fafa] p-3 rounded-md border border-[#e5eaec]">
                    {[1, 2, 3, 4, 5].map((rating) => {
                      // Get descriptive text for each rating
                      let ratingText = '';
                      switch(rating) {
                        case 1: ratingText = 'Not recommended'; break;
                        case 2: ratingText = 'Acceptable'; break;
                        case 3: ratingText = 'Good'; break;
                        case 4: ratingText = 'Very good'; break;
                        case 5: ratingText = 'Excellent'; break;
                      }
                      
                      return (
                        <div key={rating} className="flex items-center bg-white px-3 py-2 rounded-md shadow-sm transition-all duration-200 hover:shadow-md">
                          <div className={`w-4 h-4 rounded-sm ${getRatingColor(rating)} mr-2 shadow-inner`}></div>
                          <span className="text-sm text-[#365f60] font-medium">{rating} {rating === 1 ? 'Star' : 'Stars'} <span className="text-[#8aa4a9] font-normal">({ratingText})</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Tooltip */}
      {activeTooltip && (
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-64 pointer-events-none"
          style={{
            left: `${activeTooltip.x}px`,
            top: `${activeTooltip.y - 15}px`,
            transform: 'translate(-50%, -100%)',
            maxWidth: 'calc(100vw - 40px)'
          }}
        >
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-4 h-4 bg-white border-r border-b border-gray-200"></div>
          <div className="flex flex-col">
            <h3 className="font-bold text-[#365f60] mb-1 line-clamp-2">{activeTooltip.review.book.title}</h3>
            <p className="text-sm text-gray-600 mb-2">por {activeTooltip.review.book.author}</p>
            
            <div className="flex items-center mb-3 bg-[#f8fafa] p-2 rounded-md">
              <div className="flex mr-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  // Determine color based on rating
                  const starColor = star <= activeTooltip.review.rating 
                    ? star === 5 ? '#365f60' 
                      : star === 4 ? '#64b5f6'
                      : star === 3 ? '#81c784'
                      : star === 2 ? '#ffb74d'
                      : '#e57373'
                    : '#e5e7eb'; // Gray for unselected stars
                  
                  return (
                    <svg 
                      key={star} 
                      className="w-4 h-4" 
                      fill={starColor}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  );
                })}
              </div>
              <span className="text-sm font-medium text-[#365f60]">{activeTooltip.review.rating}/5</span>
            </div>
            
            <div className="text-xs font-medium text-[#365f60] mb-1 border-b border-[#e5eaec] pb-1">
              Reading period:
            </div>
            <div className="flex justify-between text-sm text-[#365f60] mb-2 bg-[#f8fafa] p-2 rounded-md">
              <div>
                <span className="font-medium">{new Date(activeTooltip.review.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                <span className="text-xs text-gray-500 ml-1">{new Date(activeTooltip.review.start_date).getFullYear()}</span>
              </div>
              <span className="text-[#adbfc7] mx-1">→</span>
              <div>
                <span className="font-medium">{new Date(activeTooltip.review.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                <span className="text-xs text-gray-500 ml-1">{new Date(activeTooltip.review.end_date).getFullYear()}</span>
              </div>
            </div>
            
            <div className="text-xs text-[#365f60] bg-[#f0f5f5] p-2 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#365f60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{calculateReadingDuration(activeTooltip.review.start_date, activeTooltip.review.end_date)} days</span> of reading
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 