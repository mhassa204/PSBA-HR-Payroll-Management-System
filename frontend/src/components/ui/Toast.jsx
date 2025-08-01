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
          bg: "bg-green-50 border-green-200",
          icon: "text-green-600",
          text: "text-green-800",
          button: "text-green-600 hover:text-green-800",
        };
      case "error":
        return {
          bg: "bg-red-50 border-red-200",
          icon: "text-red-600",
          text: "text-red-800",
          button: "text-red-600 hover:text-red-800",
        };
      case "warning":
        return {
          bg: "bg-amber-50 border-amber-200",
          icon: "text-amber-600",
          text: "text-amber-800",
          button: "text-amber-600 hover:text-amber-800",
        };
      case "info":
        return {
          bg: "bg-blue-50 border-blue-200",
          icon: "text-blue-600",
          text: "text-blue-800",
          button: "text-blue-600 hover:text-blue-800",
        };
      default:
        return {
          bg: "bg-green-50 border-green-200",
          icon: "text-green-600",
          text: "text-green-800",
          button: "text-green-600 hover:text-green-800",
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
            className={`${colors.bg} border rounded-lg shadow-lg p-4 backdrop-blur-sm`}
          >
            <div className="flex items-start space-x-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${colors.text}`}>
                  {message}
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className={`${colors.button} transition-colors duration-200 flex-shrink-0`}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
            
            {/* Progress bar for duration */}
            {duration > 0 && (
              <motion.div
                className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className={`h-full ${
                    type === "success"
                      ? "bg-green-500"
                      : type === "error"
                      ? "bg-red-500"
                      : type === "warning"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
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
