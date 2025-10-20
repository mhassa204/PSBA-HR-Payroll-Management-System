import React, { useEffect, useMemo, useState } from "react";
import axios from "../../../lib/axios";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { toastBus } from "../../../utils/toastBus";

const ApplyDialog = ({ employee, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [types, setTypes] = useState([]);
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
      });
      setRange({ start: "", end: "" });
      setMultiDates([""]);
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

              <div>
                <button type="submit" className="btn btn-success text-xs">
                  Apply
                </button>
              </div>
            </form>

            <div className="card-soft p-0 overflow-hidden">
              <div className="table-shell overflow-auto max-h-[55vh] custom-thin-scroll min-w-[800px]">
                <table className="table-enhanced text-xs">
                  <thead>
                    <tr>
                      <th className="w-24">Date</th>
                      <th className="w-32">Type</th>
                      <th className="w-20">Status</th>
                      <th className="w-40">Reason</th>
                      <th className="w-32">Submission Time</th>
                      <th className="w-40">Backup Resource</th>
                      <th className="w-32">Backup Duty Time</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="text-xs">{l.date?.slice(0, 10)}</td>
                        <td className="text-xs">
                          <div className="space-y-1">
                            <div className="font-medium">{l.type}</div>
                            {l.type === "Other" && l.custom_type && (
                              <div className="text-[10px] text-gray-600 bg-gray-50 px-1 py-0.5 rounded">
                                {l.custom_type}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge text-[10px] ${
                              l.status === "APPROVED"
                                ? "badge-success"
                                : l.status === "REJECTED"
                                ? "badge-error"
                                : "badge-gray"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td
                          className="text-xs max-w-[200px] truncate"
                          title={l.remarks || ""}
                        >
                          {l.remarks || "-"}
                        </td>
                        <td className="text-xs">
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
                            : "-"}
                        </td>
                        <td
                          className="text-xs max-w-[200px] truncate"
                          title={
                            l.backup_employee
                              ? `${l.backup_employee.full_name} (${l.backup_employee.employee_id})`
                              : ""
                          }
                        >
                          {l.backup_employee
                            ? `${l.backup_employee.full_name}`
                            : "-"}
                        </td>
                        <td className="text-xs">
                          {l.backup_duty_from && l.backup_duty_to
                            ? `${l.backup_duty_from}-${l.backup_duty_to}`
                            : "-"}
                        </td>
                        <td className="text-right">
                          {l.status === "PENDING" && (
                            <button
                              className="btn btn-error-soft text-[10px] px-2 py-1"
                              onClick={() => onDelete(l.id)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!leaves.length && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-6 text-xs text-gray-500"
                        >
                          No leaves
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
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
                <th>Employee ID</th>
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
                  <td>{emp.employee_id || "-"}</td>
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
