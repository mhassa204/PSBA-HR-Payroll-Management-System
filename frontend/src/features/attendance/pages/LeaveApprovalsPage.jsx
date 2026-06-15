import React, { useEffect, useState } from "react";
import axios from "../../../lib/axios";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import { toastBus } from "../../../utils/toastBus";
import { useAuthStore } from "../../auth/authStore";

const LeaveApprovalsPage = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;
  const userRole = user?.role?.name || "";
  const [comments, setComments] = useState("");
  const [forwardingLeave, setForwardingLeave] = useState(null);
  const [forwardUserOptions, setForwardUserOptions] = useState([]);
  const [forwardSearch, setForwardSearch] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: mine }, { data: all }] = await Promise.all([
        axios.get("/leaves/approvals/mine"),
        axios.get("/leaves/approvals/all"),
      ]);
      setItems(mine.approvals || []);
      setAllItems(all.approvals || []);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (leaveId, action, forwardToUserId = null) => {
    try {
      await axios.post(`/leaves/${leaveId}/act`, {
        action,
        comments: comments || null,
        forwardToUserId: forwardToUserId || null,
      });
      setComments("");
      setSelected(null);
      setForwardingLeave(null);
      setForwardSearch("");
      await load();
      toastBus.emit({ type: "success", message: `Action ${action} applied` });
    } catch {
      // interceptor shows error
    }
  };

  const loadForwardUsers = async (search = "") => {
    try {
      const { data } = await axios.get("/leaves/users-for-forward", {
        params: { search },
      });
      const options = (data.users || [])
        .filter((u) => Number(u.id) !== Number(currentUserId))
        .map((u) => ({
          value: u.id,
          label: u.email,
          description: u.employee?.full_name || "",
        }));
      setForwardUserOptions(options);
    } catch (e) {
      console.error("Failed to load forward users:", e);
    }
  };

  useEffect(() => {
    if (forwardingLeave) {
      loadForwardUsers("");
    }
  }, [forwardingLeave]);

  useEffect(() => {
    if (forwardingLeave && forwardSearch) {
      const timeoutId = setTimeout(() => {
        loadForwardUsers(forwardSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [forwardSearch, forwardingLeave]);

  // Routing UI intentionally removed on approvals page as requested

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

  const actionButtonsFor = (l) => {
    const routes = (l.routes || [])
      .slice()
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    const curStage = l.current_stage || 0;
    const nextSeq = curStage + 1;
    const nextRoute =
      routes.find((r) => (r.sequence || 0) === nextSeq) ||
      routes[nextSeq - 1] ||
      null;
    const btns = [];
    
    // Check if current user is Operations role or is in the forwarding chain
    const isOperations = userRole === "Operations";
    const isEstablishment = /^\s*establishment/i.test(userRole);
    const isNextApprover = nextRoute && Number(nextRoute.approver_user_id) === Number(currentUserId);
    
    // Check if next approver has Director General role
    const nextApproverRole = nextRoute?.approver_user?.role?.name || "";
    const isNextApproverDirectorGeneral = /^\s*director\s+general/i.test(nextApproverRole);
    
    // Check if all routes are completed and user is Establishment
    const maxSeq = routes.length > 0 ? Math.max(...routes.map((r) => r.sequence || 0), 0) : 0;
    
    // Check if Establishment user is the final approver
    // Establishment users see Approve when they're the next approver and all previous routes are done
    // This means current_stage should be >= (their sequence - 1)
    const isEstablishmentFinalApprover = isEstablishment && isNextApprover && nextRoute && (
      curStage >= (nextRoute.sequence - 1)
    );
    
    if (nextRoute) {
      if (nextRoute.type === "RECOMMEND")
        btns.push({
          key: "RECOMMEND",
          label: "Recommend",
          cls: "btn btn-secondary text-[11px]",
        });
      if (nextRoute.type === "ALLOW") {
        // If Establishment role and final approver, show Approve instead of Allow
        if (isEstablishmentFinalApprover) {
          btns.push({
            key: "APPROVE",
            label: "Approve",
            cls: "btn btn-success text-[11px]",
          });
        } else {
          btns.push({
            key: "ALLOW",
            label: "Allow",
            cls: "btn btn-secondary text-[11px]",
          });
          // Any next approver can recommend (Operations role users and others), but not Establishment
          // Don't show recommend option if next approver is Director General
          if (isNextApprover && !isEstablishment && !isNextApproverDirectorGeneral) {
            btns.push({
              key: "FORWARD",
              label: "Recommend",
              cls: "btn btn-outline text-[11px]",
              action: () => setForwardingLeave(l),
            });
          }
        }
      }
      // Always allow reject at pending stage
      btns.push({
        key: "REJECT",
        label: "Reject",
        cls: "btn btn-error-soft text-[11px]",
      });
    } else {
      // No more routes - final approval stage
      btns.push({
        key: "APPROVE",
        label: "Approve",
        cls: "btn btn-success text-[11px]",
      });
      btns.push({
        key: "REJECT",
        label: "Reject",
        cls: "btn btn-error-soft text-[11px]",
      });
    }
    return (
      <div className="flex flex-wrap gap-2">
        <button
          className="btn btn-outline text-[11px]"
          onClick={() => setSelected(l)}
        >
          View
        </button>
        {btns.map((b) => (
          <button
            key={b.key}
            className={b.cls}
            onClick={() => {
              if (b.action) {
                b.action();
              } else {
                act(l.id, b.key);
              }
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
    );
  };

  const canUndo = (l, userId) => {
    // Allow undo if last action is by current user (even if APPROVED)
    const hist = l.statusHistory || [];
    if (!hist.length) return false;
    const last = hist[hist.length - 1];
    // Allow undo if I authored last action and there is no further action
    return Number(last.user?.id) === Number(userId);
  };

  const undo = async (leaveId) => {
    try {
      await axios.post(`/leaves/${leaveId}/undo`);
      await load();
      toastBus.emit({ type: "success", message: "Last action undone" });
    } catch {
      // no-op: interceptor handles errors
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          Leave Approvals
        </h1>
        <button className="btn btn-secondary text-xs" onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Pending approvals */}
          <div className="card-soft p-0 overflow-auto custom-thin-scroll">
            <div className="p-3 text-xs font-semibold text-gray-700">
              Pending Approvals
            </div>
            <table className="table-enhanced">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Designation</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id}>
                    <td>{String(l.date).slice(0, 10)}</td>
                    <td className="text-left">
                      {l.employee?.full_name} ({l.employee?.cnic || "-"})
                    </td>
                    <td className="text-left">
                      {l.employee?.employmentRecords?.[0]?.designation?.title ||
                        "-"}
                    </td>
                    <td className="text-left">
                      {l.employee?.employmentRecords?.[0]?.location?.name ||
                        "-"}
                    </td>
                    <td>{l.type}</td>
                    <td>
                      <span
                        className={`badge text-xs ${
                          l.current_status === "APPROVED"
                            ? "badge-success"
                            : l.current_status === "REJECTED"
                            ? "badge-error"
                            : "badge-gray"
                        }`}
                      >
                        {l.current_status}
                      </span>
                    </td>
                    <td>{actionButtonsFor(l)}</td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center text-xs text-gray-500 py-6"
                    >
                      No pending approvals
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* All approvals */}
          <div className="card-soft p-0 overflow-auto custom-thin-scroll">
            <div className="p-3 text-xs font-semibold text-gray-700">
              All Approvals
            </div>
            <table className="table-enhanced">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Designation</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((l) => (
                  <tr key={l.id}>
                    <td>{String(l.date).slice(0, 10)}</td>
                    <td className="text-left">
                      {l.employee?.full_name} ({l.employee?.cnic || "-"})
                    </td>
                    <td className="text-left">
                      {l.employee?.employmentRecords?.[0]?.designation?.title ||
                        "-"}
                    </td>
                    <td className="text-left">
                      {l.employee?.employmentRecords?.[0]?.location?.name ||
                        "-"}
                    </td>
                    <td>{l.type}</td>
                    <td>
                      <span
                        className={`badge text-xs ${
                          l.current_status === "APPROVED"
                            ? "badge-success"
                            : l.current_status === "REJECTED"
                            ? "badge-error"
                            : "badge-gray"
                        }`}
                      >
                        {l.current_status}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn btn-outline text-[11px]"
                          onClick={() => setSelected(l)}
                        >
                          View
                        </button>
                        {canUndo(l, currentUserId) && (
                          <button
                            className="btn btn-error-soft text-[11px]"
                            onClick={() => undo(l.id)}
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!allItems.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center text-xs text-gray-500 py-6"
                    >
                      No approvals yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 backdrop-fade bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-thin-scroll">
            <div className="modal-header">
              <h2 className="text-sm font-semibold tracking-wide">
                Leave Details - {String(selected.date).slice(0, 10)}
              </h2>
              <button
                onClick={() => setSelected(null)}
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
                    {selected.employee?.full_name} (
                    {selected.employee?.cnic || "-"}
                    )
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Designation:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selected.employee?.employmentRecords?.[0]?.designation
                      ?.title || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Location:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selected.employee?.employmentRecords?.[0]?.location
                      ?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>{" "}
                  <span className="ml-1 font-medium">{selected.type}</span>
                  {selected.type === "Other" && selected.custom_type && (
                    <span className="ml-2 text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                      {selected.custom_type}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selected.current_status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Submitted:</span>{" "}
                  <span className="ml-1">
                    {selected.submission_time
                      ? new Date(selected.submission_time).toLocaleString(
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

              {/* Mirror Leave Apply details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Backup:</span>{" "}
                  <span className="ml-1 font-medium">
                    {(() => {
                      const be =
                        selected.backup_employee || selected.backupEmployee;
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
                    {selected.backup_duty_from && selected.backup_duty_to
                      ? `${selected.backup_duty_from} - ${selected.backup_duty_to}`
                      : "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Duty Time:</span>{" "}
                  <span className="ml-1 font-medium">
                    {selected.duty_from && selected.duty_to
                      ? `${selected.duty_from} - ${selected.duty_to}`
                      : "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Reason:</span>{" "}
                  <span className="ml-1">
                    {selected.remarks || "No reason provided"}
                  </span>
                </div>
              </div>

              {(() => {
                const hist = selected.statusHistory || selected.history || [];
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

              {/* Actions removed from detail modal as requested */}

              {/* Documents */}
              {selected.documents &&
                (() => {
                  try {
                    const docs = JSON.parse(selected.documents);
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

      {/* Forward Modal */}
      {forwardingLeave && (
        <div className="fixed inset-0 backdrop-fade bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="modal-surface w-full max-w-md">
            <div className="modal-header">
              <h2 className="text-sm font-semibold tracking-wide">
                Recommend Leave Request
              </h2>
              <button
                onClick={() => {
                  setForwardingLeave(null);
                  setForwardSearch("");
                }}
                className="btn btn-outline btn-sm text-xs"
              >
                Close
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-700">
                Select a user to recommend this leave request to:
              </div>
              <div>
                <label className="form-label text-[11px] mb-1">
                  Search User (by name or email)
                </label>
                <SearchableSelect
                  options={forwardUserOptions}
                  value=""
                  onChange={(value, label) => {
                    if (value) {
                      act(forwardingLeave.id, "FORWARD", value);
                    }
                  }}
                  placeholder="Search and select user..."
                  allowClear={false}
                  dropdownPriority="high"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApprovalsPage;
