import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// In-memory access token store. Kept outside React state so the axios
// interceptor (a plain module, not a component) can read/write it directly.
// AuthContext stays the single source of truth for React re-renders and
// calls setAccessToken() below whenever the token changes.
let accessToken = null;
let onTokenRefreshed = null; // callback AuthContext registers to sync its state

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const registerTokenRefreshHandler = (callback) => {
  onTokenRefreshed = callback;
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive the httpOnly refresh cookie
});

// Attach the current access token to every outgoing request.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Queue of requests waiting on an in-flight refresh, so concurrent 401s
// don't each trigger their own /refresh call.
let isRefreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  queue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Don't try to refresh on the refresh/login/signup endpoints themselves.
    const isAuthEndpoint = originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/signup');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Another request already triggered a refresh; wait for it.
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        setAccessToken(data.accessToken);
        onTokenRefreshed?.(data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        onTokenRefreshed?.(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
