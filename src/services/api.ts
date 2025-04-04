import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Log all environment variables
console.log('Environment Variables:', {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION
});

// Use environment variable with a guaranteed fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://wrappedupapi.duckdns.org';
console.log('Using API URL:', API_URL);

interface AuthResponse {
  token: string;
  id: string;
  email: string;
  username: string;
  role: string;
}

interface UserProfileData {
  username: string;
  email: string;
  fullName?: string;
  bio?: string;
  userImageUrl?: string;
  favoriteGenres?: string[];
  readingGoal?: number;
  preferredLanguage?: string;
  isPublicProfile: boolean;
  socialLinks?: Record<string, string>;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UpdateUserProfileData {
  fullName?: string;
  bio?: string;
  userImageUrl?: string;
  favoriteGenres?: string[];
  readingGoal?: number;
  preferredLanguage?: string;
  isPublicProfile?: boolean;
  socialLinks?: Record<string, string>;
  location?: string;
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL, // Use hardcoded URL instead of env variable
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para mantener la sesión
});

// Add token to requests if it exists
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // No manejar errores 401 en rutas de autenticación
    const isAuthRoute = ['/api/auth/authenticate', '/api/auth/register'].includes(originalRequest?.url || '');
    
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
    }
    
    return Promise.reject(error);
  }
);

// Auth methods
export const auth = {
  async login(email: string, password: string) {
    try {
      const response = await api.post<AuthResponse>('/api/auth/authenticate', { email, password });
      const { token, ...userData } = response.data;
      
      // Guardar token
      localStorage.setItem('token', token);
      
      // Configurar headers para futuras peticiones
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Return the user data with the proper username
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(email: string, password: string, username?: string) {
    try {
      // If username is not provided, use email as username
      const usernameToUse = username || email.split('@')[0];
      
      console.log('Registering with:', { email, password, username: usernameToUse });
      const response = await api.post<AuthResponse>('/api/auth/register', { 
        email, 
        password,
        username: usernameToUse
      });
      
      const { token, ...userData } = response.data;
      
      // Guardar token
      localStorage.setItem('token', token);
      
      // Configurar headers para futuras peticiones
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Return the user data with the proper username
      return userData;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  async getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    try {
      const response = await api.get<AuthResponse>('/api/auth/me');
      const { token: newToken, ...userData } = response.data;
      
      // Actualizar el token si se recibe uno nuevo
      if (newToken && newToken !== token) {
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }
      
      // Return the user data with the proper username 
      return userData;
    } catch (error) {
      if ((error as AxiosError).response?.status === 401) {
        localStorage.removeItem('token');
      }
      throw error;
    }
  },

  logout() {
    console.log('Logout: Removing auth token and clearing authorization headers');
    
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Clear Authorization header
    delete api.defaults.headers.common['Authorization'];
    
    // Dispatch storage event to sync auth state across tabs/components
    if (typeof window !== 'undefined') {
      console.log('Logout: Dispatching storage event to sync auth state');
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('auth-logout'));
    }
    
    console.log('Logout complete');
  },
};

// User Profile methods
export const userProfile = {
  // Get current user's profile
  async getUserProfile() {
    try {
      const response = await api.get<UserProfileData>('/api/profiles');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  // Update user profile
  async updateProfile(profileData: UpdateUserProfileData) {
    try {
      const response = await api.put<UserProfileData>('/api/profiles', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
  
  // Get public profile by username
  async getPublicProfile(username: string) {
    try {
      // Create a new instance without authentication for public endpoints
      const publicApi = axios.create({
        baseURL: API_URL, // Use hardcoded URL
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: false // Don't send cookies
      });
      
      const response = await publicApi.get<UserProfileData>(`/api/profiles/public/${username}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching public profile:', error);
      throw error;
    }
  }
};

// Wishlist methods
export const wishlist = {
  // Get current user's wishlist
  async getUserWishlist() {
    try {
      const response = await api.get('/api/wishlist');
      return response.data;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
  },
  
  // Add a book to the wishlist
  async addToWishlist(data: {
    bookId?: string;
    openLibraryKey?: string;
    description?: string;
    priority?: number;
    isPublic?: boolean;
  }) {
    // Asegurar que el openLibraryKey tenga el formato correcto (con prefijo '/works/' si no lo tiene)
    if (data.openLibraryKey && !data.openLibraryKey.startsWith('/works/') && !data.openLibraryKey.startsWith('OL')) {
      data.openLibraryKey = '/works/' + data.openLibraryKey;
    }
    
    console.log('API: Sending wishlist request with data:', data);
    
    try {
      const response = await api.post('/api/wishlist', data);
      console.log('API: Wishlist response:', response);
      return response;
    } catch (error: any) {
      console.error('API: Error adding to wishlist:', error);
      console.error('API: Error details:', error.response?.data);
      console.error('API: Error status:', error.response?.status);
      throw error;
    }
  },
  
  // Update a wishlist item
  async updateWishlistItem(id: string, data: {
    description?: string;
    priority?: number;
    isPublic?: boolean;
  }) {
    try {
      const response = await api.put(`/api/wishlist/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating wishlist item:', error);
      throw error;
    }
  },
  
  // Remove an item from the wishlist
  async removeFromWishlist(id: string) {
    try {
      await api.delete(`/api/wishlist/${id}`);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },
  
  // Get a user's public wishlist
  async getPublicWishlist(username: string) {
    try {
      // Create a new instance without authentication for public endpoints
      const publicApi = axios.create({
        baseURL: API_URL, // Use hardcoded URL
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: false // Don't send cookies
      });
      
      console.log(`Fetching public wishlist for username: ${username}`);
      const response = await publicApi.get(`/api/wishlist/public/user/${username}`);
      console.log('Public wishlist response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching public wishlist:', error);
      throw error;
    }
  }
};

// Book methods
export const books = {
  // Search for books
  async searchBooks(query: string, signal?: AbortSignal) {
    try {
      // Check for token
      const token = localStorage.getItem('token');
      
      if (token) {
        // Use authenticated API if token exists
        const response = await api.get(`/api/books/search?query=${encodeURIComponent(query)}`, { signal });
        return response.data;
      } else {
        // Fallback to public API if no token
        const publicApi = axios.create({
          baseURL: API_URL, // Use hardcoded URL
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: false // Don't send cookies
        });
        
        const response = await publicApi.get(`/api/books/search?query=${encodeURIComponent(query)}`, { signal });
        return response.data;
      }
    } catch (error) {
      console.error('Error searching books:', error);
      throw error;
    }
  },
  
  // Get a book by OpenLibrary key
  async getBookByOpenLibraryKey(key: string) {
    try {
      // Create a new instance without authentication for public endpoints
      const publicApi = axios.create({
        baseURL: API_URL, // Use hardcoded URL
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: false // Don't send cookies
      });
      
      const response = await publicApi.get(`/api/books/openlibrary/${encodeURIComponent(key)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching book by OpenLibrary key:', error);
      throw error;
    }
  },
  
  // Get a book by ID
  async getBookById(id: string) {
    try {
      const response = await api.get(`/api/books/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching book by ID:', error);
      throw error;
    }
  }
};

export default api;