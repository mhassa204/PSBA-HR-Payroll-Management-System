import { usePageState } from '../hooks/usePageState';
import Pagination from './ui/Pagination';

const PaginationTest = () => {
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = usePageState({
    defaultPage: 1,
    defaultPageSize: 5,
    storageKey: 'testPagination',
  });

  // Mock data for testing
  const totalItems = 100;
  const totalPages = Math.ceil(totalItems / pageSize);

  const handleTestNavigation = () => {
    // Test direct URL navigation
    const testUrl = `/employees?page=10&pageSize=5`;
    window.history.pushState({}, '', testUrl);
    window.location.reload();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pagination State Test</h1>
      
      {/* Current State Display */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Current State:</h2>
        <p><strong>Page:</strong> {page}</p>
        <p><strong>Page Size:</strong> {pageSize}</p>
        <p><strong>Total Items:</strong> {totalItems}</p>
        <p><strong>Total Pages:</strong> {totalPages}</p>
        <p><strong>Current URL:</strong> {window.location.href}</p>
      </div>

      {/* Manual Controls */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Manual Controls:</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setPage(1)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Page 1
          </button>
          <button
            onClick={() => setPage(5)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Page 5
          </button>
          <button
            onClick={() => setPage(10)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Page 10
          </button>
          <button
            onClick={() => setPageSize(10)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Set Page Size 10
          </button>
        </div>
        <button
          onClick={handleTestNavigation}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Test URL Navigation (Page 10)
        </button>
      </div>

      {/* Pagination Component */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Pagination Component:</h2>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          showPageSizeSelector={true}
          pageSizeOptions={[5, 10, 25, 50]}
          showInfo={true}
        />
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 p-4 rounded-lg mt-6">
        <h2 className="text-lg font-semibold mb-2">Test Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click on different page numbers in the pagination component</li>
          <li>Check if the URL updates with the correct page parameter</li>
          <li>Refresh the page and see if it maintains the same page</li>
          <li>Use the manual controls to test direct page navigation</li>
          <li>Check the browser console for debug logs</li>
        </ol>
      </div>
    </div>
  );
};

export default PaginationTest;
