import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

interface AuthResponse {
  token: string;
  id: string;
  email: string;
  username: string;
  role: string;
}

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081',
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

  async register(email: string, password: string) {
    try {
      const response = await api.post<AuthResponse>('/api/auth/register', { email, password });
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
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  },
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
    try {
      const response = await api.post('/api/wishlist', data);
      return response.data;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
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
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081',
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
          baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081',
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
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081',
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: false // Don't send cookies
      });
      
      const response = await publicApi.get(`/api/books/openlibrary/${key}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching book by OpenLibrary key:', error);
      throw error;
    }
  },
  
  // Get a book by ID
  async getBookById(id: string) {
    try {
      // Create a new instance without authentication for public endpoints
      const publicApi = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081',
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: false // Don't send cookies
      });
      
      const response = await publicApi.get(`/api/books/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching book by ID:', error);
      throw error;
    }
  }
};

export default api; 