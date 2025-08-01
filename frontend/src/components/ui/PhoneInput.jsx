import React, { useState, useEffect } from 'react';
import { formatPhoneNumber, isValidPhoneNumber } from '../../utils/formatters';

/**
 * Phone Number Input Component with automatic formatting
 * 
 * Features:
 * - Removes dashes and formatting automatically
 * - Validates phone number format
 * - Professional styling
 * - Real-time validation feedback
 */
const PhoneInput = ({
  value,
  onChange,
  placeholder = "03001234567",
  label = "Phone Number",
  error,
  required = false,
  disabled = false,
  className = "",
  name = "phone",
  id,
  showValidation = true,
  minLength = 10,
  maxLength = 15,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isValid, setIsValid] = useState(true);

  // Update display value when prop value changes
  useEffect(() => {
    if (value) {
      const formatted = formatPhoneNumber(value);
      setDisplayValue(formatted);
      setIsValid(isValidPhoneNumber(formatted));
    } else {
      setDisplayValue('');
      setIsValid(true);
    }
  }, [value]);

  const handleInputChange = (event) => {
    const inputValue = event.target.value;
    
    // Remove any non-digit characters
    const digitsOnly = inputValue.replace(/\D/g, '');
    
    // Limit to maxLength digits
    const limitedValue = digitsOnly.slice(0, maxLength);
    
    setDisplayValue(limitedValue);
    
    // Validate
    const valid = limitedValue.length === 0 || 
                  (limitedValue.length >= minLength && limitedValue.length <= maxLength);
    setIsValid(valid);

    // Call onChange with formatted value
    if (onChange) {
      onChange({
        target: {
          name: name,
          value: limitedValue
        }
      });
    }
  };

  const handleKeyPress = (event) => {
    // Only allow digits
    if (!/\d/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  };

  const getValidationMessage = () => {
    if (!showValidation || !displayValue) return null;
    
    if (displayValue.length < minLength) {
      return `Phone number must be at least ${minLength} digits (${displayValue.length}/${minLength})`;
    }
    
    if (displayValue.length > maxLength) {
      return `Phone number cannot exceed ${maxLength} digits`;
    }
    
    if (!isValid) {
      return "Invalid phone number format";
    }
    
    return null;
  };

  const validationMessage = getValidationMessage();

  return (
    <div className="relative">
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
        <input
          type="tel"
          id={id || name}
          name={name}
          value={displayValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`
            w-full px-4 py-3 border-2 rounded-lg 
            focus:outline-none focus:ring-2 transition-all duration-200 
            text-gray-900 font-medium
            ${disabled ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'bg-white'}
            ${error || (validationMessage && displayValue) 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : isValid && displayValue.length >= minLength
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-400'
            }
            ${className}
          `}
          {...props}
        />

        {/* Validation Icon */}
        {showValidation && displayValue && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isValid && displayValue.length >= minLength ? (
              <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : displayValue.length > 0 ? (
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : null}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 font-medium">
          {error}
        </p>
      )}

      {/* Validation Message */}
      {!error && validationMessage && (
        <p className="mt-1 text-sm text-red-600 font-medium">
          {validationMessage}
        </p>
      )}

      {/* Helper Text */}
      {!error && !validationMessage && (
        <p className="mt-1 text-xs text-gray-600">
          Enter {minLength}-{maxLength} digit phone number without dashes
        </p>
      )}

      {/* Success Message */}
      {!error && !validationMessage && isValid && displayValue.length >= minLength && (
        <p className="mt-1 text-xs text-green-600 font-medium">
          Valid phone number format
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
