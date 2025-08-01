import React from 'react';
import PropTypes from 'prop-types';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

/**
 * Professional Statistics Card Component
 * 
 * Features:
 * - Clean, modern design
 * - Trend indicators
 * - Icon support
 * - Responsive layout
 * - Accessibility support
 */
const StatsCard = ({ 
  name, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  href,
  onClick 
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
      case 'decrease':
        return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const CardContent = () => (
    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {Icon && (
              <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
            )}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {name}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${getChangeColor()}`}>
                    {getChangeIcon()}
                    <span className="sr-only">
                      {changeType === 'increase' ? 'Increased' : changeType === 'decrease' ? 'Decreased' : 'Changed'} by
                    </span>
                    {change}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        <CardContent />
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left">
        <CardContent />
      </button>
    );
  }

  return <CardContent />;
};

StatsCard.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  change: PropTypes.string,
  changeType: PropTypes.oneOf(['increase', 'decrease', 'neutral']),
  icon: PropTypes.elementType,
  href: PropTypes.string,
  onClick: PropTypes.func
};

export default StatsCard;
