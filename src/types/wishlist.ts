export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  alternativeTitle?: string; 
  alternativeSubtitle?: string;
  author: string;
  firstPublishYear?: number;
  platform?: string;
  coverUrl?: string;
  coverId?: number;
  openLibraryKey?: string;
  ebookAccess?: string;
  editionCount?: number;
  format?: string;
  byStatement?: string;
  firstSentence?: string;
  hasFulltext?: boolean;
  numberOfPagesMedian?: number;
  ratingsCount?: number;
  wantToReadCount?: number;
}

export interface WishlistItem {
  id: string;
  userId: string;
  username: string;
  book: Book;
  description?: string;
  priority: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistAddRequest {
  bookId?: string;
  openLibraryKey?: string;
  description?: string;
  priority?: number;
  isPublic?: boolean;
}

export interface WishlistUpdateRequest {
  description?: string;
  priority?: number;
  isPublic?: boolean;
} 