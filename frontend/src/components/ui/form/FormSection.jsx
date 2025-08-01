import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable form section component for organizing form fields
 * Provides consistent spacing, styling, and responsive layout
 */
const FormSection = ({
  title,
  description,
  children,
  className = '',
  collapsible = false,
  defaultExpanded = true,
  icon: Icon,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}
      {...props}
    >
      {/* Section Header */}
      {title && (
        <div 
          className={`
            px-6 py-4 border-b border-gray-200 
            ${collapsible ? 'cursor-pointer hover:bg-gray-50' : ''}
          `}
          onClick={toggleExpanded}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={collapsible ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleExpanded();
            }
          } : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {Icon && (
                <div className="flex-shrink-0">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {title}
                </h3>
                {description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {description}
                  </p>
                )}
              </div>
            </div>
            
            {collapsible && (
              <div className="flex-shrink-0">
                <svg
                  className={`
                    h-5 w-5 text-gray-400 transition-transform duration-200
                    ${isExpanded ? 'transform rotate-180' : ''}
                  `}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Content */}
      {(!collapsible || isExpanded) && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

FormSection.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  collapsible: PropTypes.bool,
  defaultExpanded: PropTypes.bool,
  icon: PropTypes.elementType
};

export default FormSection;
