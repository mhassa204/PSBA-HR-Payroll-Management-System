import React, { useMemo } from "react";

const PHONE_REGEX = /^\d{4}-\d{7}$/;

function formatToPattern(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  const first = digits.slice(0, 4);
  const second = digits.slice(4, 11);
  return second.length ? `${first}-${second}` : first;
}

export default function PhoneInput({
  value,
  onChange,
  name = "mobile_number",
  label = "Mobile Number",
  required = false,
  placeholder = "xxxx-xxxxxxx",
  error,
  showValidation = true,
  className = "",
}) {
  const formatted = useMemo(() => formatToPattern(value), [value]);
  const isValid = PHONE_REGEX.test(formatted);

  const handleChange = (e) => {
    const raw = e.target.value;
    const next = formatToPattern(raw);
    onChange({ target: { name, value: next } });
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="text"
        name={name}
        value={formatted}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none ${
          showValidation
            ? isValid
              ? "border-green-500 focus:ring-2 focus:ring-green-500"
              : "border-gray-300 focus:ring-2 focus:ring-blue-500"
            : "border-gray-300 focus:ring-2 focus:ring-blue-500"
        } ${className}`}
        maxLength={12}
      />
      {error && !isValid && (
        <p className="text-red-600 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
