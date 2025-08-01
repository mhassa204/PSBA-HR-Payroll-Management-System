/**
 * Reusable Form Section Component
 * 
 * A container component for grouping related form fields with
 * consistent styling and optional collapsible functionality.
 * 
 * @author PSBA HR Portal Team
 * @version 1.0.0
 */

import { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FormSection Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Section title
 * @param {string} props.description - Section description
 * @param {React.ReactNode} props.children - Form fields
 * @param {boolean} props.collapsible - Whether section can be collapsed
 * @param {boolean} props.defaultExpanded - Default expanded state
 * @param {string} props.icon - FontAwesome icon class
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.required - Whether section has required fields
 * @param {number} props.completedFields - Number of completed fields
 * @param {number} props.totalFields - Total number of fields
 */
const FormSection = ({
  title,
  description = "",
  children,
  collapsible = false,
  defaultExpanded = true,
  icon = "",
  className = "",
  required = false,
  completedFields = 0,
  totalFields = 0,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  const completionPercentage = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
  const isComplete = completedFields === totalFields && totalFields > 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} {...props}>
      {/* Section Header */}
      <div
        className={`p-6 border-b border-gray-200 ${collapsible ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={toggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isComplete ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                <i className={`${icon} ${isComplete ? 'text-green-600' : 'text-blue-600'}`}></i>
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                {title}
                {required && <span className="text-red-500 ml-1">*</span>}
                {isComplete && (
                  <i className="fas fa-check-circle text-green-500 ml-2" title="Section completed"></i>
                )}
              </h3>
              
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
              
              {/* Progress indicator */}
              {totalFields > 0 && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isComplete ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {completedFields}/{totalFields}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {collapsible && (
            <div className="flex items-center space-x-2">
              <motion.i
                className="fas fa-chevron-down text-gray-400"
                animate={{ rotate: isExpanded ? 0 : -90 }}
                transition={{ duration: 0.2 }}
              ></motion.i>
            </div>
          )}
        </div>
      </div>

      {/* Section Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-6">
              {typeof children === "function" ? children({ isExpanded }) : children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

FormSection.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
  collapsible: PropTypes.bool,
  defaultExpanded: PropTypes.bool,
  icon: PropTypes.string,
  className: PropTypes.string,
  required: PropTypes.bool,
  completedFields: PropTypes.number,
  totalFields: PropTypes.number
};

export default FormSection;
