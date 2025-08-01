// src/features/auth/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "./authStore";

const PrivateRoute = ({ roles = [], children }) => {
  const user = useAuthStore((s) => s.user);
  console.log("User in PrivateRoute:", user);
console.log("Roles allowed:", roles);


  if (!user) {
    return <Navigate to="/login" />;
  }

  // If user role is not in allowed roles
  if (!roles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default PrivateRoute;
