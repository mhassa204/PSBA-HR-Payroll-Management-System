import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import Breadcrumb from '../components/layout/Breadcrumb';
import NotificationCenter from '../components/layout/NotificationCenter';

/**
 * Modern Dashboard Layout
 * 
 * Features:
 * - Responsive sidebar with collapsible navigation
 * - Professional header with user profile and notifications
 * - Breadcrumb navigation
 * - Consistent spacing and typography
 * - Mobile-first responsive design
 * - Accessibility support
 */
const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        currentPath={location.pathname}
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header 
          onMenuClick={toggleSidebar}
          onNotificationClick={toggleNotifications}
          notificationsOpen={notificationsOpen}
        />

        {/* Page content */}
        <main className="flex-1">
          {/* Breadcrumb */}
          <div className="bg-white border-b border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8">
              <Breadcrumb currentPath={location.pathname} />
            </div>
          </div>

          {/* Main content */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node
};

export default DashboardLayout;
