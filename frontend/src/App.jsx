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
  DeviceManagement,
  DistrictManagement,
  CityManagement,
  EducationLevelManagement
} from "./features/settings";
import { UserManagement } from "./features/users";
import DatabaseSettings from "./features/settings/pages/DatabaseSettings";
import SecuritySettings from "./features/settings/pages/SecuritySettings";
import RosterList from "./features/roster/pages/RosterList";
import CreateRoster from "./features/roster/pages/CreateRoster";
import EditRoster from "./features/roster/pages/EditRoster";
import ViewRoster from "./features/roster/pages/ViewRoster";
import AttendanceDashboard from "./features/attendance/pages/AttendanceDashboard";
import AttendanceLocations from "./features/attendance/pages/AttendanceLocations";
import AttendanceLocationDetail from "./features/attendance/pages/AttendanceLocationDetail";
import AttendanceDevices from "./features/attendance/pages/AttendanceDevices";
import AttendanceLocationDetailHome from "./features/attendance/pages/AttendanceLocationDetailHome";
import LocationFMOPage from "./features/attendance/pages/LocationFMOPage";
import LocationRosterPage from "./features/attendance/pages/LocationRosterPage";
import LeaveManagement from './features/attendance/pages/LeaveManagement';
import LeaveBankPage from './features/attendance/pages/LeaveBankPage';

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
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />

          {/* App layout route keeps sidebar mounted across navigations */}
          <Route element={<LeftSidebarLayout />}>
            {/* Home */}
            <Route
              index
              element={
                <PrivateRoute permissions={["employees.read","departments.read","designations.read"]}>
                  <div className="text-center py-20">
                    <h1 className="text-4xl font-bold text-slate-800 mb-4">Welcome to PSBA HR Portal</h1>
                    <p className="text-xl text-slate-600">Select an option from the sidebar to get started</p>
                  </div>
                </PrivateRoute>
              }
            />

            {/* Dashboard */}
            <Route
              path="dashboard"
              element={
                <PrivateRoute permissions={["employees.read","reports.read"]}>
                  <div className="text-center py-20">
                    <h1 className="text-4xl font-bold text-slate-800 mb-4">Dashboard</h1>
                    <p className="text-xl text-slate-600">Overview and analytics coming soon</p>
                  </div>
                </PrivateRoute>
              }
            />

            {/* Roster routes */}
            <Route
              path="rosters"
              element={
                <PrivateRoute permissions={["roster.read"]}>
                  <RosterList />
                </PrivateRoute>
              }
            />
            <Route
              path="rosters/create"
              element={
                <PrivateRoute permissions={["roster.create"]}>
                  <CreateRoster />
                </PrivateRoute>
              }
            />
            <Route
              path="rosters/:id"
              element={
                <PrivateRoute permissions={["roster.read"]}>
                  <ViewRoster />
                </PrivateRoute>
              }
            />
            <Route
              path="rosters/:id/edit"
              element={
                <PrivateRoute permissions={["roster.update"]}>
                  <EditRoster />
                </PrivateRoute>
              }
            />

            {/* Employees */}
            <Route
              path="employees"
              element={
                <PrivateRoute permissions={["employees.read"]}>
                  <EmployeeTable />
                </PrivateRoute>
              }
            />
            <Route
              path="employees/view/:id"
              element={
                <PrivateRoute permissions={["employees.read"]}>
                  <EnhancedUserProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="employees/:id/edit"
              element={
                <PrivateRoute permissions={["employees.update"]}>
                  <EditEmployee />
                </PrivateRoute>
              }
            />
            <Route 
              path="employees/create" 
              element={
                <PrivateRoute permissions={["employees.create"]}>
                  <CreateEmployeeForm />
                </PrivateRoute>
              } 
            />
            <Route
              path="employees/:employeeId/employment"
              element={
                <PrivateRoute permissions={["employment.read"]}>
                  <CleanEmploymentHistory />
                </PrivateRoute>
              }
            />

            {/* Reports */}
            <Route
              path="reports"
              element={
                <PrivateRoute permissions={["reports.read"]}>
                  <div className="text-center py-20">
                    <h1 className="text-4xl font-bold text-slate-800 mb-4">Reports & Analytics</h1>
                    <p className="text-xl text-slate-600">Analytics and reporting dashboard coming soon</p>
                  </div>
                </PrivateRoute>
              }
            />
            
            {/* Audit Logs */}
            <Route 
              path="audit-logs" 
              element={
                <PrivateRoute permissions={["audit.read"]}>
                  <AuditLogsDashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Settings */}
            <Route
              path="settings"
              element={
                <PrivateRoute permissions={["departments.read","designations.read","role-tags.read","scale-grades.read"]}>
                  <SettingsDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/departments"
              element={
                <PrivateRoute permissions={["departments.read"]}>
                  <DepartmentManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/designations"
              element={
                <PrivateRoute permissions={["designations.read"]}>
                  <DesignationManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/role-tags"
              element={
                <PrivateRoute permissions={["role-tags.read"]}>
                  <RoleTagManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/scale-grades"
              element={
                <PrivateRoute permissions={["scale-grades.read"]}>
                  <ScaleGradeManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/locations"
              element={
                <PrivateRoute permissions={["locations.read"]}>
                  <LocationManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/devices"
              element={
                <PrivateRoute permissions={["devices.read"]}>
                  <DeviceManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/roles"
              element={
                <PrivateRoute permissions={["roles.read"]}>
                  <RoleManagement />
                </PrivateRoute>
              }
            />
            {/* New Settings routes */}
            <Route
              path="settings/districts"
              element={
                <PrivateRoute permissions={["districts.read"]}>
                  <DistrictManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/cities"
              element={
                <PrivateRoute permissions={["cities.read"]}>
                  <CityManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/education-levels"
              element={
                <PrivateRoute permissions={["education-levels.read"]}>
                  <EducationLevelManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/database"
              element={
                <PrivateRoute permissions={["system.database.read"]}>
                  <DatabaseSettings />
                </PrivateRoute>
              }
            />
            <Route
              path="settings/security"
              element={
                <PrivateRoute permissions={["system.security.read"]}>
                  <SecuritySettings />
                </PrivateRoute>
              }
            />
            
            {/* Users */}
            <Route
              path="users"
              element={
                <PrivateRoute permissions={["users.read"]}>
                  <UserManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="users/create"
              element={
                <PrivateRoute permissions={["users.manage"]}>
                  <UserManagement />
                </PrivateRoute>
              }
            />

            {/* Attendance */}
            <Route
              path="attendance"
              element={
                <PrivateRoute permissions={["attendance.read"]}>
                  <AttendanceLocations />
                </PrivateRoute>
              }
            />
            <Route
              path="attendance/locations"
              element={
                <PrivateRoute permissions={["attendance.read"]}>
                  <AttendanceLocations />
                </PrivateRoute>
              }
            />
            <Route
              path="attendance/locations/:id"
              element={
                <PrivateRoute permissions={["attendance.read"]}>
                  <AttendanceLocationDetailHome />
                </PrivateRoute>
              }
            />
            <Route
              path="attendance/locations/:id/fmo"
              element={
                <PrivateRoute permissions={["attendance.read"]}>
                  <LocationFMOPage />
                </PrivateRoute>
              }
            />
            <Route
              path="attendance/locations/:id/roster"
              element={
                <PrivateRoute permissions={["attendance.read"]}>
                  <LocationRosterPage />
                </PrivateRoute>
              }
            />
            <Route
              path="attendance/devices"
              element={
                <PrivateRoute permissions={["attendance.read"]}>
                  <AttendanceDevices />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/leaves"
              element={
                <PrivateRoute permissions={["attendance.read","leaves.read"]}>
                  <LeaveManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/leave-bank"
              element={
                <PrivateRoute permissions={["attendance.read","leaves.read"]}>
                  <LeaveBankPage />
                </PrivateRoute>
              }
            />
          </Route>
        </Routes>
        </ConfirmationProvider>
      </ToastProvider>
  );
}

export default App;
