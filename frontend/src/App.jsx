import EditEmployee from "./features/employees/pages/EditEmployee";
import { Routes, Route, useLocation } from "react-router-dom";
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
  RoleManagement,
  LocationManagement,
  DeviceManagement
} from "./features/settings";
import { UserManagement } from "./features/users";
import DatabaseSettings from "./features/settings/pages/DatabaseSettings";
import SecuritySettings from "./features/settings/pages/SecuritySettings";
import RosterList from "./features/roster/pages/RosterList";
import CreateRoster from "./features/roster/pages/CreateRoster";
import EditRoster from "./features/roster/pages/EditRoster";
import ViewRoster from "./features/roster/pages/ViewRoster";

function App() {
  const fetchSession = useAuthStore((s) => s.fetchSession);
  const location = useLocation();
  
  // Emergency scroll restore keyboard shortcut (Ctrl+Shift+S)
  useEffect(() => {
    // Only fetch session if we're not on the login page
    if (location.pathname !== '/login') {
      fetchSession();
    }
    
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        console.log("🚨 Emergency scroll restore triggered by user");
        emergencyScrollRestore();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fetchSession, location.pathname]);

  return (
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
                <PrivateRoute permissions={["employees.read","departments.read","designations.read"]}>
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
                <PrivateRoute permissions={["employees.read","reports.read"]}>
                  <LeftSidebarLayout>
                    <div className="text-center py-20">
                      <h1 className="text-4xl font-bold text-slate-800 mb-4">Dashboard</h1>
                      <p className="text-xl text-slate-600">Overview and analytics coming soon</p>
                    </div>
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />

            {/* Roster routes */}
            <Route
              path="/rosters"
              element={
                <PrivateRoute permissions={["roster.read"]}>
                  <LeftSidebarLayout>
                    <RosterList />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/rosters/create"
              element={
                <PrivateRoute permissions={["roster.create"]}>
                  <LeftSidebarLayout>
                    <CreateRoster />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/rosters/:id"
              element={
                <PrivateRoute permissions={["roster.read"]}>
                  <LeftSidebarLayout>
                    <ViewRoster />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/rosters/:id/edit"
              element={
                <PrivateRoute permissions={["roster.update"]}>
                  <LeftSidebarLayout>
                    <EditRoster />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/employees"
              element={
                <PrivateRoute permissions={["employees.read"]}>
                  <LeftSidebarLayout>
                    <EmployeeTable />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="employees/view/:id"
              element={
                <PrivateRoute permissions={["employees.read"]}>
                  <LeftSidebarLayout>
                    <EnhancedUserProfile />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="employees/:id/edit"
              element={
                <PrivateRoute permissions={["employees.update"]}>
                  <LeftSidebarLayout>
                    <EditEmployee />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />

            <Route 
              path="/employees/create" 
              element={
                <PrivateRoute permissions={["employees.create"]}>
                  <LeftSidebarLayout>
                    <CreateEmployeeForm />
                  </LeftSidebarLayout>
                </PrivateRoute>
              } 
            />
            <Route
              path="/employees/:employeeId/employment"
              element={
                <PrivateRoute permissions={["employment.read"]}>
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
                <PrivateRoute permissions={["reports.read"]}>
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
                <PrivateRoute permissions={["audit.read"]}>
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
                <PrivateRoute permissions={["departments.read","designations.read","role-tags.read","scale-grades.read"]}>
                  <LeftSidebarLayout>
                    <SettingsDashboard />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/departments"
              element={
                <PrivateRoute permissions={["departments.read"]}>
                  <LeftSidebarLayout>
                    <DepartmentManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/designations"
              element={
                <PrivateRoute permissions={["designations.read"]}>
                  <LeftSidebarLayout>
                    <DesignationManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/role-tags"
              element={
                <PrivateRoute permissions={["role-tags.read"]}>
                  <LeftSidebarLayout>
                    <RoleTagManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/scale-grades"
              element={
                <PrivateRoute permissions={["scale-grades.read"]}>
                  <LeftSidebarLayout>
                    <ScaleGradeManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/locations"
              element={
                <PrivateRoute permissions={["locations.read"]}>
                  <LeftSidebarLayout>
                    <LocationManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/devices"
              element={
                <PrivateRoute permissions={["devices.read"]}>
                  <LeftSidebarLayout>
                    <DeviceManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/roles"
              element={
                <PrivateRoute permissions={["roles.read"]}>
                  <LeftSidebarLayout>
                    <RoleManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/database"
              element={
                <PrivateRoute permissions={["system.database.read"]}>
                  <LeftSidebarLayout>
                    <DatabaseSettings />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/security"
              element={
                <PrivateRoute permissions={["system.security.read"]}>
                  <LeftSidebarLayout>
                    <SecuritySettings />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            
            {/* Users Routes */}
            <Route
              path="/users"
              element={
                <PrivateRoute permissions={["users.read"]}>
                  <LeftSidebarLayout>
                    <UserManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/users/create"
              element={
                <PrivateRoute permissions={["users.manage"]}>
                  <LeftSidebarLayout>
                    <UserManagement />
                  </LeftSidebarLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </ConfirmationProvider>
      </ToastProvider>
  );
}

export default App;
