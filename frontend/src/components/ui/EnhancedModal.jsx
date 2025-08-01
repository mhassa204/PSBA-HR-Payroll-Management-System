import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { preventBodyScroll, forceRestoreScroll } from "../../utils/scrollUtils";

const EnhancedModal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = "",
  maxHeight = "90vh",
}) => {
  const modalRef = useRef(null);

  // Handle escape key and focus management
  useEffect(() => {
    if (!isOpen) {
      // Ensure body scroll is restored when modal is closed
      preventBodyScroll(false);
      return;
    }

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Prevent body scroll when modal is open
    preventBodyScroll(true);

    // Focus management
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0];
    const lastElement = focusableElements?.[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleTabKey);
      // Always restore scroll when cleaning up
      preventBodyScroll(false);
    };
  }, [isOpen, onClose]);

  // Additional cleanup effect to ensure scroll is restored on component unmount
  useEffect(() => {
    return () => {
      // Force restore scroll on component unmount
      forceRestoreScroll();
    };
  }, []);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-[95vw]",
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: -20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 400,
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -20,
      transition: {
        duration: 0.2,
      },
    },
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={closeOnBackdropClick ? onClose : undefined}
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`
            relative w-full ${sizeClasses[size]} 
            bg-white rounded-xl shadow-2xl overflow-hidden
            ${className}
          `}
          style={{
            backgroundColor: "var(--color-background-primary)",
            borderColor: "var(--color-border-light)",
            maxHeight: maxHeight,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div
              className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50"
              style={{ borderColor: "var(--color-border-light)" }}
            >
              {title && (
                <div>
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {title}
                  </h2>
                </div>
              )}

              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-all duration-200 hover:bg-white/80 hover:scale-105"
                  style={{
                    color: "var(--color-text-secondary)",
                  }}
                  aria-label="Close modal"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div
            className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            style={{
              maxHeight: `calc(${maxHeight} - 80px)`,
              scrollBehavior: "smooth",
              overflowX: "hidden", // Prevent horizontal scroll
            }}
          >
            <div className="min-h-0"> {/* Ensure proper scrolling container */}
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

// Specialized modals
export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "default",
}) => {
  const typeConfig = {
    default: { icon: "fas fa-question-circle", color: "blue" },
    danger: { icon: "fas fa-exclamation-triangle", color: "red" },
    warning: { icon: "fas fa-exclamation-triangle", color: "yellow" },
    success: { icon: "fas fa-check-circle", color: "green" },
  };

  const config = typeConfig[type];

  return (
    <EnhancedModal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <i
            className={`${config.icon} text-2xl text-${config.color}-500 mt-1`}
          ></i>
          <div className="flex-1">
            <p className="text-gray-700">{message}</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary">
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`btn btn-${
              config.color === "red" ? "danger" : "primary"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default EnhancedModal;
