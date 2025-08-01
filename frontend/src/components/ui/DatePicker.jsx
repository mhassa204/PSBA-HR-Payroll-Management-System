import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { formatDateDisplay, formatDateForInput, parseDateInput } from '../../utils/formatters';

/**
 * Professional Date Picker Component with DD/MM/YYYY format
 * 
 * Features:
 * - Click anywhere in field to open calendar
 * - DD/MM/YYYY display format
 * - Calendar popup for date selection
 * - Keyboard navigation support
 * - Professional styling
 */
const DatePicker = ({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  label,
  error,
  required = false,
  disabled = false,
  className = "",
  name,
  id,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Update display value when prop value changes
  useEffect(() => {
    if (value) {
      setDisplayValue(formatDateDisplay(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleDateChange = (event) => {
    const selectedDate = event.target.value;
    if (selectedDate) {
      const formattedDate = formatDateDisplay(selectedDate);
      setDisplayValue(formattedDate);
      
      // Call onChange with ISO format for backend compatibility
      if (onChange) {
        onChange({
          target: {
            name: name,
            value: selectedDate
          }
        });
      }
    }
    setIsOpen(false);
  };

  const handleInputChange = (event) => {
    const inputValue = event.target.value;
    setDisplayValue(inputValue);

    // Try to parse the input and call onChange if valid
    const parsedDate = parseDateInput(inputValue);
    if (parsedDate && onChange) {
      onChange({
        target: {
          name: name,
          value: parsedDate
        }
      });
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleInputClick();
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearDate = () => {
    setDisplayValue('');
    if (onChange) {
      onChange({
        target: {
          name: name,
          value: ''
        }
      });
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label 
          htmlFor={id || name}
          className="block text-sm font-bold text-gray-800 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Display Input */}
        <input
          ref={inputRef}
          type="text"
          id={id || name}
          name={name}
          value={displayValue}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
            transition-all duration-200 text-gray-900 font-medium cursor-pointer
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />

        {/* Calendar Icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <CalendarIcon 
            className={`h-5 w-5 ${disabled ? 'text-gray-400' : 'text-gray-500 hover:text-blue-600'} cursor-pointer`}
            onClick={handleInputClick}
          />
          {displayValue && !disabled && (
            <button
              type="button"
              onClick={clearDate}
              className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear date"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Hidden Date Input for Calendar Popup */}
        {isOpen && (
          <input
            type="date"
            value={formatDateForInput(value)}
            onChange={handleDateChange}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 10
            }}
            onBlur={() => setIsOpen(false)}
            autoFocus
          />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 font-medium">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {!error && (
        <p className="mt-1 text-xs text-gray-600">
          Click to open calendar or type in DD/MM/YYYY format
        </p>
      )}
    </div>
  );
};

export default DatePicker;
