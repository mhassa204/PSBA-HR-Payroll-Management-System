import { useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

/**
 * Global navigation hook that preserves state across the entire application
 * This hook provides consistent navigation behavior that maintains pagination,
 * search, and filter states when navigating between pages.
 */
const useAppNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Save current URL as return point
  const saveCurrentLocation = useCallback(() => {
    const currentUrl = location.pathname + location.search;
    localStorage.setItem("lastVisitedUrl", currentUrl);

    // If we're on employees page, save it as the employees return point
    if (
      location.pathname.includes("/employees") &&
      !location.pathname.includes("/edit") &&
      !location.pathname.includes("/view")
    ) {
      localStorage.setItem("employeesReturnUrl", currentUrl);
    }
  }, [location]);

  // Navigate to a route while preserving current state
  const navigateWithStatePreservation = useCallback(
    (path, options = {}) => {
      // Save current location before navigating
      saveCurrentLocation();

      // Navigate to the new path
      navigate(path, options);
    },
    [navigate, saveCurrentLocation]
  );

  // Navigate back to a specific page with preserved state
  const navigateBackWithState = useCallback(
    (fallbackPath = "/") => {
      const savedUrl = localStorage.getItem("lastVisitedUrl");

      if (savedUrl && savedUrl !== location.pathname + location.search) {
        navigate(savedUrl);
      } else {
        navigate(fallbackPath);
      }
    },
    [navigate, location]
  );

  // Employee-specific navigation functions
  const employeeNavigation = {
    // Navigate to employees list with preserved pagination
    toList: useCallback(() => {
      const savedEmployeesUrl = localStorage.getItem("employeesReturnUrl");
      if (savedEmployeesUrl) {
        navigate(savedEmployeesUrl);
      } else {
        navigate("/employees");
      }
    }, [navigate]),

    // Navigate to employee edit with state preservation
    toEdit: useCallback(
      (employeeId) => {
        saveCurrentLocation();
        navigate(`/employees/${employeeId}/edit`);
      },
      [navigate, saveCurrentLocation]
    ),

    // Navigate to employee view with state preservation
    toView: useCallback(
      (employeeId) => {
        saveCurrentLocation();
        navigate(`/employees/view/${employeeId}`);
      },
      [navigate, saveCurrentLocation]
    ),

    // Navigate to create user with state preservation
    toCreate: useCallback(() => {
      saveCurrentLocation();
      navigate("/employees/create");
    }, [navigate, saveCurrentLocation]),

    // Navigate back to employees list from edit/view/create
    backToList: useCallback(() => {
      const savedEmployeesUrl = localStorage.getItem("employeesReturnUrl");
      if (savedEmployeesUrl) {
        navigate(savedEmployeesUrl);
      } else {
        navigate("/employees");
      }
    }, [navigate]),
  };

  // Dashboard navigation
  const dashboardNavigation = {
    toDashboard: useCallback(() => {
      navigateWithStatePreservation("/dashboard");
    }, [navigateWithStatePreservation]),
  };

  // Reports navigation
  const reportsNavigation = {
    toReports: useCallback(() => {
      navigateWithStatePreservation("/reports");
    }, [navigateWithStatePreservation]),
  };

  // Settings navigation
  const settingsNavigation = {
    toSettings: useCallback(() => {
      navigateWithStatePreservation("/settings");
    }, [navigateWithStatePreservation]),
  };

  // Profile navigation
  const profileNavigation = {
    toProfile: useCallback(() => {
      navigateWithStatePreservation("/profile");
    }, [navigateWithStatePreservation]),
  };

  // Generic navigation with state preservation
  const goTo = useCallback(
    (path, options = {}) => {
      navigateWithStatePreservation(path, options);
    },
    [navigateWithStatePreservation]
  );

  // Go back with state preservation
  const goBack = useCallback(
    (fallbackPath = "/") => {
      navigateBackWithState(fallbackPath);
    },
    [navigateBackWithState]
  );

  return {
    // Core navigation functions
    goTo,
    goBack,
    saveCurrentLocation,

    // Specific navigation modules
    employees: employeeNavigation,
    dashboard: dashboardNavigation,
    reports: reportsNavigation,
    settings: settingsNavigation,
    profile: profileNavigation,

    // Direct access to navigate for special cases
    navigate,
  };
};

export default useAppNavigation;
