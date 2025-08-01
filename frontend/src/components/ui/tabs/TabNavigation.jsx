import React from 'react';
import PropTypes from 'prop-types';

/**
 * TabNavigation - Responsive tab navigation with status indicators
 * 
 * Features:
 * - Visual status indicators (complete, partial, error, empty)
 * - Progress badges
 * - Responsive design (mobile dropdown)
 * - Accessibility support
 */
const TabNavigation = ({
  tabs = [],
  activeTab = 0,
  onTabChange,
  getTabStatus,
  completionStates = {}
}) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'partial':
        return (
          <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
        );
    }
  };

  const getTabClasses = (index, status) => {
    const isActive = index === activeTab;
    const baseClasses = `
      relative flex items-center space-x-2 px-4 py-3 text-sm font-medium rounded-lg
      transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
    `;

    if (isActive) {
      return `${baseClasses} bg-blue-50 text-blue-700 border-2 border-blue-200`;
    }

    switch (status) {
      case 'complete':
        return `${baseClasses} text-green-700 hover:bg-green-50 border-2 border-transparent hover:border-green-200`;
      case 'partial':
        return `${baseClasses} text-amber-700 hover:bg-amber-50 border-2 border-transparent hover:border-amber-200`;
      case 'error':
        return `${baseClasses} text-red-700 hover:bg-red-50 border-2 border-transparent hover:border-red-200`;
      default:
        return `${baseClasses} text-gray-600 hover:bg-gray-50 border-2 border-transparent hover:border-gray-200`;
    }
  };

  const getProgressPercentage = (tabId) => {
    const completion = completionStates[tabId];
    if (!completion) return 0;
    
    const { completedFields = 0, totalFields = 1 } = completion;
    return Math.round((completedFields / totalFields) * 100);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex space-x-2 overflow-x-auto">
        {tabs.map((tab, index) => {
          const status = getTabStatus(index);
          const progress = getProgressPercentage(tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(index)}
              className={getTabClasses(index, status)}
              aria-current={index === activeTab ? 'page' : undefined}
            >
              {/* Tab Icon */}
              <div className="flex-shrink-0">
                {tab.icon ? (
                  <tab.icon className="w-4 h-4" />
                ) : (
                  getStatusIcon(status)
                )}
              </div>

              {/* Tab Label */}
              <span className="flex-1 text-left">{tab.label}</span>

              {/* Required Indicator */}
              {tab.required && (
                <span className="text-red-500 text-xs">*</span>
              )}

              {/* Progress Badge */}
              {status !== 'empty' && (
                <span className={`
                  text-xs px-2 py-1 rounded-full font-medium
                  ${status === 'complete' 
                    ? 'bg-green-100 text-green-800' 
                    : status === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                  }
                `}>
                  {progress}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Navigation (Dropdown) */}
      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(e) => onTabChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {tabs.map((tab, index) => {
            const status = getTabStatus(index);
            const progress = getProgressPercentage(tab.id);
            const statusEmoji = {
              complete: '✓',
              partial: '⏳',
              error: '⚠️',
              empty: '○'
            }[status];

            return (
              <option key={tab.id} value={index}>
                {statusEmoji} {tab.label} {progress > 0 ? `(${progress}%)` : ''}
                {tab.required ? ' *' : ''}
              </option>
            );
          })}
        </select>

        {/* Mobile Progress Indicators */}
        <div className="mt-3 flex space-x-1">
          {tabs.map((tab, index) => {
            const status = getTabStatus(index);
            const isActive = index === activeTab;
            
            return (
              <div
                key={tab.id}
                className={`
                  h-2 flex-1 rounded-full transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-500' 
                    : status === 'complete'
                    ? 'bg-green-500'
                    : status === 'partial'
                    ? 'bg-amber-500'
                    : status === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-200'
                  }
                `}
              />
            );
          })}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="mt-4 text-sm text-gray-600">
        <span>Step {activeTab + 1} of {tabs.length}:</span>
        <span className="font-medium text-gray-900 ml-1">
          {tabs[activeTab]?.label}
        </span>
      </div>
    </>
  );
};

TabNavigation.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      required: PropTypes.bool
    })
  ).isRequired,
  activeTab: PropTypes.number,
  onTabChange: PropTypes.func.isRequired,
  getTabStatus: PropTypes.func.isRequired,
  completionStates: PropTypes.object
};

export default TabNavigation;
