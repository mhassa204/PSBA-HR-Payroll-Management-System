import React, { useEffect, useState } from "react";
import {
  getTravelRequest,
  updateTravelRequestStatus,
  recommendTravelRequest,
  clearTravelRecommendation,
  recommendDecisionTravelRequest,
  getTravelCapabilities,
} from "../../../services/travelService";
import api from "../../../lib/axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import EnhancedModal from "@/components/ui/EnhancedModal";
import { useAuthStore } from "../../auth/authStore";

export default function TravelApprovalsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const meEmpId = useAuthStore((s) => s.user?.employee_id);
  const [caps, setCaps] = useState(null);
  // Filters
  const [search, setSearch] = useState("");
  const [locFilter, setLocFilter] = useState(""); // '' | HEAD_OFFICE | BAZAAR
  const [departFrom, setDepartFrom] = useState("");
  const [departTo, setDepartTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/travel/requests/pending-approvals");
      setList(res.data?.requests || []);
      if (!caps) {
        try {
          const c = await getTravelCapabilities();
          setCaps(c);
        } catch (_) {}
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openDetail = async (id) => {
    setOpen(true);
    setSelected(null);
    const full = await getTravelRequest(id);
    setSelected(full);
  };

  const hasRecommended = (r) =>
    (r.statusEntries || []).some((se) => se.action === "RECOMMENDED");
  const recCount = (r) =>
    (r.statusEntries || []).filter((se) => se.action === "RECOMMENDED").length;
  const lastEntry = (r) =>
    (r.statusEntries || [])[(r.statusEntries || []).length - 1];
  const canUndoRecommendation = (r) => {
    const last = lastEntry(r);
    return (
      r.status === "CREATED" &&
      last &&
      last.action === "RECOMMENDED" &&
      String(last.actor_employee_id) === String(meEmpId)
    );
  };
  const labelAction = (a) => (a === "RECOMMENDED" ? "Recommended" : a);
  const extractEmail = (remarks, fallback) => {
    const r = String(remarks || "");
    const m = r.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return m ? m[0] : remarks || fallback || "—";
  };

  const doAction = async (r, action) => {
    if (!r) return;
    setSubmitting(true);
    try {
      if (action === "RECOMMEND") {
        await recommendTravelRequest(r.id);
      } else if (action === "RECOMMENDER_REJECT") {
        await recommendDecisionTravelRequest(r.id, "REJECT");
      } else if (action === "UNDO_RECOMMEND") {
        await clearTravelRecommendation(r.id);
      } else if (action === "APPROVE") {
        await updateTravelRequestStatus(r.id, "APPROVED");
      } else if (action === "REJECT") {
        await updateTravelRequestStatus(r.id, "REJECTED");
      }
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isDirectReportToMe = (req) => {
    const ers = req?.applicant?.employmentRecords || [];
    return ers.some(
      (er) =>
        er.is_current &&
        !er.is_deleted &&
        String(er.reporting_officer_id || "") === String(meEmpId || "")
    );
  };
  const isDeptOrigin = (r) =>
    (r.statusEntries || []).some(
      (se) =>
        se.action === "CREATED" && /\[DEPT\]/i.test(String(se.remarks || ""))
    );
  const isHoDFor = (r) => {
    const er = (r?.applicant?.employmentRecords || []).find(
      (x) => x.is_current && !x.is_deleted
    );
    const hodId = Number(er?.department?.head?.id || 0);
    return meEmpId && Number(meEmpId) === hodId;
  };
  const hodROFor = (r) => {
    const er = (r?.applicant?.employmentRecords || []).find(
      (x) => x.is_current && !x.is_deleted
    );
    const hodER = (er?.department?.head?.employmentRecords || []).find(
      (x) => x.is_current && !x.is_deleted
    );
    const ro = hodER?.reporting_officer_id
      ? Number(hodER.reporting_officer_id)
      : null;
    return ro;
  };
  const applicantLocType = (r) => {
    const er = (r?.applicant?.employmentRecords || []).find(
      (x) => x.is_current && !x.is_deleted
    );
    return er?.location?.type || "HEAD_OFFICE";
  };
  const canRecommendMe = (r) => {
    if (!meEmpId) return false;
    const recs = recCount(r);
    if (isDeptOrigin(r)) {
      if (recs === 0) return isHoDFor(r);
      if (recs === 1) return Number(meEmpId) === Number(hodROFor(r) || 0);
      return false;
    }
    // Non-dept-origin: immediate RO of applicant, first recommendation only
    return recs === 0 && isDirectReportToMe(r);
  };

  // Only DG/Ops can approve; Ops cannot approve department-origin; DG can fast-track direct reports at head office
  const canApproveMe = (r) => {
    const recs = recCount(r);
    const deptOrigin = isDeptOrigin(r);
    const locType = applicantLocType(r);
    const isLocOrigin = (r?.statusEntries || []).some(
      (se) =>
        se.action === "CREATED" && /\[LOC\]/i.test(String(se.remarks || ""))
    );
    // For department-origin, if HoD has a RO, require two recommendations before DG approval
    const neededRecs = deptOrigin && hodROFor(r) ? 2 : 1;
    const isDG = !!caps?.isDG;
    const isOps = !!caps?.isOps;
    const fastTrackDG =
      isDG && locType === "HEAD_OFFICE" && isDirectReportToMe(r);
    if (isDG) {
      if (fastTrackDG) return true;
      if (locType === "HEAD_OFFICE" && recs >= neededRecs) return true;
      return false;
    }
    if (isOps) {
      // Allow Ops to approve location-origin bazaar requests directly (no recommendations needed)
      if (locType === "BAZAAR" && !deptOrigin && (recs >= 1 || isLocOrigin))
        return true;
      return false;
    }
    return false;
  };

  // Small helper: applicant location badge label (HQ or Bazaar name)
  const applicantLocationBadge = (r) => {
    const er = (r?.applicant?.employmentRecords || []).find(
      (x) => x.is_current && !x.is_deleted
    );
    const loc = er?.location || null;
    if (loc) {
      const type = String(loc.type || "HEAD_OFFICE");
      const label = type === "HEAD_OFFICE" ? "HQ" : loc.name || "Bazaar";
      return label;
    }
    const created = (r?.statusEntries || []).find(
      (e) => e.action === "CREATED"
    );
    const remarks = String(created?.remarks || "");
    if (/\[LOC\]/i.test(remarks)) return "Bazaar";
    if (/\[DEPT\]/i.test(remarks)) return "HQ";
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Travel Approvals</h1>
        <Button variant="outline" size="sm" onClick={load}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-3 flex flex-col md:flex-row md:items-center gap-2 text-sm">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name/cnic/purpose/destination"
              className="w-full md:w-64"
            />
            <select
              value={locFilter}
              onChange={(e) => setLocFilter(e.target.value)}
              className="border rounded px-2 py-2"
            >
              <option value="">All Locations</option>
              <option value="HEAD_OFFICE">HQ</option>
              <option value="BAZAAR">Bazaar</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Depart From</span>
              <Input
                type="date"
                value={departFrom}
                onChange={(e) => setDepartFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">To</span>
              <Input
                type="date"
                value={departTo}
                onChange={(e) => setDepartTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setSearch("");
                setLocFilter("");
                setDepartFrom("");
                setDepartTo("");
              }}
            >
              Clear
            </Button>
          </div>
          <div className="divide-y">
            {loading && (
              <div className="p-4 text-muted-foreground">Loading...</div>
            )}
            {!loading && list.length === 0 && (
              <div className="p-6 text-muted-foreground">
                No pending requests
              </div>
            )}
            {(list || [])
              .filter((r) => {
                // Text search
                const q = search.trim().toLowerCase();
                if (q) {
                  const name = (r?.applicant?.full_name || "").toLowerCase();
                  const cnic = String(r?.applicant?.cnic || "").toLowerCase();
                  const dest = (r?.destination || "").toLowerCase();
                  const purpose = (r?.purpose || "").toLowerCase();
                  const cnicDigits = cnic.replace(/\D+/g, "");
                  const qDigits = q.replace(/\D+/g, "");
                  const hit =
                    name.includes(q) ||
                    dest.includes(q) ||
                    purpose.includes(q) ||
                    (!!qDigits && cnicDigits.includes(qDigits)) ||
                    cnic.includes(q);
                  if (!hit) return false;
                }
                // Location filter
                if (locFilter) {
                  const er = (r?.applicant?.employmentRecords || []).find(
                    (x) => x.is_current && !x.is_deleted
                  );
                  const type = er?.location?.type || "HEAD_OFFICE";
                  if (String(type) !== String(locFilter)) return false;
                }
                // Depart date range
                if (departFrom) {
                  if (String(r.departure_date).slice(0, 10) < departFrom)
                    return false;
                }
                if (departTo) {
                  if (String(r.departure_date).slice(0, 10) > departTo)
                    return false;
                }
                return true;
              })
              .map((r) => {
                const recommended = hasRecommended(r);
                const canUndo = canUndoRecommendation(r);
                // Allow recommending even after first recommendation for HoD's RO stage (handled by canRecommendMe)
                const showRecommenderActions = !canUndo && canRecommendMe(r);
                const showApproveActions = !canUndo && canApproveMe(r);
                return (
                  <div
                    key={r.id}
                    className="p-4 flex items-center justify-between text-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium">{r.purpose || "—"}</div>
                      <div className="text-muted-foreground">
                        {r.destination ? `${r.destination} · ` : ""}
                        {String(r.departure_date).slice(0, 10)}{" "}
                        {r.departure_time ? `at ${r.departure_time}` : ""} →{" "}
                        {String(r.expected_return_date).slice(0, 10)} ·{" "}
                        {r.total_days ? `${r.total_days} day(s)` : "—"}
                      </div>
                      {(() => {
                        const locLabel = applicantLocationBadge(r);
                        return locLabel ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px]">
                              {locLabel}
                            </Badge>
                          </div>
                        ) : null;
                      })()}
                      <div className="flex flex-wrap gap-1">
                        {(r.statusEntries || []).map((se) => (
                          <Badge
                            key={se.id}
                            variant="outline"
                            className="text-[11px]"
                          >
                            {labelAction(se.action)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(r.id)}
                      >
                        View
                      </Button>
                      <div className="flex items-center gap-1">
                        {canUndo && (
                          <Button
                            disabled={submitting}
                            size="sm"
                            variant="secondary"
                            onClick={() => doAction(r, "UNDO_RECOMMEND")}
                          >
                            Undo
                          </Button>
                        )}
                        {showRecommenderActions && (
                          <>
                            <Button
                              disabled={submitting}
                              size="sm"
                              onClick={() => doAction(r, "RECOMMEND")}
                            >
                              Recommend
                            </Button>
                            <Button
                              disabled={submitting}
                              size="sm"
                              variant="destructive"
                              onClick={() => doAction(r, "RECOMMENDER_REJECT")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {!canUndo && showApproveActions && (
                          <>
                            <Button
                              disabled={submitting}
                              size="sm"
                              onClick={() => doAction(r, "APPROVE")}
                            >
                              Approve
                            </Button>
                            <Button
                              disabled={submitting}
                              size="sm"
                              variant="destructive"
                              onClick={() => doAction(r, "REJECT")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <EnhancedModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="TADA Request Details"
        size="lg"
      >
        <div className="p-4 space-y-4 text-sm">
          {!selected && <div className="text-muted-foreground">Loading...</div>}
          {selected && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground">Submission Date</div>
                  <div className="font-medium">
                    {String(selected.submission_date).slice(0, 10)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Purpose</div>
                  <div className="font-medium">{selected.purpose || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Destination</div>
                  <div className="font-medium">
                    {selected.destination || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Departure</div>
                  <div className="font-medium">
                    {String(selected.departure_date).slice(0, 10)}{" "}
                    {selected.departure_time
                      ? `at ${selected.departure_time}`
                      : ""}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Expected Return</div>
                  <div className="font-medium">
                    {String(selected.expected_return_date).slice(0, 10)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Days</div>
                  <div className="font-medium">
                    {selected.total_days || "—"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-muted-foreground">Employees</div>
                  <div className="font-medium space-y-1">
                    {(selected.attendees || []).length
                      ? (selected.attendees || []).map((a) => (
                          <div key={a.id}>
                            {a.employee.full_name} — {a.employee.cnic || "N/A"}
                          </div>
                        ))
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    Applicant Department
                  </div>
                  <div className="font-medium">
                    {(() => {
                      const er = selected?.applicant?.employmentRecords?.[0];
                      return er?.department?.name || "—";
                    })()}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="font-medium mb-2">Status History</div>
                <div className="rounded-lg border divide-y">
                  {(selected.statusEntries || []).length === 0 && (
                    <div className="p-3 text-muted-foreground">No history</div>
                  )}
                  {/* Location badge in details */}
                  <div className="p-3">
                    {(() => {
                      const er = (
                        selected?.applicant?.employmentRecords || []
                      ).find((x) => x.is_current && !x.is_deleted);
                      const loc = er?.location || null;
                      if (!loc) return null;
                      const label =
                        loc.type === "HEAD_OFFICE"
                          ? "HQ"
                          : loc.name || "Bazaar";
                      return (
                        <Badge variant="secondary" className="text-[10px]">
                          {label}
                        </Badge>
                      );
                    })()}
                  </div>
                  {(selected.statusEntries || []).map((s) => (
                    <div
                      key={s.id}
                      className="p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {labelAction(s.action)}
                        </div>
                        <div className="text-slate-500 text-xs">
                          by {extractEmail(s.remarks, "—")} at{" "}
                          {new Date(s.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </EnhancedModal>
    </div>
  );
}
