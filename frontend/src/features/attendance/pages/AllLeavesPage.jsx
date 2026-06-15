import React, { useEffect, useState, useMemo } from "react";
import axios from "../../../lib/axios";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { useAuthStore } from "../../auth/authStore";

const AllLeavesPage = () => {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);

  // Helper function to format date consistently (dd/mm/yyyy, hh:mm:ss am/pm)
  const formatStatusHistoryDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Ensure we're working with local time
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;
    return `${day}/${month}/${year}, ${String(displayHours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
  };

  // Helper function to extract timestamp from FORWARDED comments
  const extractTimestampFromComment = (comment) => {
    if (!comment) return null;
    // Pattern: "... at dd/mm/yyyy, hh:mm:ss am/pm" or variations
    // Match patterns like "at 31/10/2025, 03:18:37 pm" or "at 31/10/2025, 3:18:37 PM"
    const match = comment.match(/at\s+(\d{1,2}\/\d{1,2}\/\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+(?:am|pm|AM|PM))/i);
    return match ? match[1] : null;
  };

  // Helper function to remove timestamp from comment
  const removeTimestampFromComment = (comment) => {
    if (!comment) return comment;
    // Remove " at dd/mm/yyyy, hh:mm:ss am/pm" pattern (flexible for 1-2 digit day/month/hour)
    return comment.replace(/\s+at\s+\d{1,2}\/\d{1,2}\/\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+(?:am|pm|AM|PM)/i, "");
  };

  // Filters
  const [fName, setFName] = useState("");
  const [fCnic, setFCnic] = useState("");
  const [fDesignation, setFDesignation] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fDate, setFDate] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fLeaveType, setFLeaveType] = useState("");
  const [fLeaveStatus, setFLeaveStatus] = useState("");

  // Restrict to Establishment role users (defense in depth; sidebar already hides for others)
  const isEstablishment = /establishment/i.test(user?.role?.name || "");

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: leavesData }, { data: typesData }] = await Promise.all([
        axios.get("/leaves/all-leaves"),
        axios.get("/leave-banks/types"),
      ]);
      setLeaves(leavesData.leaves || []);
      setLeaveTypes(typesData.types || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEstablishment) {
      load();
    }
  }, [isEstablishment]);

  const filteredLeaves = useMemo(() => {
    const norm = (s) => (s || "").toString().toLowerCase();
    const inDateRange = (d) => {
      if (fDate) return d === fDate;
      if (fStart && fEnd) return d >= fStart && d <= fEnd;
      if (fStart) return d >= fStart;
      if (fEnd) return d <= fEnd;
      return true;
    };

    return leaves.filter((lv) => {
      const emp = lv.employee || {};
      const empRec = emp.employmentRecords?.[0] || {};
      
      if (fName && !norm(emp.full_name || "").includes(norm(fName))) return false;
      if (fCnic && !String(emp.cnic || "").includes(String(fCnic))) return false;
      if (fDesignation && !norm(empRec?.designation?.title || "").includes(norm(fDesignation))) return false;
      if (fDepartment && !norm(empRec?.department?.name || "").includes(norm(fDepartment))) return false;
      if (fLeaveType && String(lv.type || "").toUpperCase() !== String(fLeaveType).toUpperCase()) return false;
      if (fLeaveStatus && String(lv.current_status || "").toUpperCase() !== String(fLeaveStatus).toUpperCase()) return false;
      if (!inDateRange(String(lv.date || "").slice(0, 10))) return false;
      return true;
    });
  }, [leaves, fName, fCnic, fDesignation, fDepartment, fDate, fStart, fEnd, fLeaveType, fLeaveStatus]);

  if (!isEstablishment) {
    return <div className="p-6 text-sm text-red-600">Unauthorized</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          All Leaves
        </h1>
        <button className="btn btn-secondary text-xs" onClick={load}>
          Refresh
        </button>
      </div>

      {/* Filters */}
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
          <input
            type="date"
            className="form-input"
            placeholder="Date"
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
          />
          <input
            type="date"
            className="form-input"
            placeholder="Date From"
            value={fStart}
            onChange={(e) => setFStart(e.target.value)}
          />
          <input
            type="date"
            className="form-input"
            placeholder="Date To"
            value={fEnd}
            onChange={(e) => setFEnd(e.target.value)}
          />
          <select
            className="form-input"
            value={fLeaveType}
            onChange={(e) => setFLeaveType(e.target.value)}
          >
            <option value="">Any Leave Type</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            className="form-input"
            value={fLeaveStatus}
            onChange={(e) => setFLeaveStatus(e.target.value)}
          >
            <option value="">Any Status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="ALLOWED">ALLOWED</option>
            <option value="RECOMMENDED">RECOMMENDED</option>
          </select>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((lv) => {
                const emp = lv.employee || {};
                const empRec = emp.employmentRecords?.[0] || {};
                return (
                  <tr key={lv.id}>
                    <td>{String(lv.date || "").slice(0, 10)}</td>
                    <td>
                      <span
                        className={`badge text-xs ${
                          lv.current_status === "APPROVED"
                            ? "badge-success"
                            : lv.current_status === "REJECTED"
                            ? "badge-error"
                            : "badge-gray"
                        }`}
                      >
                        {lv.current_status || "PENDING"}
                      </span>
                    </td>
                    <td>{lv.type}</td>
                    <td>{emp.cnic || "-"}</td>
                    <td className="text-left">{emp.full_name || "-"}</td>
                    <td className="text-left">
                      {empRec?.designation?.title || "-"}
                    </td>
                    <td className="text-left">
                      {empRec?.department?.name || "-"}
                    </td>
                    <td
                      className="text-left max-w-[280px] truncate"
                      title={lv.remarks || ""}
                    >
                      {lv.remarks || "-"}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline text-[11px]"
                        onClick={() => setSelectedLeave(lv)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredLeaves.length && (
                <tr>
                  <td
                    colSpan={9}
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

      {/* Leave Details Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 backdrop-fade bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-thin-scroll">
            <div className="modal-header">
              <h2 className="text-sm font-semibold tracking-wide">
                Leave Details - {String(selectedLeave.date).slice(0, 10)}
              </h2>
              <button
                onClick={() => setSelectedLeave(null)}
                className="btn btn-outline btn-sm text-xs"
              >
                Close
              </button>
            </div>
            <div className="p-4 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Employee:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selectedLeave.employee?.full_name} (
                    {selectedLeave.employee?.cnic || "-"}
                    )
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Designation:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selectedLeave.employee?.employmentRecords?.[0]?.designation
                      ?.title || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Location:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selectedLeave.employee?.employmentRecords?.[0]?.location
                      ?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>{" "}
                  <span className="ml-1 font-medium">{selectedLeave.type}</span>
                  {selectedLeave.type === "Other" &&
                    selectedLeave.custom_type && (
                      <span className="ml-2 text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                        {selectedLeave.custom_type}
                      </span>
                    )}
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selectedLeave.current_status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Submitted:</span>{" "}
                  <span className="ml-1">
                    {selectedLeave.submission_time
                      ? new Date(selectedLeave.submission_time).toLocaleString(
                          "en-PK",
                          {
                            timeZone: "Asia/Karachi",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "Not specified"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Backup:</span>{" "}
                  <span className="ml-1 font-medium">
                    {(() => {
                      const be = selectedLeave.backup_employee;
                      if (be) {
                        const name = be.full_name || "User";
                        const cnic = be.cnic || "-";
                        return `${name}_${cnic}`;
                      }
                      return "Not assigned";
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Backup Time:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selectedLeave.backup_duty_from &&
                    selectedLeave.backup_duty_to
                      ? `${selectedLeave.backup_duty_from} - ${selectedLeave.backup_duty_to}`
                      : "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Duty Time:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selectedLeave.duty_from && selectedLeave.duty_to
                      ? `${selectedLeave.duty_from} - ${selectedLeave.duty_to}`
                      : "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Reason:</span>{" "}
                  <span className="ml-1">
                    {selectedLeave.remarks || "No reason provided"}
                  </span>
                </div>
              </div>

              {(() => {
                const hist = selectedLeave.statusHistory || [];
                return hist.length ? (
                  <div className="card-soft p-4 space-y-2">
                    <div className="text-xs font-semibold text-gray-700">
                      Status History
                    </div>
                    <div className="space-y-1">
                      {hist.map((h, idx) => {
                        const isForwarded = h.action_type === "FORWARDED";
                        const commentTimestamp = isForwarded ? extractTimestampFromComment(h.comments) : null;
                        const displayComment = isForwarded && h.comments ? removeTimestampFromComment(h.comments) : h.comments;
                        const displayTimestamp = commentTimestamp || formatStatusHistoryDate(h.action_time);
                        
                        return (
                          <div
                            key={idx}
                            className="flex items-start justify-between text-xs bg-gray-50 p-2 rounded gap-2"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="badge badge-gray whitespace-nowrap">
                                {isForwarded ? "Recommended" : h.action_type}
                              </span>
                              {displayComment ? (
                                <span className="text-gray-600 break-words">
                                  {displayComment}
                                </span>
                              ) : (
                                <span className="whitespace-nowrap">
                                  {h.user?.email ||
                                    h.user?.employee?.full_name ||
                                    "User"}
                                </span>
                              )}
                            </div>
                            <div className="text-gray-600 whitespace-nowrap text-right">
                              {displayTimestamp}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {selectedLeave.documents &&
                (() => {
                  try {
                    const docs = JSON.parse(selectedLeave.documents);
                    return Array.isArray(docs) && docs.length > 0 ? (
                      <div className="card-soft p-4 space-y-2">
                        <div className="text-xs font-semibold text-gray-700">
                          Documents
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {docs.map((doc, idx) => {
                            const backendUrl = String(doc).startsWith("/")
                              ? `${window.location.protocol}//${window.location.hostname}:3000${doc}`
                              : doc;
                            return (
                              <a
                                key={idx}
                                href={backendUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                              >
                                📄 {String(doc).split("/").pop()}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ) : null;
                  } catch {
                    return null;
                  }
                })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllLeavesPage;

