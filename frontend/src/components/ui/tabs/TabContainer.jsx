import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import TabNavigation from './TabNavigation';

/**
 * TabContainer - Main container for tab-based interfaces
 * 
 * Features:
 * - Responsive tab navigation
 * - Progress tracking
 * - Validation state management
 * - Auto-save functionality
 * - Unsaved changes warning
 */
const TabContainer = ({
  tabs = [],
  initialTab = 0,
  onTabChange,
  validationStates = {},
  completionStates = {},
  hasUnsavedChanges = false,
  onSave,
  autoSaveInterval = 30000, // 30 seconds
  className = '',
  children
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  // Auto-save functionality
  useEffect(() => {
    if (!onSave || !hasUnsavedChanges) return;

    const autoSaveTimer = setInterval(() => {
      if (hasUnsavedChanges) {
        onSave('auto');
        setLastSaveTime(new Date());
      }
    }, autoSaveInterval);

    return () => clearInterval(autoSaveTimer);
  }, [onSave, hasUnsavedChanges, autoSaveInterval]);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleTabChange = (tabIndex) => {
    if (hasUnsavedChanges) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes. Do you want to save before switching tabs?'
      );
      if (confirmSwitch && onSave) {
        onSave('manual');
        setLastSaveTime(new Date());
      }
    }

    setActiveTab(tabIndex);
    onTabChange?.(tabIndex);
  };

  const getTabStatus = (tabIndex) => {
    const tabId = tabs[tabIndex]?.id;
    const validation = validationStates[tabId];
    const completion = completionStates[tabId];

    if (validation?.hasErrors) return 'error';
    if (completion?.isComplete) return 'complete';
    if (completion?.hasData) return 'partial';
    return 'empty';
  };

  const calculateOverallProgress = () => {
    const totalTabs = tabs.length;
    const completedTabs = tabs.filter((tab, index) => 
      getTabStatus(index) === 'complete'
    ).length;
    return Math.round((completedTabs / totalTabs) * 100);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header with Progress */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Employee Information
          </h2>
          <div className="flex items-center space-x-4">
            {lastSaveTime && (
              <span className="text-sm text-gray-500">
                Last saved: {lastSaveTime.toLocaleTimeString()}
              </span>
            )}
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-600 font-medium">
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-sm text-gray-600">
              {calculateOverallProgress()}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateOverallProgress()}%` }}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          getTabStatus={getTabStatus}
          completionStates={completionStates}
        />
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

TabContainer.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      required: PropTypes.bool
    })
  ).isRequired,
  initialTab: PropTypes.number,
  onTabChange: PropTypes.func,
  validationStates: PropTypes.object,
  completionStates: PropTypes.object,
  hasUnsavedChanges: PropTypes.bool,
  onSave: PropTypes.func,
  autoSaveInterval: PropTypes.number,
  className: PropTypes.string,
  children: PropTypes.node
};

export default TabContainer;
