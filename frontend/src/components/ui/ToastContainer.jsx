import React, { createContext, useContext } from "react";
import Toast from "./Toast";
import useToast from "../../hooks/useToast";

const ToastContext = createContext();

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
};

const ToastProvider = ({ children }) => {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      
      {/* Render all toasts */}
      {toast.toasts.map((toastItem) => (
        <Toast
          key={toastItem.id}
          isVisible={true}
          message={toastItem.message}
          type={toastItem.type}
          duration={0} // Duration is handled by the hook
          position={toastItem.position}
          onClose={() => toast.removeToast(toastItem.id)}
        />
      ))}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
