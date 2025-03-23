'use client';

import { useState, useEffect, useMemo } from 'react';
import { wishlist } from '@/services/api';
import { WishlistItem } from '@/types/wishlist';
import WishlistCard from '@/components/WishlistCard';
import WishlistHeader from '@/components/WishlistHeader';
import Head from 'next/head';

export default function PublicWishlistPage({ params }: { params: { username: string } }) {
  const { username } = params;
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'title'>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchPublicWishlist = async () => {
      setLoading(true);
      try {
        const data = await wishlist.getPublicWishlist(username);
        setWishlistItems(data);
      } catch (error) {
        console.error('Failed to fetch public wishlist:', error);
        setError('Could not load this wishlist. It may not exist or is not public.');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchPublicWishlist();
    }
  }, [username]);

  // Handle sort change from the header component
  const handleSortChange = (newSortBy: 'priority' | 'date' | 'title', newSortDirection: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortDirection(newSortDirection);
  };

  // Sort the wishlist items based on the selected sort option
  const sortedWishlistItems = useMemo(() => {
    if (!wishlistItems.length) return [];
    
    return [...wishlistItems].sort((a, b) => {
      if (sortBy === 'priority') {
        return sortDirection === 'desc' 
          ? b.priority - a.priority 
          : a.priority - b.priority;
      } else if (sortBy === 'date') {
        return sortDirection === 'desc'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else { // title
        const titleA = a.book.title.toLowerCase();
        const titleB = b.book.title.toLowerCase();
        return sortDirection === 'desc'
          ? titleB.localeCompare(titleA)
          : titleA.localeCompare(titleB);
      }
    });
  }, [wishlistItems, sortBy, sortDirection]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Head>
        <title>{username}'s Wishlist | WrappedUp</title>
        <meta name="description" content={`View ${username}'s public book wishlist on WrappedUp`} />
      </Head>

      <WishlistHeader
        username={username}
        isPersonal={false}
        itemCount={wishlistItems.length}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#365f60]"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
          <p>{error}</p>
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="bg-[#f8fafa] border border-[#e0e7e9] rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-[#8aa4a9] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h2 className="text-2xl font-bold text-[#365f60] mb-2">This wishlist is empty</h2>
          <p className="text-[#6b8e92] mb-6">{username} hasn't added any public books to their wishlist yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedWishlistItems.map(item => (
            <WishlistCard
              key={item.id}
              item={item}
              isEditable={false}
              onRemove={async () => Promise.resolve()}
              onUpdate={async () => Promise.resolve()}
            />
          ))}
        </div>
      )}
    </div>
  );
} 