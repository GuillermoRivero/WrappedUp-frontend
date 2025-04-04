import { useMemo } from 'react';
import { formatDate } from '@/utils/dateUtils';

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
  numberOfPagesMedian?: number;
  number_of_pages_median?: number;
  number_of_pages?: number;
  openLibraryKey: string;
}

interface Review {
  id: string;
  text: string;
  rating: number;
  startDate: string;
  endDate: string;
  book: Book;
}

interface ReviewDetailProps {
  review: Review;
}

interface BasicMetrics {
  totalDays: number;
  reviewLength: number;
  wordsInReview: number;
  reflectionDays: number;
}

interface FullMetrics extends BasicMetrics {
  pagesPerDay: string;
  timePerPage: string;
  reviewDensity: string;
  valuePerPage: string;
}

export default function ReviewDetail({ review }: ReviewDetailProps) {
  const { book } = review;

  // Función para obtener el número de páginas del libro
  const getBookPages = (book: Book): number => {
    // Log para depuración
    console.log('Book object:', book);
    console.log('Book fields:', Object.keys(book));
    
    // Verificar campos explícitos para el número de páginas
    const explicitFields = [
      book.numberOfPagesMedian,
      book.number_of_pages_median,
      book.number_of_pages,
      book.numberOfPages
    ];
    
    // Log de valores de campos explícitos
    console.log('Explicit fields values:', {
      numberOfPagesMedian: book.numberOfPagesMedian,
      number_of_pages_median: book.number_of_pages_median,
      number_of_pages: book.number_of_pages,
      numberOfPages: book.numberOfPages
    });
    
    // Si alguno de los campos explícitos tiene un valor, usarlo
    for (const value of explicitFields) {
      if (value && typeof value === 'number') {
        console.log('Found valid page count in explicit field:', value);
        return value;
      }
    }
    
    // Buscar cualquier campo que pueda contener el número de páginas
    const allFields = Object.keys(book);
    const pageRelatedFields = allFields.filter(field => 
      field.toLowerCase().includes('page') || field.toLowerCase().includes('pages')
    );
    
    console.log('Page-related fields found:', pageRelatedFields);
    
    for (const field of pageRelatedFields) {
      const value = book[field as keyof typeof book];
      console.log(`Field ${field} has value:`, value, 'of type:', typeof value);
      
      if (
        typeof value === 'number' &&
        value > 0
      ) {
        console.log('Found valid page count in field:', field, 'with value:', value);
        return value;
      }
    }
    
    // Si no se encuentra ningún campo, devolver 0
    console.log('No valid page count found, returning 0');
    return 0;
  };

  const bookPages = getBookPages(book);
  console.log('Final bookPages value:', bookPages);

  const metrics = useMemo<BasicMetrics | FullMetrics>(() => {
    try {
      const start = new Date(review.startDate);
      const end = new Date(review.endDate);
      const now = new Date();
      
      // Check if dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.warn('Invalid date detected in metrics calculation');
        return {
          totalDays: 0,
          reviewLength: review.text.length,
          wordsInReview: review.text.split(/\s+/).length,
          reflectionDays: 0,
        };
      }
      
      const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const reflectionDays = Math.ceil((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
      
      // Basic metrics that don't depend on number of pages
      const basicMetrics: BasicMetrics = {
        totalDays,
        reviewLength: review.text.length,
        wordsInReview: review.text.split(/\s+/).length,
        reflectionDays,
      };

      // Additional metrics if we have number of pages
      if (bookPages > 0) {
        console.log('Generating page-related metrics with bookPages =', bookPages);
        return {
          ...basicMetrics,
          pagesPerDay: (bookPages / totalDays).toFixed(1),
          timePerPage: (totalDays / bookPages).toFixed(1),
          reviewDensity: (review.text.length / bookPages).toFixed(1),
          valuePerPage: ((review.rating / bookPages) * 100).toFixed(1),
        };
      }

      console.log('Not generating page-related metrics because bookPages =', bookPages);
      return basicMetrics;
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return {
        totalDays: 0,
        reviewLength: review.text.length,
        wordsInReview: review.text.split(/\s+/).length,
        reflectionDays: 0,
      };
    }
  }, [review, bookPages]);

  console.log('Final metrics object:', metrics);
  console.log('Has page-related metrics:', 'pagesPerDay' in metrics);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-[#adbfc7]">
      {/* Book Information */}
      <div className="flex flex-col sm:flex-row sm:gap-6 mb-6">
        {book.coverUrl && (
          <div className="flex justify-center sm:justify-start mb-4 sm:mb-0">
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-32 sm:w-40 h-auto rounded-md shadow-md"
            />
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#365f60] mb-2 text-center sm:text-left">{book.title}</h1>
          <div className="text-[#8aa4a9] mb-1 text-center sm:text-left">by {book.author} ({book.releaseYear})</div>
          {book.publisher && (
            <div className="text-sm text-[#8aa4a9] text-center sm:text-left">Publisher: {book.publisher}</div>
          )}
          {bookPages > 0 && (
            <div className="text-sm text-[#8aa4a9] text-center sm:text-left">{bookPages} pages</div>
          )}
          {book.description && (
            <div className="text-sm text-[#746a64] mt-3">{book.description}</div>
          )}
        </div>
      </div>

      {/* Review Content */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#365f60] mb-3">Review</h2>
        <div className="flex items-center gap-2 mb-4">
          <div className="text-xl text-[#365f60]">
            {'⭐'.repeat(review.rating)}
          </div>
          <div className="text-[#8aa4a9]">({review.rating} stars)</div>
        </div>
        <div className="text-[#365f60] whitespace-pre-wrap text-sm sm:text-base">{review.text}</div>
      </div>

      {/* Reading Period */}
      <div className="text-xs sm:text-sm text-[#8aa4a9] mb-6">
        Read from {formatDate(review.startDate)} to {formatDate(review.endDate)}
      </div>

      {/* Reading Statistics */}
      {metrics && (
        <div className="border-t border-[#adbfc7] pt-6">
          <h2 className="text-lg font-semibold text-[#365f60] mb-4">Reading Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-[#f8fafc] p-3 sm:p-4 rounded-md">
              <div className="text-xs sm:text-sm text-[#8aa4a9]">Reading Period</div>
              <div className="text-base sm:text-lg font-medium text-[#365f60]">{metrics.totalDays} days</div>
            </div>

            <div className="bg-[#f8fafc] p-3 sm:p-4 rounded-md">
              <div className="text-xs sm:text-sm text-[#8aa4a9]">Review Length</div>
              <div className="text-base sm:text-lg font-medium text-[#365f60]">{metrics.wordsInReview} words</div>
              <div className="text-xs text-[#8aa4a9]">({metrics.reviewLength} characters)</div>
            </div>

            <div className="bg-[#f8fafc] p-3 sm:p-4 rounded-md">
              <div className="text-xs sm:text-sm text-[#8aa4a9]">Reflection Time</div>
              <div className="text-base sm:text-lg font-medium text-[#365f60]">{metrics.reflectionDays} days</div>
              <div className="text-xs text-[#8aa4a9]">Time taken to write the review</div>
            </div>

            {'pagesPerDay' in metrics && (
              <>
                <div className="bg-[#f8fafc] p-3 sm:p-4 rounded-md">
                  <div className="text-xs sm:text-sm text-[#8aa4a9]">Reading Speed</div>
                  <div className="text-base sm:text-lg font-medium text-[#365f60]">{metrics.pagesPerDay} pages/day</div>
                </div>

                <div className="bg-[#f8fafc] p-3 sm:p-4 rounded-md">
                  <div className="text-xs sm:text-sm text-[#8aa4a9]">Time per Page</div>
                  <div className="text-base sm:text-lg font-medium text-[#365f60]">{metrics.timePerPage} days</div>
                </div>

                <div className="bg-[#f8fafc] p-3 sm:p-4 rounded-md">
                  <div className="text-xs sm:text-sm text-[#8aa4a9]">Review Density</div>
                  <div className="text-base sm:text-lg font-medium text-[#365f60]">{metrics.reviewDensity} chars/page</div>
                  <div className="text-xs text-[#8aa4a9]">How much you wrote about each page</div>
                </div>

                <div className="bg-[#f8fafc] p-3 sm:p-4 rounded-md">
                  <div className="text-xs sm:text-sm text-[#8aa4a9]">Value per Page</div>
                  <div className="text-base sm:text-lg font-medium text-[#365f60]">{metrics.valuePerPage}%</div>
                  <div className="text-xs text-[#8aa4a9]">Rating distributed per page</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 