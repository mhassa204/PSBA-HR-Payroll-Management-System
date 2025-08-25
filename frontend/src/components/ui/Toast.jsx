import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useEffect } from "react";

const Toast = ({
  isVisible,
  message,
  type = "success", // success, error, warning, info
  duration = 4000,
  onClose,
  position = "top-right", // top-right, top-left, bottom-right, bottom-left
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return CheckCircle;
      case "error":
        return XCircle;
      case "warning":
        return AlertTriangle;
      case "info":
        return Info;
      default:
        return CheckCircle;
    }
  };

  const getColorScheme = () => {
    switch (type) {
      case "success":
        return {
          bgStyle: {
            backgroundColor: "#f0fdf4",
            borderColor: "#22c55e",
            borderWidth: "1px",
          },
          iconStyle: { color: "#16a34a" },
          textStyle: { color: "#15803d" },
          buttonStyle: { color: "#22c55e" },
          buttonHoverStyle: { color: "#16a34a" },
        };
      case "error":
        return {
          bgStyle: {
            backgroundColor: "#fef2f2",
            borderColor: "#ef4444",
            borderWidth: "1px",
          },
          iconStyle: { color: "#dc2626" },
          textStyle: { color: "#b91c1c" },
          buttonStyle: { color: "#ef4444" },
          buttonHoverStyle: { color: "#dc2626" },
        };
      case "warning":
        return {
          bgStyle: {
            backgroundColor: "#fffbeb",
            borderColor: "#f59e0b",
            borderWidth: "1px",
          },
          iconStyle: { color: "#d97706" },
          textStyle: { color: "#b45309" },
          buttonStyle: { color: "#f59e0b" },
          buttonHoverStyle: { color: "#d97706" },
        };
      case "info":
        return {
          bgStyle: {
            backgroundColor: "#f0f9ff",
            borderColor: "#3b82f6",
            borderWidth: "1px",
          },
          iconStyle: { color: "#2563eb" },
          textStyle: { color: "#1d4ed8" },
          buttonStyle: { color: "#3b82f6" },
          buttonHoverStyle: { color: "#2563eb" },
        };
      default:
        return {
          bgStyle: {
            backgroundColor: "#f0f9ff",
            borderColor: "#3b82f6",
            borderWidth: "1px",
          },
          iconStyle: { color: "#2563eb" },
          textStyle: { color: "#1d4ed8" },
          buttonStyle: { color: "#3b82f6" },
          buttonHoverStyle: { color: "#2563eb" },
        };
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      default:
        return "top-4 right-4";
    }
  };

  const getAnimationDirection = () => {
    if (position.includes("right")) {
      return { x: 100 };
    } else if (position.includes("left")) {
      return { x: -100 };
    }
    return { y: -100 };
  };

  const Icon = getIcon();
  const colors = getColorScheme();
  const positionClasses = getPositionClasses();
  const animationDirection = getAnimationDirection();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, ...animationDirection }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, ...animationDirection }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`fixed ${positionClasses} z-50 max-w-sm w-full`}
        >
          <div
            className="border rounded-lg shadow-lg p-4 backdrop-blur-sm"
            style={{
              ...colors.bgStyle,
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
            }}
          >
            <div className="flex items-start space-x-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <Icon 
                  className="w-5 h-5 flex-shrink-0 mt-0.5" 
                  style={colors.iconStyle}
                />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-relaxed" style={colors.textStyle}>
                  {message}
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="transition-colors duration-200 flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10"
                style={colors.buttonStyle}
                onMouseEnter={(e) => Object.assign(e.target.style, colors.buttonHoverStyle)}
                onMouseLeave={(e) => Object.assign(e.target.style, colors.buttonStyle)}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
            
            {/* Progress bar for duration */}
            {duration > 0 && (
              <motion.div
                className="mt-3 h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: colors.iconStyle.color }}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: duration / 1000, ease: "linear" }}
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
