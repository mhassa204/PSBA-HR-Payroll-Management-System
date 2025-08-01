import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

/**
 * Breadcrumb Navigation Component
 * 
 * Features:
 * - Automatic breadcrumb generation from path
 * - Professional styling
 * - Accessibility support
 * - Responsive design
 */

const pathMappings = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/employees/new': 'Add Employee',
  '/employees/edit': 'Edit Employee',
  '/employees/reports': 'Employee Reports',
  '/employment': 'Employment',
  '/employment/new': 'New Employment',
  '/employment/contracts': 'Contracts',
  '/documents': 'Documents',
  '/reports': 'Reports',
  '/settings': 'Settings'
};

const Breadcrumb = ({ currentPath }) => {
  const generateBreadcrumbs = (path) => {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', href: '/dashboard', icon: HomeIcon }];

    let currentHref = '';
    segments.forEach((segment, index) => {
      currentHref += `/${segment}`;
      const name = pathMappings[currentHref] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      breadcrumbs.push({
        name,
        href: currentHref,
        current: index === segments.length - 1
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs(currentPath);

  return (
    <nav className="flex py-4" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-4">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.href}>
            <div className="flex items-center">
              {index === 0 ? (
                <Link
                  to={breadcrumb.href}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <breadcrumb.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="sr-only">{breadcrumb.name}</span>
                </Link>
              ) : (
                <>
                  <ChevronRightIcon
                    className="h-5 w-5 flex-shrink-0 text-gray-300"
                    aria-hidden="true"
                  />
                  {breadcrumb.current ? (
                    <span className="ml-4 text-sm font-medium text-gray-900">
                      {breadcrumb.name}
                    </span>
                  ) : (
                    <Link
                      to={breadcrumb.href}
                      className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {breadcrumb.name}
                    </Link>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

Breadcrumb.propTypes = {
  currentPath: PropTypes.string.isRequired
};

export default Breadcrumb;
