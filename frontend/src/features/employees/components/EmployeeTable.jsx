import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DataTable from "../../../components/DataTable";
import ErrorPage from "../../../components/ErrorPage";
import { useEmployeeStore } from "../store/employeeStore";
import useAppNavigation from "../../../hooks/useAppNavigation";
import Loader from "../../../components/Loader";
import { useConfirmationContext } from "../../../components/ui/ConfirmationProvider";
import { displayCNIC, displayPhoneNumber } from "../../../utils/formatters";

const EmployeeTable = () => {
  const {
    fetchEmployees,
    deleteEmployee,
    employees,
    loading,
    error,
    preloadEmployees,
    clearCache,
  } = useEmployeeStore();
  const { employees: employeeNav, saveCurrentLocation } = useAppNavigation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { confirmDelete } = useConfirmationContext();

  // Get current query parameters
  const getCurrentParams = () => ({
    page: parseInt(searchParams.get("page")) || 1,
    pageSize: parseInt(searchParams.get("pageSize")) || 10,
    search: searchParams.get("search") || "",
    filters: Object.fromEntries(
      Array.from(searchParams.entries())
        .filter(([key]) => key.startsWith("filter_"))
        .map(([key, value]) => [key.replace("filter_", ""), value])
    ),
  });

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        saveCurrentLocation(); // Save current location for return navigation

        // Check if any employee was updated and force refresh if needed
        const hasUpdates =
          sessionStorage.getItem("employees_updated") === "true";
        if (hasUpdates) {
          clearCache();
          sessionStorage.removeItem("employees_updated");
        }

        const params = getCurrentParams();
        await fetchEmployees(params);
        setIsInitialLoad(false);
      } catch (err) {
        console.error("Failed to fetch employees:", err.message);
        setIsInitialLoad(false);
      }
    };
    loadEmployees();
  }, [fetchEmployees, saveCurrentLocation, searchParams, clearCache]);

  const columns = [
    { header: "Name", accessor: "full_name" },
    { header: "Father/Husband Name", accessor: "father_husband_name" },
    { header: "Email", accessor: "email" },
    {
      header: "CNIC",
      accessor: "cnic",
      render: (row) => displayCNIC(row.cnic),
    },
    {
      header: "Number",
      accessor: "mobile_number",
      render: (row) => displayPhoneNumber(row.mobile_number),
    },
    {
      header: "Status",
      accessor: "employment_status",
      render: (row) => {
        // Get current employment record to show status
        const currentEmployment = row.employment_records?.find(emp => emp.is_current === true) ||
                                 row.employment_records?.find(emp => emp.effective_till === null || emp.end_date === null) ||
                                 row.employment_records?.[0];
        return currentEmployment?.employment_status || "N/A";
      }
    },
    {
      header: "Department",
      accessor: "department",
      render: (row) => {
        // Get current employment record to show department
        const currentEmployment = row.employment_records?.find(emp => emp.is_current === true) ||
                                 row.employment_records?.find(emp => emp.effective_till === null || emp.end_date === null) ||
                                 row.employment_records?.[0];
        return currentEmployment?.department || "N/A";
      }
    },
    {
      header: "Designation",
      accessor: "designation",
      render: (row) => {
        // Get current employment record to show designation
        const currentEmployment = row.employment_records?.find(emp => emp.is_current === true) ||
                                 row.employment_records?.find(emp => emp.effective_till === null || emp.end_date === null) ||
                                 row.employment_records?.[0];
        return currentEmployment?.designation || "N/A";
      }
    },
    {
      header: "Scale",
      accessor: "scale_grade",
      render: (row) => {
        // Get current employment record to show scale/grade
    
        const currentEmployment = row.employment_records?.find(emp => emp.is_current === true) ||
                                 row.employment_records?.find(emp => emp.effective_till === null || emp.end_date === null) ||
                                 row.employment_records?.[0];
        return currentEmployment?.scale_grade || "N/A";
      }
    },
  ];

  const actions = [
    {
      label: "View",
      handler: (row) => {
        // Preload current page data for smooth return
        const currentParams = getCurrentParams();
        preloadEmployees(currentParams);
        employeeNav.toView(row.id);
      },
      className: "bg-green-600 hover:bg-green-700",
    },
    {
      label: "Employment",
      handler: (row) => {
        // Navigate to employment history page
        const currentParams = getCurrentParams();
        preloadEmployees(currentParams);
        navigate(`/employees/${row.id}/employment`);
      },
      className: "bg-purple-600 hover:bg-purple-700",
    },
    {
      label: "edit",
      handler: (row) => {
        // Preload current page data for smooth return
        const currentParams = getCurrentParams();
        preloadEmployees(currentParams);
        employeeNav.toEdit(row.id);
      },
      className: "bg-blue-600 hover:bg-blue-700",
    },
    {
      label: "Delete",
      handler: (row) => {
        confirmDelete({
          message: `Are you sure you want to delete "${row.full_name}"?`,
          details: (
            <div className="space-y-2">
              <p>
                <strong>Employee:</strong> {row.full_name}
              </p>
              <p>
                <strong>CNIC:</strong> {row.cnic}
              </p>
              <p>
                <strong>Department:</strong> {row.department?.name || "N/A"}
              </p>
              <p className="text-red-600 font-medium">
                This action cannot be undone.
              </p>
            </div>
          ),
          onConfirm: async () => {
            try {
              await deleteEmployee(row.id);
              // Success notification will be handled by the store or a toast system
            } catch (err) {
              console.error("Failed to delete employee:", err);
              throw err; // Re-throw to keep modal open on error
            }
          },
        });
      },
      className: "bg-red-600 hover:bg-red-700",
    },
  ];

  if (error) {
    return (
      <ErrorPage
        title="Error Loading Employees"
        message={error}
        action={{
          label: "Retry",
          handler: () => fetchEmployees(),
        }}
      />
    );
  }

  return (
    <div className="w-[95%] h-full my-4 m-auto px-4 sm:px-6 lg:px-8 ">
      {/* Subtle loading indicator for background updates */}
      {loading && !isInitialLoad && (
        <div className="fixed top-20 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-2 border border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500 mr-2"></div>
            Updating data...
          </div>
        </div>
      )}

      {loading && isInitialLoad ? (
        <Loader size="large" text="Loading employees..." />
      ) : (
        <DataTable
          title="All Employees"
          columns={columns}
          data={employees || []}
          actions={actions}
          itemsPerPage={10}
          storageKey="employeeTable"
        />
      )}
    </div>
  );
};

export default EmployeeTable;
