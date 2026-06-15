/**
 * Image Utilities
 *
 * Utility functions for handling image URLs and paths from the backend
 */

/**
 * Get the base URL for the backend server
 * @returns {string} Base URL without /api suffix
 */
export const getServerBaseUrl = () => {
  // Get API base URL and remove /api suffix
  const preferLocal = (() => {
    try {
      const h = window.location.hostname;
      return h === "localhost" || h === "127.0.0.1";
    } catch {
      return false;
    }
  })();
  const apiBaseUrl =
    (preferLocal ? null : import.meta.env.VITE_API_URL) ||
    (() => {
      try {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:3000/api`;
      } catch {
        return "";
      }
    })();
  return apiBaseUrl.replace("/api", "");
};

/**
 * Convert database file path to web-accessible URL
 * @param {string} filePath - File path from database (e.g., "uploads\filename.png")
 * @returns {string} Web-accessible URL
 */
export const getImageUrl = (filePath) => {
  if (!filePath) return null;

  // Normalize path separators (convert backslashes to forward slashes)
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Ensure path starts with uploads/ if it doesn't already
  const cleanPath = normalizedPath.startsWith("uploads/")
    ? normalizedPath
    : `uploads/${normalizedPath}`;

  // Construct full URL
  return `${getServerBaseUrl()}/${cleanPath}`;
};

/**
 * Get profile picture URL for an employee
 * @param {Object} employee - Employee object with profile_picture field
 * @returns {string|null} Profile picture URL or null if not available
 */
export const getProfilePictureUrl = (employee) => {
  if (!employee?.profile_picture) return null;

  // If profile_picture is already a full URL (from enhanced backend response), use it
  if (employee.profile_picture.startsWith("http")) {
    return employee.profile_picture;
  }

  // If it's a relative path, construct the full URL
  if (employee.profile_picture.startsWith("/")) {
    return `${getServerBaseUrl()}${employee.profile_picture}`;
  }

  // Otherwise, use the standard image URL function
  return getImageUrl(employee.profile_picture);
};

/**
 * Get document URL from document object
 * @param {Object} document - Document object with file_path field
 * @returns {string|null} Document URL or null if not available
 */
export const getDocumentUrl = (document) => {
  if (!document?.file_path) return null;
  return getImageUrl(document.file_path);
};

/**
 * Check if a file path represents an image
 * @param {string} filePath - File path to check
 * @returns {boolean} True if file is an image
 */
export const isImageFile = (filePath) => {
  if (!filePath) return false;

  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  const extension = filePath.toLowerCase().substring(filePath.lastIndexOf("."));

  return imageExtensions.includes(extension);
};

/**
 * Get file type icon class based on file extension
 * @param {string} filePath - File path
 * @returns {string} Font Awesome icon class
 */
export const getFileTypeIcon = (filePath) => {
  if (!filePath) return "fas fa-file";

  const extension = filePath.toLowerCase().substring(filePath.lastIndexOf("."));

  switch (extension) {
    case ".pdf":
      return "fas fa-file-pdf";
    case ".doc":
    case ".docx":
      return "fas fa-file-word";
    case ".jpg":
    case ".jpeg":
    case ".png":
    case ".gif":
    case ".bmp":
    case ".webp":
      return "fas fa-file-image";
    case ".txt":
      return "fas fa-file-alt";
    default:
      return "fas fa-file";
  }
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Create a fallback avatar URL or initials
 * @param {string} fullName - Employee full name
 * @returns {string} Initials for avatar fallback
 */
export const getAvatarFallback = (fullName) => {
  if (!fullName) return "U";

  const names = fullName.trim().split(" ");
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }

  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

/**
 * Validate if an image URL is accessible
 * @param {string} imageUrl - Image URL to validate
 * @returns {Promise<boolean>} True if image is accessible
 */
export const validateImageUrl = async (imageUrl) => {
  if (!imageUrl) return false;

  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    console.warn("Image validation failed:", error);
    return false;
  }
};

export default {
  getServerBaseUrl,
  getImageUrl,
  getProfilePictureUrl,
  getDocumentUrl,
  isImageFile,
  getFileTypeIcon,
  formatFileSize,
  getAvatarFallback,
  validateImageUrl,
};
