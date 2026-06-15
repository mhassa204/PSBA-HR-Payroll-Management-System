import React, { useRef, useEffect, useState, useCallback } from "react";
import { CalendarIcon } from "@heroicons/react/24/outline";

/**
 * SmartDateInput — segmented DD / MM / YYYY date field with AUTO-ADVANCE.
 *
 * Requirement #3: typing the day auto-jumps to month, then to year. Backspace on
 * an empty segment jumps back. A small calendar button opens the native picker.
 *
 * - value: ISO string "YYYY-MM-DD" (or "" / null)
 * - onChange(isoString): called with "YYYY-MM-DD" when the date is complete, or
 *   "" when cleared. Compatible with react-hook-form Controller and plain usage.
 */
const pad = (s, n) => String(s).padStart(n, "0");

function isoToParts(iso) {
  if (!iso || typeof iso !== "string") return { d: "", m: "", y: "" };
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { d: "", m: "", y: "" };
  return { y: m[1], m: m[2], d: m[3] };
}

function partsToIso({ d, m, y }) {
  if (d && m && y && y.length === 4) {
    const dd = Math.min(31, Math.max(1, parseInt(d, 10) || 0));
    const mm = Math.min(12, Math.max(1, parseInt(m, 10) || 0));
    return `${pad(y, 4)}-${pad(mm, 2)}-${pad(dd, 2)}`;
  }
  return "";
}

const SmartDateInput = ({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  error,
  name,
  id,
  min,
  max,
  className = "",
  helperText,
}) => {
  const [parts, setParts] = useState(() => isoToParts(value));
  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const nativeRef = useRef(null);

  // Sync when the external value changes (e.g. form reset / edit prefill)
  useEffect(() => {
    setParts(isoToParts(value));
  }, [value]);

  const emit = useCallback(
    (next) => {
      setParts(next);
      const iso = partsToIso(next);
      // Emit complete date, or "" when fully cleared
      if (iso) onChange?.(iso);
      else if (!next.d && !next.m && !next.y) onChange?.("");
    },
    [onChange]
  );

  const handleSegment = (seg, raw, nextRef, maxLen, maxVal) => {
    const digits = raw.replace(/\D/g, "").slice(0, maxLen);
    const next = { ...parts, [seg]: digits };
    emit(next);
    // Auto-advance: full length, OR a first digit that can't start a 2-digit value
    const num = parseInt(digits, 10);
    const cantExtend = digits.length === 1 && num * 10 > maxVal;
    if ((digits.length >= maxLen || cantExtend) && nextRef?.current) {
      nextRef.current.focus();
      nextRef.current.select?.();
    }
  };

  const handleKeyDown = (seg, prevRef) => (e) => {
    if (e.key === "Backspace" && !parts[seg] && prevRef?.current) {
      prevRef.current.focus();
    }
  };

  const segClass =
    "text-center outline-none bg-transparent text-gray-900 font-medium tabular-nums placeholder-gray-400";

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id || name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div
        className={`flex items-center w-full px-3 py-2 border rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
          error ? "border-red-400" : "border-gray-300"
        } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
      >
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          aria-label="Day"
          placeholder="DD"
          disabled={disabled}
          value={parts.d}
          onChange={(e) => handleSegment("d", e.target.value, monthRef, 2, 31)}
          onKeyDown={handleKeyDown("d", null)}
          onFocus={(e) => e.target.select()}
          className={`${segClass} w-7`}
        />
        <span className="text-gray-400 select-none">/</span>
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          aria-label="Month"
          placeholder="MM"
          disabled={disabled}
          value={parts.m}
          onChange={(e) => handleSegment("m", e.target.value, yearRef, 2, 12)}
          onKeyDown={handleKeyDown("m", dayRef)}
          onFocus={(e) => e.target.select()}
          className={`${segClass} w-7`}
        />
        <span className="text-gray-400 select-none">/</span>
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          aria-label="Year"
          placeholder="YYYY"
          disabled={disabled}
          value={parts.y}
          onChange={(e) => handleSegment("y", e.target.value, null, 4, 9999)}
          onKeyDown={handleKeyDown("y", monthRef)}
          onFocus={(e) => e.target.select()}
          className={`${segClass} w-12`}
        />
        <div className="ml-auto flex items-center gap-1 pl-2">
          {(parts.d || parts.m || parts.y) && !disabled && (
            <button
              type="button"
              title="Clear"
              onClick={() => emit({ d: "", m: "", y: "" })}
              className="text-gray-400 hover:text-red-500"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            type="button"
            title="Open calendar"
            disabled={disabled}
            onClick={() => nativeRef.current?.showPicker?.() || nativeRef.current?.focus()}
            className="relative text-gray-500 hover:text-blue-600"
          >
            <CalendarIcon className="h-5 w-5" />
            <input
              ref={nativeRef}
              type="date"
              tabIndex={-1}
              min={min}
              max={max}
              value={partsToIso(parts) || ""}
              onChange={(e) => emit(isoToParts(e.target.value))}
              className="absolute inset-0 opacity-0 w-0 h-0"
            />
          </button>
        </div>
      </div>
      {error ? (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default SmartDateInput;
