import React, { createContext, useContext, useEffect } from "react";
import Toast from "./Toast";
import useToast from "../../hooks/useToast";
import { toastBus } from "../../utils/toastBus";

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

  useEffect(() => {
    const off = toastBus.on(({ type = 'info', message }) => {
      if (!message) return;
      if (type === 'error') toast.showError(message);
      else if (type === 'success') toast.showSuccess(message);
      else if (type === 'warning') toast.showWarning(message);
      else toast.showInfo(message);
    });
    return () => off();
  }, [toast]);

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
          // Pass duration so the component timer/progress bar can reflect and be cancelled on close
          duration={toastItem.duration || 4000}
          position={toastItem.position}
          onClose={() => toast.removeToast(toastItem.id)}
        />
      ))}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
