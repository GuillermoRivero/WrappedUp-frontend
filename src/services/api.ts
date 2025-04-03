import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Log all environment variables
console.log('Environment Variables:', {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION
});

const API_URL = process.env.NEXT_PUBLIC_API_URL;
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
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Enhanced error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          throw new Error(data?.message || 'Invalid email or password. Please check your credentials and try again.');
        } else if (status === 404) {
          throw new Error('User not found. Please check your email or register for a new account.');
        } else if (status === 400) {
          throw new Error(data?.message || 'Invalid request. Please check your input and try again.');
        } else if (status === 403) {
          throw new Error('Your account has been locked. Please contact support for assistance.');
        } else if (status === 429) {
          throw new Error('Too many login attempts. Please try again later.');
        } else {
          throw new Error(data?.message || `Server error (${status}). Please try again later.`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('Unable to reach the server. Please check your internet connection and try again.');
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error('An unexpected error occurred. Please try again later.');
      }
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
      
      if (newToken && newToken !== token) {
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }
      
      return userData;
    } catch (error) {
      if ((error as AxiosError).response?.status === 401) {
        localStorage.removeItem('token');
      }
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  },
};

export const userProfile = {
  async getUserProfile() {
    try {
      const response = await api.get<UserProfileData>('/api/profiles');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  async updateProfile(profileData: UpdateUserProfileData) {
    try {
      const response = await api.put<UserProfileData>('/api/profiles', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
  
  async getPublicProfile(username: string) {
    try {
      const publicApi = axios.create({
        baseURL: API_URL, 
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: false 
      });
      
      const response = await publicApi.get<UserProfileData>(`/api/profiles/public/${username}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching public profile:', error);
      throw error;
    }
  }
};

export const wishlist = {
  async getUserWishlist() {
    try {
      const response = await api.get('/api/wishlist');
      return response.data;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
  },
  
  async addToWishlist(data: {
    bookId?: string;
    openLibraryKey?: string;
    description?: string;
    priority?: number;
    isPublic?: boolean;
  }) {
    if (data.openLibraryKey && !data.openLibraryKey.startsWith('/works/') && !data.openLibraryKey.startsWith('OL')) {
      data.openLibraryKey = '/works/' + data.openLibraryKey;
    }
    
    
    try {
      const response = await api.post('/api/wishlist', data);
      return response;
    } catch (error: any) {
      throw error;
    }
  },
  
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
  
  async removeFromWishlist(id: string) {
    try {
      await api.delete(`/api/wishlist/${id}`);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },
  
  async getPublicWishlist(username: string) {
    try {
      const publicApi = axios.create({
        baseURL: API_URL,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: false
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

export const books = {
  async searchBooks(query: string, signal?: AbortSignal) {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        const response = await api.get(`/api/books/search?query=${encodeURIComponent(query)}`, { signal });
        return response.data;
      } else {
        const publicApi = axios.create({
          baseURL: API_URL,
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: false 
        });
        
        const response = await publicApi.get(`/api/books/search?query=${encodeURIComponent(query)}`, { signal });
        return response.data;
      }
    } catch (error) {
      console.error('Error searching books:', error);
      throw error;
    }
  },
  
  async getBookByOpenLibraryKey(key: string) {
    try {
      const publicApi = axios.create({
        baseURL: API_URL,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: false 
      });
      
      const response = await publicApi.get(`/api/books/openlibrary/${encodeURIComponent(key)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching book by OpenLibrary key:', error);
      throw error;
    }
  },
  
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