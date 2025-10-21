import React, { useEffect, useState } from "react";
import {
  getEligibleExpenseClaimRequests,
  listExpenseClaims,
  createExpenseClaim,
  getExpenseClaim,
  updateExpenseClaim,
  addExpenseClaimSegment,
  updateExpenseClaimSegment,
  deleteExpenseClaimSegment,
  uploadExpenseClaimDocuments,
  deleteExpenseClaimDocument,
  deleteExpenseClaim,
  submitExpenseClaim,
  computeExpenseClaimTotals,
  listPendingExpenseClaimApprovals,
  decideExpenseClaim,
  getTravelReportees,
  getTravelCapabilities,
} from "../../../services/travelService";
import { useAuthStore } from "../../auth/authStore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function TravelExpenseClaimsPage() {
  const can = useAuthStore((s) => s.can);
  const [caps, setCaps] = useState({ isDG: false });
  const [eligible, setEligible] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [tab, setTab] = useState("eligible"); // eligible | existing
  const [step, setStep] = useState(1); // 1=list,2=select attendee,3=form
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [claim, setClaim] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingCreationAttendee, setPendingCreationAttendee] = useState(null); // holds attendee until user confirms creation
  // Filters for Existing Claims list
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(""); // claim.from_date (or request.departure_date)
  const [dateTo, setDateTo] = useState("");

  // Form core fields
  const [form, setForm] = useState({
    from_date: "",
    to_date: "",
    overnight_stay: false,
    rate_per_km: "",
    toll_tax_total: "",
    per_diem_days: "",
    per_diem_rate: "",
    // New UI-only fields for transport mode
    transport_mode: "OWN", // OWN | OTHER
    fuel_total: "",
    fare_total: "",
  });

  const [segmentsDraft, setSegmentsDraft] = useState([]); // local unsaved until added

  const [approvalsTab, setApprovalsTab] = useState("create"); // create | manage | approvals
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [withinCityTab, setWithinCityTab] = useState("with-request"); // with-request | within-city
  const [reportees, setReportees] = useState([]);
  const user = useAuthStore((s) => s.user);
  const isPersonalAccount = !!user?.employee_id; // non-department/non-location users (including DG)
  // Flag: within-city claims have no linked travel request
  const isWithinCity = !!(claim && !claim.travel_request_id);

  const loadEligible = async () => {
    setLoadingEligible(true);
    try {
      const rs = await getEligibleExpenseClaimRequests();
      setEligible(rs);
    } finally {
      setLoadingEligible(false);
    }
  };
  const loadClaims = async () => {
    setLoadingClaims(true);
    try {
      const rs = await listExpenseClaims();
      setClaims(rs);
    } finally {
      setLoadingClaims(false);
    }
  };
  const loadPendingApprovals = async () => {
    setLoadingApprovals(true);
    try {
      const rs = await listPendingExpenseClaimApprovals();
      setPendingApprovals(rs);
    } finally {
      setLoadingApprovals(false);
    }
  };
  const loadReportees = async () => {
    try {
      const rs = await getTravelReportees();
      // For personal account, only show own employee record
      if (isPersonalAccount) {
        const self = (rs || []).find(
          (e) => Number(e.id) === Number(user.employee_id)
        );
        setReportees(self ? [self] : []);
      } else {
        setReportees(rs || []);
      }
    } catch (_) {}
  };
  useEffect(() => {
    loadEligible();
    loadClaims();
    // fetch capabilities (for DG start override)
    getTravelCapabilities()
      .then((c) => setCaps(c || {}))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (approvalsTab === "approvals") loadPendingApprovals();
  }, [approvalsTab]);
  useEffect(() => {
    if (withinCityTab === "within-city" && reportees.length === 0)
      loadReportees();
  }, [withinCityTab]);

  const startClaim = (req) => {
    setSelectedRequest(req);
    setStep(2);
  };
  const chooseAttendee = (att) => {
    setSelectedAttendee(att);
    setPendingCreationAttendee(att);
  };
  const reqId = () => selectedRequest?.id;

  const startWithinCityClaim = () => {
    setSelectedRequest(null);
    setStep(2);
    setWithinCityTab("within-city");
  };
  const chooseReportee = (emp) => {
    setSelectedAttendee({
      employee_id: emp.id,
      employee: { full_name: emp.full_name, cnic: emp.cnic },
    });
    setPendingCreationAttendee({ employee_id: emp.id });
  };

  const confirmCreateClaim = async () => {
    if (!pendingCreationAttendee) return;
    try {
      setSaving(true);
      const payload = selectedRequest
        ? {
            travel_request_id: selectedRequest.id,
            employee_id: pendingCreationAttendee.employee_id,
          }
        : { employee_id: pendingCreationAttendee.employee_id };
      const c = await createExpenseClaim(payload);
      setClaim(c);
      setForm((prev) => ({
        ...prev,
        from_date: c.from_date?.slice(0, 10) || "",
        to_date: c.to_date?.slice(0, 10) || "",
        rate_per_km: c.rate_per_km || 0,
        per_diem_rate: c.per_diem_rate || 0,
        per_diem_days: c.per_diem_days || "",
        toll_tax_total: c.toll_tax_total ?? "",
        transport_mode: c.transport_mode || "OWN",
        fuel_total: c.fuel_total ?? "",
        fare_total: c.fare_total ?? "",
      }));
      setStep(3);
      setPendingCreationAttendee(null);
      loadEligible();
      loadClaims();
    } finally {
      setSaving(false);
    }
  };

  const cancelCreateFlow = () => {
    setPendingCreationAttendee(null);
    setSelectedAttendee(null);
  };

  const refreshClaim = async () => {
    if (!claim) return;
    const full = await getExpenseClaim(claim.id);
    setClaim(full);
    setForm((f) => ({
      ...f,
      rate_per_km: full.rate_per_km || 0,
      per_diem_rate: full.per_diem_rate || 0,
      per_diem_days: full.per_diem_days || "",
      toll_tax_total: full.toll_tax_total ?? f.toll_tax_total,
      transport_mode: full.transport_mode || f.transport_mode,
      fuel_total: full.fuel_total ?? f.fuel_total,
      fare_total: full.fare_total ?? f.fare_total,
    }));
  };

  // Auto-sync rates into form if form empty but claim has values (when claim updates from backend recompute)
  React.useEffect(() => {
    if (!claim) return;
    setForm((f) => {
      const patch = {};
      if (
        (f.rate_per_km === "" || Number(f.rate_per_km) === 0) &&
        claim.rate_per_km
      )
        patch.rate_per_km = claim.rate_per_km;
      if (
        (f.per_diem_rate === "" || Number(f.per_diem_rate) === 0) &&
        claim.per_diem_rate
      )
        patch.per_diem_rate = claim.per_diem_rate;
      if (f.per_diem_days === "" && (claim.per_diem_days ?? "") !== "")
        patch.per_diem_days = claim.per_diem_days;
      return Object.keys(patch).length ? { ...f, ...patch } : f;
    });
  }, [
    claim?.id,
    claim?.rate_per_km,
    claim?.per_diem_rate,
    claim?.per_diem_days,
  ]);

  const persistCore = async () => {
    if (!claim) return;
    setSaving(true);
    try {
      const payload = {
        from_date: form.from_date || null,
        to_date: form.to_date || null,
        overnight_stay: !!form.overnight_stay,
        toll_tax_total: Number(form.toll_tax_total || 0),
        per_diem_days: Number(form.per_diem_days || 0),
        // new fields
        transport_mode: form.transport_mode,
        fuel_total: Number(form.fuel_total || 0),
        fare_total: Number(form.fare_total || 0),
      };
      const updated = await updateExpenseClaim(claim.id, payload);
      setClaim(updated);
      // sync form with updated claim values
      setForm((f) => ({
        ...f,
        from_date: updated.from_date
          ? String(updated.from_date).slice(0, 10)
          : f.from_date,
        to_date: updated.to_date
          ? String(updated.to_date).slice(0, 10)
          : f.to_date,
        overnight_stay: !!updated.overnight_stay,
        per_diem_days: (
          updated.per_diem_days ??
          f.per_diem_days ??
          ""
        ).toString(),
        toll_tax_total: (
          updated.toll_tax_total ??
          f.toll_tax_total ??
          ""
        ).toString(),
        transport_mode: updated.transport_mode || f.transport_mode,
        fuel_total: (updated.fuel_total ?? f.fuel_total ?? "").toString(),
        fare_total: (updated.fare_total ?? f.fare_total ?? "").toString(),
      }));
      loadClaims();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClaim = async () => {
    if (!claim) return;
    if (!window.confirm("Delete this claim?")) return;
    try {
      await deleteExpenseClaim(claim.id);
      setClaim(null);
      setStep(1);
      setSelectedRequest(null);
      setSelectedAttendee(null);
      loadEligible();
      loadClaims();
    } catch (e) {
      alert(e.message);
    }
  };

  // New: Submit should first save core fields entered in the form
  const handleSubmit = async () => {
    if (!claim) return;
    const isWithinCity = !claim.travel_request_id;
    if (
      !isWithinCity &&
      !(claim.documents || []).some((d) => d.category === "REPORT")
    ) {
      alert("Upload REPORT before submitting");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        from_date: form.from_date || null,
        to_date: form.to_date || null,
        overnight_stay: !!form.overnight_stay,
        toll_tax_total: Number(form.toll_tax_total || 0),
        per_diem_days: Number(form.per_diem_days || 0),
        transport_mode: form.transport_mode,
        fuel_total: Number(form.fuel_total || 0),
        fare_total: Number(form.fare_total || 0),
      };
      await updateExpenseClaim(claim.id, payload);
      const updated = await submitExpenseClaim(claim.id);
      setClaim(updated);
      loadClaims();
      alert("Submitted");
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const addSegment = async (seg) => {
    if (!claim) return;
    const updated = await addExpenseClaimSegment(claim.id, seg);
    setClaim(updated);
    loadClaims();
  };
  const updateSegmentRow = async (seg) => {
    if (!claim) return;
    const updated = await updateExpenseClaimSegment(claim.id, seg.id, seg);
    setClaim(updated);
    loadClaims();
  };
  const removeSegment = async (id) => {
    if (!claim) return;
    const updated = await deleteExpenseClaimSegment(claim.id, id);
    setClaim(updated);
    loadClaims();
  };

  const totals = computeExpenseClaimTotals(
    claim || {
      ...form,
      total_distance_km: (claim?.segments || []).reduce(
        (s, a) => s + Number(a.distance_km || 0),
        0
      ),
    }
  );

  const handleDocUpload = async (category, files) => {
    if (!claim || !files?.length) return;
    const updated = await uploadExpenseClaimDocuments(
      claim.id,
      category,
      files
    );
    setClaim(updated);
    loadClaims();
  };
  const handleDocDelete = async (docId) => {
    if (!claim) return;
    const updated = await deleteExpenseClaimDocument(claim.id, docId);
    setClaim(updated);
    loadClaims();
  };

  const attendeeAlreadyClaimed = (req, empId) =>
    (req.claims || []).some((c) => c.employee_id === empId);

  const claimLocationBadge = (c) => {
    const er = (c?.employee?.employmentRecords || []).find(
      (x) => x.is_current && !x.is_deleted
    );
    const loc = er?.location || null;
    if (!loc) return null;
    return loc.type === "HEAD_OFFICE" ? "HQ" : loc.name || "Bazaar";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Travel Expense Claims</h1>

      {step === 1 && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={tab === "eligible" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTab("eligible");
                  setWithinCityTab("with-request");
                }}
              >
                Create New
              </Button>
              <Button
                variant={tab === "existing" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("existing")}
              >
                Existing Claims
              </Button>
              <Button
                variant={
                  tab === "eligible" && withinCityTab === "within-city"
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => {
                  setTab("eligible");
                  setWithinCityTab("within-city");
                }}
              >
                Create Within City
              </Button>
            </div>
          </CardHeader>
          {tab === "eligible" && withinCityTab === "with-request" && (
            <CardContent className="space-y-2">
              {loadingEligible && (
                <div className="text-sm text-muted-foreground">Loading...</div>
              )}
              {!loadingEligible && eligible.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No approved travel requests.
                </div>
              )}
              <div className="divide-y">
                {eligible.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        Request #{r.id} · {r.destination || "Destination"} ·{" "}
                        {r.status}
                      </div>
                      <div className="text-muted-foreground">
                        Departure {String(r.departure_date).slice(0, 10)} →
                        Return {String(r.expected_return_date).slice(0, 10)}
                      </div>
                    </div>
                    <Button
                      disabled={!(can("travel.claim.create") || caps.isDG)}
                      onClick={() => startClaim(r)}
                    >
                      Start
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
          {tab === "eligible" && withinCityTab === "within-city" && (
            <CardContent className="space-y-3">
              <div className="font-semibold">
                Select Employee (Your Reportees)
              </div>
              {reportees.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No reportees found.
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                {reportees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => chooseReportee(emp)}
                    className="p-3 border rounded text-left hover:bg-accent/30"
                  >
                    <div className="font-medium">
                      {emp.full_name} (#{emp.id})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      CNIC: {emp.cnic || "—"}
                    </div>
                  </button>
                ))}
              </div>
              {pendingCreationAttendee && (
                <div className="p-3 border rounded bg-accent/20 text-xs flex items-center justify-between">
                  <div>
                    Proceed creating within-city claim for employee #
                    {pendingCreationAttendee.employee_id}?
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmCreateClaim}>
                      Yes
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPendingCreationAttendee(null)}
                    >
                      No
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          )}
          {tab === "existing" && (
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Existing Claims</div>
                <Button variant="link" size="sm" onClick={loadClaims}>
                  Refresh
                </Button>
              </div>
              {/* Filters */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search id/name/cnic"
                  className="w-full md:w-56"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded px-2 py-2"
                >
                  <option value="">All Statuses</option>
                  {[
                    "DRAFT",
                    "SUBMITTED",
                    "APPROVED",
                    "VERIFIED",
                    "UNDER_PROCESS",
                    "PROCESSED",
                    "SETTLED",
                    "REJECTED",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">From</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-muted-foreground">To</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Clear
                </Button>
              </div>
              {loadingClaims && (
                <div className="text-sm text-muted-foreground">
                  Loading claims...
                </div>
              )}
              {!loadingClaims && claims.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No claims yet.
                </div>
              )}
              <div className="divide-y">
                {(claims || [])
                  .filter((c) => {
                    const q = search.trim().toLowerCase();
                    if (q) {
                      const idHit = String(c.id).includes(q);
                      const nameHit = (c.employee?.full_name || "")
                        .toLowerCase()
                        .includes(q);
                      const cnicRaw = String(c.employee?.cnic || "");
                      const cnicDigits = cnicRaw.replace(/\D+/g, "");
                      const qDigits = q.replace(/\D+/g, "");
                      const cnicHit =
                        (!!qDigits && cnicDigits.includes(qDigits)) ||
                        cnicRaw.toLowerCase().includes(q);
                      if (!(idHit || nameHit || cnicHit)) return false;
                    }
                    if (statusFilter && String(c.status) !== statusFilter)
                      return false;
                    // Date range: prefer claim.from_date; fallback to request.departure_date if missing
                    const baseDate = c.from_date || c.request?.departure_date;
                    if (
                      dateFrom &&
                      (!baseDate || String(baseDate).slice(0, 10) < dateFrom)
                    )
                      return false;
                    if (
                      dateTo &&
                      (!baseDate || String(baseDate).slice(0, 10) > dateTo)
                    )
                      return false;
                    return true;
                  })
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-3 flex items-center justify-between text-sm"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium">
                          Claim #{c.id} • Req #{c.travel_request_id || "—"} •{" "}
                          {c.employee?.full_name || `Emp #${c.employee_id}`}{" "}
                          {c.employee?.cnic ? `— CNIC ${c.employee.cnic}` : ""}
                        </div>
                        {(() => {
                          const loc = claimLocationBadge(c);
                          return loc ? (
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {loc}
                              </Badge>
                            </div>
                          ) : null;
                        })()}
                        <div className="text-muted-foreground">
                          Distance {c.total_distance_km || 0} km • Grand{" "}
                          {c.grand_total || 0}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setClaim(null);
                            setSelectedRequest(null);
                            setSelectedAttendee(null);
                            setStep(3);
                            getExpenseClaim(c.id).then((full) => {
                              setClaim(full);
                              setForm((f) => ({
                                ...f,
                                from_date: full.from_date?.slice(0, 10) || "",
                                to_date: full.to_date?.slice(0, 10) || "",
                                rate_per_km: full.rate_per_km || 0,
                                per_diem_rate: full.per_diem_rate || 0,
                                per_diem_days: full.per_diem_days || "",
                                toll_tax_total:
                                  full.toll_tax_total ?? f.toll_tax_total,
                                transport_mode:
                                  full.transport_mode || f.transport_mode,
                                fuel_total: full.fuel_total ?? f.fuel_total,
                                fare_total: full.fare_total ?? f.fare_total,
                              }));
                            });
                          }}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {step === 2 && selectedRequest && (
        <Card>
          <CardHeader className="flex items-center justify-between border-b">
            <CardTitle>
              Select Attendee For Claim (Request #{selectedRequest.id})
            </CardTitle>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setStep(1);
                setSelectedRequest(null);
              }}
            >
              Back
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {selectedRequest.attendees.map((a) => (
                <button
                  key={a.id}
                  disabled={attendeeAlreadyClaimed(
                    selectedRequest,
                    a.employee_id
                  )}
                  onClick={() => chooseAttendee(a)}
                  className={`p-3 border rounded text-left hover:bg-accent/30 disabled:opacity-40 ${
                    attendeeAlreadyClaimed(selectedRequest, a.employee_id)
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <div className="font-medium">
                    {a.employee?.full_name || "Employee"} (#{a.employee_id})
                  </div>
                  {attendeeAlreadyClaimed(selectedRequest, a.employee_id) && (
                    <div className="text-xs text-amber-600">
                      Claim already created
                    </div>
                  )}
                </button>
              ))}
            </div>
            {pendingCreationAttendee && (
              <div className="p-3 border rounded bg-accent/20 text-xs flex items-center justify-between">
                <div>
                  Proceed creating claim for employee #
                  {pendingCreationAttendee.employee_id}?
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={confirmCreateClaim}>
                    Yes
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={cancelCreateFlow}
                  >
                    No
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* When within-city, step 2 is reached directly from startWithinCityClaim button in header, but we integrated into tab instead */}

      {step === 3 && claim && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="font-semibold">
              Expense Claim #{claim.id} (Request #{claim.travel_request_id})
            </div>
            <div className="flex gap-3 items-center">
              {(() => {
                const loc = claimLocationBadge(claim);
                return loc ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {loc}
                  </Badge>
                ) : null;
              })()}
              {claim.status === "DRAFT" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteClaim}
                >
                  Delete
                </Button>
              )}
              {claim.status === "DRAFT" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={handleSubmit}
                >
                  Submit
                </Button>
              )}
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setStep(1);
                  setClaim(null);
                  setSelectedRequest(null);
                  setSelectedAttendee(null);
                  loadEligible();
                  loadClaims();
                }}
              >
                Close
              </Button>
            </div>
          </div>

          {/* Core Fields */}
          <Card>
            <CardContent className="grid md:grid-cols-7 gap-4 text-sm p-6">
              {/* From/To dates are hidden for within-city */}
              {!isWithinCity && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      From Date
                    </label>
                    <div className="relative">
                      <Input
                        type="date"
                        className="pr-10"
                        value={form.from_date}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, from_date: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        aria-label="Open from date picker"
                        onClick={(e) => {
                          const inp = e.currentTarget.previousElementSibling;
                          if (inp) {
                            if (typeof inp.showPicker === "function") {
                              inp.showPicker();
                            } else {
                              inp.focus();
                              try {
                                inp.click();
                              } catch (_) {
                                /* ignore */
                              }
                            }
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-gray-500 hover:text-gray-700"
                        style={{ color: "#6b7280" }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          ></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      To Date
                    </label>
                    <div className="relative">
                      <Input
                        type="date"
                        className="pr-10"
                        value={form.to_date}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, to_date: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        aria-label="Open to date picker"
                        onClick={(e) => {
                          const inp = e.currentTarget.previousElementSibling;
                          if (inp) {
                            if (typeof inp.showPicker === "function") {
                              inp.showPicker();
                            } else {
                              inp.focus();
                              try {
                                inp.click();
                              } catch (_) {
                                /* ignore */
                              }
                            }
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-gray-500 hover:text-gray-700"
                        style={{ color: "#6b7280" }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          ></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 mt-5">
                <input
                  type="checkbox"
                  checked={form.overnight_stay}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, overnight_stay: e.target.checked }))
                  }
                />
                <span className="text-xs">Overnight Stay</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Diem Days
                </label>
                <Input
                  value={form.per_diem_days}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, per_diem_days: e.target.value }))
                  }
                />
              </div>
              {/* Transport mode toggle + conditional fields */}
              <div className="md:col-span-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Mode of Transport:
                  </span>
                  <div className="inline-flex border rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, transport_mode: "OWN" }))
                      }
                      className={`px-3 py-1 text-xs ${
                        form.transport_mode === "OWN"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background"
                      }`}
                    >
                      Own Vehicle
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, transport_mode: "OTHER" }))
                      }
                      className={`px-3 py-1 text-xs border-l ${
                        form.transport_mode === "OTHER"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background"
                      }`}
                    >
                      Other
                    </button>
                  </div>
                  {form.transport_mode === "OWN" && (
                    <>
                      {/* Hide Total Fuel Price for within-city */}
                      {!isWithinCity && (
                        <div className="min-w-[220px]">
                          <label className="text-xs text-muted-foreground">
                            Total Fuel Price Amount
                          </label>
                          <Input
                            value={form.fuel_total}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                fuel_total: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                      <div className="min-w-[220px]">
                        <label className="text-xs text-muted-foreground">
                          Toll Tax Total (D)
                        </label>
                        <Input
                          value={form.toll_tax_total || ""}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              toll_tax_total: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                  {form.transport_mode === "OTHER" && (
                    <div className="min-w-[220px]">
                      <label className="text-xs text-muted-foreground">
                        Total Fare
                      </label>
                      <Input
                        value={form.fare_total}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, fare_total: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-7 flex justify-end">
                <Button
                  disabled={saving || claim.status !== "DRAFT"}
                  onClick={persistCore}
                >
                  Save Core
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Travel Segments */}
          <Card>
            <CardContent className="p-4 text-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Travel Segments</div>
                <Button
                  size="sm"
                  onClick={() =>
                    setSegmentsDraft((d) => [
                      ...d,
                      {
                        departure_from: "",
                        departure_to: "",
                        depart_date: "",
                        depart_time: "",
                        arrive_date: "",
                        arrive_time: "",
                        mode: "",
                        distance_km: "",
                      },
                    ])
                  }
                >
                  Add Row
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-accent/30">
                    <tr>
                      <th className="p-2 text-left">Departure From</th>
                      <th className="p-2 text-left">Departure To</th>
                      <th className="p-2 text-left">Date of Departure</th>
                      <th className="p-2 text-left">Time of Departure</th>
                      <th className="p-2 text-left">Date of Arrival</th>
                      <th className="p-2 text-left">Time of Arrival</th>
                      <th className="p-2 text-left">Mode</th>
                      <th className="p-2 text-left">Distance (KM)</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(claim.segments || []).map((seg) => (
                      <tr key={seg.id} className="border-b bg-emerald-50/40">
                        <td className="p-1">
                          <Input
                            defaultValue={seg.departure_from}
                            onBlur={(e) =>
                              updateSegmentRow({
                                ...seg,
                                departure_from: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            defaultValue={seg.departure_to}
                            onBlur={(e) =>
                              updateSegmentRow({
                                ...seg,
                                departure_to: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="date"
                            defaultValue={(seg.depart_date || "").slice(0, 10)}
                            onBlur={(e) =>
                              updateSegmentRow({
                                ...seg,
                                depart_date: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="time"
                            defaultValue={seg.depart_time || ""}
                            onBlur={(e) =>
                              updateSegmentRow({
                                ...seg,
                                depart_time: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="date"
                            defaultValue={(seg.arrive_date || "").slice(0, 10)}
                            onBlur={(e) =>
                              updateSegmentRow({
                                ...seg,
                                arrive_date: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="time"
                            defaultValue={seg.arrive_time || ""}
                            onBlur={(e) =>
                              updateSegmentRow({
                                ...seg,
                                arrive_time: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            defaultValue={seg.mode || ""}
                            onBlur={(e) =>
                              updateSegmentRow({ ...seg, mode: e.target.value })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            defaultValue={seg.distance_km || ""}
                            onBlur={(e) =>
                              updateSegmentRow({
                                ...seg,
                                distance_km: Number(e.target.value || 0),
                              })
                            }
                          />
                        </td>
                        <td className="p-1 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeSegment(seg.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {segmentsDraft.map((r, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-1">
                          <Input
                            value={r.departure_from}
                            onChange={(e) =>
                              setSegmentsDraft((d) =>
                                d.map((x, i) =>
                                  i === idx
                                    ? { ...x, departure_from: e.target.value }
                                    : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            value={r.departure_to}
                            onChange={(e) =>
                              setSegmentsDraft((d) =>
                                d.map((x, i) =>
                                  i === idx
                                    ? { ...x, departure_to: e.target.value }
                                    : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="date"
                            value={r.depart_date || ""}
                            onChange={(e) =>
                              setSegmentsDraft((d) =>
                                d.map((x, i) =>
                                  i === idx
                                    ? { ...x, depart_date: e.target.value }
                                    : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="time"
                            value={r.depart_time}
                            onChange={(e) =>
                              setSegmentsDraft((d) =>
                                d.map((x, i) =>
                                  i === idx
                                    ? { ...x, depart_time: e.target.value }
                                    : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="date"
                            value={r.arrive_date || ""}
                            onChange={(e) =>
                              setSegmentsDraft((d) =>
                                d.map((x, i) =>
                                  i === idx
                                    ? { ...x, arrive_date: e.target.value }
                                    : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="time"
                            value={r.arrive_time}
                            onChange={(e) =>
                              setSegmentsDraft((d) =>
                                d.map((x, i) =>
                                  i === idx
                                    ? { ...x, arrive_time: e.target.value }
                                    : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            value={r.mode}
                            onChange={(e) =>
                              setSegmentsDraft((d) =>
                                d.map((x, i) =>
                                  i === idx ? { ...x, mode: e.target.value } : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            value={r.distance_km}
                            onChange={(e) =>
                              setSegmentsDraft((d) =>
                                d.map((x, i) =>
                                  i === idx
                                    ? { ...x, distance_km: e.target.value }
                                    : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-1 text-right space-x-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              const seg = segmentsDraft[idx];
                              addSegment({
                                ...seg,
                                distance_km: Number(seg.distance_km || 0),
                              });
                              setSegmentsDraft((d) =>
                                d.filter((_, i) => i !== idx)
                              );
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setSegmentsDraft((d) =>
                                d.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardContent className="text-sm space-y-4 p-6">
              <div className="font-medium">Documents</div>
              {isWithinCity ? (
                <div className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-xs">
                      Documents{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </div>
                    <label className="relative inline-flex items-center px-3 py-1.5 text-xs border rounded bg-white hover:bg-accent/30 cursor-pointer">
                      Upload
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        multiple={true}
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            handleDocUpload("OTHER", e.target.files);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(claim.documents || []).length === 0 && (
                      <div className="text-muted-foreground text-xs">
                        No files
                      </div>
                    )}
                    {(claim.documents || []).map((d) => (
                      <div key={d.id} className="relative">
                        {(() => {
                          let p = d.file_path || "";
                          p = p.replace(/^\\+|^\/+/, "");
                          const isAbsolute = /^https?:\//i.test(p);
                          const base = (
                            import.meta.env.VITE_API_URL ||
                            (typeof window !== "undefined"
                              ? `${window.location.protocol}//${window.location.hostname}:3000/api`
                              : "")
                          ).replace(/\/api\/?$/, "");
                          const url = isAbsolute
                            ? p
                            : p.startsWith("uploads/")
                            ? `${base}/${p}`
                            : `${base}/${p}`;
                          return (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs border rounded bg-white hover:bg-accent/30 max-w-[160px] truncate"
                            >
                              {p.split("/").pop()}
                            </a>
                          );
                        })()}
                        <button
                          onClick={() => handleDocDelete(d.id)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-5 w-5 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Outstation/request-linked: keep category groups, with REPORT required
                <>
                  {["FUEL", "TOLL", "PICTURE", "REPORT", "OTHER"].map((cat) => {
                    const docs = (claim.documents || []).filter(
                      (d) => d.category === cat
                    );
                    const isReport = cat === "REPORT";
                    return (
                      <div key={cat} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-xs">
                            {cat}{" "}
                            {isReport && (
                              <span className="text-rose-600">
                                (At least one required)
                              </span>
                            )}
                          </div>
                          <label className="relative inline-flex items-center px-3 py-1.5 text-xs border rounded bg-white hover:bg-accent/30 cursor-pointer">
                            Upload
                            <input
                              type="file"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              multiple={true}
                              onChange={(e) => {
                                if (e.target.files?.length) {
                                  handleDocUpload(cat, e.target.files);
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {docs.length === 0 && (
                            <div className="text-muted-foreground text-xs">
                              No files
                            </div>
                          )}
                          {docs.map((d) => (
                            <div key={d.id} className="relative">
                              {(() => {
                                let p = d.file_path || "";
                                p = p.replace(/^\\+|^\/+/, "");
                                const isAbsolute = /^https?:\//i.test(p);
                                const base = (
                                  import.meta.env.VITE_API_URL ||
                                  (typeof window !== "undefined"
                                    ? `${window.location.protocol}//${window.location.hostname}:3000/api`
                                    : "")
                                ).replace(/\/api\/?$/, "");
                                const url = isAbsolute
                                  ? p
                                  : p.startsWith("uploads/")
                                  ? `${base}/${p}`
                                  : `${base}/${p}`;
                                return (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center px-2 py-1 text-xs border rounded bg-white hover:bg-accent/30 max-w-[160px] truncate"
                                  >
                                    {p.split("/").pop()}
                                  </a>
                                );
                              })()}
                              {(!isReport || docs.length > 0) && (
                                <button
                                  onClick={() => handleDocDelete(d.id)}
                                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-5 w-5 text-xs"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {decisionTarget && <></>}
    </div>
  );
}

function DecisionForm({ claim, onDone, onClose }) {
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const act = async (action) => {
    try {
      setSubmitting(true);
      const updated = await decideExpenseClaim(claim.id, action, remarks);
      onDone(updated);
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground">
          Remarks (optional)
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="w-full border rounded p-2 text-xs"
          rows={3}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          disabled={submitting}
          onClick={() => act("REJECT")}
          variant="destructive"
          size="sm"
        >
          Reject
        </Button>
        <Button disabled={submitting} onClick={() => act("APPROVE")} size="sm">
          Approve
        </Button>
      </div>
    </div>
  );
}
