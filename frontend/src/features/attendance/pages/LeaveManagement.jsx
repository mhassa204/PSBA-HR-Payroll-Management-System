import React, { useEffect, useMemo, useState } from "react";
import axios from "../../../lib/axios";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";
import { useNavigate } from "react-router-dom";

const LeaveDialog = ({ employee, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [types, setTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [backupEmployees, setBackupEmployees] = useState([]);
  const [form, setForm] = useState({
    date: "",
    type: "",
    remarks: "",
    duty_from: "",
    duty_to: "",
    // New fields
    submission_time: "",
    custom_type: "",
    backup_employee_id: "",
    backup_duty_from: "",
    backup_duty_to: "",
    documents: [],
  });
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
  const [canStatus, setCanStatus] = useState(false);
  const [mode, setMode] = useState("single"); // 'single' | 'range' | 'multi'
  const [range, setRange] = useState({ start: "", end: "" });
  const [multiDates, setMultiDates] = useState([""]);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (!open || !employee) return;
    let ignore = false;
    const load = async () => {
      try {
        setLoading(true);
        const me = await axios.get("/me");
        const perms = me?.data?.user?.permissions || [];
        setCanStatus(perms.includes("*") || perms.includes("leaves.status"));
        const [{ data: leavesRes }, { data: typesRes }, { data: backupRes }] =
          await Promise.all([
            axios.get(`/leaves/${employee.id}`),
            axios.get("/leave-banks/types"),
            axios.get(`/leaves/backup-employees?applicantId=${employee.id}`),
          ]);
        if (ignore) return;
        setLeaves(leavesRes.leaves || []);
        setSummary(leavesRes.summary || null);
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
    if (!form.type) return;
    const body = {
      type: form.type,
      remarks: form.remarks,
      duty_from: form.duty_from || null,
      duty_to: form.duty_to || null,
      // New fields
      submission_time: form.submission_time
        ? fromLocalDateTime(form.submission_time)
        : null,
      custom_type: form.custom_type || null,
      backup_employee_id: form.backup_employee_id || null,
      backup_duty_from: form.backup_duty_from || null,
      backup_duty_to: form.backup_duty_to || null,
      documents:
        form.documents.length > 0 ? form.documents.map((f) => f.path) : null,
    };
    if (mode === "single") {
      if (!form.date) return;
      body.date = form.date;
    } else if (mode === "range") {
      if (!range.start || !range.end) return;
      body.start = range.start;
      body.end = range.end;
    } else if (mode === "multi") {
      const dates = multiDates.filter(Boolean);
      if (!dates.length) return;
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
        submission_time: "",
        custom_type: "",
        backup_employee_id: "",
        backup_duty_from: "",
        backup_duty_to: "",
        documents: [],
      });
      setRange({ start: "", end: "" });
      setMultiDates([""]);
      setUploadedFiles([]);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      setSummary(data.summary || null);
      toastBus.emit({ type: "success", message: "Leaves added" });
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to add leaves",
      });
    }
  };

  const update = async (leaveId, patch) => {
    try {
      await axios.put(`/leaves/${leaveId}`, patch);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      setSummary(data.summary || null);
      toastBus.emit({ type: "success", message: "Leave updated" });
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to update leave",
      });
    }
  };

  const updateStatus = async (leaveId, status) => {
    try {
      await axios.patch(`/leaves/${leaveId}/status`, { status });
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      setSummary(data.summary || null);
      toastBus.emit({ type: "success", message: "Leave status updated" });
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to update status",
      });
    }
  };

  const remove = async (leaveId) => {
    try {
      await axios.delete(`/leaves/${leaveId}`);
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      setSummary(data.summary || null);
      toastBus.emit({ type: "success", message: "Leave deleted" });
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Failed to delete leave",
      });
    }
  };

  // Group consecutive (by date) leaves of same type into ranges
  const groupedLeaves = useMemo(() => {
    if (!leaves?.length) return [];
    // sort by date ascending
    const sorted = [...leaves].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const groups = [];
    const ONE_DAY = 24 * 60 * 60 * 1000;
    let current = null;
    for (const lv of sorted) {
      const d = new Date(lv.date);
      if (!current) {
        current = {
          type: lv.type,
          leaves: [lv],
          start: lv.date,
          end: lv.date,
          statuses: new Set([lv.status]),
          remarksSet: new Set([lv.remarks || ""]),
        };
        continue;
      }
      const prevDate = new Date(current.end);
      const contiguous = d - prevDate === ONE_DAY;
      if (contiguous && lv.type === current.type) {
        current.leaves.push(lv);
        current.end = lv.date;
        current.statuses.add(lv.status);
        if (lv.remarks) current.remarksSet.add(lv.remarks);
      } else {
        groups.push(current);
        current = {
          type: lv.type,
          leaves: [lv],
          start: lv.date,
          end: lv.date,
          statuses: new Set([lv.status]),
          remarksSet: new Set([lv.remarks || ""]),
        };
      }
    }
    if (current) groups.push(current);
    return groups.map((g, i) => ({
      key: `${g.start}_${g.end}_${g.type}_${i}`,
      type: g.type,
      start: g.start,
      end: g.end,
      count: g.leaves.length,
      status: g.statuses.size === 1 ? Array.from(g.statuses)[0] : "MIXED",
      remarks: g.remarksSet.size === 1 ? Array.from(g.remarksSet)[0] : "",
      leaveIds: g.leaves.map((l) => l.id),
    }));
  }, [leaves]);

  const bulkUpdateGroupStatus = async (group, status) => {
    if (!canStatus) return;
    try {
      setBulkBusy(true);
      // perform parallel status updates
      await Promise.all(
        group.leaveIds.map((id) =>
          axios.patch(`/leaves/${id}/status`, { status })
        )
      );
      const { data } = await axios.get(`/leaves/${employee.id}`);
      setLeaves(data.leaves || []);
      setSummary(data.summary || null);
      toastBus.emit({
        type: "success",
        message: `Updated ${group.leaveIds.length} leaves (${group.start} to ${group.end}) to ${status}`,
      });
    } catch (e) {
      toastBus.emit({
        type: "error",
        message: e?.response?.data?.error || "Bulk status update failed",
      });
    } finally {
      setBulkBusy(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 backdrop-fade bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="modal-surface w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-thin-scroll">
        <div className="modal-header">
          <h2 className="text-sm font-semibold tracking-wide">
            Manage Leaves - {employee.full_name}
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
            {summary && (
              <div className="card-soft p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-700">
                  Current Leave Bank: {summary.title || `#${summary.bankId}`} (
                  {String(summary.period_start).slice(0, 10)} to{" "}
                  {String(summary.period_end).slice(0, 10)})
                </div>
                <div className="grid md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-3">
                  {(summary.items || []).map((it) => (
                    <div
                      key={it.typeId}
                      className="rounded border border-gray-200 bg-white p-2 shadow-sm"
                    >
                      <div className="text-[11px] font-semibold text-gray-700 mb-1">
                        {it.typeName}
                      </div>
                      <div className="flex flex-col gap-0.5 text-[10px] text-gray-600">
                        <span>Allocated: {it.allocated}</span>
                        <span className="text-green-700">
                          Approved: {it.approvedUsed}
                        </span>
                        <span className="text-amber-700">
                          Pending: {it.pending}
                        </span>
                        <span className="text-blue-700 font-medium">
                          Available: {it.available}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!summary.items?.length && (
                    <div className="text-xs text-gray-500">
                      No types configured
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* New grouped consecutive leaves card */}
            {groupedLeaves.length > 0 && (
              <div className="card-soft p-0 overflow-hidden">
                <div className="card-soft-header flex justify-between items-center">
                  <span>Grouped Consecutive Leaves</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    (Same type, adjacent dates)
                  </span>
                </div>
                <div className="table-shell overflow-auto max-h-[35vh] custom-thin-scroll">
                  <table className="table-enhanced text-[11px]">
                    <thead>
                      <tr>
                        <th>Start</th>
                        <th>End</th>
                        <th>Days</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Reason</th>
                        {canStatus && <th>Bulk Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedLeaves.map((g) => (
                        <tr key={g.key}>
                          <td>{g.start?.slice(0, 10)}</td>
                          <td>{g.end?.slice(0, 10)}</td>
                          <td>{g.count}</td>
                          <td>{g.type}</td>
                          <td>{g.status}</td>
                          <td
                            className="text-left whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis"
                            title={g.remarks}
                          >
                            {g.remarks || "-"}
                          </td>
                          {canStatus && (
                            <td className="space-x-1">
                              <button
                                disabled={bulkBusy}
                                onClick={() =>
                                  bulkUpdateGroupStatus(g, "APPROVED")
                                }
                                className="btn btn-success text-[10px]"
                              >
                                Approve
                              </button>
                              <button
                                disabled={bulkBusy}
                                onClick={() =>
                                  bulkUpdateGroupStatus(g, "REJECTED")
                                }
                                className="btn btn-error-soft text-[10px]"
                              >
                                Reject
                              </button>
                              <button
                                disabled={bulkBusy}
                                onClick={() =>
                                  bulkUpdateGroupStatus(g, "PENDING")
                                }
                                className="btn btn-outline text-[10px]"
                              >
                                Pending
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {!groupedLeaves.length && (
                        <tr>
                          <td
                            colSpan={canStatus ? 6 : 5}
                            className="text-center py-4 text-xs text-gray-500"
                          >
                            No grouped leaves
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <form className="card-soft p-4 space-y-4" onSubmit={submit}>
              <div className="filter-panel compact">
                <div>
                  <label className="form-label text-[11px] mb-1">Type</label>
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
                <div>
                  <label className="form-label text-[11px] mb-1">
                    Submission Time
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={form.submission_time}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        submission_time: e.target.value,
                      }))
                    }
                  />
                </div>
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
                        {emp.full_name} ({emp.employee_id})
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
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option value="single">Single Date</option>
                    <option value="range">Date Range</option>
                    <option value="multi">Multiple Dates</option>
                  </select>
                </div>
              </div>

              {mode === "single" && (
                <div>
                  <label className="form-label text-[11px] mb-1">Date</label>
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

              {mode === "range" && (
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[140px]">
                    <label className="form-label text-[11px] mb-1">Start</label>
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
                    <label className="form-label text-[11px] mb-1">End</label>
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

              {mode === "multi" && (
                <div className="space-y-2">
                  <label className="form-label text-[11px] mb-1">Dates</label>
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
                  Save
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Leave Records ({leaves.length})
              </h3>
              {leaves.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-sm">No leave records found</div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {leaves.map((l) => (
                    <div
                      key={l.id}
                      className="card-soft p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Basic Info */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="form-label text-xs mb-1">
                                Leave Date
                              </label>
                              <input
                                type="date"
                                className="form-input text-sm"
                                value={l.date?.slice(0, 10)}
                                onChange={(e) =>
                                  update(l.id, { date: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <label className="form-label text-xs mb-1">
                                Status
                              </label>
                              {canStatus ? (
                                <select
                                  className="form-input text-sm"
                                  value={l.status}
                                  onChange={(e) =>
                                    updateStatus(l.id, e.target.value)
                                  }
                                >
                                  <option value="PENDING">PENDING</option>
                                  <option value="APPROVED">APPROVED</option>
                                  <option value="REJECTED">REJECTED</option>
                                </select>
                              ) : (
                                <span
                                  className={`badge text-xs ${
                                    l.status === "APPROVED"
                                      ? "badge-success"
                                      : l.status === "REJECTED"
                                      ? "badge-error"
                                      : "badge-gray"
                                  }`}
                                >
                                  {l.status}
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="form-label text-xs mb-1">
                              Leave Type
                            </label>
                            <div className="space-y-2">
                              <select
                                className="form-input text-sm"
                                value={l.type}
                                onChange={(e) =>
                                  update(l.id, { type: e.target.value })
                                }
                              >
                                {types.map((t) => (
                                  <option key={t.id} value={t.name}>
                                    {t.name}
                                  </option>
                                ))}
                                <option value="Other">Other</option>
                                {!types.length && (
                                  <option value={l.type}>{l.type}</option>
                                )}
                              </select>
                              {l.type === "Other" && (
                                <input
                                  type="text"
                                  className="form-input text-sm"
                                  placeholder="Enter custom leave type"
                                  value={l.custom_type || ""}
                                  onChange={(e) =>
                                    update(l.id, {
                                      custom_type: e.target.value,
                                    })
                                  }
                                />
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="form-label text-xs mb-1">
                              Reason
                            </label>
                            <textarea
                              className="form-input text-sm"
                              rows={2}
                              value={l.remarks || ""}
                              onChange={(e) =>
                                update(l.id, { remarks: e.target.value })
                              }
                              placeholder="Enter reason for leave"
                            />
                          </div>
                        </div>

                        {/* Right Column - Advanced Info */}
                        <div className="space-y-4">
                          <div>
                            <label className="form-label text-xs mb-1">
                              Submission Time
                            </label>
                            <input
                              type="datetime-local"
                              className="form-input text-sm"
                              value={toLocalDateTime(l.submission_time)}
                              onChange={(e) =>
                                update(l.id, {
                                  submission_time: fromLocalDateTime(
                                    e.target.value
                                  ),
                                })
                              }
                            />
                          </div>

                          <div>
                            <label className="form-label text-xs mb-1">
                              Backup Resource
                            </label>
                            <select
                              className="form-input text-sm"
                              value={l.backup_employee_id || ""}
                              onChange={(e) =>
                                update(l.id, {
                                  backup_employee_id: e.target.value,
                                })
                              }
                            >
                              <option value="">Select backup employee</option>
                              {backupEmployees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.full_name} ({emp.employee_id})
                                </option>
                              ))}
                              {l.backup_employee &&
                                !backupEmployees.find(
                                  (emp) => emp.id === l.backup_employee_id
                                ) && (
                                  <option value={l.backup_employee_id} selected>
                                    {l.backup_employee.full_name} (
                                    {l.backup_employee.employee_id})
                                  </option>
                                )}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="form-label text-xs mb-1">
                                Backup Duty From
                              </label>
                              <input
                                type="time"
                                className="form-input text-sm"
                                value={l.backup_duty_from || ""}
                                onChange={(e) =>
                                  update(l.id, {
                                    backup_duty_from: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="form-label text-xs mb-1">
                                Backup Duty To
                              </label>
                              <input
                                type="time"
                                className="form-input text-sm"
                                value={l.backup_duty_to || ""}
                                onChange={(e) =>
                                  update(l.id, {
                                    backup_duty_to: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Documents */}
                      {l.documents && JSON.parse(l.documents).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                Documents:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {JSON.parse(l.documents).map((doc, idx) => {
                                  // Convert relative path to full backend URL
                                  const backendUrl = doc.startsWith("/")
                                    ? `${window.location.protocol}//${window.location.hostname}:3000${doc}`
                                    : doc;
                                  return (
                                    <a
                                      key={idx}
                                      href={backendUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 cursor-pointer"
                                    >
                                      📄 {doc.split("/").pop()}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                        <button
                          className="btn btn-error-soft text-xs px-3 py-1"
                          onClick={() => remove(l.id)}
                        >
                          Delete Leave
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main page reskin
const LeaveManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [cnicFilter, setCnicFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/leaves/employees", {
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

  const filtered = useMemo(() => {
    const norm = (s) => (s || "").toString().toLowerCase();
    const normDigits = (s) => (s || "").toString().replace(/\D/g, "");
    const cnicTerm = normDigits(cnicFilter);
    return employees.filter((emp) => {
      if (!cnicTerm) return true;
      const empCnicDigits = normDigits(emp.cnic);
      return empCnicDigits.includes(cnicTerm);
    });
  }, [employees, cnicFilter]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          Leave Management
        </h1>
        <div className="actions-inline">
          <button
            className="btn btn-outline text-xs"
            onClick={() => navigate("/attendance/leave-bank")}
          >
            Leave Bank
          </button>
          <input
            className="form-input !py-1 !px-2 text-xs w-48"
            placeholder="Search employees"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            className="form-input !py-1 !px-2 text-xs w-40"
            placeholder="Filter CNIC"
            value={cnicFilter}
            onChange={(e) => setCnicFilter(e.target.value)}
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
                <th>Employee ID</th>
                <th>CNIC</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Current Leave Bank</th>
                <th>Recent Leaves</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.employee_id || "-"}</td>
                  <td>{emp.cnic || "-"}</td>
                  <td className="text-left">{emp.full_name}</td>
                  <td className="text-left">
                    {emp.employmentRecords?.[0]?.designation?.title || "-"}
                  </td>
                  <td className="text-left">
                    {emp.currentLeaveBankSummary ? (
                      <div className="space-y-1 text-[10px]">
                        <div className="font-semibold text-gray-700">
                          {emp.currentLeaveBankSummary.title ||
                            `#${emp.currentLeaveBankSummary.bankId}`}
                        </div>
                        <div className="text-gray-500">
                          {String(
                            emp.currentLeaveBankSummary.period_start
                          ).slice(0, 10)}{" "}
                          to{" "}
                          {String(emp.currentLeaveBankSummary.period_end).slice(
                            0,
                            10
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(emp.currentLeaveBankSummary.items || []).map(
                            (it) => (
                              <span
                                key={it.typeId}
                                className="badge badge-blue"
                              >
                                {it.typeName}: {it.approvedUsed}/{it.allocated}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-500">
                        No active leave bank
                      </span>
                    )}
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
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={7}
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
      <LeaveDialog
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

export default LeaveManagement;
