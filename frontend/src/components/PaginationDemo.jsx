import React from 'react';
import DataTable from './DataTable';

const PaginationDemo = () => {
  // Generate sample data for demonstration
  const generateSampleData = (count = 100) => {
    return Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      email: `user${index + 1}@example.com`,
      department: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'][index % 5],
      status: ['Active', 'Inactive', 'Pending'][index % 3],
      joinDate: new Date(2020 + (index % 4), index % 12, (index % 28) + 1).toLocaleDateString(),
    }));
  };

  const sampleData = generateSampleData(100);

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Department', accessor: 'department' },
    { header: 'Status', accessor: 'status' },
    { header: 'Join Date', accessor: 'joinDate' },
  ];

  const actions = [
    {
      label: 'View',
      handler: (row) => alert(`Viewing user: ${row.name}`),
    },
    {
      label: 'Edit',
      handler: (row) => alert(`Editing user: ${row.name}`),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Persistent Pagination Demo
        </h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            How to test persistent pagination:
          </h2>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>Navigate to any page (e.g., page 5) using the pagination controls</li>
            <li>Change the page size (e.g., from 10 to 25 entries)</li>
            <li>Use the search functionality to filter results</li>
            <li>Refresh the page (F5 or Ctrl+R)</li>
            <li>Notice that your pagination state is preserved!</li>
            <li>The URL also updates to reflect the current state</li>
          </ol>
        </div>
      </div>

      <DataTable
        title="Sample Users"
        columns={columns}
        data={sampleData}
        actions={actions}
        itemsPerPage={10}
        storageKey="paginationDemo"
      />

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Technical Details:
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>URL Persistence:</strong> Pagination state is stored in URL parameters</li>
          <li><strong>localStorage Backup:</strong> State is also saved to localStorage as a fallback</li>
          <li><strong>Browser Navigation:</strong> Back/forward buttons work correctly</li>
          <li><strong>Automatic Restoration:</strong> State is restored on page reload</li>
          <li><strong>Unique Storage Keys:</strong> Each table can have its own persistent state</li>
        </ul>
      </div>
    </div>
  );
};

export default PaginationDemo;
