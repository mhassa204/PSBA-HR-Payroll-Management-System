import { useMemo } from 'react';

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  pageSizeOptions = [10, 25, 50, 100],
  showInfo = true,
  className = "",
}) => {
  // Calculate visible page numbers
  const visiblePages = useMemo(() => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    // Remove duplicates and invalid pages
    return rangeWithDots.filter((page, index, arr) => {
      if (typeof page === 'string') return true; // Keep dots
      if (page < 1 || page > totalPages) return false; // Remove invalid pages
      return arr.indexOf(page) === index; // Remove duplicates
    });
  }, [currentPage, totalPages]);

  // Calculate item range for current page
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalPages <= 1) {
    return null; // Don't show pagination if only one page
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Page Info */}
      {showInfo && (
        <div className="text-sm text-slate-600">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Page Size Selector */}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pagination Controls */}
        <nav className="flex items-center gap-1">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-l-lg hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-500"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          {/* Page Numbers */}
          {visiblePages.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`dots-${index}`}
                  className="px-3 py-2 text-sm font-medium text-slate-500"
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-2 text-sm font-medium border-t border-b border-slate-300 hover:bg-slate-50 hover:text-slate-700 ${
                  page === currentPage
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                    : 'bg-white text-slate-500'
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-r-lg hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-500"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;
