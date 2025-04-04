/**
 * Date formatting and conversion utilities
 */

/**
 * Formats a date string for display
 * @param dateString - The date string to format
 * @param format - The format to use (default: 'short')
 * @returns Formatted date string or 'N/A' if date is invalid
 */
export const formatDate = (
  dateString: string | null | undefined, 
  format: 'short' | 'medium' | 'long' = 'medium'
): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateString}`);
      return 'N/A';
    }
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'short' ? 'short' : format === 'medium' ? 'short' : 'long',
      day: 'numeric',
    };
    
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Converts a date to an ISO string format for API requests (YYYY-MM-DD)
 * @param date - Date string or Date object to convert
 * @returns ISO date string without time component (YYYY-MM-DD)
 */
export const toApiDateFormat = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn(`Invalid date for API format: ${date}`);
      return '';
    }
    
    // Format as YYYY-MM-DD
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error converting date to API format:', error);
    return '';
  }
};

/**
 * Validates if a string is a valid date
 * @param dateString - The date string to validate
 * @returns Boolean indicating if the date is valid
 */
export const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
};

/**
 * Converts API response date fields to proper format
 * @param reviewData - The review data from API
 * @returns Review with properly formatted date fields
 */
export const normalizeReviewDates = <T extends { start_date?: any; end_date?: any; startDate?: any; endDate?: any }>(
  reviewData: T
): T => {
  const normalized = { ...reviewData };
  
  // Handle camelCase and snake_case variations
  if (normalized.start_date === undefined && normalized.startDate) {
    normalized.start_date = normalized.startDate;
  } else if (normalized.startDate === undefined && normalized.start_date) {
    normalized.startDate = normalized.start_date;
  }
  
  if (normalized.end_date === undefined && normalized.endDate) {
    normalized.end_date = normalized.endDate;
  } else if (normalized.endDate === undefined && normalized.end_date) {
    normalized.endDate = normalized.end_date;
  }
  
  return normalized;
}; 