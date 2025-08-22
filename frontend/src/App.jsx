import EditEmployee from "./features/employees/pages/EditEmployee";
import { Routes, Route } from "react-router-dom";
import "./styles/globals.css";
import { useEffect } from "react";
import { useAuthStore } from "./features/auth/authStore";
import { emergencyScrollRestore } from "./utils/scrollUtils";
import PrivateRoute from "./features/auth/PrivateRoute";
import Login from "./features/auth/Login";
import EmployeeTable from "./features/employees/components/EmployeeTable";
import LeftSidebarLayout from "./components/layout/LeftSidebarLayout";
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
import { 
  SettingsDashboard, 
  DepartmentManagement, 
  DesignationManagement,
  RoleTagManagement,
  ScaleGradeManagement,
  RoleManagement
} from "./features/settings";
import { UserManagement } from "./features/users";
function App() {
  const fetchSession = useAuthStore((s) => s.fetchSession);
  // Emergency scroll restore keyboard shortcut (Ctrl+Shift+S)
  useEffect(() => {
    fetchSession();
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        console.log("🚨 Emergency scroll restore triggered by user");
        emergencyScrollRestore();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fetchSession]);

  return (
    <ColorThemeProvider defaultTheme="default">
      <ToastProvider>
        <ConfirmationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/unauthorized"
              element={<div>Unauthorized Access</div>}
            />

            {/* Protected Routes with Left Sidebar Layout */}
            <Route
              path="/"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <div className="text-center py-20">
                      <h1 className="text-4xl font-bold text-slate-800 mb-4">Welcome to PSBA HR Portal</h1>
                      <p className="text-xl text-slate-600">Select an option from the sidebar to get started</p>
                    </div>
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <div className="text-center py-20">
                      <h1 className="text-4xl font-bold text-slate-800 mb-4">Dashboard</h1>
                      <p className="text-xl text-slate-600">Overview and analytics coming soon</p>
                    </div>
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/employees"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <EmployeeTable />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="employees/view/:id"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <EnhancedUserProfile />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="employees/:id/edit"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <EditEmployee />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />

            <Route 
              path="/employees/create" 
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <CreateEmployeeForm />
                  </LeftSidebarLayout>
                </PrivateRoute>
              } 
            />
            <Route
              path="/employees/:employeeId/employment"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <CleanEmploymentHistory />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />



            {/* Reports Routes */}
            <Route
              path="/reports"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <div className="text-center py-20">
                      <h1 className="text-4xl font-bold text-slate-800 mb-4">Reports & Analytics</h1>
                      <p className="text-xl text-slate-600">Analytics and reporting dashboard coming soon</p>
                    </div>
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            
            <Route 
              path="/audit-logs" 
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <AuditLogsDashboard />
                  </LeftSidebarLayout>
                </PrivateRoute>
              } 
            />
            
            {/* Settings Routes */}
            <Route
              path="/settings"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <SettingsDashboard />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/departments"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <DepartmentManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/designations"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <DesignationManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/role-tags"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <RoleTagManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/scale-grades"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <ScaleGradeManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/roles"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <RoleManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            
            {/* Users Routes */}
            <Route
              path="/users"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <UserManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/users/create"
              element={
                <PrivateRoute roles={["super_admin", "hr_admin"]}>
                  <LeftSidebarLayout>
                    <UserManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </ConfirmationProvider>
      </ToastProvider>
    </ColorThemeProvider>
  );
}

export default App;
