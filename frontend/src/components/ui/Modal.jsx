import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = "md", 
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = ""
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-full mx-4"
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: -50
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -50,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={closeOnBackdropClick ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`
              relative w-full ${sizeClasses[size]} max-h-[90vh] 
              bg-white rounded-lg shadow-2xl overflow-hidden
              ${className}
            `}
            style={{
              backgroundColor: "var(--color-background-primary)",
              borderColor: "var(--color-border-light)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div 
                className="flex items-center justify-between p-6 border-b"
                style={{ borderColor: "var(--color-border-light)" }}
              >
                {title && (
                  <h2 
                    className="text-xl font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {title}
                  </h2>
                )}
                
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                    style={{ 
                      color: "var(--color-text-secondary)",
                      backgroundColor: "transparent"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "var(--color-background-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <i className="fas fa-times text-lg"></i>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Specialized modal components
export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "default" // default, danger, warning, success
}) => {
  const typeStyles = {
    default: {
      confirmClass: "btn btn-primary",
      iconClass: "fas fa-question-circle text-blue-500",
    },
    danger: {
      confirmClass: "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors",
      iconClass: "fas fa-exclamation-triangle text-red-500",
    },
    warning: {
      confirmClass: "bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors",
      iconClass: "fas fa-exclamation-triangle text-yellow-500",
    },
    success: {
      confirmClass: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors",
      iconClass: "fas fa-check-circle text-green-500",
    }
  };

  const styles = typeStyles[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <i className={`${styles.iconClass} text-2xl mt-1`}></i>
          <div className="flex-1">
            <p 
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={styles.confirmClass}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Loading modal
export const LoadingModal = ({ isOpen, message = "Loading..." }) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {}} 
      showCloseButton={false}
      closeOnBackdropClick={false}
      size="sm"
    >
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p style={{ color: "var(--color-text-secondary)" }}>{message}</p>
      </div>
    </Modal>
  );
};

export default Modal;
