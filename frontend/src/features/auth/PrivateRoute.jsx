// src/features/auth/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "./authStore";
import { toastBus } from "../../utils/toastBus";
import { useEffect, useMemo } from "react";

const PrivateRoute = ({ roles = [], permissions = [], children }) => {
  const user = useAuthStore((s) => s.user);
  const isChecking = useAuthStore((s) => s.isChecking);
  const can = useAuthStore((s) => s.can);
  const fetchSession = useAuthStore((s) => s.fetchSession);

  // If user is undefined (not checked yet), trigger session fetch
  useEffect(() => {
    if (user === undefined && !isChecking) {
      fetchSession();
    }
  }, [user, isChecking, fetchSession]);

  // Compute violation deterministically each render; do not return early before hooks
  const violation = useMemo(() => {
    if (isChecking || user === undefined) return null;
    if (!user) return { type: "unauthenticated" };
    if (roles.length > 0 && !roles.includes(user.role?.name)) {
      return { type: "forbidden" };
    }
    if (permissions.length > 0) {
      const ok = permissions.some((p) => can(p));
      if (!ok) return { type: "forbidden" };
    }
    return null;
  }, [isChecking, user, roles, permissions, can]);

  useEffect(() => {
    if (!violation || violation.type !== "forbidden") return;
    // Emit a single deduped toast. axios interceptors may also emit a 403 toast; the toastBus
    // will suppress duplicates within a short window.
    toastBus.emit({ type: "error", message: "Forbidden. You do not have permission." });
  }, [violation]);

  if (isChecking || user === undefined) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (violation) {
    return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute;
