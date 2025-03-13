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
      
      // Usar email como username temporalmente
      return { ...userData, username: userData.email };
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
      
      // Usar email como username temporalmente
      return { ...userData, username: userData.email };
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
      
      // Usar email como username temporalmente
      return { ...userData, username: userData.email };
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

export default api; 