import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Trash2,
  Edit,
  Save,
} from "lucide-react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "warning", // warning, danger, success, info
  action = "confirm", // confirm, delete, update, save
  confirmText,
  cancelText = "Cancel",
  isLoading = false,
  showIcon = true,
  details = null,
}) => {
  // Icon mapping based on type and action
  const getIcon = () => {
    if (action === "delete") return Trash2;
    if (action === "update" || action === "save") return Edit;

    switch (type) {
      case "danger":
        return XCircle;
      case "success":
        return CheckCircle;
      case "info":
        return Info;
      default:
        return AlertTriangle;
    }
  };

  // Color schemes based on type
  const getColorScheme = () => {
    switch (type) {
      case "danger":
        return {
          iconColor: "text-red-600",
          bgColor: "bg-red-50",
          buttonColor: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
          borderColor: "border-red-200",
        };
      case "success":
        return {
          iconColor: "text-green-600",
          bgColor: "bg-green-50",
          buttonColor: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
          borderColor: "border-green-200",
        };
      case "info":
        return {
          iconColor: "text-blue-600",
          bgColor: "bg-blue-50",
          buttonColor: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
          borderColor: "border-blue-200",
        };
      default: // warning
        return {
          iconColor: "text-amber-600",
          bgColor: "bg-amber-50",
          buttonColor: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
          borderColor: "border-amber-200",
        };
    }
  };

  // Default confirm text based on action
  const getDefaultConfirmText = () => {
    switch (action) {
      case "delete":
        return "Delete";
      case "update":
        return "Update";
      case "save":
        return "Save Changes";
      default:
        return "Confirm";
    }
  };

  const Icon = getIcon();
  const colors = getColorScheme();
  const finalConfirmText = confirmText || getDefaultConfirmText();

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur effect */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white/20 backdrop-blur-md z-50"
            onClick={handleCancel}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 max-w-md w-full mx-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={`px-6 py-4 ${colors.bgColor}/80 backdrop-blur-sm ${colors.borderColor} border-b border-white/30`}
              >
                <div className="flex items-center space-x-3">
                  {showIcon && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className={`p-2 rounded-full ${colors.bgColor}/60 backdrop-blur-sm`}
                    >
                      <Icon className={`w-6 h-6 ${colors.iconColor}`} />
                    </motion.div>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 bg-white/50 backdrop-blur-sm">
                <p className="text-gray-700 mb-4">{message}</p>

                {details && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="bg-white/60 backdrop-blur-sm rounded-lg p-3 mb-4 border border-white/40"
                  >
                    <div className="text-sm text-gray-600">
                      {typeof details === "string" ? <p>{details}</p> : details}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-white/40 backdrop-blur-sm border-t border-white/30 flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/80 backdrop-blur-sm border border-white/50 rounded-lg hover:bg-white/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {cancelText}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg backdrop-blur-sm border border-white/30 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${colors.buttonColor}`}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    finalConfirmText
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
