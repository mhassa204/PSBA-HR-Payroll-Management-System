import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const EmploymentIcon = () => (
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
      d="M9 12h6m-6 4h6M9 8h6m-8 8h-.01M7 8h-.01M7 12h-.01M7 16h-.01M17 8h.01M17 12h.01M17 16h.01"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
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
            "rounded-full text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors duration-150 border border-green-200 px-2 py-2",
        };
      case "delete":
        return {
          icon: <DeleteIcon />,
          className:
            "rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 border border-red-200 px-2 py-2",
        };
      case "view":
        return {
          icon: <ViewIcon />,
          className:
            "rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 border border-blue-200 px-2 py-2",
        };
      case "employment":
        return {
          icon: <EmploymentIcon />,
          className:
            "rounded-full text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-150 border border-purple-200 px-2 py-2",
        };
      default:
        return {
          icon: null,
          className:
            "rounded-full text-gray-600 hover:bg-gray-50 hover:text-gray-700 transition-colors duration-150 border border-gray-200 px-2 py-2",
        };
    }
  };

  return (
    <div className="w-full bg-white/90 backdrop-blur rounded-2xl shadow-xl ring-1 ring-slate-200 p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span>Total:</span>
          <span className="font-semibold text-slate-700">{Array.isArray(data) ? data.length : 0}</span>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center space-x-3 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by any visible column..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white text-slate-700 placeholder-slate-400 shadow-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-colors duration-150"
          >
            Search
          </button>
        </div>
        <div className="flex justify-end">
          <Link
            to="/employees/create"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors duration-150"
          >
            + Create Employee
          </Link>
        </div>
      </div>

      <div className="block sm:hidden text-xs text-slate-500 text-center mb-2">
        ← Swipe left/right to view all columns →
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
        <table className="min-w-full bg-white rounded-xl">
          <thead className="bg-slate-800 text-white sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left text-xs sm:text-sm font-medium whitespace-nowrap">Sr. No.</th>
              {columns.map((column) => (
                <th
                  key={column.accessor}
                  className="px-2 sm:px-3 py-3 text-left text-xs sm:text-sm font-medium cursor-pointer hover:bg-slate-700 transition-colors duration-150 whitespace-nowrap"
                  onClick={() => handleSort(column.accessor)}
                >
                  <div className="flex items-center justify-start gap-1">
                    <span className="truncate max-w-[160px] sm:max-w-none">{column.header}</span>
                    {sortConfig.key === column.accessor && (
                      <span className="ml-1 sm:ml-2 text-slate-300 flex-shrink-0">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-medium whitespace-nowrap">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-6 py-8 bg-white text-center">
                  <div className="flex justify-center items-center">
                    <div>
                      <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="mt-2 text-lg font-medium text-slate-800">No Results</h3>
                      <p className="mt-1 text-sm text-slate-500">Try adjusting your search or add new employees.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={`border-b border-slate-100 transition-colors duration-150 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-sky-50`}
                >
                  <td className="px-2 sm:px-3 py-3 text-left text-slate-700 text-xs sm:text-sm font-medium whitespace-nowrap">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  {columns.map((column) => {
                    const hasRenderer = typeof column.render === 'function';
                    const value = !hasRenderer
                      ? (column.accessor.includes(".")
                        ? column.accessor.split(".").reduce((o, i) => o?.[i] || "", row)
                        : row[column.accessor] || "")
                      : null;
                    return (
                      <td key={column.accessor} className="px-2 sm:px-3 py-3 text-left text-slate-700 text-xs sm:text-sm align-middle">
                        <div className={`max-w-[220px] md:max-w-[280px] ${hasRenderer ? 'overflow-visible' : ''}`}>
                          {hasRenderer ? (
                            column.render(row)
                          ) : (
                            <div className="truncate" title={String(value)}>
                              {value}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {actions.length > 0 && (
                    <td className="px-2 sm:px-3 py-3 text-sm whitespace-nowrap">
                      <div className="flex justify-start gap-2">
                        {actions.map((action) => {
                          const { icon, className } = getActionStyles(action.label);
                          return (
                            <button
                              key={action.label}
                              onClick={() => action.handler(row)}
                              className={`${className}`}
                              title={action.label}
                            >
                              {icon}
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

      <div className="mt-6 border-t border-slate-200 bg-white/70 px-4 py-4 sm:px-6 rounded-b-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-slate-700">
            Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, filteredData.length)}</span>
            {" "}to{" "}
            <span className="font-medium">{Math.min(currentPage * pageSize, filteredData.length)}</span>{" "}
            of <span className="font-medium">{filteredData.length}</span> results
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-sm text-slate-600">
                Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages || 1}</span>
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages || 1, currentPage + 1))}
                disabled={currentPage >= (totalPages || 1)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
