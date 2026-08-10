import React, { useEffect, useMemo, useState } from "react";
import axios from "../../../lib/axios";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";
import { Req, ShortLeaveChip, lastReturnComment } from "../leaveUtils";

const ApplyDialog = ({ employee, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [types, setTypes] = useState([]);
  const [backupEmployees, setBackupEmployees] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const user = useAuthStore((s) => s.user);
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

  const [form, setForm] = useState({
    date: "",
    type: "",
    remarks: "",
    duty_from: "",
    duty_to: "",
    // New fields
    custom_type: "",
    backup_employee_id: "",
    backup_duty_from: "",
    backup_duty_to: "",
    documents: [],
    short_leave_from: "",
    short_leave_to: "",
  });

  // Helper function to convert UTC+5 time to local datetime-local format
  const toLocalDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Adjust for UTC+5 (5 hours ahead of UTC)
    const localDate = new Date(date.getTime() - 5 * 60 * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  // Helper function to convert local datetime-local to UTC+5
  const fromLocalDateTime = (localDateTime) => {
    if (!localDateTime) return null;
    const localDate = new Date(localDateTime);
    // Adjust for UTC+5 (5 hours ahead of UTC)
    const utc5Date = new Date(localDate.getTime() + 5 * 60 * 60 * 1000);
    return utc5Date.toISOString();
  };
  const [mode, setMode] = useState("single");
  const [shortLeave, setShortLeave] = useState(false);
  const [range, setRange] = useState({ start: "", end: "" });
  const [multiDates, setMultiDates] = useState([""]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Document upload handlers
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      setLoading(true);
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("documents", file);
      });

      // Add applicant CNIC to form data
      if (employee?.cnic) {
        formData.append("applicant_cnic", employee.cnic);
      }

      const response = await axios.post("/leaves/upload-documents", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        const uploadedFiles = response.data.files.map((file) => ({
          id: Date.now() + Math.random(),
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          path: file.path,
          filename: file.filename,
        }));

        setUploadedFiles((prev) => [...prev, ...uploadedFiles]);
        setForm((prev) => ({
          ...prev,
          documents: [...prev.documents, ...uploadedFiles],
        }));

        toastBus.emit({
          type: "success",
          message: `${files.length} file(s) uploaded successfully`,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toastBus.emit({
        type: "error",
        message: error.response?.data?.error || "Failed to upload files",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((f) => f.id !== fileId),
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  useEffect(() => {
    if (!open || !employee) return;
    let ignore = false;
    const load = async () => {
      try {
        setLoading(true);
        const [{ data: leavesRes }, { data: typesRes }, { data: backupRes }] =
          await Promise.all([
            axios.get(`/leaves/${employee.id}`),
            axios.get("/leave-banks/types"),
            axios.get(
              `/leaves/backup-employees?applicantId=${employee.id}`
            ),
          ]);
        if (ignore) return;
        setLeaves(leavesRes.leaves || []);
        setTypes(typesRes.types || []);
        setBackupEmployees(backupRes.employees || []);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [open, employee?.id]);


  const submit = async (e) => {
    e.preventDefault();
    const fail = (message) => toastBus.emit({ type: "error", message });
    if (!form.type) return fail("Leave type is required");
    if (form.type === "Other" && !form.custom_type.trim())
      return fail("Custom leave type is required");
    if (!form.duty_from || !form.duty_to)
      return fail("Duty time (from and to) is required");
    if (shortLeave) {
      if (!form.short_leave_from || !form.short_leave_to)
        return fail("Short leave time (from and to) is required");
      if (form.short_leave_from >= form.short_leave_to)
        return fail("Short leave 'to' time must be after 'from' time");
    }
    const body = {
      type: form.type,
      remarks: form.remarks,
      duty_from: form.duty_from || null,
      duty_to: form.duty_to || null,
      // New fields
      custom_type: form.custom_type || null,
      backup_employee_id: form.backup_employee_id || null,
      backup_duty_from: form.backup_duty_from || null,
      backup_duty_to: form.backup_duty_to || null,
      documents:
        form.documents.length > 0 ? form.documents.map((f) => f.path) : null,
      is_short_leave: shortLeave,
      short_leave_from: shortLeave ? form.short_leave_from : null,
      short_leave_to: shortLeave ? form.short_leave_to : null,
    };
    if (shortLeave || mode === "single") {
      if (!form.date) return fail("Leave date is required");
      body.date = form.date;
    } else if (mode === "range") {
      if (!range.start || !range.end)
        return fail("Start and end dates are required");
      body.start = range.start;
      body.end = range.end;
    } else if (mode === "multi") {
      const dates = multiDates.filter(Boolean);
      if (!dates.length) return fail("At least one leave date is required");
      body.dates = dates;
    }

    try {
      await axios.post(`/leaves/${employee.id}`, body);
      setForm({
        date: "",
        type: "",
        remarks: "",
        duty_from: "",
        duty_to: "",
        custom_type: "",
        backup_employee_id: "",
        backup_duty_from: "",
        backup_duty_to: "",
        documents: [],
        short_leave_from: "",
        short_leave_to: "",
      });
      setShortLeave(false);
      setRange({ start: "", end: "" });
      setMultiDates([""]);
      setUploadedFiles([]);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      toastBus.emit({ type: "success", message: "Leave(s) applied" });
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to apply leave",
      });
    }
  };

  const onDelete = async (leaveId) => {
    try {
      if (!window.confirm("Delete this pending leave?")) return;
      await axios.delete(`/leaves/${leaveId}`);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      toastBus.emit({ type: "success", message: "Leave deleted" });
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Delete failed",
      });
    }
  };

  return !open ? null : (
    <div className="fixed inset-0 backdrop-fade bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="modal-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-thin-scroll">
        <div className="modal-header">
          <h2 className="text-sm font-semibold tracking-wide">
            Apply Leave - {employee.full_name}
          </h2>
          <button onClick={onClose} className="btn btn-outline btn-sm text-xs">
            Close
          </button>
        </div>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="p-4 space-y-6">
            <form className="card-soft p-4 space-y-4" onSubmit={submit}>
              <div className="col-span-2 flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                <div>
                  <span className="text-xs font-semibold text-blue-800">
                    Short Leave
                  </span>
                  <p className="text-[10px] text-blue-700">
                    Time-boxed leave for a single date — specify the time
                    interval instead of a full day
                  </p>
                </div>
                <label className="flex items-center gap-2 select-none cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={shortLeave}
                    onChange={(e) => {
                      setShortLeave(e.target.checked);
                      if (e.target.checked) setMode("single");
                    }}
                  />
                  <span className="text-xs font-medium text-blue-800">
                    Apply as short leave
                  </span>
                </label>
              </div>
              <div className="filter-panel compact">
                <div>
                  <label className="form-label text-[11px] mb-1">
                    Type
                    <Req />
                  </label>
                  <select
                    className="form-input"
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                  >
                    <option value="">Select type</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
                {form.type === "Other" && (
                  <div className="col-span-2">
                    <label className="form-label text-[11px] mb-1">
                      Custom Leave Type
                      <Req />
                    </label>
                    <input
                      className="form-input"
                      placeholder="Enter custom leave type"
                      value={form.custom_type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, custom_type: e.target.value }))
                      }
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="form-label text-[11px] mb-1">
                    Reason for availing leave
                  </label>
                  <input
                    className="form-input"
                    placeholder="Optional"
                    value={form.remarks}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, remarks: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="form-label text-[11px] mb-1">
                    Duty time (from)
                    <Req />
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.duty_from}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, duty_from: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="form-label text-[11px] mb-1">
                    Duty time (to)
                    <Req />
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.duty_to}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, duty_to: e.target.value }))
                    }
                  />
                </div>
                {shortLeave && (
                  <>
                    <div>
                      <label className="form-label text-[11px] mb-1">
                        Short Leave Time (From)
                        <Req />
                      </label>
                      <input
                        type="time"
                        className="form-input"
                        value={form.short_leave_from}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            short_leave_from: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="form-label text-[11px] mb-1">
                        Short Leave Time (To)
                        <Req />
                      </label>
                      <input
                        type="time"
                        className="form-input"
                        value={form.short_leave_to}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            short_leave_to: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="form-label text-[11px] mb-1">
                    Backup Resource
                  </label>
                  <select
                    className="form-input"
                    value={form.backup_employee_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        backup_employee_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select backup employee</option>
                    {backupEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.cnic || "-"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label text-[11px] mb-1">
                    Backup Duty Time (From)
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.backup_duty_from}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        backup_duty_from: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="form-label text-[11px] mb-1">
                    Backup Duty Time (To)
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.backup_duty_to}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, backup_duty_to: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="form-label text-[11px] mb-1">Mode</label>
                  <select
                    className="form-input"
                    value={shortLeave ? "single" : mode}
                    onChange={(e) => setMode(e.target.value)}
                    disabled={shortLeave}
                    title={
                      shortLeave
                        ? "Short leave is always for a single date"
                        : undefined
                    }
                  >
                    <option value="single">Single Date</option>
                    {!shortLeave && (
                      <>
                        <option value="range">Date Range</option>
                        <option value="multi">Multiple Dates</option>
                      </>
                    )}
                  </select>
                  {shortLeave && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Short leave is limited to a single date
                    </p>
                  )}
                </div>
              </div>

              {(shortLeave || mode === "single") && (
                <div>
                  <label className="form-label text-[11px] mb-1">
                    Date
                    <Req />
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
              )}

              {!shortLeave && mode === "range" && (
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[140px]">
                    <label className="form-label text-[11px] mb-1">
                      Start
                      <Req />
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={range.start}
                      onChange={(e) =>
                        setRange((r) => ({ ...r, start: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="form-label text-[11px] mb-1">
                      End
                      <Req />
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={range.end}
                      onChange={(e) =>
                        setRange((r) => ({ ...r, end: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              {!shortLeave && mode === "multi" && (
                <div className="space-y-2">
                  <label className="form-label text-[11px] mb-1">
                    Dates
                    <Req />
                  </label>
                  {multiDates.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="date"
                        className="form-input !py-1 !px-2"
                        value={d}
                        onChange={(e) =>
                          setMultiDates((arr) => {
                            const c = [...arr];
                            c[idx] = e.target.value;
                            return c;
                          })
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-error-soft text-[11px]"
                        onClick={() =>
                          setMultiDates((arr) =>
                            arr.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline text-[11px]"
                    onClick={() => setMultiDates((arr) => [...arr, ""])}
                  >
                    Add another date
                  </button>
                </div>
              )}

              {/* Document Upload Section */}
              <div className="space-y-3">
                <label className="form-label text-[11px] mb-1">
                  Supporting Documents (Optional)
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    multiple
                    className="form-input text-xs"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  />
                  <p className="text-xs text-gray-500">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF
                  </p>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">
                      Uploaded Files ({uploadedFiles.length}):
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600">📄</span>
                            <span className="font-medium">{file.name}</span>
                            <span className="text-gray-500">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button type="submit" className="btn btn-success text-xs">
                  Apply
                </button>
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Applied Leaves ({leaves.length})
              </h3>
              {leaves.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-sm">No leaves applied yet</div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {leaves.map((l) => (
                    <div
                      key={l.id}
                      className="card-soft p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Basic Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                Date:
                              </span>
                              <span className="text-sm font-semibold">
                                {l.date?.slice(0, 10)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                Type:
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">
                                  {l.type}
                                </span>
                                <ShortLeaveChip leave={l} />
                                {l.type === "Other" && l.custom_type && (
                                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    {l.custom_type}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                Status:
                              </span>
                              <span
                                className={`badge text-xs ${
                                  l.current_status === "APPROVED"
                                    ? "badge-success"
                                    : l.current_status === "REJECTED"
                                    ? "badge-error"
                                    : l.current_status === "RETURNED"
                                    ? "badge-amber"
                                    : "badge-gray"
                                }`}
                              >
                                {l.current_status === "RETURNED"
                                  ? "RETURNED FOR CORRECTION"
                                  : l.current_status}
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                Reason:
                              </span>
                              <span className="text-sm text-gray-800">
                                {l.remarks || "No reason provided"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                Submitted:
                              </span>
                              <span className="text-sm">
                                {l.submission_time
                                  ? new Date(l.submission_time).toLocaleString(
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

                          {/* Minimal list: Backup, documents, and routing moved to Details modal */}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          {l.current_status === "PENDING" && (
                            <button
                              className="btn btn-error-soft text-xs px-3 py-1"
                              onClick={() => onDelete(l.id)}
                            >
                              Delete
                            </button>
                          )}
                          <button
                            className="btn btn-outline text-xs px-3 py-1"
                            onClick={() => setSelectedLeave(l)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                      {l.current_status === "RETURNED" && (
                        <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                          <span className="font-semibold">
                            Correction requested:
                          </span>{" "}
                          {lastReturnComment(l) || "No reason provided"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leave Details Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 backdrop-fade bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-thin-scroll">
            <div className="modal-header">
              <h2 className="text-sm font-semibold tracking-wide">
                Leave Details - {selectedLeave.date?.slice(0, 10)}
              </h2>
              <button
                onClick={() => setSelectedLeave(null)}
                className="btn btn-outline btn-sm text-xs"
              >
                Close
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Basic Information */}
              <div className="card-soft p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">
                      Applicant:
                    </span>
                    <span className="ml-2">{employee?.full_name || "-"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">CNIC:</span>
                    <span className="ml-2">{employee?.cnic || "-"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Date:</span>
                    <span className="ml-2">
                      {selectedLeave.date?.slice(0, 10)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Type:</span>
                    <span className="ml-2">{selectedLeave.type}</span>
                    <span className="ml-2">
                      <ShortLeaveChip leave={selectedLeave} />
                    </span>
                    {selectedLeave.type === "Other" &&
                      selectedLeave.custom_type && (
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                          {selectedLeave.custom_type}
                        </span>
                      )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <span
                      className={`ml-2 badge ${
                        selectedLeave.current_status === "APPROVED"
                          ? "badge-success"
                          : selectedLeave.current_status === "REJECTED"
                          ? "badge-error"
                          : selectedLeave.current_status === "RETURNED"
                          ? "badge-amber"
                          : "badge-gray"
                      }`}
                    >
                      {selectedLeave.current_status === "RETURNED"
                        ? "RETURNED FOR CORRECTION"
                        : selectedLeave.current_status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Submitted:
                    </span>
                    <span className="ml-2">
                      {selectedLeave.submission_time
                        ? new Date(
                            selectedLeave.submission_time
                          ).toLocaleString("en-PK", {
                            timeZone: "Asia/Karachi",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Designation:
                    </span>
                    <span className="ml-2">
                      {employee?.employmentRecords?.[0]?.designation?.title ||
                        "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Location:</span>
                    <span className="ml-2">
                      {employee?.employmentRecords?.[0]?.location?.name || "-"}
                    </span>
                  </div>
                </div>
                {selectedLeave.remarks && (
                  <div>
                    <span className="font-medium text-gray-600">Reason:</span>
                    <p className="mt-1 text-sm text-gray-800">
                      {selectedLeave.remarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Duty Information */}
              {(selectedLeave.duty_from ||
                selectedLeave.duty_to ||
                selectedLeave.is_short_leave) && (
                <div className="card-soft p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Duty Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">
                        Duty Time:
                      </span>
                      <span className="ml-2">
                        {selectedLeave.duty_from && selectedLeave.duty_to
                          ? `${selectedLeave.duty_from} - ${selectedLeave.duty_to}`
                          : "Not specified"}
                      </span>
                    </div>
                    {selectedLeave.is_short_leave && (
                      <div>
                        <span className="font-medium text-gray-600">
                          Short Leave Time:
                        </span>
                        <span className="ml-2">
                          {selectedLeave.short_leave_from &&
                          selectedLeave.short_leave_to
                            ? `${selectedLeave.short_leave_from} - ${selectedLeave.short_leave_to}`
                            : "Not specified"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Backup Information */}
              {selectedLeave.backup_employee && (
                <div className="card-soft p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Backup Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">
                        Backup Employee:
                      </span>
                      <span className="ml-2">{`${
                        selectedLeave.backup_employee.full_name || "User"
                      }_${selectedLeave.backup_employee.cnic || "-"}`}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Backup Time:
                      </span>
                      <span className="ml-2">
                        {selectedLeave.backup_duty_from &&
                        selectedLeave.backup_duty_to
                          ? `${selectedLeave.backup_duty_from} - ${selectedLeave.backup_duty_to}`
                          : "Not specified"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status History */}
              {Array.isArray(selectedLeave.statusHistory) &&
                selectedLeave.statusHistory.length > 0 && (
                  <div className="card-soft p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Status History
                    </h3>
                    <div className="space-y-1">
                      {selectedLeave.statusHistory.map((h, idx) => {
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
                                <span className="whitespace-nowrap">{h.user?.email || "User"}</span>
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
                )}


              {/* Documents */}
              {selectedLeave.documents &&
                JSON.parse(selectedLeave.documents).length > 0 && (
                  <div className="card-soft p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Supporting Documents
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(selectedLeave.documents).map((doc, idx) => {
                        const backendUrl = doc.startsWith("/")
                          ? `${window.location.protocol}//${window.location.hostname}:3000${doc}`
                          : doc;
                        return (
                          <a
                            key={idx}
                            href={backendUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-100 text-blue-800 px-3 py-2 rounded hover:bg-blue-200 cursor-pointer flex items-center gap-2"
                          >
                            📄 {doc.split("/").pop()}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LeaveApply = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/leaves/apply/employees", {
        params: { search },
      });
      setEmployees(data.employees || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          Apply Leave
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
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="table-shell card-soft p-0 overflow-auto custom-thin-scroll">
          <table className="table-enhanced">
            <thead>
              <tr>
                <th>CNIC</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Recent Leaves</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.cnic || "-"}</td>
                  <td className="text-left">{emp.full_name}</td>
                  <td className="text-left">
                    {emp.employmentRecords?.[0]?.designation?.title || "-"}
                  </td>
                  <td>
                    <div className="max-h-24 overflow-y-auto pr-1 space-y-1 custom-thin-scroll text-[10px]">
                      {(emp.leaves || []).map((l) => (
                        <div key={l.id} className="text-gray-700">
                          {l.date?.slice(0, 10)} - {l.type} ({l.status})
                        </div>
                      ))}
                      {!emp.leaves?.length && (
                        <span className="text-gray-400">No leaves</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary text-[11px]"
                      onClick={() => setSelected(emp)}
                    >
                      Apply
                    </button>
                  </td>
                </tr>
              ))}
              {!employees.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-6 text-xs text-gray-500"
                  >
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <ApplyDialog
        open={!!selected}
        employee={selected}
        onClose={() => {
          setSelected(null);
          load();
        }}
      />
    </div>
  );
};

export default LeaveApply;
