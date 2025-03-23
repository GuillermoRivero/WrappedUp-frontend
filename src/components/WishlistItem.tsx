'use client';

import { useState } from 'react';
import { WishlistItem } from '@/types/wishlist';

interface WishlistItemProps {
  item: WishlistItem;
  onRemove: (id: string) => Promise<void>;
  onUpdate: (id: string, data: { description?: string; priority?: number; isPublic?: boolean }) => Promise<void>;
}

export default function WishlistItemComponent({ item, onRemove, onUpdate }: WishlistItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(item.description || '');
  const [priority, setPriority] = useState(item.priority);
  const [isPublic, setIsPublic] = useState(item.isPublic);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get background color based on priority
  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 1: return 'bg-gray-200 text-gray-800';
      case 2: return 'bg-blue-200 text-blue-800';
      case 3: return 'bg-yellow-200 text-yellow-800';
      case 4: return 'bg-orange-200 text-orange-800';
      case 5: return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };
  
  // Get priority label
  const getPriorityLabel = (priority: number): string => {
    switch(priority) {
      case 1: return 'Low';
      case 2: return 'Medium-Low';
      case 3: return 'Medium';
      case 4: return 'Medium-High';
      case 5: return 'High';
      default: return `${priority}`;
    }
  };

  // Format date string
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // Handle save button click
  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(item.id, { 
        description, 
        priority, 
        isPublic 
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating wishlist item:', error);
    } finally {
      setIsUpdating(false);
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
    } catch (error) {
      console.error('Error removing wishlist item:', error);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg ${isEditing ? 'border-[#365f60]' : 'border-[#e0e7e9] hover:border-[#adbfc7]'}`}>
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
          <div className={`${getPriorityColor(priority)} text-xs font-bold px-2 py-1 rounded-full`}>
            {isEditing ? 'Editing' : `Priority: ${getPriorityLabel(priority)}`}
          </div>
        </div>
        
        {/* Public/Private badge */}
        <div className="absolute top-2 left-2">
          <div className={`${isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} text-xs font-bold px-2 py-1 rounded-full flex items-center`}>
            {isPublic ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Public
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
            <label htmlFor={`description-${item.id}`} className="block text-sm font-medium text-[#365f60] mb-1">
              Description
            </label>
            <textarea
              id={`description-${item.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-[#adbfc7] rounded-md focus:outline-none focus:ring-1 focus:ring-[#365f60]"
              rows={3}
              placeholder="Add a description..."
              maxLength={500}
            />
            <div className="text-xs text-[#8aa4a9] mt-1 text-right">
              {description.length}/500 characters
            </div>
          </div>
        ) : (
          description && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-[#365f60] mb-1">Description</h4>
              <p className="text-sm text-[#6b8e92] line-clamp-3">{description}</p>
            </div>
          )
        )}
        
        {/* Edit controls */}
        {isEditing && (
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor={`priority-${item.id}`} className="block text-sm font-medium text-[#365f60] mb-1">
                Priority
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriority(value)}
                    className={`flex-1 px-2 py-1.5 rounded-md transition-colors ${
                      priority === value 
                        ? `${getPriorityColor(value)} border border-current` 
                        : 'bg-[#f1f5f5] text-[#6b8e92] hover:bg-[#e5eaec]'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="text-xs text-[#8aa4a9] mt-1 text-center">
                {getPriorityLabel(priority)} Priority
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#365f60] mb-1">
                Visibility
              </label>
              <div className="flex items-center bg-[#f8fafa] p-3 rounded-md border border-[#e0e7e9]">
                <input
                  id={`public-${item.id}`}
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-[#365f60] border-[#adbfc7] rounded focus:ring-[#365f60]"
                />
                <label htmlFor={`public-${item.id}`} className="ml-2 text-sm text-[#365f60] flex-grow">
                  Make this item public
                </label>
                <div className={`w-4 h-4 rounded-full ${isPublic ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>
              <p className="text-xs text-[#8aa4a9] mt-1">
                {isPublic 
                  ? 'This item will be visible on your public wishlist' 
                  : 'This item will be private and only visible to you'}
              </p>
            </div>
          </div>
        )}
        
        {/* Added date */}
        {!isEditing && !isConfirmingDelete && (
          <div className="text-xs text-[#8aa4a9] mb-3">
            Added {formatDate(item.createdAt)}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-between pt-3 border-t border-[#e5eaec]">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="text-sm text-[#6b8e92] hover:text-[#365f60] px-2 py-1 rounded-md transition-colors hover:bg-[#f1f5f5]"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="text-sm text-white bg-[#365f60] px-4 py-1 rounded-md hover:bg-[#4d797e] transition-colors flex items-center"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </>
          ) : isConfirmingDelete ? (
            <>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="text-sm text-[#6b8e92] hover:text-[#365f60] px-2 py-1 rounded-md transition-colors hover:bg-[#f1f5f5]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="text-sm text-white bg-red-600 px-4 py-1 rounded-md hover:bg-red-700 transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Confirm Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-[#6b8e92] hover:text-[#365f60] px-2 py-1 rounded-md transition-colors hover:bg-[#f1f5f5] flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded-md transition-colors hover:bg-red-50 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 