import React, { useState, useRef, useEffect } from 'react';

/**
 * SearchableSelect Component
 * 
 * A dropdown component with search functionality that can be used as a replacement
 * for standard select elements. Supports keyboard navigation and accessibility.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.options - Array of options {value, label}
 * @param {string} props.value - Current selected value
 * @param {function} props.onChange - Callback when selection changes
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether the select is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.name - Field name for form integration
 * @param {Object} props.register - React Hook Form register function
 * @param {string} props.error - Error message to display
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
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsRef = useRef([]);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected option for display
  const selectedOption = options.find(option => option.value === value);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    bg-white text-gray-900 cursor-pointer transition-colors
    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:border-gray-400'}
    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
    ${className}
  `.trim();

  return (
    <div className="relative" ref={dropdownRef}>
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
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex items-center space-x-2">
            {selectedOption && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            )}
            <i
              className={`fas fa-chevron-down text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            ></i>
          </div>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 caret-gray-900"
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
          <div className="max-h-48 overflow-y-auto" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  ref={el => optionsRef.current[index] = el}
                  className={`
                    px-4 py-3 cursor-pointer transition-colors
                    ${highlightedIndex === index ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'}
                    ${value === option.value ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'}
                  `}
                  onClick={() => handleSelect(option)}
                  role="option"
                  aria-selected={value === option.value}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-red-600 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default SearchableSelect;
