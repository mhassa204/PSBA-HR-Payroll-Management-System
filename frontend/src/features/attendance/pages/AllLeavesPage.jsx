import React, { useEffect, useMemo, useState } from "react";
import axios from "../../../lib/axios";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { useAuthStore } from "../../auth/authStore";

const AllLeavesPage = () => {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");

  // Filters
  const [fName, setFName] = useState("");
  const [fCnic, setFCnic] = useState("");
  const [fDesignation, setFDesignation] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fDate, setFDate] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  // Restrict to Establishment role users (defense in depth; sidebar already hides for others)
  const isEstablishment = /establishment/i.test(user?.role?.name || "");

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/leaves/employees", {
        params: { search },
      });
      setEmployees(data.employees || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Flatten employees/leaves into rows for filtering
  const rows = useMemo(() => {
    const out = [];
    for (const emp of employees || []) {
      const empRec = emp.employmentRecords?.[0] || {};
      const designation = empRec?.designation?.title || "";
      const department = empRec?.department?.title || "";
      for (const lv of emp.leaves || []) {
        out.push({
          id: lv.id,
          date: String(lv.date || "").slice(0, 10),
          type: lv.type || "",
          status: lv.status || lv.current_status || "",
          remarks: lv.remarks || "",
          employeeName: emp.full_name || "",
          cnic: emp.cnic || "",
          designation,
          department,
        });
      }
    }
    // Sort by date desc
    out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return out;
  }, [employees]);

  const filtered = useMemo(() => {
    const norm = (s) => (s || "").toString().toLowerCase();
    const inDateRange = (d) => {
      if (fDate) return d === fDate;
      if (fStart && fEnd) return d >= fStart && d <= fEnd;
      if (fStart) return d >= fStart;
      if (fEnd) return d <= fEnd;
      return true;
    };
    return rows.filter((r) => {
      if (fName && !norm(r.employeeName).includes(norm(fName))) return false;
      if (fCnic && !String(r.cnic || "").includes(String(fCnic))) return false;
      if (fDesignation && !norm(r.designation).includes(norm(fDesignation)))
        return false;
      if (fDepartment && !norm(r.department).includes(norm(fDepartment)))
        return false;
      if (
        fStatus &&
        String(r.status).toUpperCase() !== String(fStatus).toUpperCase()
      )
        return false;
      if (!inDateRange(r.date)) return false;
      return true;
    });
  }, [
    rows,
    fName,
    fCnic,
    fDesignation,
    fDepartment,
    fStatus,
    fDate,
    fStart,
    fEnd,
  ]);

  if (!isEstablishment) {
    return <div className="p-6 text-sm text-red-600">Unauthorized</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          All Leaves
        </h1>
        <div className="actions-inline">
          <input
            className="form-input !py-1 !px-2 text-xs w-48"
            placeholder="Search employees"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-secondary text-xs" onClick={load}>
            Search
          </button>
        </div>
      </div>

      <div className="card-soft p-4 space-y-3">
        <div className="filter-panel compact grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <input
            className="form-input"
            placeholder="Name"
            value={fName}
            onChange={(e) => setFName(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="CNIC"
            value={fCnic}
            onChange={(e) => setFCnic(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="Designation"
            value={fDesignation}
            onChange={(e) => setFDesignation(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="Department"
            value={fDepartment}
            onChange={(e) => setFDepartment(e.target.value)}
          />
          <select
            className="form-input"
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
          >
            <option value="">Any Status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <input
            type="date"
            className="form-input"
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
          />
          <input
            type="date"
            className="form-input"
            value={fStart}
            onChange={(e) => setFStart(e.target.value)}
            placeholder="Start"
          />
          <input
            type="date"
            className="form-input"
            value={fEnd}
            onChange={(e) => setFEnd(e.target.value)}
            placeholder="End"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="table-shell card-soft p-0 overflow-auto custom-thin-scroll">
          <table className="table-enhanced">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Type</th>
                <th>CNIC</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Department</th>
                <th className="text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>
                    <span
                      className={`badge text-xs ${
                        r.status === "APPROVED"
                          ? "badge-success"
                          : r.status === "REJECTED"
                          ? "badge-error"
                          : "badge-gray"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.type}</td>
                  <td>{r.cnic || "-"}</td>
                  <td className="text-left">{r.employeeName}</td>
                  <td className="text-left">{r.designation || "-"}</td>
                  <td className="text-left">{r.department || "-"}</td>
                  <td
                    className="text-left max-w-[280px] truncate"
                    title={r.remarks}
                  >
                    {r.remarks || "-"}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-6 text-xs text-gray-500"
                  >
                    No leaves found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllLeavesPage;

