import React, { useEffect, useMemo, useState } from "react";
import axios from "../../../lib/axios";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { useAuthStore } from "../../auth/authStore";

const AllTadaRequestsPage = () => {
  const user = useAuthStore((s) => s.user);
  const isEstablishment = /establishment/i.test(user?.role?.name || "");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  // Filters
  const [fName, setFName] = useState("");
  const [fCnic, setFCnic] = useState("");
  const [fDesignation, setFDesignation] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fDate, setFDate] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/travel/requests/all");
      setRequests(data.requests || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    return (requests || []).map((r) => {
      const er = (r.applicant?.employmentRecords || [])[0] || {};
      return {
        id: r.id,
        date: String(r.departure_date || "").slice(0, 10),
        endDate: String(r.expected_return_date || "").slice(0, 10),
        status: r.status || "",
        name: r.applicant?.full_name || "",
        cnic: r.applicant?.cnic || "",
        designation: er?.designation?.title || "",
        department: er?.department?.name || er?.department?.title || "",
        purpose: r.purpose || "",
      };
    });
  }, [requests]);

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
      if (fName && !norm(r.name).includes(norm(fName))) return false;
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

  if (!isEstablishment)
    return <div className="p-6 text-sm text-red-600">Unauthorized</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          All Tada Requests
        </h1>
        <div className="actions-inline">
          <button className="btn btn-secondary text-xs" onClick={load}>
            Refresh
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
            <option value="CREATED">CREATED</option>
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
                <th>Name</th>
                <th>CNIC</th>
                <th>Designation</th>
                <th>Department</th>
                <th className="text-left">Purpose</th>
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
                  <td className="text-left">{r.name}</td>
                  <td>{r.cnic || "-"}</td>
                  <td className="text-left">{r.designation || "-"}</td>
                  <td className="text-left">{r.department || "-"}</td>
                  <td
                    className="text-left max-w-[300px] truncate"
                    title={r.purpose}
                  >
                    {r.purpose || "-"}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-6 text-xs text-gray-500"
                  >
                    No requests found
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

export default AllTadaRequestsPage;

