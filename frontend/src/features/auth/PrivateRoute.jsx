// src/features/auth/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "./authStore";

const PrivateRoute = ({ roles = [], children }) => {
  const user = useAuthStore((s) => s.user);
  const isChecking = useAuthStore((s) => s.isChecking);

  if (isChecking || user === undefined) {
    return null; // or a loader component
  }

  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

export default PrivateRoute;
