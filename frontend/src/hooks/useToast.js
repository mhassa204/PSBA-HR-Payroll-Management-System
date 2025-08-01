import { useState, useCallback } from "react";

let toastId = 0;

const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((config) => {
    const id = ++toastId;
    const toast = {
      id,
      message: config.message || "Action completed",
      type: config.type || "success",
      duration: config.duration || 4000,
      position: config.position || "top-right",
    };

    setToasts(prev => [...prev, toast]);

    // Auto remove after duration
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Preset methods for common toast types
  const showSuccess = useCallback((message, options = {}) => {
    return addToast({
      message,
      type: "success",
      ...options,
    });
  }, [addToast]);

  const showError = useCallback((message, options = {}) => {
    return addToast({
      message,
      type: "error",
      duration: 6000, // Longer duration for errors
      ...options,
    });
  }, [addToast]);

  const showWarning = useCallback((message, options = {}) => {
    return addToast({
      message,
      type: "warning",
      ...options,
    });
  }, [addToast]);

  const showInfo = useCallback((message, options = {}) => {
    return addToast({
      message,
      type: "info",
      ...options,
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default useToast;
