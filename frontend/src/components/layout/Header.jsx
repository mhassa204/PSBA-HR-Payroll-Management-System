import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Bars3Icon, 
  BellIcon, 
  MagnifyingGlassIcon,
  UserCircleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

/**
 * Modern Header Component
 * 
 * Features:
 * - Search functionality
 * - Notifications
 * - User profile dropdown
 * - Mobile menu toggle
 * - Professional design
 */
const Header = ({ onMenuClick }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Search query:', searchQuery);
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search */}
        <form className="relative flex flex-1" onSubmit={handleSearch}>
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
            placeholder="Search employees, departments..."
            type="search"
            name="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            {/* Notification badge */}
            <span className="absolute -mt-2 -ml-2 inline-flex h-2 w-2 rounded-full bg-red-400"></span>
          </button>

          {/* Separator */}
          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200"
            aria-hidden="true"
          />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              className="-m-1.5 flex items-center p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={toggleUserMenu}
            >
              <span className="sr-only">Open user menu</span>
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-gray-900">
                  Admin User
                </span>
                <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
              </span>
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <div className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                <a
                  href="#"
                  className="block px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-gray-50"
                >
                  Your profile
                </a>
                <a
                  href="#"
                  className="block px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-gray-50"
                >
                  Settings
                </a>
                <a
                  href="#"
                  className="block px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-gray-50"
                >
                  Sign out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

Header.propTypes = {
  onMenuClick: PropTypes.func.isRequired
};

export default Header;
