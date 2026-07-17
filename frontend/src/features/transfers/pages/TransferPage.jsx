import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../auth/authStore";
import { displayCNIC } from "../../../utils/formatters";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import EmployeePickerPanel from "../components/EmployeePickerPanel";
import EmploymentSelector from "../components/EmploymentSelector";
import TransferTimeline from "../components/TransferTimeline";
import NewTransferModal from "../components/NewTransferModal";
import TransferExportMenu from "../components/TransferExportMenu";
import { getEmployee, getEmployments, getTransfers } from "../services/transferService";

// Employee Transfers. One page for both routes:
//   /transfers                          -> employee picker first
//   /employees/:employeeId/transfers    -> deep link from the profile page
const TransferPage = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const can = useAuthStore((s) => s.can);
  const canTransfer = can("employment.location.update");

  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const employmentIdParam = parseInt(searchParams.get("employment_id") || "", 10) || null;

  const [employee, setEmployee] = useState(null);
  const [employments, setEmployments] = useState([]);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [transferData, setTransferData] = useState(null); // { employment, transfers }
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const setParam = (key, value) => {
    const np = new URLSearchParams(searchParams);
    const isDefault = value === null || value === undefined || value === "" || (key === "page" && value === 1);
    if (isDefault) np.delete(key);
    else np.set(key, String(value));
    setSearchParams(np, { replace: true });
  };

  // Load employee identity + employments when deep-linked
  useEffect(() => {
    if (!employeeId) { setEmployee(null); setEmployments([]); setTransferData(null); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoadingEmployee(true);
        const [empRes, emplRes] = await Promise.all([
          getEmployee(employeeId).catch(() => null),
          getEmployments(employeeId).catch(() => null),
        ]);
        if (cancelled) return;
        setEmployee(empRes?.employee || null);
        setEmployments(emplRes?.employments || []);
      } finally {
        if (!cancelled) setLoadingEmployee(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employeeId, refreshKey]);

  // Which employment is selected: URL param if it belongs to this employee,
  // else the current record, else the latest.
  const selectedEmploymentId = useMemo(() => {
    if (!employments.length) return null;
    if (employmentIdParam && employments.some((e) => e.id === employmentIdParam)) return employmentIdParam;
    const current = employments.find((e) => e.is_current);
    return (current || employments[employments.length - 1]).id;
  }, [employments, employmentIdParam]);

  // Load the transfer history (returns the freshest employment record too)
  useEffect(() => {
    if (!selectedEmploymentId) { setTransferData(null); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoadingTransfers(true);
        const data = await getTransfers(selectedEmploymentId);
        if (!cancelled) setTransferData(data);
      } catch {
        if (!cancelled) setTransferData(null);
      } finally {
        if (!cancelled) setLoadingTransfers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedEmploymentId, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const employment = transferData?.employment || employments.find((e) => e.id === selectedEmploymentId) || null;
  const transfers = transferData?.transfers || [];
  const employeeName = employee?.full_name || transferData?.employment?.employee?.full_name || "";
  const employeeCnic = employee?.cnic || transferData?.employment?.employee?.cnic || "";

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-primary">Employee Transfers</h1>
          {employeeId && employeeName ? (
            <p className="text-xs text-gray-500">
              {employeeName} · {displayCNIC(employeeCnic) || "no CNIC"}
            </p>
          ) : (
            <p className="text-xs text-gray-500">Search an employee to view and manage transfer history.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {employeeId && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => navigate(`/employees/view/${employeeId}`)}>
                Profile
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate("/transfers")}>
                Change employee
              </button>
              <TransferExportMenu
                transfers={transfers}
                employment={employment}
                employeeName={employeeName}
                employeeCnic={employeeCnic}
              />
            </>
          )}
        </div>
      </div>

      {!employeeId ? (
        <EmployeePickerPanel
          search={search}
          page={page}
          onSearchChange={(v) => { const np = new URLSearchParams(searchParams); if (v) np.set("search", v); else np.delete("search"); np.delete("page"); setSearchParams(np, { replace: true }); }}
          onPageChange={(p) => setParam("page", p)}
          onSelect={(emp) => navigate(`/employees/${emp.id}/transfers`)}
        />
      ) : loadingEmployee ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="md" text="Loading employee..." /></div>
      ) : (
        <>
          <EmploymentSelector
            employeeId={employeeId}
            employments={employments}
            selectedId={selectedEmploymentId}
            onSelect={(id) => setParam("employment_id", id)}
          />
          {selectedEmploymentId && (
            <TransferTimeline
              employment={employment}
              transfers={transfers}
              loading={loadingTransfers}
              canTransfer={canTransfer}
              onNewTransfer={() => setModalOpen(true)}
            />
          )}
        </>
      )}

      {modalOpen && employment && (
        <NewTransferModal
          employment={employment}
          employeeName={employeeName}
          latestTransferAt={transfers[0]?.changed_at || null}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); refresh(); }}
          onStale={() => { setModalOpen(false); refresh(); }}
        />
      )}
    </div>
  );
};

export default TransferPage;
