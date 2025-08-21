import React, { useState, useRef, useEffect } from 'react';

/**
 * SearchableSelect Component
 * 
 * A dropdown component with search functionality that can be used as a replacement
 * for standard select elements. Supports keyboard navigation and accessibility.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.options - Array of options {value, label, description}
 * @param {string} props.value - Current selected value
 * @param {function} props.onChange - Callback when selection changes
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether the select is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.name - Field name for form integration
 * @param {Object} props.register - React Hook Form register function
 * @param {string} props.error - Error message to display
 * @param {boolean} props.allowClear - Whether to show clear button
 */
const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  required = false,
  name = '',
  register = null,
  error = null,
  allowClear = false,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsRef = useRef([]);
  
  // Get dropdown type for better z-index management
  const dropdownType = props['data-dropdown-type'] || 'default';
  
  // Set much higher z-index for role dropdown to ensure it's always on top
  const getZIndex = () => {
    if (dropdownType === 'role') return 2147483647; // Maximum possible z-index
    if (dropdownType === 'employee') return 10000; // Much lower for employee
    return 5000; // Default for others
  };

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Find selected option for display
  const selectedOption = options.find(option => option.value == value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup: ensure dropdown is closed on unmount
      setIsOpen(false);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle option selection
  const handleSelect = (option) => {
    if (onChange) {
      onChange(option.value);
    }
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  // Handle clear selection
  const handleClear = (event) => {
    event.stopPropagation();
    if (onChange) {
      onChange('');
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      if (!isOpen) {
        // Calculate best position for dropdown
        if (dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;
          
          // Check if there's enough space below
          if (spaceBelow < 280 && spaceAbove > spaceBelow) {
            setDropdownPosition('top');
          } else {
            setDropdownPosition('bottom');
          }
        }
      }
      
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current[highlightedIndex]) {
      optionsRef.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex]);

  const baseClassName = `
    relative w-full px-4 py-3 border border-gray-300 rounded-lg 
    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
    bg-white text-gray-900 cursor-pointer transition-all duration-200
    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:border-gray-400 hover:shadow-sm'}
    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
    ${className}
  `.trim();

  return (
    <div className="relative w-full" ref={dropdownRef} style={{ 
      isolation: 'isolate',
      // Ensure role dropdown container has proper stacking context
      ...(dropdownType === 'role' && {
        zIndex: 999999,
        position: 'relative'
      })
    }}>
      {/* Hidden input for form integration */}
      {register && (
        <input
          type="hidden"
          {...register(name, { required })}
          value={value}
        />
      )}
      
      {/* Main select button */}
      <div
        className={baseClassName}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={placeholder}
        {...props}
      >
        <div className="flex items-center justify-between min-h-[24px]">
          <div className="flex-1 min-w-0">
            {selectedOption ? (
              <div className="text-gray-900 font-medium">
                <div className="truncate">{selectedOption.label}</div>
                {selectedOption.description && (
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {selectedOption.description}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
            {selectedOption && allowClear && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                tabIndex={-1}
                title="Clear selection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'transform rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={`absolute w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-hidden min-w-[320px] transform -translate-x-0 ${
          dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        } ${dropdownType === 'role' ? 'role-dropdown-superior' : ''}`} style={{ 
          minWidth: '320px',
          maxWidth: '100%',
          position: dropdownType === 'role' ? 'fixed' : 'absolute',
          zIndex: getZIndex(),
          maxHeight: '320px',
          // Ensure role dropdown is always visible and properly positioned
          ...(dropdownType === 'role' && {
            isolation: 'isolate',
            contain: 'layout style paint',
            left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left : 0,
            top: dropdownRef.current ? (dropdownPosition === 'top' ? 
              dropdownRef.current.getBoundingClientRect().top - 280 : 
              dropdownRef.current.getBoundingClientRect().bottom + 8) : 0,
            width: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().width : 'auto'
          })
        }}>
          {/* Search input */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 text-sm"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto" role="listbox" style={{ maxHeight: '192px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  ref={el => optionsRef.current[index] = el}
                  className={`
                    px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0
                    ${highlightedIndex === index ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'}
                    ${value === option.value ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'}
                  `}
                  onClick={() => handleSelect(option)}
                  role="option"
                  aria-selected={value === option.value}
                >
                  <div className="text-sm font-medium leading-relaxed">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {option.description}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="text-gray-400 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No options found</p>
                <p className="text-gray-400 text-xs mt-1">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-red-600 text-sm mt-2 font-medium">{error}</p>
      )}
    </div>
  );
};

export default SearchableSelect;
