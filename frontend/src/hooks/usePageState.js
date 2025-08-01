import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";

/**
 * Custom hook for managing page state with URL persistence
 * Maintains pagination, filters, search, and sorting state in URL
 */
export const usePageState = (options = {}) => {
  const {
    defaultPage = 1,
    defaultPageSize = 10,
    defaultSort = null,
    defaultFilters = {},
    defaultSearch = "",
    storageKey = null, // Optional localStorage key for persistence
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Initialize state from URL params or defaults
  const [pageState, setPageState] = useState(() => {
    const urlPage = parseInt(searchParams.get("page")) || defaultPage;
    const urlPageSize =
      parseInt(searchParams.get("pageSize")) || defaultPageSize;
    const urlSort = searchParams.get("sort") || defaultSort;
    const urlSearch = searchParams.get("search") || defaultSearch;

    // Parse filters from URL
    const urlFilters = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter_")) {
        const filterKey = key.replace("filter_", "");
        urlFilters[filterKey] = value;
      }
    }

    const initialState = {
      page: urlPage,
      pageSize: urlPageSize,
      sort: urlSort,
      search: urlSearch,
      filters: Object.keys(urlFilters).length > 0 ? urlFilters : defaultFilters,
    };

    return initialState;
  });

  // Sync state with URL changes (for browser back/forward)
  useEffect(() => {
    const urlPage = parseInt(searchParams.get("page")) || defaultPage;
    const urlPageSize =
      parseInt(searchParams.get("pageSize")) || defaultPageSize;
    const urlSort = searchParams.get("sort") || defaultSort;
    const urlSearch = searchParams.get("search") || defaultSearch;

    // Parse filters from URL
    const urlFilters = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter_")) {
        const filterKey = key.replace("filter_", "");
        urlFilters[filterKey] = value;
      }
    }

    const newState = {
      page: urlPage,
      pageSize: urlPageSize,
      sort: urlSort,
      search: urlSearch,
      filters: Object.keys(urlFilters).length > 0 ? urlFilters : defaultFilters,
    };

    // Only update if state actually changed
    setPageState((prevState) => {
      const hasChanged =
        prevState.page !== newState.page ||
        prevState.pageSize !== newState.pageSize ||
        prevState.sort !== newState.sort ||
        prevState.search !== newState.search ||
        JSON.stringify(prevState.filters) !== JSON.stringify(newState.filters);

      return hasChanged ? newState : prevState;
    });
  }, [
    searchParams,
    defaultPage,
    defaultPageSize,
    defaultSort,
    defaultSearch,
    defaultFilters,
  ]);

  // Update URL when state changes
  const updateURL = useCallback(
    (newState) => {
      const params = new URLSearchParams();

      // Always add page parameter for consistency
      params.set("page", newState.page.toString());

      // Always add pageSize parameter for consistency
      params.set("pageSize", newState.pageSize.toString());

      // Add sort if exists
      if (newState.sort) {
        params.set("sort", newState.sort);
      }

      // Add search if exists
      if (newState.search) {
        params.set("search", newState.search);
      }

      // Add filters
      Object.entries(newState.filters || {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          params.set(`filter_${key}`, value);
        }
      });

      setSearchParams(params, { replace: true });
    },
    [defaultPage, defaultPageSize, setSearchParams]
  );

  // Save to localStorage if storageKey provided
  const saveToStorage = useCallback(
    (state) => {
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (error) {
          console.warn("Failed to save page state to localStorage:", error);
        }
      }
    },
    [storageKey]
  );

  // Load from localStorage if available
  const loadFromStorage = useCallback(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : null;
      } catch (error) {
        console.warn("Failed to load page state from localStorage:", error);
        return null;
      }
    }
    return null;
  }, [storageKey]);

  // Update state and URL
  const updatePageState = useCallback(
    (updates) => {
      setPageState((prevState) => {
        const newState = { ...prevState, ...updates };
        updateURL(newState);
        saveToStorage(newState);
        return newState;
      });
    },
    [updateURL, saveToStorage]
  );

  // Specific update functions
  const setPage = useCallback(
    (page) => {
      updatePageState({ page });
    },
    [updatePageState]
  );

  const setPageSize = useCallback(
    (pageSize) => {
      updatePageState({ pageSize, page: 1 }); // Reset to first page when changing page size
    },
    [updatePageState]
  );

  const setSort = useCallback(
    (sort) => {
      updatePageState({ sort, page: 1 }); // Reset to first page when changing sort
    },
    [updatePageState]
  );

  const setSearch = useCallback(
    (search) => {
      updatePageState({ search, page: 1 }); // Reset to first page when searching
    },
    [updatePageState]
  );

  const setFilters = useCallback(
    (filters) => {
      updatePageState({ filters, page: 1 }); // Reset to first page when filtering
    },
    [updatePageState]
  );

  const updateFilter = useCallback(
    (key, value) => {
      updatePageState({
        filters: { ...pageState.filters, [key]: value },
        page: 1,
      });
    },
    [updatePageState, pageState.filters]
  );

  const clearFilters = useCallback(() => {
    updatePageState({ filters: defaultFilters, page: 1 });
  }, [updatePageState, defaultFilters]);

  const reset = useCallback(() => {
    const resetState = {
      page: defaultPage,
      pageSize: defaultPageSize,
      sort: defaultSort,
      search: defaultSearch,
      filters: defaultFilters,
    };
    updatePageState(resetState);
  }, [
    updatePageState,
    defaultPage,
    defaultPageSize,
    defaultSort,
    defaultSearch,
    defaultFilters,
  ]);

  // Initialize from storage on mount if no URL params
  useEffect(() => {
    const hasUrlParams = searchParams.toString().length > 0;
    if (!hasUrlParams && storageKey) {
      const savedState = loadFromStorage();
      if (savedState) {
        // Update URL with saved state to ensure persistence on refresh
        updateURL(savedState);
        setPageState(savedState);
      }
    }
  }, []);

  // Save state to storage whenever it changes (for refresh protection)
  useEffect(() => {
    if (storageKey) {
      saveToStorage(pageState);
    }
  }, [pageState, storageKey, saveToStorage]);

  // Generate query object for API calls
  const getQueryParams = useCallback(() => {
    const params = {
      page: pageState.page,
      pageSize: pageState.pageSize,
    };

    if (pageState.sort) {
      params.sort = pageState.sort;
    }

    if (pageState.search) {
      params.search = pageState.search;
    }

    // Add filters
    Object.entries(pageState.filters || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        params[key] = value;
      }
    });

    return params;
  }, [pageState]);

  return {
    // Current state
    ...pageState,

    // Update functions
    setPage,
    setPageSize,
    setSort,
    setSearch,
    setFilters,
    updateFilter,
    clearFilters,
    reset,
    updatePageState,

    // Utility functions
    getQueryParams,

    // State info
    hasFilters: Object.keys(pageState.filters || {}).some(
      (key) =>
        pageState.filters[key] !== null &&
        pageState.filters[key] !== undefined &&
        pageState.filters[key] !== ""
    ),
    hasSearch: Boolean(pageState.search),
  };
};

export default usePageState;
