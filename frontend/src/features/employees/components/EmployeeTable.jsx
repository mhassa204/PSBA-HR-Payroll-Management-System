import { useEffect, useState, useMemo } from "react";
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
    pagination,
  } = useEmployeeStore();
  const { employees: employeeNav, saveCurrentLocation } = useAppNavigation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { confirmDelete } = useConfirmationContext();

  // Helpers
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

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
    return (first + last).toUpperCase();
  };

  const getCurrentEmployment = (row) => {
    return (
      row.employmentRecords?.find((emp) => emp.is_current === true) ||
      row.employmentRecords?.find(
        (emp) => emp.effective_till === null || emp.end_date === null
      ) ||
      row.employmentRecords?.[0]
    );
  };

  const statusColor = (status) => {
    const s = (status || "").toString().toLowerCase();
    if (/(active|current)/.test(s))
      return "bg-green-100 text-green-700 ring-green-200";
    if (/(probation|pending)/.test(s))
      return "bg-amber-100 text-amber-700 ring-amber-200";
    if (/(inactive|terminated|left|resigned)/.test(s))
      return "bg-red-100 text-red-700 ring-red-200";
    return "bg-slate-100 text-slate-700 ring-slate-200";
  };

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        saveCurrentLocation();

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

  const columns = useMemo(
    () => [
      {
        header: "Employee",
        accessor: "full_name",
        render: (row) => (
          <div className="flex items-center gap-2 text-left overflow-visible">
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold ring-1 ring-slate-300">
              {/* If photo available later, swap this for <img /> */}
              <span className="text-sm leading-none">
                {getInitials(row.full_name)}
              </span>
            </div>
            <div className="min-w-0">
              <div
                className="font-medium text-slate-900 truncate max-w-[180px] md:max-w-[240px]"
                title={row.full_name}
              >
                {row.full_name}
              </div>
              <div
                className="text-xs text-slate-500 truncate max-w-[180px] md:max-w-[240px]"
                title={row.email}
              >
                {row.email || "—"}
              </div>
            </div>
          </div>
        ),
      },
      {
        header: "CNIC",
        accessor: "cnic",
        render: (row) => (
          <span className="font-mono text-[13px] text-slate-700">
            {displayCNIC(row.cnic)}
          </span>
        ),
      },
      {
        header: "Phone",
        accessor: "mobile_number",
        render: (row) => (
          <span className="font-mono text-[13px] text-slate-700">
            {displayPhoneNumber(row.mobile_number)}
          </span>
        ),
      },
      {
        header: "Role",
        accessor: "designation",
        render: (row) => {
          const ce = getCurrentEmployment(row);
          const dept =
            ce?.department?.name ||
            ce?.department_text ||
            ce?.department ||
            "N/A";
          const desig =
            ce?.designation?.title ||
            ce?.designation_text ||
            ce?.designation ||
            "N/A";
          return (
            <div className="text-left">
              <div
                className="text-slate-900 text-sm font-medium truncate max-w-[220px]"
                title={desig}
              >
                {desig}
              </div>
              <div
                className="text-xs text-slate-500 truncate max-w-[220px]"
                title={dept}
              >
                {dept}
              </div>
            </div>
          );
        },
      },
      {
        header: "Scale",
        accessor: "scale_grade",
        render: (row) => {
          const ce = getCurrentEmployment(row);
          const scale = ce?.scale_grade?.name || ce?.scale_grade_id || "N/A";
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-1 ring-inset bg-slate-50 text-slate-700 ring-slate-200">
              {scale}
            </span>
          );
        },
      },
      {
        header: "Status",
        accessor: "employment_status",
        render: (row) => {
          const ce = getCurrentEmployment(row);
          const status = ce?.employment_status || "N/A";
          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${statusColor(
                status
              )}`}
            >
              {status}
            </span>
          );
        },
      },
    ],
    [employees]
  );

  const actions = [
    {
      label: "View",
      handler: (row) => {
        const currentParams = getCurrentParams();
        preloadEmployees(currentParams);
        employeeNav.toView(row.id);
      },
      className: "bg-green-600 hover:bg-green-700",
    },
    {
      label: "Employment",
      handler: (row) => {
        const currentParams = getCurrentParams();
        preloadEmployees(currentParams);
        navigate(`/employees/${row.id}/employment`);
      },
      className: "bg-purple-600 hover:bg-purple-700",
    },
    {
      label: "edit",
      handler: (row) => {
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
                <strong>Department:</strong>{" "}
                {(() => {
                  const currentEmployment = getCurrentEmployment(row);
                  return (
                    currentEmployment?.department?.name ||
                    currentEmployment?.department_id ||
                    "N/A"
                  );
                })()}
              </p>
              <p className="text-red-600 font-medium">
                This action cannot be undone.
              </p>
            </div>
          ),
          onConfirm: async () => {
            try {
              await deleteEmployee(row.id);
            } catch (err) {
              console.error("Failed to delete employee:", err);
              throw err;
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
    <div className="w-[95%] h-full my-4 m-auto px-2 sm:px-4 lg:px-6">
      {loading && !isInitialLoad && (
        <div className="fixed top-20 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-2 border border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500 mr-2" />
            Updating data...
          </div>
        </div>
      )}

      {loading && isInitialLoad ? (
        <Loader size="large" text="Loading employees..." />
      ) : (
        <DataTable
          title="Employees"
          columns={columns}
          data={employees || []}
          actions={actions}
          itemsPerPage={10}
          storageKey="employeeTable"
          serverPaginated={true}
          serverTotal={pagination?.total || 0}
          serverTotalPages={pagination?.totalPages || 0}
        />
      )}
    </div>
  );
};

export default EmployeeTable;
