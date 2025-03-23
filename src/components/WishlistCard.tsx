'use client';

import { useState } from 'react';
import { WishlistItem } from '@/types/wishlist';

interface WishlistCardProps {
  item: WishlistItem;
  isEditable: boolean;
  onRemove: (id: string) => Promise<void>;
  onUpdate: (id: string, data: { description?: string; priority?: number; isPublic?: boolean }) => Promise<void>;
}

export default function WishlistCard({ item, isEditable, onRemove, onUpdate }: WishlistCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(item.description || '');
  const [priority, setPriority] = useState(item.priority);
  const [isPublic, setIsPublic] = useState(item.isPublic);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle save button click
  const handleSave = async () => {
    try {
      await onUpdate(item.id, {
        description,
        priority,
        isPublic
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update wishlist item:', error);
    }
  };

  // Handle delete button click
  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    try {
      await onRemove(item.id);
      setIsConfirmingDelete(false);
    } catch (error) {
      console.error('Failed to remove wishlist item:', error);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#e0e7e9] overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
      {/* Book cover */}
      <div className="relative h-48 bg-[#e5eaec]">
        {item.book.coverUrl ? (
          <img 
            src={item.book.coverUrl} 
            alt={`Cover of ${item.book.title}`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#d1dfe2]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#8aa4a9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        
        {/* Priority badge */}
        <div className="absolute top-2 right-2">
          <div className={`${getPriorityColor(item.priority)} text-xs font-bold px-2 py-1 rounded-full`}>
            {item.priority}
          </div>
        </div>

        {/* Public/Private badge */}
        <div className="absolute top-2 left-2">
          <div className={`text-xs font-bold px-2 py-1 rounded-full flex items-center ${
            item.isPublic 
              ? 'bg-emerald-100 text-emerald-800' 
              : 'bg-slate-100 text-slate-800'
          }`}>
            {item.isPublic ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Public
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Private
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Book details */}
      <div className="p-4">
        <h3 className="text-[#365f60] font-semibold text-lg mb-1 line-clamp-2" title={item.book.title}>
          {item.book.title}
        </h3>
        
        <p className="text-[#6b8e92] text-sm mb-3" title={item.book.author}>
          {item.book.author}
        </p>
        
        {/* Book metadata */}
        <div className="flex flex-wrap gap-2 mb-3">
          {item.book.firstPublishYear && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f1f5f5] text-[#6b8e92]">
              {item.book.firstPublishYear}
            </span>
          )}
          
          {item.book.numberOfPagesMedian && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f1f5f5] text-[#6b8e92]">
              {item.book.numberOfPagesMedian} pages
            </span>
          )}
        </div>
        
        {/* Description */}
        {isEditing ? (
          <div className="mb-4">
            <label className="text-sm font-medium text-[#365f60] mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-[#d1dfe2] rounded-md text-sm"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-[#8aa4a9] mt-1 text-right">{description.length}/500</div>
          </div>
        ) : item.description ? (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-[#365f60] mb-1">Description</h4>
            <p className="text-sm text-[#6b8e92] line-clamp-3">{item.description}</p>
          </div>
        ) : null}

        {/* Edit controls */}
        {isEditing && (
          <div className="mb-4">
            {/* Priority selection */}
            <label className="text-sm font-medium text-[#365f60] mb-2 block">Priority</label>
            <div className="flex space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    priority === p ? getPriorityColor(p) + ' font-bold' : 'bg-[#f1f5f5] text-[#6b8e92]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Visibility toggle */}
            <label className="text-sm font-medium text-[#365f60] mb-2 block">Visibility</label>
            <div className="flex items-center space-x-4 mb-4">
              <button
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
          </div>
        )}

        {/* Added date - only show when not editing and not confirming delete */}
        {!isEditing && !isConfirmingDelete && (
          <div className="text-xs text-[#8aa4a9] mb-3">
            Added {formatDate(item.createdAt)}
          </div>
        )}
        
        {/* Action buttons */}
        {isEditable && (
          <div className="flex justify-end space-x-2 mt-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 text-[#6b8e92] hover:text-[#365f60] rounded-full hover:bg-[#f1f5f5] transition-colors"
                  title="Cancel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={handleSave}
                  className="p-2 text-emerald-600 hover:text-emerald-700 rounded-full hover:bg-emerald-50 transition-colors"
                  title="Save changes"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </>
            ) : isConfirmingDelete ? (
              <>
                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  className="p-2 text-[#6b8e92] hover:text-[#365f60] rounded-full hover:bg-[#f1f5f5] transition-colors"
                  title="Cancel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-600 hover:text-red-700 rounded-full hover:bg-red-50 transition-colors"
                  title="Confirm delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-[#6b8e92] hover:text-[#365f60] rounded-full hover:bg-[#f1f5f5] transition-colors"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 