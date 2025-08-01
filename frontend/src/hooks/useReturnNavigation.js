import { useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Custom hook for managing return navigation with state preservation
 * Stores the previous page URL and restores it when navigating back
 */
export const useReturnNavigation = (options = {}) => {
  const {
    storageKey = "returnUrl",
    defaultReturnUrl = "/",
    preserveParams = true,
  } = options;

  const navigate = useNavigate();
  const location = useLocation();

  // Save current URL as return URL when navigating away
  const saveReturnUrl = useCallback(
    (url = null) => {
      const urlToSave = url || location.pathname + location.search;
      try {
        localStorage.setItem(storageKey, urlToSave);
      } catch (error) {
        console.warn("Failed to save return URL to localStorage:", error);
      }
    },
    [location, storageKey]
  );

  // Get saved return URL
  const getReturnUrl = useCallback(() => {
    try {
      return localStorage.getItem(storageKey) || defaultReturnUrl;
    } catch (error) {
      console.warn("Failed to get return URL from localStorage:", error);
      return defaultReturnUrl;
    }
  }, [storageKey, defaultReturnUrl]);

  // Navigate back to saved URL
  const navigateBack = useCallback(
    (fallbackUrl = null) => {
      const returnUrl = getReturnUrl();
      const targetUrl = fallbackUrl || returnUrl;

      // Clear the stored URL after using it
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn("Failed to clear return URL from localStorage:", error);
      }

      navigate(targetUrl, { replace: false });
    },
    [navigate, getReturnUrl, storageKey]
  );

  // Navigate to a new page and save current as return URL
  const navigateWithReturn = useCallback(
    (url, options = {}) => {
      saveReturnUrl();
      navigate(url, options);
    },
    [navigate, saveReturnUrl]
  );

  // Auto-save return URL when component mounts (for list pages)
  const markAsReturnPoint = useCallback(() => {
    saveReturnUrl();
  }, [saveReturnUrl]);

  return {
    saveReturnUrl,
    getReturnUrl,
    navigateBack,
    navigateWithReturn,
    markAsReturnPoint,
  };
};

/**
 * Hook specifically for employee list page state management
 */
export const useEmployeeNavigation = () => {
  const navigate = useNavigate(); // Add navigate hook here
  const returnNav = useReturnNavigation({
    storageKey: "employeeListReturnUrl",
    defaultReturnUrl: "/employees",
  });

  const navigateToCreate = useCallback(() => {
    returnNav.navigateWithReturn("/employees/create");
  }, [returnNav]);

  const navigateToEdit = useCallback(
    (employeeId) => {
      returnNav.navigateWithReturn(`/employees/${employeeId}/edit`);
    },
    [returnNav]
  );

  const navigateToView = useCallback(
    (employeeId) => {
      returnNav.navigateWithReturn(`/employees/view/${employeeId}`);
    },
    [returnNav]
  );

  const navigateBackToList = useCallback(() => {
    returnNav.navigateBack("/employees");
  }, [returnNav]);

  const navigateToList = useCallback(() => {
    // Check if there's a saved return URL with pagination state
    const savedReturnUrl = localStorage.getItem("returnUrl");
    if (savedReturnUrl && savedReturnUrl.includes("/employees")) {
      // If there's a saved employees URL with pagination, use it
      navigate(savedReturnUrl);
    } else {
      // Otherwise, just go to employees page
      navigate("/employees");
    }
  }, [navigate]);

  return {
    ...returnNav,
    navigateToCreate,
    navigateToEdit,
    navigateToView,
    navigateBackToList,
    navigateToList,
  };
};

export default useReturnNavigation;
