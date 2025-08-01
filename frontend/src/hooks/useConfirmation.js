import { useState, useCallback } from "react";

const useConfirmation = () => {
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    action: "confirm",
    confirmText: "",
    cancelText: "Cancel",
    details: null,
    onConfirm: null,
    isLoading: false,
  });

  const showConfirmation = useCallback((config) => {
    setConfirmationState({
      isOpen: true,
      title: config.title || "Confirm Action",
      message: config.message || "Are you sure you want to proceed?",
      type: config.type || "warning",
      action: config.action || "confirm",
      confirmText: config.confirmText || "",
      cancelText: config.cancelText || "Cancel",
      details: config.details || null,
      onConfirm: config.onConfirm || (() => {}),
      isLoading: false,
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmationState(prev => ({
      ...prev,
      isOpen: false,
      isLoading: false,
    }));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (confirmationState.onConfirm) {
      setConfirmationState(prev => ({ ...prev, isLoading: true }));
      
      try {
        await confirmationState.onConfirm();
        hideConfirmation();
      } catch (error) {
        console.error("Confirmation action failed:", error);
        setConfirmationState(prev => ({ ...prev, isLoading: false }));
        // Don't hide the modal on error, let the user try again
      }
    } else {
      hideConfirmation();
    }
  }, [confirmationState.onConfirm, hideConfirmation]);

  // Preset configurations for common actions
  const confirmDelete = useCallback((config) => {
    showConfirmation({
      title: "Delete Confirmation",
      message: config.message || "This action cannot be undone.",
      type: "danger",
      action: "delete",
      confirmText: "Delete",
      details: config.details,
      onConfirm: config.onConfirm,
    });
  }, [showConfirmation]);

  const confirmUpdate = useCallback((config) => {
    showConfirmation({
      title: "Update Confirmation",
      message: config.message || "Are you sure you want to save these changes?",
      type: "warning",
      action: "update",
      confirmText: "Update",
      details: config.details,
      onConfirm: config.onConfirm,
    });
  }, [showConfirmation]);

  const confirmSave = useCallback((config) => {
    showConfirmation({
      title: "Save Changes",
      message: config.message || "Do you want to save your changes?",
      type: "info",
      action: "save",
      confirmText: "Save",
      details: config.details,
      onConfirm: config.onConfirm,
    });
  }, [showConfirmation]);

  const confirmAction = useCallback((config) => {
    showConfirmation({
      title: config.title || "Confirm Action",
      message: config.message || "Are you sure you want to proceed?",
      type: config.type || "warning",
      action: config.action || "confirm",
      confirmText: config.confirmText,
      cancelText: config.cancelText,
      details: config.details,
      onConfirm: config.onConfirm,
    });
  }, [showConfirmation]);

  return {
    // State
    confirmationState,
    isOpen: confirmationState.isOpen,
    isLoading: confirmationState.isLoading,
    
    // Actions
    showConfirmation,
    hideConfirmation,
    handleConfirm,
    
    // Preset methods
    confirmDelete,
    confirmUpdate,
    confirmSave,
    confirmAction,
  };
};

export default useConfirmation;
