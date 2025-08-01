import React, { createContext, useContext } from "react";
import ConfirmationModal from "./ConfirmationModal";
import useConfirmation from "../../hooks/useConfirmation";

const ConfirmationContext = createContext();

export const useConfirmationContext = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmationContext must be used within a ConfirmationProvider");
  }
  return context;
};

const ConfirmationProvider = ({ children }) => {
  const confirmation = useConfirmation();

  return (
    <ConfirmationContext.Provider value={confirmation}>
      {children}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={confirmation.hideConfirmation}
        onConfirm={confirmation.handleConfirm}
        title={confirmation.confirmationState.title}
        message={confirmation.confirmationState.message}
        type={confirmation.confirmationState.type}
        action={confirmation.confirmationState.action}
        confirmText={confirmation.confirmationState.confirmText}
        cancelText={confirmation.confirmationState.cancelText}
        details={confirmation.confirmationState.details}
        isLoading={confirmation.isLoading}
      />
    </ConfirmationContext.Provider>
  );
};

export default ConfirmationProvider;
