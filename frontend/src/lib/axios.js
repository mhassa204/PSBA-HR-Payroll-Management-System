import axios from "axios";
import { toastBus } from "../utils/toastBus";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;
    
    if (status === 401) {
      // Don't show unauthorized toast if user is already on login page
      if (currentPath !== '/login') {
        toastBus.emit({ type: 'error', message: 'Unauthorized. Please log in.' });
      }
    } else if (status === 403) {
      toastBus.emit({ type: 'error', message: 'Forbidden. You do not have permission.' });
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
