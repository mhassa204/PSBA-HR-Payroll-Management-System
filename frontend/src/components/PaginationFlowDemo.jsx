import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const PaginationFlowDemo = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Persistent Pagination Flow Demo
        </h1>
        <p className="text-gray-600 mb-6">
          This demonstrates how pagination state is preserved throughout the entire user journey.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Step 1 */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Navigate to Employee Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-3">
              Go to the Employee Table page and navigate to a specific page (e.g., page 5).
            </p>
            <div className="bg-blue-50 p-3 rounded-lg">
              <code className="text-sm">URL: /employees?page=5&pageSize=10</code>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Click Edit Button
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-3">
              Click the "Edit" button on any employee row. The current page state is automatically saved.
            </p>
            <div className="bg-green-50 p-3 rounded-lg">
              <code className="text-sm">Saved State: page=5, pageSize=10</code>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
              Edit Employee Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-3">
              Make your changes in the edit form. The pagination state remains saved in the background.
            </p>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <code className="text-sm">URL: /employees/123/edit</code>
            </div>
          </CardContent>
        </Card>

        {/* Step 4 */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
              Save or Go Back
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-3">
              Click "Save" or "Back" button. You'll be returned to the exact same page you were on!
            </p>
            <div className="bg-purple-50 p-3 rounded-lg">
              <code className="text-sm">Restored URL: /employees?page=5&pageSize=10</code>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</span>
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <strong>Page Number Preserved:</strong> Returns to the exact page you were on
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <strong>Page Size Preserved:</strong> Maintains your preferred items per page
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <strong>Search Terms Preserved:</strong> Any search filters remain active
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <strong>Works with Browser Navigation:</strong> Back/forward buttons work correctly
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <strong>Survives Page Refresh:</strong> State persists even after F5 refresh
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Technical Implementation */}
        <Card className="border-l-4 border-l-gray-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">⚙</span>
              Technical Implementation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">useReturnNavigation Hook</h4>
                <p className="text-sm text-gray-600">Manages navigation state and provides functions for preserving pagination context.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">usePageState Hook</h4>
                <p className="text-sm text-gray-600">Handles pagination state persistence in URL parameters and localStorage.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Navigation Functions</h4>
                <p className="text-sm text-gray-600">
                  <code className="bg-gray-100 px-1 rounded">navigateToEdit()</code>, 
                  <code className="bg-gray-100 px-1 rounded ml-1">navigateToView()</code>, 
                  <code className="bg-gray-100 px-1 rounded ml-1">navigateBackToList()</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Try It Out!</h3>
        <p className="text-blue-800 text-sm">
          Go to the Employee Table, navigate to page 5 or higher, click edit on any employee, 
          make some changes, then click "Back" or "Save". You'll return to the exact same page!
        </p>
      </div>
    </div>
  );
};

export default PaginationFlowDemo;
