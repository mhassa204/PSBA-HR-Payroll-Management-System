import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePageState } from "../hooks/usePageState";

// Heroicons
const EditIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

const DeleteIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0h4m-7 4v12m10-12v12"
    />
  </svg>
);

const ViewIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.293-3.293a1 1 0 011.414 1.414C19.582 13.246 16.406 16 12 16c-4.406 0-7.582-2.754-10.707-5.879a1 1 0 011.414-1.414C5.832 11.832 8.594 14 12 14s6.168-2.168 9.293-5.293z"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    className="w-5 h-5 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1016.65 16.65z"
    />
  </svg>
);

const DataTable = ({
  title,
  columns,
  data = [],
  actions = [],
  itemsPerPage = 10,
  storageKey = null,
}) => {
  // Use persistent pagination state
  const {
    page: currentPage,
    pageSize,
    search: searchTerm,
    sort,
    setPage: setCurrentPage,
    setPageSize,
    setSearch: setSearchTerm,
    setSort,
  } = usePageState({
    defaultPage: 1,
    defaultPageSize: itemsPerPage,
    defaultSearch: "",
    storageKey:
      storageKey || `dataTable_${title?.replace(/\s+/g, "_").toLowerCase()}`,
  });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filteredData, setFilteredData] = useState([]);
  const navigate = useNavigate();

  const validData = Array.isArray(data) ? data : [];

  // Filter data based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(validData);
      return;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = validData.filter((row) =>
      columns.some((column) => {
        const value = column.accessor.includes(".")
          ? column.accessor.split(".").reduce((o, i) => o?.[i] || "", row)
          : row[column.accessor] || "";
        return value.toString().toLowerCase().includes(lowerSearchTerm);
      })
    );
    setFilteredData(filtered);
  }, [data, searchTerm, columns]);

  const handleSearch = () => {
    // Search is now handled automatically by the effect above
    // This function can be used for manual search triggers if needed
  };

  const sortData = (data, key, direction) => {
    return [...data].sort((a, b) => {
      const aValue = key.includes(".")
        ? key.split(".").reduce((o, i) => o?.[i] || "", a)
        : a[key] || "";
      const bValue = key.includes(".")
        ? key.split(".").reduce((o, i) => o?.[i] || "", b)
        : b[key] || "";
      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const sortedData = sortConfig.key
    ? sortData(filteredData, sortConfig.key, sortConfig.direction)
    : filteredData;
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getActionStyles = (label) => {
    const normalized = label.toLowerCase().trim();
    switch (normalized) {
      case "edit":
        return {
          icon: <EditIcon />,
          className:
            " rounded-full text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors duration-150",
        };
      case "delete":
        return {
          icon: <DeleteIcon />,
          className:
            "p-2 rounded-full text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-150",
        };
      case "view":
        return {
          icon: <ViewIcon />,
          className:
            " rounded-full text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors duration-150",
        };
      default:
        return {
          icon: null,
          className:
            " rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150",
        };
    }
  };

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl shadow-lg p-3 sm:p-6">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4 sm:mb-6">{title}</h1>
      {/* Search Bar */}
      {/* <div className="mb-6 flex items-center space-x-3 max-w-md">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, CNIC, phone number..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white text-gray-700 placeholder-gray-400 shadow-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-300 transition-colors duration-150 flex items-center space-x-2"
        >
          <SearchIcon />
          <span>Search</span>
        </button>
      </div> */}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Search bar */}
        <div className="flex flex-1 items-center space-x-3 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, CNIC, phone number..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white text-gray-700 placeholder-gray-400 shadow-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-300 transition-colors duration-150 flex items-center space-x-2"
          >
            {/* <SearchIcon /> */}
            <span>Search</span>
          </button>
        </div>

        {/* Right: Create Employee button */}
        <div className="flex justify-end">
          <button
            onClick={() => navigate("/employees/create")}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors duration-150"
          >
            + Create Employee
          </button>
        </div>
      </div>

      {/* Mobile scroll hint */}
      <div className="block sm:hidden text-xs text-gray-500 text-center mb-2">
        ← Swipe left/right to view all columns →
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-100 rounded-xl shadow-md">
          <thead className="bg-background-dark text-white">
            <tr>
              <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium whitespace-nowrap">
                Sr. No.
              </th>
              {columns.map((column) => (
                <th
                  key={column.accessor}
                  className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-medium cursor-pointer hover:bg-teal-500 transition-colors duration-150 whitespace-nowrap"
                  onClick={() => handleSort(column.accessor)}
                >
                  <div className="flex items-center justify-center">
                    <span className="truncate max-w-[120px] sm:max-w-none">
                      {column.header}
                    </span>
                    {sortConfig.key === column.accessor && (
                      <span className="ml-1 sm:ml-2 text-teal-100 flex-shrink-0">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-medium whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-6 py-8 bg-white text-center"
                >
                  <div className="flex justify-center items-center">
                    <div>
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <h3 className="mt-2 text-lg font-medium text-gray-800">
                        No Employees Found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search or add new employees.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
            paginatedData.map((row, index) => (
              <tr
                key={row.id || index}
                className={`border-b border-gray-100 transition-colors duration-200 ${
                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                } hover:bg-gray-100`}
              >
                <td className="px-2 sm:px-3 py-2 sm:py-3 text-center text-gray-700 text-xs sm:text-sm font-medium whitespace-nowrap">
                  {(currentPage - 1) * pageSize + index + 1}
                </td>
                {columns.map((column) => (
                  <td
                    key={column.accessor}
                    className="px-2 sm:px-3 py-2 sm:py-3 text-center text-gray-700 text-xs sm:text-sm"
                  >
                    <div className="max-w-[100px] sm:max-w-[150px] md:max-w-[200px] mx-auto">
                      <div
                        className="truncate"
                        title={column.render
                          ? String(column.render(row))
                          : String(column.accessor.includes(".")
                            ? column.accessor.split(".").reduce((o, i) => o?.[i] || "", row)
                            : row[column.accessor] || "")
                        }
                      >
                        {column.render
                          ? column.render(row)
                          : column.accessor.includes(".")
                          ? column.accessor
                              .split(".")
                              .reduce((o, i) => o?.[i] || "", row)
                          : row[column.accessor] || ""}
                      </div>
                    </div>
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-sm whitespace-nowrap">
                    <div className="flex justify-center space-x-1 sm:space-x-2">
                      {actions.map((action) => {
                        const { icon, className } = getActionStyles(
                          action.label
                        );
                        return (
                          <button
                            key={action.label}
                            onClick={() => action.handler(row)}
                            className={`${className} text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2`}
                            title={action.label}
                          >
                            <span className="block sm:hidden">{icon}</span>
                            <span className="hidden sm:block">{icon}</span>
                          </button>
                        );
                      })}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
          </tbody>
        </table>
      </div>

      {/* Modern Professional Pagination */}
      <div className="mt-8 border-t border-gray-200 bg-white px-4 py-6 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Results Summary & Page Size Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Results Summary */}
            <div className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {Math.min(
                  (currentPage - 1) * pageSize + 1,
                  filteredData.length
                )}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, filteredData.length)}
              </span>{" "}
              of <span className="font-medium">{filteredData.length}</span>{" "}
              results
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
          </div>

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center sm:justify-end">
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-medium text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-1 hidden sm:inline">Previous</span>
                </button>

                {/* Page Numbers */}
                {(() => {
                  const pages = [];
                  const showPages = 5; // Number of page buttons to show
                  let startPage = Math.max(
                    1,
                    currentPage - Math.floor(showPages / 2)
                  );
                  let endPage = Math.min(totalPages, startPage + showPages - 1);

                  // Adjust start if we're near the end
                  if (endPage - startPage + 1 < showPages) {
                    startPage = Math.max(1, endPage - showPages + 1);
                  }

                  // First page + ellipsis
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span
                          key="ellipsis1"
                          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300"
                        >
                          ...
                        </span>
                      );
                    }
                  }

                  // Page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                          i === currentPage
                            ? "z-10 bg-teal-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                            : "text-gray-900"
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Last page + ellipsis
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span
                          key="ellipsis2"
                          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300"
                        >
                          ...
                        </span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}

                {/* Next Button */}
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(currentPage + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-3 py-2 text-sm font-medium text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  <span className="mr-1 hidden sm:inline">Next</span>
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataTable;
