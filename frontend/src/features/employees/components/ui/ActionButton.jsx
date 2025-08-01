/**
 * Reusable Action Button Component
 * 
 * A flexible button component with consistent styling, loading states,
 * and various visual variants for different actions.
 * 
 * @author PSBA HR Portal Team
 * @version 1.0.0
 */

import PropTypes from "prop-types";
import { motion } from "framer-motion";

/**
 * ActionButton Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant (primary, secondary, success, warning, danger, ghost)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.icon - FontAwesome icon class
 * @param {string} props.iconPosition - Icon position (left, right)
 * @param {string} props.className - Additional CSS classes
 * @param {function} props.onClick - Click handler
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {string} props.loadingText - Text to show when loading
 * @param {boolean} props.fullWidth - Whether button should take full width
 * @param {string} props.tooltip - Tooltip text
 */
const ActionButton = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon = "",
  iconPosition = "left",
  className = "",
  onClick,
  type = "button",
  loadingText = "Loading...",
  fullWidth = false,
  tooltip = "",
  ...props
}) => {
  // Variant styles
  const variantStyles = {
    primary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:border-gray-400 focus:ring-gray-500",
    success: "bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700 focus:ring-green-500",
    warning: "bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700 hover:border-yellow-700 focus:ring-yellow-500",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 focus:ring-red-500",
    ghost: "bg-transparent text-gray-700 border-transparent hover:bg-gray-100 focus:ring-gray-500"
  };

  // Size styles
  const sizeStyles = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg"
  };

  // Base classes
  const baseClasses = `
    inline-flex items-center justify-center
    border rounded-lg font-medium
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `.trim();

  const handleClick = (e) => {
    if (!loading && !disabled && onClick) {
      onClick(e);
    }
  };

  const renderIcon = (position) => {
    if (!icon || iconPosition !== position) return null;
    
    if (loading && position === "left") {
      return <i className="fas fa-spinner fa-spin mr-2"></i>;
    }
    
    return (
      <i className={`${icon} ${
        position === "left" ? "mr-2" : "ml-2"
      }`}></i>
    );
  };

  const buttonContent = loading ? loadingText : children;

  return (
    <motion.button
      type={type}
      className={baseClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      title={tooltip}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      {...props}
    >
      {renderIcon("left")}
      <span>{buttonContent}</span>
      {renderIcon("right")}
    </motion.button>
  );
};

ActionButton.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "success", "warning", "danger", "ghost"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.string,
  iconPosition: PropTypes.oneOf(["left", "right"]),
  className: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  loadingText: PropTypes.string,
  fullWidth: PropTypes.bool,
  tooltip: PropTypes.string
};

export default ActionButton;
