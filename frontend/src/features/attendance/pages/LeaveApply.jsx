import React, { useEffect, useMemo, useState } from "react";
import axios from "../../../lib/axios";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";

const ApplyDialog = ({ employee, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [types, setTypes] = useState([]);
  const [backupEmployees, setBackupEmployees] = useState([]);
  const [approverOptions, setApproverOptions] = useState([]);
  const [routeType, setRouteType] = useState("RECOMMEND");
  const [routes, setRoutes] = useState([]); // { type: 'RECOMMEND'|'ALLOW', approver_user_id, display }
  const [selectedLeave, setSelectedLeave] = useState(null);
  const user = useAuthStore((s) => s.user);
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
            axios.get("/leaves/backup-employees"),
          ]);
        if (ignore) return;
        setLeaves(leavesRes.leaves || []);
        setTypes(typesRes.types || []);
        setBackupEmployees(backupRes.employees || []);
        // Load initial approver users
        loadApprovers();
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

  const loadApprovers = async () => {
    try {
      const { data } = await axios.get("/leaves/approver-users");
      const meId = user?.id;
      const meEmail = user?.email;
      const options = (data.users || [])
        .filter((u) => Number(u.id) !== Number(meId) && u.email !== meEmail)
        .map((u) => ({ value: u.id, label: u.email, description: "" }));
      setApproverOptions(options);
    } catch (e) {}
  };

  const addRoute = (userId, userEmail) => {
    const id = Number(userId);
    if (!id) return;
    const exists = routes.some(
      (r) => r.approver_user_id === id && r.type === routeType
    );
    if (exists) return;
    setRoutes((prev) => [
      ...prev,
      { type: routeType, approver_user_id: id, display: userEmail },
    ]);
  };

  const removeRoute = (idx) => {
    setRoutes((prev) => prev.filter((_, i) => i !== idx));
  };

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
      routes: routes.map((r) => ({
        type: r.type,
        approver_user_id: r.approver_user_id,
      })),
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
      setRoutes([]);
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
                        {emp.full_name} ({emp.cnic || "-"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Manual Approval Routing */}
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-gray-600 mb-2">
                    Manual Routing (Recommendation / Allow)
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="form-label text-[11px] mb-1">
                        Type
                      </label>
                      <select
                        className="form-input !w-40"
                        value={routeType}
                        onChange={(e) => setRouteType(e.target.value)}
                      >
                        <option value="RECOMMEND">Recommendation by</option>
                        <option value="ALLOW">Allow by</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[400px]">
                      <label className="form-label text-[11px] mb-1">
                        Select User
                      </label>
                      <SearchableSelect
                        options={approverOptions}
                        value=""
                        onChange={(value, label) => {
                          if (value) {
                            addRoute(value, label);
                          }
                        }}
                        placeholder="Search and select user..."
                        allowClear={false}
                        dropdownPriority="high"
                      />
                    </div>
                  </div>
                  {!!routes.length && (
                    <div className="mt-3 space-y-2">
                      {routes.map((r, idx) => (
                        <div
                          key={`${r.type}-${r.approver_user_id}-${idx}`}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="badge badge-gray">
                              {r.type === "RECOMMEND"
                                ? "Recommendation"
                                : "Allow"}
                            </span>
                            <span>{r.display}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-error-soft text-[11px]"
                            onClick={() => removeRoute(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                                  l.status === "APPROVED"
                                    ? "badge-success"
                                    : l.status === "REJECTED"
                                    ? "badge-error"
                                    : "badge-gray"
                                }`}
                              >
                                {l.status}
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
                          {l.status === "PENDING" && (
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
                    <span className="font-medium text-gray-600">Date:</span>
                    <span className="ml-2">
                      {selectedLeave.date?.slice(0, 10)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Type:</span>
                    <span className="ml-2">{selectedLeave.type}</span>
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
                        selectedLeave.status === "APPROVED"
                          ? "badge-success"
                          : selectedLeave.status === "REJECTED"
                          ? "badge-error"
                          : "badge-gray"
                      }`}
                    >
                      {selectedLeave.status}
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
              {(selectedLeave.duty_from || selectedLeave.duty_to) && (
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
                      {selectedLeave.statusHistory.map((h, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="badge badge-gray">
                              {h.action_type}
                            </span>
                            <span>{h.user?.email || "User"}</span>
                          </div>
                          <div className="text-gray-600">
                            {new Date(h.action_time).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Approval Routing */}
              {selectedLeave.routes && selectedLeave.routes.length > 0 && (
                <div className="card-soft p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Approval Routing
                  </h3>
                  <div className="space-y-2">
                    {selectedLeave.routes.map((rt, idx) => {
                      const label =
                        rt.type === "RECOMMEND" ? "Recommendation" : "Allow";
                      const approver =
                        rt.approver_user?.email ||
                        `User #${rt.approver_user_id}`;
                      return (
                        <div
                          key={`${rt.id || idx}-${rt.type}`}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                        >
                          <span className="badge badge-gray text-xs px-2 py-1">
                            {label}
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            {approver}
                          </span>
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
