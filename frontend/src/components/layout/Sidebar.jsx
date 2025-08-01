import React from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  UsersIcon, 
  BriefcaseIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

/**
 * Modern Sidebar Navigation
 * 
 * Features:
 * - Clean, professional design
 * - Active state indicators
 * - Responsive behavior
 * - Accessibility support
 * - Icon-based navigation
 */

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: HomeIcon,
    description: 'Overview and analytics'
  },
  { 
    name: 'Employees', 
    href: '/employees', 
    icon: UsersIcon,
    description: 'Manage employee records',
    children: [
      { name: 'All Employees', href: '/employees' },
      { name: 'Add Employee', href: '/employees/new' },
      { name: 'Employee Reports', href: '/employees/reports' }
    ]
  },
  { 
    name: 'Employment', 
    href: '/employment', 
    icon: BriefcaseIcon,
    description: 'Employment management',
    children: [
      { name: 'Employment Records', href: '/employment' },
      { name: 'New Employment', href: '/employment/new' },
      { name: 'Contracts', href: '/employment/contracts' }
    ]
  },
  { 
    name: 'Documents', 
    href: '/documents', 
    icon: DocumentTextIcon,
    description: 'Document management'
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: ChartBarIcon,
    description: 'Analytics and reports'
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: CogIcon,
    description: 'System configuration'
  }
];

const Sidebar = ({ isOpen, onClose, currentPath }) => {
  const location = useLocation();

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const isChildActive = (children) => {
    return children?.some(child => location.pathname === child.href);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">HR</span>
              </div>
              <span className="ml-3 text-xl font-semibold text-gray-900">
                PSBA Portal
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-medium transition-colors
                          ${isActive(item.href) || isChildActive(item.children)
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-5 w-5 shrink-0 ${
                            isActive(item.href) || isChildActive(item.children)
                              ? 'text-blue-600'
                              : 'text-gray-400 group-hover:text-blue-600'
                          }`}
                          aria-hidden="true"
                        />
                        <div className="flex-1">
                          <div>{item.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {item.description}
                          </div>
                        </div>
                      </Link>

                      {/* Sub-navigation */}
                      {item.children && (isActive(item.href) || isChildActive(item.children)) && (
                        <ul className="mt-2 ml-8 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.name}>
                              <Link
                                to={child.href}
                                className={`
                                  block rounded-md py-2 px-3 text-sm leading-6 transition-colors
                                  ${location.pathname === child.href
                                    ? 'text-blue-600 bg-blue-50 font-medium'
                                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                                  }
                                `}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden ${isOpen ? 'relative z-50' : 'hidden'}`}>
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={onClose}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>

            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
              {/* Mobile Logo */}
              <div className="flex h-16 shrink-0 items-center">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">HR</span>
                  </div>
                  <span className="ml-3 text-xl font-semibold text-gray-900">
                    PSBA Portal
                  </span>
                </div>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            onClick={onClose}
                            className={`
                              group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-medium
                              ${isActive(item.href)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                              }
                            `}
                          >
                            <item.icon
                              className={`h-5 w-5 shrink-0 ${
                                isActive(item.href)
                                  ? 'text-blue-600'
                                  : 'text-gray-400 group-hover:text-blue-600'
                              }`}
                              aria-hidden="true"
                            />
                            <div>
                              <div>{item.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentPath: PropTypes.string.isRequired
};

export default Sidebar;
