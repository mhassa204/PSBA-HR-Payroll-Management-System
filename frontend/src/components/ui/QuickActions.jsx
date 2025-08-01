import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
 * Quick Actions Grid Component
 * 
 * Features:
 * - Grid layout for action cards
 * - Icon support
 * - Hover effects
 * - Responsive design
 * - Professional styling
 */
const QuickActions = ({ actions = [] }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.name}
          to={action.href}
          className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
        >
          <div>
            <span className={`rounded-lg inline-flex p-3 ring-4 ring-white ${action.color}`}>
              <action.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              <span className="absolute inset-0" aria-hidden="true" />
              {action.name}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {action.description}
            </p>
          </div>
          <span
            className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
            aria-hidden="true"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  );
};

QuickActions.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
      color: PropTypes.string.isRequired
    })
  )
};

export default QuickActions;
