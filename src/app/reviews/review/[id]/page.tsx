'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/services/api';
import Link from 'next/link';
import ReviewDetail from '@/components/ReviewDetail';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { normalizeReviewDates } from '@/utils/dateUtils';

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
  user_id: string;
  text: string;
  rating: number;
  start_date: string;
  end_date: string;
  book: Book;
}

export default function ReviewDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Determinar la fuente de navegación (wraps o reviews)
  const source = searchParams.get('source') || 'reviews';

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const response = await api.get(`/api/reviews/${params.id}`);
        console.log('API Response for review:', response.data);
        console.log('Book data from API:', response.data.book);
        console.log('Book fields from API:', Object.keys(response.data.book));
        
        // Normalize date fields in the review data
        const normalizedReview = normalizeReviewDates(response.data);
        setReview(normalizedReview);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching review:', err);
        setError(err.response?.data?.message || 'Failed to load review');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [params.id]);

  if (!user) {
    router.push('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-[#365f60]">Loading...</div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-[#dc2626]">{error || 'Review not found'}</p>
          <Link 
            href={source === 'wraps' ? '/wraps' : '/reviews'} 
            className="btn-primary"
          >
            Back to {source === 'wraps' ? 'Wraps' : 'Reviews'}
          </Link>
        </div>
      </div>
    );
  }

  // Transform the review data to match the ReviewDetail component's expected format
  const transformedReview = {
    id: review.id,
    text: review.text,
    rating: review.rating,
    startDate: review.start_date,
    endDate: review.end_date,
    book: {
      id: review.book.id,
      title: review.book.title,
      author: review.book.author,
      releaseYear: review.book.releaseYear,
      coverUrl: review.book.coverUrl,
      description: review.book.description,
      isbn: review.book.isbn,
      language: review.book.language,
      publisher: review.book.publisher,
      numberOfPages: getBookPages(review.book),
      numberOfPagesMedian: review.book.numberOfPagesMedian,
      number_of_pages_median: review.book.number_of_pages_median,
      number_of_pages: review.book.number_of_pages,
      openLibraryKey: review.book.openLibraryKey,
    }
  };

  console.log('Transformed review object:', transformedReview);
  console.log('Book pages in transformed review:', transformedReview.book.numberOfPages);

  // Función para obtener el número de páginas del libro
  function getBookPages(book: any): number {
    // Verificar campos explícitos para el número de páginas
    const explicitFields = [
      book.numberOfPagesMedian,
      book.number_of_pages_median,
      book.number_of_pages,
      book.numberOfPages
    ];
    
    // Si alguno de los campos explícitos tiene un valor, usarlo
    for (const value of explicitFields) {
      if (value && typeof value === 'number') {
        return value;
      }
    }
    
    // Buscar cualquier campo que pueda contener el número de páginas
    const allFields = Object.keys(book);
    for (const field of allFields) {
      const value = book[field as keyof typeof book];
      if (
        (field.toLowerCase().includes('page') || field.toLowerCase().includes('pages')) &&
        typeof value === 'number' &&
        value > 0
      ) {
        return value;
      }
    }
    
    // Si no se encuentra ningún campo, devolver 0
    return 0;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link 
            href={source === 'wraps' ? '/wraps' : '/reviews'} 
            className="text-[#365f60] hover:text-[#63b4b7] flex items-center text-sm sm:text-base"
          >
            <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            {source === 'wraps' ? 'Back to Wraps' : 'Back to Reviews'}
          </Link>
        </div>

        <ReviewDetail review={transformedReview} />
      </div>
    </div>
  );
} 