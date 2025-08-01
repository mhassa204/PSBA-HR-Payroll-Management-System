import React from "react";
import PropTypes from "prop-types";

/**
 * Reusable form field component with consistent styling and validation
 * Supports text, email, tel, date, select, and textarea inputs
 */
const FormField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  placeholder,
  options = [],
  rows = 3,
  className = "",
  helpText,
  ...props
}) => {
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-lg transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${
      error
        ? "border-red-500 bg-red-50 focus:ring-red-500"
        : "border-gray-300 hover:border-gray-400"
    }
    ${className}
  `;

  const renderInput = () => {
    switch (type) {
      case "select":
        // Debug logging for designation dropdown
        if (
          name === "designation_id" &&
          process.env.NODE_ENV === "development"
        ) {
          console.log(`🔍 FormField ${name} options:`, options);
          console.log(`🔍 FormField ${name} current value:`, value);
        }

        return (
          <select
            id={name}
            name={name}
            value={value || ""}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            className={baseInputClasses}
            {...props}
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((option, index) => {
              const optionValue = option.value || option.id || "";
              const optionLabel =
                option.label ||
                option.name ||
                option.title ||
                optionValue ||
                "Unknown";

              return (
                <option
                  key={option.id || option.value || index}
                  value={optionValue}
                >
                  {optionLabel}
                </option>
              );
            })}
          </select>
        );

      case "textarea":
        return (
          <textarea
            id={name}
            name={name}
            value={value || ""}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className={baseInputClasses}
            {...props}
          />
        );

      case "checkbox":
        return (
          <div className="flex items-center">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={value || false}
              onChange={onChange}
              onBlur={onBlur}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              {...props}
            />
            <label htmlFor={name} className="ml-2 text-sm text-gray-700">
              {label}
            </label>
          </div>
        );

      default:
        return (
          <input
            id={name}
            name={name}
            type={type}
            value={value || ""}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            className={baseInputClasses}
            {...props}
          />
        );
    }
  };

  if (type === "checkbox") {
    return (
      <div className="mb-4">
        {renderInput()}
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {helpText && <p className="mt-1 text-sm text-gray-500">{helpText}</p>}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {renderInput()}

      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.oneOf([
    "text",
    "email",
    "tel",
    "password",
    "number",
    "date",
    "select",
    "textarea",
    "checkbox",
  ]),
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool,
  ]),
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
    })
  ),
  rows: PropTypes.number,
  className: PropTypes.string,
  helpText: PropTypes.string,
};

export default FormField;
