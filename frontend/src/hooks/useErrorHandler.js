import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleError = useCallback((error, options = {}) => {
    const {
      showAlert = true,
      redirectTo = null,
      customMessage = null,
      logError = true
    } = options;

    // Log error in development
    if (logError && process.env.NODE_ENV === 'development') {
      console.error('Error handled:', error);
    }

    // Set error state
    setError(error);

    // Get error message
    const getErrorMessage = () => {
      if (customMessage) return customMessage;
      if (typeof error === 'string') return error;
      if (error?.message) return error.message;
      if (error?.response?.data?.message) return error.response.data.message;
      if (error?.response?.data?.error) return error.response.data.error;
      return 'An unexpected error occurred. Please try again.';
    };

    // Show alert if requested
    if (showAlert) {
      alert(getErrorMessage());
    }

    // Handle specific error codes
    if (error?.response?.status) {
      switch (error.response.status) {
        case 401:
          // Unauthorized - redirect to login
          navigate('/login');
          break;
        case 403:
          // Forbidden - redirect to unauthorized page
          navigate('/unauthorized');
          break;
        case 404:
          // Not found - redirect to 404 page
          navigate('/404');
          break;
        case 500:
          // Server error - show error page
          if (!redirectTo) {
            navigate('/error');
          }
          break;
        default:
          break;
      }
    }

    // Custom redirect
    if (redirectTo) {
      navigate(redirectTo);
    }

    return getErrorMessage();
  }, [navigate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback(async (asyncFunction, options = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await asyncFunction();
      return result;
    } catch (error) {
      handleError(error, options);
      throw error; // Re-throw so caller can handle if needed
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const safeAsync = useCallback(async (asyncFunction, options = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await asyncFunction();
      return { data: result, error: null };
    } catch (error) {
      const errorMessage = handleError(error, { ...options, showAlert: false });
      return { data: null, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    withErrorHandling,
    safeAsync
  };
};

// Hook for API calls with automatic error handling
export const useApiCall = () => {
  const { handleError, isLoading, setIsLoading } = useErrorHandler();

  const apiCall = useCallback(async (apiFunction, options = {}) => {
    const {
      onSuccess = null,
      onError = null,
      showSuccessAlert = false,
      successMessage = 'Operation completed successfully',
      errorOptions = {}
    } = options;

    try {
      setIsLoading(true);
      const result = await apiFunction();
      
      if (showSuccessAlert) {
        alert(successMessage);
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = handleError(error, errorOptions);
      
      if (onError) {
        onError(error, errorMessage);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, setIsLoading]);

  return {
    apiCall,
    isLoading
  };
};

export default useErrorHandler;
