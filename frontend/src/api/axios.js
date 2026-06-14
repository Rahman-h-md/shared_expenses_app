import axios from 'axios';

let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Automatically normalize the baseURL to ensure it always ends with '/api/v1'
if (baseUrl && !baseUrl.endsWith('/api/v1')) {
  if (baseUrl.endsWith('/api')) {
    baseUrl += '/v1';
  } else {
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    baseUrl += 'api/v1';
  }
}

const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors (e.g. 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout if token expires
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
