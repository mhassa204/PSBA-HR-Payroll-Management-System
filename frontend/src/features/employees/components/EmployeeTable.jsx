import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DataTable from "../../../components/DataTable";
import ErrorPage from "../../../components/ErrorPage";
import { useEmployeeStore } from "../store/employeeStore";
import employeeService from "../services/employeeService";
import useAppNavigation from "../../../hooks/useAppNavigation";
import Loader from "../../../components/Loader";
import { useConfirmationContext } from "../../../components/ui/ConfirmationProvider";
import { toastBus } from "../../../utils/toastBus";
import {
  displayCNIC,
  displayPhoneNumber,
  toTitleCase,
} from "../../../utils/formatters";
import locationService from "../../settings/services/locationService";
import { scaleGradeService } from "../../settings/services/scaleGradeService";
import { departmentService } from "../../settings/services/departmentService";

// Filter keys persisted in the URL as filter_<key>; they drive both the list
// query and the Excel export so the export always matches the on-screen result.
const FILTER_KEYS = [
  "location_id",
  "scale_grade_id",
  "department_id",
  "employment_status",
];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [exporting, setExporting] = useState(false);
  const exportAbortRef = useRef(null);
  const { confirmDelete } = useConfirmationContext();

  // Filter dropdown option sources
  const [locations, setLocations] = useState([]);
  const [scaleGrades, setScaleGrades] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    let ignore = false;
    const loadOptions = async () => {
      try {
        const [locRes, sgRes, deptRes] = await Promise.all([
          locationService.getAllLocations(),
          scaleGradeService.getAllScaleGrades(),
          departmentService.getAllDepartments(),
        ]);
        if (ignore) return;
        setLocations(locRes?.locations || locRes?.bazaars || []);
        setScaleGrades(sgRes?.scaleGrades || []);
        setDepartments(deptRes?.departments || []);
      } catch (err) {
        console.error("Failed to load filter options:", err?.message);
      }
    };
    loadOptions();
    return () => {
      ignore = true;
    };
  }, []);

  // Read the currently-applied filters straight from the URL
  const activeFilters = FILTER_KEYS.reduce((acc, key) => {
    const val = searchParams.get(`filter_${key}`);
    if (val) acc[key] = val;
    return acc;
  }, {});
  const activeSearch = searchParams.get("search") || "";
  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(`filter_${key}`, value);
    else next.delete(`filter_${key}`);
    next.set("page", "1"); // any filter change returns to the first page
    setSearchParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    FILTER_KEYS.forEach((key) => next.delete(`filter_${key}`));
    next.set("page", "1");
    setSearchParams(next);
  };

  // Abort any in-flight export if the user leaves the page
  useEffect(() => {
    return () => {
      if (exportAbortRef.current) {
        exportAbortRef.current.abort();
        exportAbortRef.current = null;
      }
    };
  }, []);

  const handleExportEmployees = useCallback(async () => {
    if (exporting) return;

    // Cancel any previous orphaned request before starting a new one
    if (exportAbortRef.current) {
      exportAbortRef.current.abort();
    }
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExporting(true);

    try {
      const { blob, filename } = await employeeService.exportEmployeesExcel({
        signal: controller.signal,
        timeoutMs: 120000,
        filters: { ...activeFilters, search: activeSearch },
      });

      if (controller.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke after a tick so the download can start
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toastBus.emit({
        type: "success",
        message: "Employees exported successfully.",
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        toastBus.emit({
          type: "error",
          message: err?.message || "Failed to export employees.",
        });
      }
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
      }
      setExporting(false);
    }
  }, [exporting, searchParams]);

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
          const dept = toTitleCase(
            ce?.department?.name ||
              ce?.department_text ||
              ce?.department ||
              "—"
          );
          const desig = toTitleCase(
            ce?.designation?.title ||
              ce?.designation_text ||
              ce?.designation ||
              "—"
          );
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
          const scale = ce?.scale_grade?.name || ce?.scale_grade_id || "—";
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
          const status = toTitleCase(ce?.employment_status || "—");
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
                    "—"
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
    <div className="w-full h-full my-4 m-auto px-2 sm:px-4 lg:px-6">
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
        <>
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-600">
              Bazaar / Location
            </label>
            <select
              className="min-w-[180px] rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              value={activeFilters.location_id || ""}
              onChange={(e) => setFilter("location_id", e.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                  {loc.type && loc.type !== "BAZAAR"
                    ? ` (${toTitleCase(loc.type.replace(/_/g, " "))})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-600">
              Grade / Scale
            </label>
            <select
              className="min-w-[150px] rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              value={activeFilters.scale_grade_id || ""}
              onChange={(e) => setFilter("scale_grade_id", e.target.value)}
            >
              <option value="">All grades</option>
              {scaleGrades.map((sg) => (
                <option key={sg.id} value={sg.id}>
                  {sg.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-600">
              Department
            </label>
            <select
              className="min-w-[160px] rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              value={activeFilters.department_id || ""}
              onChange={(e) => setFilter("department_id", e.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-600">
              Status
            </label>
            <select
              className="min-w-[140px] rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              value={activeFilters.employment_status || ""}
              onChange={(e) => setFilter("employment_status", e.target.value)}
            >
              <option value="">Any status</option>
              <option value="Active">Active</option>
              <option value="Probation">Probation</option>
              <option value="Inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="off_duty">Off Duty</option>
              <option value="Terminated">Terminated</option>
              <option value="Resigned">Resigned</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto self-center text-xs text-slate-500">
            Export respects the filters above
          </span>
        </div>
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
          toolbarActions={
            <button
              type="button"
              onClick={handleExportEmployees}
              disabled={exporting}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Exporting...
                </>
              ) : (
                "Export Employees"
              )}
            </button>
          }
        />
        </>
      )}
    </div>
  );
};

export default EmployeeTable;
