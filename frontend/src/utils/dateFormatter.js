/**
 * Date formatting utilities for consistent DD/MM/YYYY format across the application
 */

/**
 * Format a date string or Date object to DD/MM/YYYY format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date in DD/MM/YYYY format or "—" if invalid
 */
export const formatDate = (date) => {
  if (!date) return "—";

  try {
    let dateObj;

    if (typeof date === "string") {
      // Handle ISO datetime strings by extracting just the date part
      let dateStr = date;
      if (date.includes("T")) {
        dateStr = date.split("T")[0];
      }
      dateObj = new Date(dateStr);
    } else {
      dateObj = date;
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) return "—";

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn("Date formatting error:", error);
    return "—";
  }
};

/**
 * Format a date string to DD/MM/YYYY format (for ISO date strings)
 * @param {string} dateString - ISO date string (YYYY-MM-DD or ISO datetime)
 * @returns {string} Formatted date in DD/MM/YYYY format or "—" if invalid
 */
export const formatDateString = (dateString) => {
  if (!dateString) return "—";

  try {
    // Handle ISO date strings (YYYY-MM-DD or ISO datetime with timezone)
    if (typeof dateString === "string") {
      // Extract just the date part from ISO datetime strings
      let datePart = dateString;

      // Handle ISO datetime strings like "2025-10-06T00:00:00.000Z"
      if (dateString.includes("T")) {
        datePart = dateString.split("T")[0];
      }

      // Handle date strings with timezone info
      if (datePart.includes("-")) {
        const [year, month, day] = datePart.split("-");
        if (year && month && day) {
          // Clean up any extra characters
          const cleanYear = year.replace(/[^0-9]/g, "");
          const cleanMonth = month.replace(/[^0-9]/g, "");
          const cleanDay = day.replace(/[^0-9]/g, "");

          if (cleanYear && cleanMonth && cleanDay) {
            return `${cleanDay}/${cleanMonth}/${cleanYear}`;
          }
        }
      }
    }

    // Fallback to general date formatting
    return formatDate(dateString);
  } catch (error) {
    console.warn("Date string formatting error:", error);
    return "—";
  }
};

/**
 * Format time to 12-hour format (1:10:03 PM)
 * @param {string} time - Time string (HH:MM or HH:MM:SS)
 * @returns {string} Formatted time in 12-hour format or "—" if invalid
 */
export const formatTime = (time) => {
  if (!time) return "—";

  try {
    // Handle different time formats
    let timeStr = String(time).trim();

    // If it's already in 12-hour format, return as is
    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      return timeStr;
    }

    // Parse HH:MM or HH:MM:SS format
    const timeParts = timeStr.split(":");
    if (timeParts.length < 2) return "—";

    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return "—";
    }

    // Convert to 12-hour format
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    // Format with seconds if provided
    if (seconds > 0) {
      return `${displayHours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")} ${period}`;
    } else {
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
    }
  } catch (error) {
    console.warn("Time formatting error:", error);
    return "—";
  }
};

/**
 * Format date and time to DD/MM/YYYY 1:10:03 PM format
 * @param {string|Date} date - Date string or Date object
 * @param {string} time - Time string (HH:MM or HH:MM:SS)
 * @returns {string} Formatted date and time or "—" if invalid
 */
export const formatDateTime = (date, time = null) => {
  const formattedDate = formatDate(date);
  if (formattedDate === "—") return "—";

  if (time) {
    const formattedTime = formatTime(time);
    if (formattedTime === "—") return formattedDate;
    return `${formattedDate} ${formattedTime}`;
  }

  return formattedDate;
};

/**
 * Convert DD/MM/YYYY format back to ISO date format (YYYY-MM-DD) for HTML date inputs
 * @param {string} dateString - Date string in DD/MM/YYYY format
 * @returns {string} ISO date string (YYYY-MM-DD) or original string if invalid
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return "";

  try {
    // If it's already in ISO format, return as is
    if (
      typeof dateString === "string" &&
      dateString.includes("-") &&
      !dateString.includes("/")
    ) {
      return dateString;
    }

    // Handle DD/MM/YYYY format
    if (typeof dateString === "string" && dateString.includes("/")) {
      const [day, month, year] = dateString.split("/");
      if (day && month && year) {
        const cleanDay = day.replace(/[^0-9]/g, "");
        const cleanMonth = month.replace(/[^0-9]/g, "");
        const cleanYear = year.replace(/[^0-9]/g, "");

        if (cleanDay && cleanMonth && cleanYear) {
          return `${cleanYear}-${cleanMonth.padStart(
            2,
            "0"
          )}-${cleanDay.padStart(2, "0")}`;
        }
      }
    }

    // Handle ISO datetime strings
    if (typeof dateString === "string" && dateString.includes("T")) {
      return dateString.split("T")[0];
    }

    return dateString;
  } catch (error) {
    console.warn("Date input formatting error:", error);
    return dateString;
  }
};

/**
 * Format date range (from date to date)
 * @param {string|Date} fromDate - Start date
 * @param {string|Date} toDate - End date
 * @returns {string} Formatted date range or "—" if invalid
 */
export const formatDateRange = (fromDate, toDate) => {
  const from = formatDate(fromDate);
  const to = formatDate(toDate);

  if (from === "—" && to === "—") return "—";
  if (from === "—") return `— to ${to}`;
  if (to === "—") return `${from} to —`;

  return `${from} to ${to}`;
};
