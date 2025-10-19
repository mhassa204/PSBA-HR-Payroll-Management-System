import axios from "axios";
import { toastBus } from "../utils/toastBus";

// Prefer localhost inference when app is opened on localhost to keep cookies same-site.
const inferredApi = (() => {
  try {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000/api`;
  } catch {
    return "";
  }
})();
const preferLocal = (() => {
  try {
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1";
  } catch { return false; }
})();
const API_URL = preferLocal ? inferredApi : (import.meta.env.VITE_API_URL || inferredApi);

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Ensure correct headers for multipart requests
axiosInstance.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
    }
  } else {
    // Default JSON header for non-FormData requests
    if (config.headers && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;
    const suppress403Toast = !!error?.config?.suppress403Toast; // allow callers to silence expected 403s
    
    if (status === 401) {
      // Don't show unauthorized toast if user is already on login page
      if (currentPath !== '/login') {
        toastBus.emit({ type: 'error', message: 'Unauthorized. Please log in.' });
      }
    } else if (status === 403) {
      if (!suppress403Toast) {
        toastBus.emit({ type: 'error', message: 'Forbidden. You do not have permission.' });
      }
    } else if (status >= 500) {
      toastBus.emit({ type: 'error', message: 'Server error. Please try again later.' });
    } else if (status >= 400) {
      const msg = error.response?.data?.error || 'Request failed.';
      toastBus.emit({ type: 'error', message: msg });
    } else if (!error.response) {
      toastBus.emit({ type: 'error', message: 'Network error. Check your connection.' });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
