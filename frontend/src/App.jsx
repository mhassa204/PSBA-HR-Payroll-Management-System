import EditEmployee from "./features/employees/pages/EditEmployee";
import { Routes, Route } from "react-router-dom";
import "./styles/globals.css";
import { useEffect } from "react";
import { emergencyScrollRestore } from "./utils/scrollUtils";
import PrivateRoute from "./features/auth/PrivateRoute";
import Login from "./features/auth/Login";
import EmployeeTable from "./features/employees/components/EmployeeTable";
import { Header, Footer } from "./components/HeaderFooter";
// import EmployeeList from "./features/employees/components/EmployeeList";
import EnhancedUserProfile from "./features/employees/components/EnhancedUserProfile";
// import PaginationTest from "./components/PaginationTest";
import { ColorThemeProvider } from "./components/ColorThemeProvider";
// import ColorSystemDemo from "./components/ColorSystemDemo";
import CreateEmployeeForm from "./features/employees/components/CreateEmployeeForm";
import CleanEmploymentHistory from "./features/employees/components/CleanEmploymentHistory";
import AuditLogsDashboard from "./features/audit/components/AuditLogsDashboard";
import ConfirmationProvider from "./components/ui/ConfirmationProvider";
import ToastProvider from "./components/ui/ToastContainer";
function App() {
  // Emergency scroll restore keyboard shortcut (Ctrl+Shift+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        console.log("🚨 Emergency scroll restore triggered by user");
        emergencyScrollRestore();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ColorThemeProvider defaultTheme="default">
      <ToastProvider>
        <ConfirmationProvider>
          <Header />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/unauthorized"
              element={<div>Unauthorized Access</div>}
            />

            <Route
              path="/employees"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <EmployeeTable />
                </PrivateRoute>
              }
            />
            <Route
              path="employees/view/:id"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <EnhancedUserProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="employees/:id/edit"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <EditEmployee />
                </PrivateRoute>
              }
            />

            <Route path="/employees/create" element={<CreateEmployeeForm />} />
            <Route
              path="/employees/:employeeId/employment"
              element={<CleanEmploymentHistory />}
            />
            <Route path="/audit-logs" element={<AuditLogsDashboard />} />
          </Routes>
          <Footer />
        </ConfirmationProvider>
      </ToastProvider>
    </ColorThemeProvider>
  );
}

export default App;
