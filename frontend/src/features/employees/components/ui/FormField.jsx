/**
 * Reusable Form Field Component
 * 
 * A flexible form field component that supports various input types
 * and provides consistent styling and validation display.
 * 
 * @author PSBA HR Portal Team
 * @version 1.0.0
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";

/**
 * FormField Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Field label
 * @param {string} props.name - Field name
 * @param {string} props.type - Input type (text, email, tel, date, select, textarea)
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.error - Error message
 * @param {Array} props.options - Options for select fields
 * @param {boolean} props.disabled - Whether field is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 * @param {number} props.rows - Rows for textarea
 * @param {string} props.helpText - Help text below field
 * @param {string} props.icon - FontAwesome icon class
 */
const FormField = forwardRef(({
  label,
  name,
  type = "text",
  placeholder = "",
  required = false,
  error = "",
  options = [],
  disabled = false,
  className = "",
  style = {},
  rows = 3,
  helpText = "",
  icon = "",
  ...props
}, ref) => {
  const baseInputClasses = `
    w-full px-4 py-3 border rounded-lg transition-all duration-200
    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}
    ${className}
  `.trim();

  const renderInput = () => {
    switch (type) {
      case "select":
        return (
          <select
            ref={ref}
            name={name}
            disabled={disabled}
            className={baseInputClasses}
            style={style}
            {...props}
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value} title={option.description}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea
            ref={ref}
            name={name}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
            style={style}
            {...props}
          />
        );

      case "checkbox":
        return (
          <div className="flex items-center">
            <input
              ref={ref}
              type="checkbox"
              name={name}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              {...props}
            />
            <label htmlFor={name} className="ml-2 text-sm text-gray-700">
              {label}
            </label>
          </div>
        );

      default:
        return (
          <div className="relative">
            {icon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className={`${icon} text-gray-400`}></i>
              </div>
            )}
            <input
              ref={ref}
              type={type}
              name={name}
              placeholder={placeholder}
              disabled={disabled}
              className={`${baseInputClasses} ${icon ? 'pl-10' : ''}`}
              style={style}
              {...props}
            />
          </div>
        );
    }
  };

  if (type === "checkbox") {
    return (
      <div className="space-y-1">
        {renderInput()}
        {error && (
          <p className="text-red-600 text-sm flex items-center">
            <i className="fas fa-exclamation-circle mr-1"></i>
            {error}
          </p>
        )}
        {helpText && !error && (
          <p className="text-gray-500 text-sm">{helpText}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={name} className="block text-sm font-semibold text-gray-700">
          {icon && <i className={`${icon} mr-2`}></i>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {renderInput()}
      
      {error && (
        <p className="text-red-600 text-sm flex items-center">
          <i className="fas fa-exclamation-circle mr-1"></i>
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p className="text-gray-500 text-sm">{helpText}</p>
      )}
    </div>
  );
});

FormField.displayName = "FormField";

FormField.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  type: PropTypes.oneOf([
    "text", "email", "tel", "password", "number", "date", "datetime-local",
    "select", "textarea", "checkbox", "radio", "file", "url", "search"
  ]),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string
  })),
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  rows: PropTypes.number,
  helpText: PropTypes.string,
  icon: PropTypes.string
};

export default FormField;
