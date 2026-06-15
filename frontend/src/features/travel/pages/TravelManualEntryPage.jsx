import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EnhancedModal from "@/components/ui/EnhancedModal";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "../../auth/authStore";
import api from "../../../lib/axios";
import { getTravelCapabilities } from "../../../services/travelService";
import { formatTime } from "../../../utils/dateFormatter";

export default function TravelManualEntryPage() {
  const me = useAuthStore((s) => s.user);
  const [caps, setCaps] = useState({
    isAccountsHod: false,
    isSuperAdmin: false,
  });
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ack, setAck] = useState("");
  const [form, setForm] = useState({
    applicant_id: "",
    departure_date: "",
    departure_time: "",
    expected_return_date: "",
    purpose: "",
    destination: "",
    employee_ids: [],
    submission_date: "",
    submission_time: "",
  });
  const [applicantReportees, setApplicantReportees] = useState([]);
  const [created, setCreated] = useState(null);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/travel/employees/search", {
        params: { q: search },
      });
      setEmployees(res.data?.employees || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadEmployees();
  }, []);

  // Capability guard: Super Admin only
  useEffect(() => {
    (async () => {
      try {
        const c = await getTravelCapabilities();
        setCaps(c || {});
      } catch (_) {}
    })();
  }, []);
  if (!caps.isSuperAdmin) {
    return (
      <div className="p-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
        Unauthorized: Only Super Admin can access TADA Managed Entry.
      </div>
    );
  }

  // Fetch reportees after applicant picked
  useEffect(() => {
    (async () => {
      setApplicantReportees([]);
      if (!form.applicant_id) return;
      try {
        const res = await api.get(
          `/travel/employees/${form.applicant_id}/reportees`
        );
        setApplicantReportees(res.data?.employees || []);
      } catch (_) {}
    })();
  }, [form.applicant_id]);

  const pickApplicant = (emp) => {
    setForm((f) => ({ ...f, applicant_id: emp.id, employee_ids: [] }));
    setAck(`Applicant selected: ${emp.full_name} (#${emp.id})`);
    setTimeout(() => setAck(""), 2000);
  };
  const addAttendee = (emp) =>
    setForm((f) => ({
      ...f,
      employee_ids: f.employee_ids.includes(emp.id)
        ? f.employee_ids
        : [...f.employee_ids, emp.id],
    }));
  const removeAttendee = (id) =>
    setForm((f) => ({
      ...f,
      employee_ids: f.employee_ids.filter((x) => x !== id),
    }));

  const previewDays = useMemo(() => {
    if (!form.departure_date || !form.expected_return_date) return "";
    try {
      const dep = new Date(
        form.departure_date +
          (form.departure_time ? `T${form.departure_time}:00` : "T00:00:00")
      );
      const ret = new Date(form.expected_return_date + "T00:00:00");
      const ms = ret.getTime() - dep.getTime();
      const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
      return String(Math.max(1, days));
    } catch {
      return "";
    }
  }, [form.departure_date, form.departure_time, form.expected_return_date]);

  const create = async () => {
    if (!form.applicant_id) {
      alert("Please select an applicant first.");
      return;
    }
    if (!form.departure_date || !form.expected_return_date) {
      alert("Select dates");
      return;
    }
    const submission_date =
      form.submission_date || new Date().toISOString().slice(0, 10);
    const submission_time =
      form.submission_time || new Date().toTimeString().slice(0, 5);
    const payload = {
      ...form,
      total_days: previewDays ? Number(previewDays) : null,
      submission_date,
      submission_time,
    };
    try {
      const res = await api.post("/travel/requests/manual", payload);
      setCreated(res.data?.request || null);
      alert("Request created");
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  // Manual recommendation/approval block
  const [recAppr, setRecAppr] = useState({
    stage: "",
    actor_employee_id: "",
    action: "RECOMMEND",
  });
  const doManualDecision = async () => {
    if (!created) return;
    if (!recAppr.actor_employee_id) {
      alert("Select user");
      return;
    }
    try {
      const res = await api.post(
        `/travel/requests/${created.id}/manual/decision`,
        recAppr
      );
      setCreated(res.data?.request || null);
      alert("Recorded");
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  const extractEmail = (remarks, fallback) => {
    const r = String(remarks || "");
    const m = r.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return m ? m[0] : remarks || fallback || "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">TADA Managed Entry</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search employees"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
          <Button variant="outline" size="sm" onClick={loadEmployees}>
            Search
          </Button>
        </div>
      </div>
      {ack && (
        <div className="text-xs text-green-700 bg-green-100 border border-green-200 px-3 py-2 rounded">
          {ack}
        </div>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Create Request On Behalf</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3 text-sm">
          <div className="md:col-span-2 space-y-3">
            <div className="text-[11px] uppercase text-muted-foreground">
              Select Applicant
            </div>
            <div className="border rounded p-2 max-h-64 overflow-auto custom-thin-scroll">
              {loading && (
                <div className="p-2 text-xs text-muted-foreground">
                  Loading...
                </div>
              )}
              {!loading && employees.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground">
                  No employees
                </div>
              )}
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className={`p-2 rounded flex items-center justify-between ${
                    form.applicant_id === emp.id ? "bg-accent/40" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{emp.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      CNIC: {emp.cnic || "—"} • #{emp.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" onClick={() => pickApplicant(emp)}>
                      Pick Applicant
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {form.applicant_id && (
              <div className="space-y-2">
                <div className="text-[11px] uppercase text-muted-foreground">
                  Attendees (reporting to applicant)
                </div>
                <div className="border rounded p-2 max-h-64 overflow-auto custom-thin-scroll">
                  {(applicantReportees || []).length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">
                      No reportees for this applicant
                    </div>
                  )}
                  {applicantReportees.map((emp) => (
                    <div
                      key={emp.id}
                      className="p-2 rounded flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {emp.full_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          CNIC: {emp.cnic || "—"} • #{emp.id}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addAttendee(emp)}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.employee_ids.map((id) => {
                    const emp =
                      applicantReportees.find((e) => e.id === id) ||
                      employees.find((e) => e.id === id);
                    return (
                      <Badge key={id} variant="outline" className="gap-1">
                        {emp?.full_name || `#${id}`}
                        <button
                          onClick={() => removeAttendee(id)}
                          className="opacity-50 hover:opacity-100"
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">
                Departure Date
              </div>
              <Input
                type="date"
                value={form.departure_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departure_date: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">
                Departure Time
              </div>
              <Input
                type="time"
                value={form.departure_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departure_time: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">
                Expected Return
              </div>
              <Input
                type="date"
                value={form.expected_return_date}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    expected_return_date: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">
                Total Days
              </div>
              <Input value={previewDays} readOnly />
            </div>
            <div className="col-span-2">
              <div className="text-[11px] text-muted-foreground mb-1">
                Purpose
              </div>
              <Input
                value={form.purpose}
                onChange={(e) =>
                  setForm((f) => ({ ...f, purpose: e.target.value }))
                }
                placeholder="e.g., Market visit"
              />
            </div>
            <div className="col-span-2">
              <div className="text-[11px] text-muted-foreground mb-1">
                Destination
              </div>
              <Input
                value={form.destination}
                onChange={(e) =>
                  setForm((f) => ({ ...f, destination: e.target.value }))
                }
                placeholder="e.g., Lahore"
              />
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground mb-1">
                Submission Date
              </div>
              <Input
                type="date"
                value={form.submission_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, submission_date: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">
                Submission Time
              </div>
              <Input
                type="time"
                value={form.submission_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, submission_time: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t justify-end">
          <Button onClick={create}>Create</Button>
        </CardFooter>
      </Card>

      {created && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Manual Recommendation/Approval</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3 text-sm">
            <div className="md:col-span-2">
              <div className="text-[11px] uppercase text-muted-foreground mb-1">
                Pick User
              </div>
              <div className="border rounded p-2 max-h-64 overflow-auto custom-thin-scroll">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className={`p-2 rounded flex items-center justify-between ${
                      String(recAppr.actor_employee_id) === String(emp.id)
                        ? "bg-accent/40"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {emp.full_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        CNIC: {emp.cnic || "—"} • #{emp.id}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Button
                        size="sm"
                        onClick={() =>
                          setRecAppr((a) => ({
                            ...a,
                            actor_employee_id: emp.id,
                          }))
                        }
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">
                  Action
                </div>
                <select
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={recAppr.action}
                  onChange={(e) =>
                    setRecAppr((a) => ({ ...a, action: e.target.value }))
                  }
                >
                  <option value="RECOMMEND">Recommend</option>
                  <option value="APPROVE">Approve</option>
                  <option value="REJECT">Reject</option>
                  <option value="CLEAR">Clear Last</option>
                </select>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">
                  Stage (auto by system)
                </div>
                <Input
                  value={recAppr.stage}
                  onChange={(e) =>
                    setRecAppr((a) => ({ ...a, stage: e.target.value }))
                  }
                  placeholder="Optional: OPS/DG"
                />
              </div>
              <div className="pt-2 flex justify-end">
                <Button onClick={doManualDecision}>Record</Button>
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="text-[11px] uppercase text-muted-foreground mb-1">
                Status History
              </div>
              <div className="rounded border divide-y">
                {(created.statusEntries || []).map((se) => (
                  <div
                    key={se.id}
                    className="p-2 flex items-center justify-between"
                  >
                    <div className="text-xs">{se.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {extractEmail(
                        se.remarks,
                        se.actor?.full_name || `Emp #${se.actor_employee_id}`
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(se.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
