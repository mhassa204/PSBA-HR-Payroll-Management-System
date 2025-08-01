// Audit Logs Dashboard - View and manage system audit logs
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuditLog } from '../../../hooks/useAuditLog';

const AuditLogsDashboard = () => {
  const { getAuditLogs, getAuditStatistics } = useAuditLog();
  
  // State management
  const [auditData, setAuditData] = useState({ logs: [], total: 0, totalPages: 0 });
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    severity: '',
    category: '',
    date_from: '',
    date_to: '',
    user_id: ''
  });

  // Load audit data
  const loadAuditData = () => {
    setLoading(true);
    try {
      const data = getAuditLogs(filters, { page: currentPage, limit: 20 });
      setAuditData(data);
      
      const stats = getAuditStatistics({
        from: filters.date_from,
        to: filters.date_to
      });
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when filters/page change
  useEffect(() => {
    loadAuditData();
  }, [currentPage, filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      severity: '',
      category: '',
      date_from: '',
      date_to: '',
      user_id: ''
    });
    setCurrentPage(1);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get severity badge color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATE': return 'fas fa-plus text-green-600';
      case 'UPDATE': return 'fas fa-edit text-blue-600';
      case 'DELETE': return 'fas fa-trash text-red-600';
      case 'VIEW': return 'fas fa-eye text-gray-600';
      case 'LOGIN': return 'fas fa-sign-in-alt text-green-600';
      case 'LOGOUT': return 'fas fa-sign-out-alt text-orange-600';
      case 'EXPORT': return 'fas fa-download text-purple-600';
      case 'SEARCH': return 'fas fa-search text-blue-600';
      default: return 'fas fa-info-circle text-gray-600';
    }
  };

  // Statistics cards data
  const statsCards = useMemo(() => [
    {
      title: 'Total Logs',
      value: statistics.total_logs || 0,
      icon: 'fas fa-list',
      color: 'blue'
    },
    {
      title: 'High Severity',
      value: statistics.severity?.HIGH || 0,
      icon: 'fas fa-exclamation-triangle',
      color: 'red'
    },
    {
      title: 'Data Changes',
      value: statistics.categories?.DATA_MODIFICATION || 0,
      icon: 'fas fa-database',
      color: 'green'
    },
    {
      title: 'User Actions',
      value: Object.keys(statistics.users || {}).length,
      icon: 'fas fa-users',
      color: 'purple'
    }
  ], [statistics]);

  if (loading && auditData.logs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                <i className="fas fa-shield-alt mr-3 text-blue-600"></i>
                Audit Logs Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor and track all system activities and changes
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadAuditData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {statsCards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-${card.color}-100`}>
                  <i className={`${card.icon} text-${card.color}-600 text-xl`}></i>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              <i className="fas fa-filter mr-2 text-blue-600"></i>
              Filters
            </h3>
            <button
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              <i className="fas fa-times mr-1"></i>
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="VIEW">View</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="EXPORT">Export</option>
                <option value="SEARCH">Search</option>
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
              <select
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">All Resources</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="EMPLOYMENT_RECORD">Employment Record</option>
                <option value="USER">User</option>
                <option value="PAGE">Page</option>
                <option value="FORM">Form</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">All Severities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">All Categories</option>
                <option value="AUTHENTICATION">Authentication</option>
                <option value="DATA_MODIFICATION">Data Modification</option>
                <option value="DATA_ACCESS">Data Access</option>
                <option value="DATA_TRANSFER">Data Transfer</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Audit Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Audit Logs ({auditData.total} total)
              </h3>
              <div className="text-sm text-gray-600">
                Page {currentPage} of {auditData.totalPages}
              </div>
            </div>
          </div>

          {auditData.logs.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">No Audit Logs Found</h4>
              <p className="text-gray-500">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditData.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <i className={`${getActionIcon(log.action)} mr-2`}></i>
                          <span className="text-sm font-medium text-gray-900">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.user_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {auditData.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left mr-2"></i>
                  Previous
                </button>
                
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {auditData.totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(auditData.totalPages, prev + 1))}
                  disabled={currentPage === auditData.totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <i className="fas fa-chevron-right ml-2"></i>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AuditLogsDashboard;
