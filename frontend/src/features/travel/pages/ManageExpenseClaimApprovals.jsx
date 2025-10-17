import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../../auth/authStore";
import {
  listPendingExpenseClaimApprovals,
  listAllExpenseClaimApprovals,
  decideExpenseClaim,
  getTravelCapabilities,
  updateExpenseClaim,
  computeExpenseClaimTotals,
} from "../../../services/travelService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import EnhancedModal from "@/components/ui/EnhancedModal";
import { exportClaimToPdf } from "../utils/pdfExport";

export default function ManageExpenseClaimApprovals() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [viewTab, setViewTab] = useState("pending"); // pending | all
  const [allClaims, setAllClaims] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // New: server-backed date filters for All tab
  const [submissionFrom, setSubmissionFrom] = useState("");
  const [submissionTo, setSubmissionTo] = useState("");
  const [departFrom, setDepartFrom] = useState("");
  const [departTo, setDepartTo] = useState("");
  // Inline edit state (Accounts only)
  const [editMode, setEditMode] = useState(false);
  const [editVals, setEditVals] = useState({
    total_distance_km: "",
    rate_per_km: "",
    per_diem_days: "",
    per_diem_rate: "",
    fare_total: "",
    toll_tax_total: "",
  });
  // enforce numeric-only; preserve caret position on change
  const rateKmRef = React.useRef(null);
  const totalDistRef = React.useRef(null);
  const perDiemDaysRef = React.useRef(null);
  const perDiemRateRef = React.useRef(null);
  const fareTotalRef = React.useRef(null);
  const tollTaxRef = React.useRef(null);
  const setNumWithRef = (field, ref) => (e) => {
    const el = e.target;
    const start = el.selectionStart ?? el.value.length;
    const raw = el.value;
    const cleaned = (raw ?? "").replace(/[^0-9]/g, "");
    setEditVals((v) => ({ ...v, [field]: cleaned }));
    // restore caret after state update
    requestAnimationFrame(() => {
      if (ref?.current) {
        const removedBefore = (raw.slice(0, start).match(/[^0-9]/g) || [])
          .length;
        let pos = start - removedBefore;
        pos = Math.max(0, Math.min(pos, cleaned.length));
        try {
          ref.current.setSelectionRange(pos, pos);
        } catch (_) {}
        try {
          ref.current.focus();
        } catch (_) {}
      }
    });
  };

  // Auth / permission context
  const user = useAuthStore((s) => s.user);
  const can = useAuthStore((s) => s.can);
  const isSuper = user?.role?.name === "Super Admin";
  // Fetch backend capability heuristics (includes legacy isOps / isDG / isHR flags)
  const [caps, setCaps] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const c = await getTravelCapabilities();
        setCaps(c);
      } catch (_) {
        /* ignore */
      }
    })();
  }, []);
  const roleName = (user?.role?.name || "").toLowerCase();
  // Permission OR heuristic fallbacks mirroring backend travelRequestService
  const canOps = isSuper || can("travel.claim.approve.ops") || caps?.isOps;
  // DG UI gating: only a true DG (designation) or Super Admin should see DG actions
  // DG UI gating: only a Director General by role (from backend caps) or Super Admin
  const canDG =
    isSuper ||
    !!caps?.isDG ||
    can("travel.claim.approve.dg") ||
    /(^|\b)(director\s*general|dg)(\b|$)/i.test(roleName);
  // Establishment replaces HR
  const canEstablishment =
    isSuper ||
    can("travel.claim.verify.establishment") ||
    caps?.isEstablishment ||
    /establishment/i.test(roleName);
  const canAccounts =
    isSuper ||
    can("travel.claim.process.start") ||
    caps?.isAccountsApprover ||
    /accounts/i.test(roleName);
  const meEmpId = user?.employee_id;
  const hasAnyApprovalPerm = canOps || canDG || canEstablishment || canAccounts;
  const isApproverRole = !!(canOps || canDG || canEstablishment || canAccounts);

  // Helper to compute dynamic eligibility replicating backend generalized logic (with recommender stage)
  const isRecommenderFor = (claim) => {
    const ro = String(meEmpId || "");
    const applicantEmps = claim?.request?.applicant?.employmentRecords || [];
    const employeeEmps = claim?.employee?.employmentRecords || [];
    return (
      applicantEmps.some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          String(er.reporting_officer_id || "") === ro
      ) ||
      employeeEmps.some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          String(er.reporting_officer_id || "") === ro
      )
    );
  };
  const isDeptOriginClaim = (claim) => !!claim?.created_by_department_id;
  const hodIdForClaim = (claim) => {
    if (!claim) return null;
    // Department-origin: HoD of submitting department
    if (isDeptOriginClaim(claim)) {
      const hodId = claim?.createdByDepartment?.head_employee_id;
      return hodId ? Number(hodId) : null;
    }
    // HQ/personal: HoD of claimant's department
    const er = (claim?.employee?.employmentRecords || []).find(
      (x) => x.is_current && !x.is_deleted
    );
    const hodId = er?.department?.head_employee_id;
    return hodId ? Number(hodId) : null;
  };
  const hodROForClaim = (claim) => {
    if (!claim) return null;
    // Department-origin: use submitting department HoD's current employment to read RO
    if (isDeptOriginClaim(claim)) {
      const hodER = (
        claim?.createdByDepartment?.head?.employmentRecords || []
      ).find((e) => e.is_current && !e.is_deleted);
      const ro = hodER?.reporting_officer_id;
      return ro ? Number(ro) : null;
    }
    // HQ/personal: use claimant department HoD's employment to read RO
    const er = (claim?.employee?.employmentRecords || []).find(
      (x) => x.is_current && !x.is_deleted
    );
    const hodER = (er?.department?.head?.employmentRecords || []).find(
      (e) => e.is_current && !e.is_deleted
    );
    const ro = hodER?.reporting_officer_id;
    return ro ? Number(ro) : null;
  };
  const computeEligibility = (claim) => {
    if (!claim)
      return {
        canApprove: false,
        canReject: false,
        canClear: false,
        canRecommend: false,
      };
    const status = claim.status;
    const entries = claim.statusEntries || [];
    const approvalsOrder = [
      "OPS_APPROVED",
      "DG_APPROVED",
      "ESTABLISHMENT_VERIFIED",
      "PROCESS_STARTED",
    ];
    const rejectionActions = [
      "OPS_REJECTED",
      "DG_REJECTED",
      "ESTABLISHMENT_REJECTED",
      "ACCOUNTS_REJECTED",
      "RECOMMENDER_REJECTED",
    ];
    const lastApproval = [...entries]
      .reverse()
      .find(
        (e) => approvalsOrder.includes(e.action) || e.action === "RECOMMENDED"
      );
    const lastEntry = entries[entries.length - 1];
    const hasRecommended = entries.some((e) => e.action === "RECOMMENDED");
    const hasEstVerified = entries.some(
      (e) => e.action === "ESTABLISHMENT_VERIFIED"
    );
    const hasProcessStarted = entries.some(
      (e) => e.action === "PROCESS_STARTED"
    );
    const locType =
      claim.employee?.employmentRecords?.[0]?.location?.type || "HEAD_OFFICE";
    const directToDG =
      canDG &&
      (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          String(er.reporting_officer_id || "") === String(meEmpId || "")
      );

    // Rejected: only allow CLEAR by the actor who rejected at their stage
    if (
      status === "REJECTED" ||
      (typeof status === "string" && status.startsWith("REJECTED"))
    ) {
      let canClear = false;
      if (
        lastEntry &&
        rejectionActions.includes(lastEntry.action) &&
        lastEntry.actor_employee_id === user?.employee_id
      ) {
        const stage = lastEntry.action.split("_")[0];
        if (stage === "RECOMMENDER") {
          canClear = isRecommenderFor(claim);
        } else if (
          (stage === "OPS" && canOps) ||
          (stage === "DG" && canDG) ||
          (stage === "ESTABLISHMENT" && canEstablishment) ||
          (stage === "ACCOUNTS" && canAccounts)
        ) {
          canClear = true;
        }
      }
      return {
        canApprove: false,
        canReject: false,
        canClear,
        canRecommend: false,
      };
    }

    // Processed/Settled: lock all actions
    if (status === "PROCESSED" || status === "SETTLED") {
      return {
        canApprove: false,
        canReject: false,
        canClear: false,
        canRecommend: false,
      };
    }

    const nextStageHasActed = () => {
      if (!lastApproval) return false;
      if (lastApproval.action === "RECOMMENDED")
        return entries.some((e) =>
          ["OPS_APPROVED", "DG_APPROVED"].includes(e.action)
        );
      if (
        lastApproval.action === "OPS_APPROVED" ||
        lastApproval.action === "DG_APPROVED"
      )
        return hasEstVerified || hasProcessStarted;
      if (lastApproval.action === "ESTABLISHMENT_VERIFIED")
        return hasProcessStarted;
      if (lastApproval.action === "PROCESS_STARTED") return false; // processing initiated
      return false;
    };

    // Determine if the last approval/recommendation entry was performed by me.
    // Prefer strict employee_id match when present; for department accounts without employee linkage,
    // fall back to matching email embedded in remarks.
    const entryEmail = (text) => {
      const m = String(text || "").match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
      );
      return m ? m[0].toLowerCase() : "";
    };
    const myEmpId = user?.employee_id ? String(user.employee_id) : "";
    const myEmail = (user?.email || "").toLowerCase();
    const lastApprovalIsMine = !!(
      lastApproval &&
      ((lastApproval.actor_employee_id != null &&
        String(lastApproval.actor_employee_id) === myEmpId) ||
        (myEmail && entryEmail(lastApproval.remarks) === myEmail))
    );

    // If Accounts has started processing, lock further actions (except CLEAR by same actor)
    if (hasProcessStarted) {
      if (
        lastApproval &&
        lastApproval.action === "PROCESS_STARTED" &&
        lastApprovalIsMine
      ) {
        return {
          canApprove: false,
          canReject: false,
          canClear: true,
          canRecommend: false,
        };
      }
      return {
        canApprove: false,
        canReject: false,
        canClear: false,
        canRecommend: false,
      };
    }

    if (lastApprovalIsMine && !nextStageHasActed()) {
      // Only allow CLEAR (Undo) if I have capability for the same stage of the last action.
      const act = lastApproval?.action || "";
      const stage = act === "RECOMMENDED" ? "RECOMMENDER" : act.split("_")[0];
      let canClear = false;
      if (stage === "RECOMMENDER") {
        canClear = isRecommenderFor(claim);
      } else if (stage === "OPS") {
        canClear = !!canOps;
      } else if (stage === "DG") {
        canClear = !!canDG;
      } else if (stage === "ESTABLISHMENT") {
        canClear = !!canEstablishment;
      } else if (stage === "ACCOUNTS" || stage === "PROCESS") {
        canClear = !!canAccounts;
      }
      if (canClear)
        return {
          canApprove: false,
          canReject: false,
          canClear: true,
          canRecommend: false,
        };
      // If I don't have capability for that stage, fall through to forward-stage actions
    }

    // DG fast-track: skip recommender if direct report to DG
    if (status === "SUBMITTED" && directToDG) {
      if (locType === "HEAD_OFFICE" && canDG)
        return {
          canApprove: true,
          canReject: true,
          canClear: false,
          canRecommend: false,
        };
    }

    // DG bypass when DG (as HoD's RO) just recommended: allow immediate DG approval
    if (
      status === "SUBMITTED" &&
      canDG &&
      lastApproval &&
      lastApproval.action === "RECOMMENDED" &&
      lastApproval.actor_employee_id === user?.employee_id
    ) {
      return {
        canApprove: true,
        canReject: true,
        canClear: false,
        canRecommend: false,
      };
    }

    // Recommender stage with two-step logic; for non-approver roles, trust server inclusion and show Recommend
    if (status === "SUBMITTED") {
      if (!isApproverRole) {
        // Server already filtered pending approvals for me; surface Recommend for me here.
        const last = entries[entries.length - 1];
        const alreadyByMe =
          last &&
          last.action === "RECOMMENDED" &&
          String(last.actor_employee_id || "") === String(meEmpId || "");
        if (!alreadyByMe)
          return {
            canApprove: false,
            canReject: true,
            canClear: false,
            canRecommend: true,
          };
      }
      const recs = entries.filter((e) => e.action === "RECOMMENDED").length;
      const deptOrigin = isDeptOriginClaim(claim);
      const hodId = hodIdForClaim(claim);
      const hodRO = hodROForClaim(claim);
      let canRecommend = false;
      if (deptOrigin && hodId) {
        if (recs === 0) canRecommend = String(meEmpId || "") === String(hodId);
        else if (recs === 1)
          canRecommend = hodRO
            ? String(meEmpId || "") === String(hodRO)
            : false;
        else canRecommend = false;
      } else {
        // legacy path: immediate in-charge of applicant (request-linked) or employee (within-city)
        canRecommend = isRecommenderFor(claim) && recs === 0;
      }
      const canReject = canRecommend;
      if (canRecommend || canReject)
        return { canApprove: false, canReject, canClear: false, canRecommend };
    }

    // Forward-stage actions
    if (status === "SUBMITTED") {
      // Only DG can approve/reject at SUBMITTED stage (HQ/department-origin); OPS only for BAZAAR
      if (locType === "BAZAAR" && canOps) {
        if (!hasRecommended)
          return {
            canApprove: false,
            canReject: false,
            canClear: false,
            canRecommend: false,
          };
        return {
          canApprove: true,
          canReject: true,
          canClear: false,
          canRecommend: false,
        };
      }
      if (locType === "HEAD_OFFICE" && canDG) {
        // Require recommendations before DG acts. For department-origin claims where HoD has a RO,
        // require two recommendations (HoD, then HoD's RO). Otherwise require at least one.
        const recs = entries.filter((e) => e.action === "RECOMMENDED").length;
        const deptOrigin = isDeptOriginClaim(claim);
        const needRecs = (() => {
          if (deptOrigin) {
            const hodId = hodIdForClaim(claim);
            const hodRO = hodROForClaim(claim);
            if (hodId && hodRO) return 2;
          }
          return 1;
        })();
        if (recs < needRecs)
          return {
            canApprove: false,
            canReject: false,
            canClear: false,
            canRecommend: false,
          };
        return {
          canApprove: true,
          canReject: true,
          canClear: false,
          canRecommend: false,
        };
      }
      // HoD/RO must not see Approve/Reject at SUBMITTED stage
    } else if (status === "APPROVED") {
      // Establishment stage
      if (canEstablishment)
        return {
          canApprove: true, // Verify action triggers APPROVE with ESTABLISHMENT_VERIFIED server-side
          canReject: true,
          canClear: false,
          canRecommend: false,
        };
    } else if (status === "VERIFIED") {
      // Accounts stage (start process)
      if (canAccounts)
        return {
          canApprove: true, // Start Process action triggers APPROVE with PROCESS_STARTED
          canReject: true,
          canClear: false,
          canRecommend: false,
        };
    }

    return {
      canApprove: false,
      canReject: false,
      canClear: false,
      canRecommend: false,
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      const rs = await listPendingExpenseClaimApprovals();
      setList(rs);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const open = (c) => {
    setSelected(c);
    setRemarks("");
    setEditMode(false);
    setEditVals({
      total_distance_km: String(c?.total_distance_km ?? ""),
      rate_per_km: String(c?.rate_per_km ?? ""),
      per_diem_days: String(c?.per_diem_days ?? ""),
      per_diem_rate: String(c?.per_diem_rate ?? ""),
      fare_total: String(c?.fare_total ?? ""),
      toll_tax_total: String(c?.toll_tax_total ?? ""),
    });
  };
  const close = () => {
    setSelected(null);
    setEditMode(false);
  };

  const act = async (action) => {
    if (!selected) return;
    if (!window.confirm(`Confirm ${action.toLowerCase()}?`)) return;
    setSubmitting(true);
    try {
      const upd = await decideExpenseClaim(selected.id, action, remarks);
      setSelected(upd);
      await load();
      await loadAll();
      close();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdits = async () => {
    if (!selected) return;
    const payload = {
      total_distance_km: Number(editVals.total_distance_km || 0) || 0,
      rate_per_km: Number(editVals.rate_per_km || 0) || 0,
      per_diem_days: Number(editVals.per_diem_days || 0) || 0,
      per_diem_rate: Number(editVals.per_diem_rate || 0) || 0,
      fare_total: Number(editVals.fare_total || 0) || 0,
      toll_tax_total: Number(editVals.toll_tax_total || 0) || 0,
    };
    const totals = computeExpenseClaimTotals({ ...selected, ...payload });
    // Also persist dependent totals
    const submitPayload = {
      ...payload,
      distance_amount: totals.C,
      travel_total: totals.E,
      per_diem_amount: totals.F,
      grand_total: totals.G,
    };
    setSubmitting(true);
    try {
      const upd = await updateExpenseClaim(selected.id, submitPayload);
      setSelected(upd);
      setEditMode(false);
      await load();
      await loadAll();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const extractEmail = (remarks, fallback) => {
    const r = String(remarks || "");
    const m = r.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return m ? m[0] : remarks || fallback || "—";
  };

  const loadAll = async () => {
    setLoadingAll(true);
    try {
      const rs = await listAllExpenseClaimApprovals({
        submission_from: submissionFrom || undefined,
        submission_to: submissionTo || undefined,
        depart_from: departFrom || undefined,
        depart_to: departTo || undefined,
      });
      setAllClaims(rs);
    } finally {
      setLoadingAll(false);
    }
  };
  // extend initial load to fetch all in background
  useEffect(() => {
    load();
    loadAll();
  }, []);

  // Role-based client filters for both tabs
  const passesRoleFilter = (c) => {
    const entries = c.statusEntries || [];
    const has = (act) => entries.some((e) => e.action === act);
    const empRepsToMe = (c.employee?.employmentRecords || []).some(
      (er) =>
        er.is_current &&
        !er.is_deleted &&
        String(er.reporting_officer_id || "") === String(meEmpId || "")
    );
    const applicantRepsToMe = c.request?.applicant?.employmentRecords?.some(
      (er) =>
        er.is_current &&
        !er.is_deleted &&
        String(er.reporting_officer_id || "") === String(meEmpId || "")
    );

    // HoD/HoD's RO short-circuit: always see their recommender items
    if (c.status === "SUBMITTED") {
      const deptOrigin = isDeptOriginClaim(c);
      const recs = entries.filter((e) => e.action === "RECOMMENDED").length;
      const hodId = hodIdForClaim(c);
      const hodRO = hodROForClaim(c);
      if (
        deptOrigin &&
        ((recs === 0 && String(meEmpId || "") === String(hodId || "")) ||
          (recs === 1 &&
            hodRO &&
            String(meEmpId || "") === String(hodRO || "")))
      )
        return true;
    }

    if (canAccounts) {
      // Accounts sees Establishment-verified (status VERIFIED) or Under Process
      return (
        (c.status === "VERIFIED" && has("ESTABLISHMENT_VERIFIED")) ||
        c.status === "UNDER_PROCESS"
      );
    }
    if (canEstablishment) {
      // Establishment sees only DG-approved (status APPROVED with DG_APPROVED)
      return c.status === "APPROVED" && has("DG_APPROVED");
    }
    if (canDG) {
      // DG sees:
      // - Any SUBMITTED with at least one recommendation
      // - Direct reports (fast-track)
      // - Department-origin SUBMITTED claims (server already enforces recs before approve)
      const isRecommended = entries.some((e) => e.action === "RECOMMENDED");
      const isDeptOriginExplicit = isDeptOriginClaim(c);
      const hasDeptOriginMarker = (entries || []).some(
        (e) =>
          e.action === "SUBMITTED" &&
          // submitted by department account (no employee actor)
          (!e.actor_employee_id ||
            // legacy textual markers
            (e.remarks &&
              /\[DEPT\]|department|submitted by/i.test(String(e.remarks))))
      );
      const isDeptOriginForDG = isDeptOriginExplicit || hasDeptOriginMarker;
      return (
        (c.status === "SUBMITTED" && (isRecommended || isDeptOriginForDG)) ||
        empRepsToMe
      );
    }
    // Others (non-approver roles): trust server-side pending list
    if (!isApproverRole) return true;
    // Approver roles but not DG/HR/Accounts (i.e., Ops) fall through to recommender logic below
    const deptOrigin = isDeptOriginClaim(c);
    const recs = entries.filter((e) => e.action === "RECOMMENDED").length;
    const hodId = hodIdForClaim(c);
    const hodRO = hodROForClaim(c);
    let canRecommend = false;
    if (c.status === "SUBMITTED") {
      if (deptOrigin && hodId) {
        if (recs === 0 && String(meEmpId || "") === String(hodId))
          canRecommend = true;
        else if (recs === 1 && hodRO && String(meEmpId || "") === String(hodRO))
          canRecommend = true;
      } else {
        canRecommend = recs === 0 && (empRepsToMe || applicantRepsToMe);
      }
    }
    return canRecommend;
  };

  const pendingFiltered = useMemo(
    () => (list || []).filter(passesRoleFilter),
    [list, canAccounts, canEstablishment, canDG, meEmpId]
  );

  const filteredAll = useMemo(() => {
    const actedByMe = (c) => {
      const myEmp = String(meEmpId || "");
      const myEmail = String(user?.email || "").toLowerCase();
      return (c.statusEntries || []).some((se) => {
        const byEmp = String(se.actor_employee_id || "") === myEmp;
        const byEmail = myEmail
          ? String(se.remarks || "")
              .toLowerCase()
              .includes(myEmail)
          : false;
        return byEmp || byEmail;
      });
    };
    // Show processed/settled items in All tab regardless of role filter, plus any acted-by-me
    const roleScoped = (allClaims || []).filter((c) => {
      const alwaysInclude = ["UNDER_PROCESS", "PROCESSED", "SETTLED"].includes(
        String(c.status || "")
      );
      return alwaysInclude || passesRoleFilter(c) || actedByMe(c);
    });
    return roleScoped.filter((c) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const qDigits = q.replace(/\D+/g, "");
        const empName = (c.employee?.full_name || "").toLowerCase();
        const empCnicRaw = String(c.employee?.cnic || "");
        const empCnicDigits = empCnicRaw.replace(/\D+/g, "");
        const reqPurpose = (
          c.request?.purpose ||
          c.request?.travel_purpose ||
          ""
        ).toLowerCase();
        const basicMatch =
          `${c.id}`.includes(q) ||
          `${c.employee_id}`.includes(q) ||
          empName.includes(q) ||
          reqPurpose.includes(q);
        const cnicMatch =
          (!!qDigits && empCnicDigits.includes(qDigits)) ||
          empCnicRaw.toLowerCase().includes(q);
        if (!(basicMatch || cnicMatch)) return false;
      }
      if (statusFilter) {
        const stat = String(c.status || "");
        const entries = c.statusEntries || [];
        const approvals = [
          "OPS_APPROVED",
          "DG_APPROVED",
          "ESTABLISHMENT_VERIFIED",
          "PROCESS_STARTED",
        ];
        const rejections = [
          "OPS_REJECTED",
          "DG_REJECTED",
          "ESTABLISHMENT_REJECTED",
          "ACCOUNTS_REJECTED",
          "RECOMMENDER_REJECTED",
        ];
        const approvedByMe = entries.some(
          (e) =>
            approvals.includes(e.action) &&
            String(e.actor_employee_id || "") === String(meEmpId || "")
        );
        const rejectedByMe = entries.some(
          (e) =>
            rejections.includes(e.action) &&
            String(e.actor_employee_id || "") === String(meEmpId || "")
        );
        let matchesStatus = false;
        if (statusFilter === "APPROVED") {
          // Show items currently in APPROVED, or any that I have approved at any stage
          matchesStatus = stat === "APPROVED" || approvedByMe;
        } else if (statusFilter === "REJECTED") {
          // Treat as any rejected status OR ones I rejected at any stage
          matchesStatus =
            stat === "REJECTED" || stat.startsWith("REJECTED") || rejectedByMe;
        } else {
          matchesStatus = stat === statusFilter;
        }
        if (!matchesStatus) return false;
      }
      return true;
    });
  }, [
    allClaims,
    search,
    statusFilter,
    canAccounts,
    canEstablishment,
    canDG,
    meEmpId,
  ]);

  const currentEmployment = (emp) => emp?.employmentRecords?.[0];
  const formatMoney = (v) =>
    (v || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const fmtDate = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "—");

  // Label: always display 'Recommend'
  const getRecommendLabel = () => "Recommend";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Expense Claim Approvals</h1>
      </div>
      <div className="flex gap-4 text-sm">
        <Button
          variant={viewTab === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewTab("pending")}
        >
          Pending Approvals
        </Button>
        <Button
          variant={viewTab === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setViewTab("all");
            if (allClaims.length === 0) loadAll();
          }}
        >
          All Claims
        </Button>
      </div>
      {viewTab === "pending" && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Pending Claims</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {loading && (
                <div className="p-4 text-muted-foreground text-sm">
                  Loading...
                </div>
              )}
              {!loading && pendingFiltered.length === 0 && (
                <div className="p-4 text-muted-foreground text-sm">
                  No pending claims
                </div>
              )}
              {pendingFiltered.map((c) => {
                const emp = c.employee;
                const empJob = currentEmployment(emp);
                const eligibility = computeEligibility(c);
                const clickAction = async (claim, action) => {
                  const labelMap = {
                    APPROVE: "approve",
                    REJECT: "reject",
                    CLEAR: "clear last decision on",
                    RECOMMEND: "recommend",
                  };
                  if (
                    !window.confirm(
                      `Confirm to ${labelMap[action]} claim #${claim.id}?`
                    )
                  )
                    return;
                  try {
                    await decideExpenseClaim(claim.id, action, "");
                    await load();
                    await loadAll();
                  } catch (e) {
                    alert(e?.response?.data?.error || e.message);
                  }
                };
                const reqPart = c.travel_request_id
                  ? ` • Req #${c.travel_request_id}`
                  : "";
                const recLabel = getRecommendLabel(c);
                return (
                  <div
                    key={c.id}
                    className="p-4 flex items-center justify-between text-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium">
                        Claim #{c.id}
                        {reqPart} • {emp?.full_name || "Employee"} (
                        {empJob?.designation?.title || "—"})
                      </div>
                      <div className="text-muted-foreground">
                        Distance {c.total_distance_km || 0} km • Grand{" "}
                        {formatMoney(c.grand_total)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(c.statusEntries || []).map((se) => (
                          <Badge
                            key={se.id}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {se.action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => open(c)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportClaimToPdf(c)}
                      >
                        Export
                      </Button>
                      <div className="flex items-center gap-1">
                        {eligibility.canRecommend && (
                          <Button
                            size="sm"
                            onClick={() => clickAction(c, "RECOMMEND")}
                          >
                            {recLabel}
                          </Button>
                        )}
                        {eligibility.canApprove && (
                          <Button
                            size="sm"
                            onClick={() => clickAction(c, "APPROVE")}
                          >
                            {c.status === "APPROVED" && canEstablishment
                              ? "Verify"
                              : c.status === "VERIFIED" && canAccounts
                              ? "Start Process"
                              : "Approve"}
                          </Button>
                        )}
                        {eligibility.canReject && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => clickAction(c, "REJECT")}
                          >
                            Reject
                          </Button>
                        )}
                        {eligibility.canClear && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => clickAction(c, "CLEAR")}
                          >
                            Undo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {viewTab === "all" && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>All Claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search id, emp, cnic, purpose"
                  className="w-56"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded px-2 py-2 text-sm"
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
                    "PENDING_APPROVAL",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* New: Submission date range */}
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-muted-foreground">
                    Submitted From
                  </label>
                  <Input
                    type="date"
                    value={submissionFrom}
                    onChange={(e) => setSubmissionFrom(e.target.value)}
                    className="w-40"
                  />
                  <label className="text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={submissionTo}
                    onChange={(e) => setSubmissionTo(e.target.value)}
                    className="w-40"
                  />
                </div>
                {/* New: Departure date range (claim.from_date or request.departure_date) */}
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-muted-foreground">
                    Departure From
                  </label>
                  <Input
                    type="date"
                    value={departFrom}
                    onChange={(e) => setDepartFrom(e.target.value)}
                    className="w-40"
                  />
                  <label className="text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={departTo}
                    onChange={(e) => setDepartTo(e.target.value)}
                    className="w-40"
                  />
                </div>

                <Button variant="outline" size="sm" onClick={loadAll}>
                  Apply
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setSubmissionFrom("");
                    setSubmissionTo("");
                    setDepartFrom("");
                    setDepartTo("");
                    loadAll();
                  }}
                >
                  Clear
                </Button>
                <Button variant="link" size="sm" onClick={loadAll}>
                  Refresh
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Showing {filteredAll.length} / {allClaims.length}
              </div>
            </div>
            <div className="divide-y max-h-[60vh] overflow-auto">
              {loadingAll && (
                <div className="p-4 text-muted-foreground text-sm">
                  Loading...
                </div>
              )}
              {!loadingAll && filteredAll.length === 0 && (
                <div className="p-4 text-muted-foreground text-sm">
                  No claims match filters.
                </div>
              )}
              {filteredAll.map((c) => {
                const emp = c.employee;
                const empJob = c.employee?.employmentRecords?.[0];
                const eligibility = computeEligibility(c);
                const locTypeAll =
                  c.employee?.employmentRecords?.[0]?.location?.type ||
                  "HEAD_OFFICE";
                const isSubmitted = c.status === "SUBMITTED";
                // In All tab, do an extra guard: for SUBMITTED, only DG (HO) or OPS (BAZAAR) can see Approve/Reject
                const allowApproveRejectInAll = isSubmitted
                  ? locTypeAll === "BAZAAR"
                    ? !!canOps
                    : !!canDG
                  : true; // other stages governed by eligibility (HR/Accounts)
                const showApprove =
                  eligibility.canApprove && allowApproveRejectInAll;
                const showReject =
                  eligibility.canReject && allowApproveRejectInAll;
                const clickAction = async (claim, action) => {
                  const labelMap = {
                    APPROVE: "approve",
                    REJECT: "reject",
                    CLEAR: "clear last decision on",
                    RECOMMEND: "recommend",
                  };
                  if (
                    !window.confirm(
                      `Confirm to ${labelMap[action]} claim #${claim.id}?`
                    )
                  )
                    return;
                  try {
                    await decideExpenseClaim(claim.id, action, "");
                    await load();
                    await loadAll();
                  } catch (e) {
                    alert(e?.response?.data?.error || e.message);
                  }
                };
                const reqBadge = c.status && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {c.status}
                  </Badge>
                );
                const reqPart = c.travel_request_id ? (
                  <span> • Req #{c.travel_request_id}</span>
                ) : null;
                const recLabel = getRecommendLabel(c);
                return (
                  <div
                    key={c.id}
                    className="p-4 flex items-center justify-between text-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium flex flex-wrap items-center gap-1">
                        Claim #{c.id}
                        {reqPart} • {emp?.full_name || "Employee"}{" "}
                        <span className="text-muted-foreground">
                          ({empJob?.designation?.title || "—"})
                        </span>{" "}
                        {reqBadge}
                      </div>
                      <div className="text-muted-foreground">
                        Distance {c.total_distance_km || 0} km • Grand{" "}
                        {(c.grand_total || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(c.statusEntries || []).map((se) => (
                          <Badge
                            key={se.id}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {se.action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => open(c)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportClaimToPdf(c)}
                      >
                        Export
                      </Button>
                      <div className="flex items-center gap-1">
                        {eligibility.canRecommend && (
                          <Button
                            size="sm"
                            onClick={() => clickAction(c, "RECOMMEND")}
                          >
                            {recLabel}
                          </Button>
                        )}
                        {showApprove && (
                          <Button
                            size="sm"
                            onClick={() => clickAction(c, "APPROVE")}
                          >
                            {c.status === "APPROVED" && canEstablishment
                              ? "Verify"
                              : c.status === "VERIFIED" && canAccounts
                              ? "Start Process"
                              : "Approve"}
                          </Button>
                        )}
                        {showReject && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => clickAction(c, "REJECT")}
                          >
                            Reject
                          </Button>
                        )}
                        {eligibility.canClear && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => clickAction(c, "CLEAR")}
                          >
                            Undo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <EnhancedModal
        isOpen={!!selected}
        onClose={close}
        title={selected ? `Expense Claim #${selected.id}` : ""}
        size="xl"
      >
        {selected &&
          (() => {
            const emp = selected.employee;
            const empJob = currentEmployment(emp);
            const isAccountsUser =
              isSuper ||
              can("travel.claim.process.start") ||
              caps?.isAccountsApprover;
            const entries = selected.statusEntries || [];
            const hasAccountsDecision = entries.some(
              (se) =>
                se.action === "PROCESS_STARTED" ||
                se.action === "ACCOUNTS_REJECTED"
            );
            // Edit is only available to Accounts users when Establishment has verified (status === 'VERIFIED')
            // and Accounts have not started processing/rejected/processed/settled yet
            const allowEdit =
              isAccountsUser &&
              selected.status === "VERIFIED" &&
              !hasAccountsDecision;
            const draft = editMode
              ? {
                  ...selected,
                  total_distance_km:
                    Number(editVals.total_distance_km || 0) || 0,
                  rate_per_km: Number(editVals.rate_per_km || 0) || 0,
                  per_diem_days: Number(editVals.per_diem_days || 0) || 0,
                  per_diem_rate: Number(editVals.per_diem_rate || 0) || 0,
                  fare_total: Number(editVals.fare_total || 0) || 0,
                  toll_tax_total: Number(editVals.toll_tax_total || 0) || 0,
                }
              : selected;
            const totals = computeExpenseClaimTotals(draft);
            return (
              <div className="p-1 md:p-4 space-y-5 text-sm">
                {/* Top-right edit controls for Accounts */}
                <div className="flex justify-end">
                  {allowEdit && !editMode && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditMode(true);
                        setEditVals({
                          total_distance_km: String(
                            selected?.total_distance_km ?? ""
                          ),
                          rate_per_km: String(selected?.rate_per_km ?? ""),
                          per_diem_days: String(selected?.per_diem_days ?? ""),
                          per_diem_rate: String(selected?.per_diem_rate ?? ""),
                          fare_total: String(selected?.fare_total ?? ""),
                          toll_tax_total: String(
                            selected?.toll_tax_total ?? ""
                          ),
                        });
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  {allowEdit && editMode && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditMode(false);
                          setEditVals({
                            total_distance_km: String(
                              selected?.total_distance_km ?? ""
                            ),
                            rate_per_km: String(selected?.rate_per_km ?? ""),
                            per_diem_days: String(
                              selected?.per_diem_days ?? ""
                            ),
                            per_diem_rate: String(
                              selected?.per_diem_rate ?? ""
                            ),
                            fare_total: String(selected?.fare_total ?? ""),
                            toll_tax_total: String(
                              selected?.toll_tax_total ?? ""
                            ),
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveEdits}
                        disabled={submitting}
                      >
                        Update
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <Card className="p-3">
                    <div className="text-[11px] uppercase text-muted-foreground mb-1">
                      Employee
                    </div>
                    <div className="font-medium">
                      {emp?.full_name || "—"}{" "}
                      <span className="text-muted-foreground">
                        #{selected.employee_id}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      CNIC: {emp?.cnic || "—"}
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-[11px] uppercase text-muted-foreground mb-1">
                      Designation
                    </div>
                    <div className="font-medium">
                      {empJob?.designation?.title || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Dept:{" "}
                      {empJob?.department?.title ||
                        empJob?.department?.name ||
                        "—"}
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-[11px] uppercase text-muted-foreground mb-1">
                      Location
                    </div>
                    <div className="font-medium">
                      {empJob?.location?.name || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Type: {empJob?.location?.type || "—"}
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-[11px] uppercase text-muted-foreground mb-1">
                      Status
                    </div>
                    <div className="font-medium">{selected.status}</div>
                    <div className="text-xs text-muted-foreground">
                      Segments: {(selected.segments || []).length}
                    </div>
                  </Card>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {selected.request && (
                    <Card className="p-3">
                      <div className="text-[11px] uppercase text-muted-foreground mb-1">
                        Request
                      </div>
                      <div className="font-medium">
                        #{selected.travel_request_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selected.request?.purpose ||
                          selected.request?.travel_purpose ||
                          "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Destination: {selected.request?.destination || "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Departure: {fmtDate(selected.request?.departure_date)} →
                        Return:{" "}
                        {fmtDate(selected.request?.expected_return_date)}
                      </div>
                    </Card>
                  )}
                  <Card className="p-3">
                    <div className="text-[11px] uppercase text-muted-foreground mb-1">
                      Claim Details
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>From Date</div>
                      <div className="text-right font-medium">
                        {fmtDate(selected.from_date)}
                      </div>
                      <div>To Date</div>
                      <div className="text-right font-medium">
                        {fmtDate(selected.to_date)}
                      </div>
                      <div>Overnight Stay</div>
                      <div className="text-right font-medium">
                        {selected.overnight_stay ? "Yes" : "No"}
                      </div>
                      <div>Transport Mode</div>
                      <div className="text-right font-medium">
                        {selected.transport_mode || "—"}
                      </div>
                      <div>Fuel Total</div>
                      <div className="text-right font-medium">
                        {formatMoney(selected.fuel_total)}
                      </div>
                      <div>Fare Total</div>
                      <div className="text-right font-medium">
                        {editMode ? (
                          <Input
                            ref={fareTotalRef}
                            type="text"
                            value={editVals.fare_total}
                            onChange={setNumWithRef("fare_total", fareTotalRef)}
                            className="h-7 text-right"
                          />
                        ) : (
                          formatMoney(selected.fare_total)
                        )}
                      </div>
                      <div>Toll Tax Total (D)</div>
                      <div className="text-right font-medium">
                        {editMode ? (
                          <Input
                            ref={tollTaxRef}
                            type="text"
                            value={editVals.toll_tax_total}
                            onChange={setNumWithRef(
                              "toll_tax_total",
                              tollTaxRef
                            )}
                            className="h-7 text-right"
                          />
                        ) : (
                          formatMoney(selected.toll_tax_total)
                        )}
                      </div>
                      <div>Rate / KM (B)</div>
                      <div className="text-right font-medium">
                        {editMode ? (
                          <Input
                            ref={rateKmRef}
                            type="text"
                            value={editVals.rate_per_km}
                            onChange={setNumWithRef("rate_per_km", rateKmRef)}
                            className="h-7 text-right"
                          />
                        ) : (
                          formatMoney(selected.rate_per_km)
                        )}
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-[11px] uppercase text-muted-foreground mb-1">
                      Totals
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>Total Distance (A)</div>
                      <div className="text-right font-medium">
                        {editMode ? (
                          <Input
                            ref={totalDistRef}
                            type="text"
                            value={editVals.total_distance_km}
                            onChange={setNumWithRef(
                              "total_distance_km",
                              totalDistRef
                            )}
                            className="h-7 text-right"
                          />
                        ) : (
                          totals.A || 0
                        )}
                      </div>

                      <div>Distance Amount (C = A×B)</div>
                      <div className="text-right font-medium">
                        {formatMoney(totals.C)}
                      </div>
                      <div>Travel Total (E = C + D)</div>
                      <div className="text-right font-medium">
                        {formatMoney(totals.E)}
                      </div>

                      <div>Per Diem Days</div>
                      <div className="text-right font-medium">
                        {editMode ? (
                          <Input
                            ref={perDiemDaysRef}
                            type="text"
                            value={editVals.per_diem_days}
                            onChange={setNumWithRef(
                              "per_diem_days",
                              perDiemDaysRef
                            )}
                            className="h-7 text-right"
                          />
                        ) : (
                          draft.per_diem_days || 0
                        )}
                      </div>

                      <div>Per Diem Rate</div>
                      <div className="text-right font-medium">
                        {editMode ? (
                          <Input
                            ref={perDiemRateRef}
                            type="text"
                            value={editVals.per_diem_rate}
                            onChange={setNumWithRef(
                              "per_diem_rate",
                              perDiemRateRef
                            )}
                            className="h-7 text-right"
                          />
                        ) : (
                          formatMoney(draft.per_diem_rate)
                        )}
                      </div>

                      <div>Per Diem Amount (F)</div>
                      <div className="text-right font-medium">
                        {formatMoney(totals.F)}
                      </div>
                      <div className="col-span-2 border-t pt-1" />
                      <div>Grand Total (G = E + F)</div>
                      <div className="text-right font-semibold">
                        {formatMoney(totals.G)}
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-[11px] uppercase text-muted-foreground mb-1">
                      Documents
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto">
                      {(selected.documents || []).map((d) => {
                        let p = d.file_path || "";
                        p = p.replace(/^\\+|^\/+/, "");
                        const isAbsolute = /^https?:\/\//i.test(p);
                        const base = (
                          import.meta.env.VITE_API_URL ||
                          "http://localhost:3000/api"
                        ).replace(/\/api\/?$/, "");
                        const url = isAbsolute
                          ? p
                          : p.startsWith("uploads/")
                          ? `${base}/${p}`
                          : `${base}/${p}`;
                        return (
                          <a
                            key={d.id}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] px-2 py-1 border rounded bg-white hover:bg-slate-50"
                          >
                            {d.category}:{p.split("/").pop()}
                          </a>
                        );
                      })}
                      {(!selected.documents ||
                        selected.documents.length === 0) && (
                        <div className="text-[10px] text-muted-foreground">
                          No documents
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                <div>
                  <div className="text-[11px] uppercase text-muted-foreground mb-2">
                    Segments
                  </div>
                  <div className="overflow-auto border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-accent/30 text-muted-foreground">
                        <tr>
                          <th className="p-2 text-left font-medium">#</th>
                          <th className="p-2 text-left font-medium">Mode</th>
                          <th className="p-2 text-left font-medium">From</th>
                          <th className="p-2 text-left font-medium">To</th>
                          <th className="p-2 text-left font-medium">
                            Depart Date
                          </th>
                          <th className="p-2 text-left font-medium">
                            Depart Time
                          </th>
                          <th className="p-2 text-left font-medium">
                            Arrive Date
                          </th>
                          <th className="p-2 text-left font-medium">
                            Arrive Time
                          </th>
                          <th className="p-2 text-left font-medium">
                            Distance KM
                          </th>
                          <th className="p-2 text-left font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selected.segments || []).map((s, i) => {
                          const amount =
                            Number(s.distance_km || 0) *
                            Number(
                              (editMode
                                ? draft.rate_per_km
                                : selected.rate_per_km) || 0
                            );
                          return (
                            <tr key={s.id} className="border-t">
                              <td className="p-2">{i + 1}</td>
                              <td className="p-2">{s.mode || "—"}</td>
                              <td className="p-2">{s.departure_from || "—"}</td>
                              <td className="p-2">{s.departure_to || "—"}</td>
                              <td className="p-2">{fmtDate(s.depart_date)}</td>
                              <td className="p-2">{s.depart_time || "—"}</td>
                              <td className="p-2">{fmtDate(s.arrive_date)}</td>
                              <td className="p-2">{s.arrive_time || "—"}</td>
                              <td className="p-2">{s.distance_km || 0}</td>
                              <td className="p-2">{formatMoney(amount)}</td>
                            </tr>
                          );
                        })}
                        {(!selected.segments ||
                          selected.segments.length === 0) && (
                          <tr>
                            <td
                              colSpan={10}
                              className="p-2 text-center text-muted-foreground"
                            >
                              No segments
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase text-muted-foreground mb-2">
                    Status History
                  </div>
                  <div className="space-y-1 max-h-48 overflow-auto pr-1">
                    {(selected.statusEntries || []).map((se) => {
                      const actorJob = currentEmployment(se.actor);
                      return (
                        <div
                          key={se.id}
                          className="flex items-start gap-2 text-xs border rounded p-2 bg-accent/20"
                        >
                          <div className="font-mono text-[10px] px-1 py-0.5 bg-background rounded border">
                            {se.action}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              {extractEmail(se.remarks, "—")}
                            </div>
                            <div className="text-muted-foreground">
                              at {new Date(se.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {(!selected.statusEntries ||
                      selected.statusEntries.length === 0) && (
                      <div className="text:[11px] text-muted-foreground">
                        No history
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Remarks (optional)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="w-full border rounded p-2 text-xs"
                    placeholder="Add remarks for this decision"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  {(() => {
                    const elig = computeEligibility(selected);
                    return (
                      <div className="flex gap-2 items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRemarks("");
                            close();
                          }}
                        >
                          Close
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportClaimToPdf(selected)}
                        >
                          Export
                        </Button>
                        {elig.canRecommend && (
                          <Button
                            disabled={submitting}
                            size="sm"
                            onClick={() => act("RECOMMEND")}
                          >
                            Recommend
                          </Button>
                        )}
                        {elig.canApprove && (
                          <Button
                            disabled={submitting}
                            size="sm"
                            onClick={() => act("APPROVE")}
                          >
                            {selected.status === "APPROVED" && canEstablishment
                              ? "Verify"
                              : selected.status === "VERIFIED" && canAccounts
                              ? "Start Process"
                              : "Approve"}
                          </Button>
                        )}
                        {elig.canReject && (
                          <Button
                            disabled={submitting}
                            size="sm"
                            variant="destructive"
                            onClick={() => act("REJECT")}
                          >
                            Reject
                          </Button>
                        )}
                        {elig.canClear && (
                          <Button
                            disabled={submitting}
                            size="sm"
                            variant="secondary"
                            onClick={() => act("CLEAR")}
                          >
                            Undo
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                  <Button variant="outline" size="sm" onClick={close}>
                    Dismiss
                  </Button>
                </div>
              </div>
            );
          })()}
      </EnhancedModal>
    </div>
  );
}
