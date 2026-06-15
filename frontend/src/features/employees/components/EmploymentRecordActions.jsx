import { useState, useEffect } from "react";
import { formatDateDisplay } from "../../../utils/formatters";
import { motion } from "framer-motion";
import { Pencil, Trash, Eye } from "lucide-react";
import EnhancedModal from "../../../components/ui/EnhancedModal";
import TabbedEmploymentForm from "./TabbedEmploymentForm";
import HistoryTab from "./TabbedEmploymentForm/HistoryTab";
import PDFPreview from "../../../components/ui/PDFPreview";
import { employmentService } from "../services/employmentService";
import { employeeService } from "../services/employeeService";

const EmploymentRecordActions = ({
  employmentRecords = [],
  onEdit,
  onDelete,
  employeeName,
  userId,
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [reportingOfficerDisplay, setReportingOfficerDisplay] = useState("—");

  const organizationOptions = [
    {
      value: "MBWO",
      label: "Model Bazaar Welfare Organization (MBWO) - 2010-2016",
    },
    {
      value: "PMBMC",
      label: "Punjab Model Bazaars Management Company (PMBMC) - 2016-2024",
    },
    {
      value: "PSBA",
      label: "Punjab Sahulat Bazaars Authority (PSBA) - 2025-Present",
    },
  ];

  const getOrganizationColor = (org) => {
    switch (org) {
      case "MBWO":
        return "#3B82F6";
      case "PMBMC":
        return "#F59E0B";
      case "PSBA":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const getOrganizationIcon = (org) => {
    switch (org) {
      case "MBWO":
        return "building-2";
      case "PMBMC":
        return "factory";
      case "PSBA":
        return "shield";
      default:
        return "briefcase";
    }
  };

  const handleEditRecord = (record) => {
    setSelectedRecord(record);
    // Call the parent's onEdit callback to open the edit modal
    if (onEdit) {
      onEdit(record);
    } else {
      console.error(
        "❌ EmploymentRecordActions: onEdit callback not provided!"
      );
    }
  };

  const handleViewRecord = (record) => {
    console.log("👁️ Viewing employment record:", record);
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleDeleteRecord = (record) => {
    // Call the parent's onDelete callback directly
    if (onDelete) {
      onDelete(record);
    } else {
      console.error(
        "❌ EmploymentRecordActions: onDelete callback not provided!"
      );
    }
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedRecord(null);
  };

  const handleViewHistory = () => {
    setShowDetailsModal(false);
    setShowHistoryModal(true);
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
  };

  const formatDate = (dateString) => {
    return formatDateDisplay(dateString) || "";
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "";
    return `PKR ${Number(amount).toLocaleString()}`;
  };

  // Renders a label/value pair ONLY when the value is present (no "N/A"/"—").
  const isBlank = (v) =>
    v === null ||
    v === undefined ||
    v === "" ||
    v === "—" ||
    v === "N/A" ||
    (typeof v === "string" && v.trim() === "");
  const InfoRow = ({ label, value, valueClass = "ml-2 text-gray-900" }) =>
    isBlank(value) ? null : (
      <div>
        <span className="font-medium text-gray-600">{label}</span>
        <span className={valueClass}>{value}</span>
      </div>
    );
  // Same, but for the flex-between layout used in the details modal
  const Row = ({ label, value }) =>
    isBlank(value) ? null : (
      <div className="flex justify-between">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="text-gray-900">{value}</span>
      </div>
    );

  // Resolve Reporting Officer label (Name - CNIC) for details modal
  useEffect(() => {
    const roId = String(selectedRecord?.reporting_officer_id || "").trim();
    if (!showDetailsModal) {
      setReportingOfficerDisplay(roId || "—");
      return;
    }
    if (!roId) {
      setReportingOfficerDisplay("—");
      return;
    }
    let cancelled = false;
    const loadRO = async () => {
      try {
        // 1) Try specialized RO source (usually returns label: "Name - CNIC")
        const list = await employmentService.getEmployeesForReportingOfficer();
        let display = null;
        if (Array.isArray(list)) {
          const matchA = list.find((e) => {
            const candidateA = String(e?.value ?? "").trim();
            const candidateB = String(e?.employee_id ?? "").trim();
            const candidateC = String(e?.id ?? "").trim();
            return (
              roId &&
              (roId === candidateA ||
                roId === candidateB ||
                roId === candidateC)
            );
          });
          if (matchA) {
            const name =
              matchA.full_name ||
              matchA.name ||
              matchA.label?.split(" - ")?.[0];
            const cnic = matchA.cnic || matchA.label?.split(" - ")?.[1];
            display = matchA.label || [name, cnic].filter(Boolean).join(" - ");
          }
        }

        // 2) Fallback to generic employee dropdown
        if (!display) {
          const dropdown = await employeeService.getAllEmployeesForDropdown();
          if (Array.isArray(dropdown)) {
            const matchB = dropdown.find(
              (opt) => String(opt?.value ?? "").trim() === roId
            );
            if (matchB?.label) {
              display = matchB.label.replace("_", " - ");
            }
          }
        }

        // 3) Final attempt: direct employee lookup if roId is numeric
        if (!display && /^\d+$/.test(roId)) {
          try {
            const emp = await employeeService.getEmployeeById(roId);
            if (emp?.full_name || emp?.cnic) {
              display = [emp.full_name, emp.cnic].filter(Boolean).join(" - ");
            }
          } catch {}
        }

        if (!cancelled) setReportingOfficerDisplay(display || roId);
      } catch (err) {
        if (!cancelled) setReportingOfficerDisplay(roId);
      }
    };
    loadRO();
    return () => {
      cancelled = true;
    };
  }, [showDetailsModal, selectedRecord?.reporting_officer_id]);

  // New: location formatter without city/district
  const formatLocation = (rec) => {
    const loc = rec?.location;
    if (!loc) return rec?.office_location || "—";

    // Debug (can be removed later)
    if (process.env.NODE_ENV !== "production") {
      try {
        console.debug("Location object for record", rec.id, loc);
      } catch (e) {}
    }

    // Primary: explicit master location name
    if (
      loc.name &&
      typeof loc.name === "string" &&
      loc.name.trim() &&
      loc.name.toLowerCase() !== "null"
    ) {
      return loc.name.trim();
    }

    // Secondary: legacy bazaar_name injected by backend compat mapper
    if (
      loc.bazaar_name &&
      typeof loc.bazaar_name === "string" &&
      loc.bazaar_name.trim() &&
      loc.bazaar_name.toLowerCase() !== "null"
    ) {
      return loc.bazaar_name.trim();
    }

    // Tertiary: compose from city/district if present
    const parts = [];
    if (loc.city && typeof loc.city === "string") parts.push(loc.city);
    if (loc.district && typeof loc.district === "string")
      parts.push(loc.district);
    if (parts.length) return parts.join(", ");

    // Fallback by type
    switch (loc.type) {
      case "HEAD_OFFICE":
        return "Head Office";
      case "HEAD_QUARTER":
        return "Head Quarter";
      case "BAZAAR":
        return "Bazaar";
      case "SAHULAT_BAZAAR":
        return "Sahulat Bazaar";
      default:
        return rec?.office_location || "—";
    }
  };

  if (employmentRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-briefcase text-6xl mb-4 text-gray-300"></i>
        <h4 className="text-xl font-semibold mb-2 text-gray-900">
          No Employment Records
        </h4>
        <p className="text-gray-600">
          {employeeName || "This employee"} has no employment records yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {employmentRecords.map((record) => (
        <motion.div
          key={record.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Big Org Tab */}
          <div
            className={`absolute -top-3 left-0 px-4 py-1 rounded-br-lg text-white text-sm font-semibold shadow ${
              record.organization === "MBWO"
                ? "bg-blue-600"
                : record.organization === "PMBMC"
                ? "bg-amber-600"
                : record.organization === "PSBA"
                ? "bg-green-600"
                : "bg-slate-600"
            }`}
          >
            {record.organization || ""}
          </div>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: getOrganizationColor(record.organization),
                  }}
                ></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {record.designation?.title ||
                    record.designation_text ||
                    record.designation ||
                    "Employment Record"}
                </h3>
                {record.is_current && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Current
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <InfoRow
                  label="Organization:"
                  value={
                    organizationOptions.find(
                      (opt) => opt.value === record.organization
                    )?.label || record.organization
                  }
                />
                <InfoRow
                  label="Department:"
                  value={
                    record.department?.name ||
                    record.department_text ||
                    record.department
                  }
                />
                <InfoRow label="Employment Type:" value={record.employment_type} />
                <InfoRow
                  label="Joining Date:"
                  value={formatDate(record.joining_date || record.effective_from)}
                />
                <InfoRow
                  label="Effective Till:"
                  value={
                    record.effective_till
                      ? formatDate(record.effective_till)
                      : ""
                  }
                />
                <InfoRow label="Status:" value={record.employment_status} />
                {record.is_on_probation && (
                  <InfoRow
                    label="Probation End:"
                    value={formatDate(record.probation_end_date)}
                  />
                )}
                {record.salary && (
                  <InfoRow
                    label={
                      record.organization === "MBWO"
                        ? "Gross Salary:"
                        : "Total Salary:"
                    }
                    value={
                      record.organization === "MBWO"
                        ? formatCurrency(record.salary.gross_salary)
                        : formatCurrency(
                            (record.salary.basic_salary || 0) +
                              (record.salary.medical_allowance || 0) +
                              (record.salary.house_rent || 0) +
                              (record.salary.conveyance_allowance || 0) +
                              (record.salary.other_allowances || 0)
                          )
                    }
                  />
                )}
                {record.location && (
                  <InfoRow label="Location:" value={formatLocation(record)} />
                )}
                {record.contract && (
                  <InfoRow
                    label="Contract Type:"
                    value={record.contract.contract_type}
                  />
                )}
              </div>

              {record.remarks && (
                <div className="mt-3">
                  <span className="font-medium text-gray-600">Remarks:</span>
                  <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {record.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleViewRecord(record)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => handleEditRecord(record)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Edit Record"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDeleteRecord(record)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Record"
              >
                <Trash size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Edit Modal is now handled by the parent component (CleanEmploymentHistory) */}

      {/* Details Modal */}
      <EnhancedModal
        isOpen={showDetailsModal}
        onClose={handleCloseModal}
        title="Employment Record Details"
        size="xl"
      >
        {selectedRecord && (
          <div className="relative p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Big Org Tab in Modal */}
            <div
              className={`absolute -top-3 left-0 px-4 py-1 rounded-br-lg text-white text-sm font-semibold shadow ${
                selectedRecord.organization === "MBWO"
                  ? "bg-blue-600"
                  : selectedRecord.organization === "PMBMC"
                  ? "bg-amber-600"
                  : selectedRecord.organization === "PSBA"
                  ? "bg-green-600"
                  : "bg-slate-600"
              }`}
            >
              {selectedRecord.organization || ""}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Employment Information
                </h3>
                <div className="space-y-2">
                  <Row
                    label="Organization:"
                    value={
                      organizationOptions.find(
                        (opt) => opt.value === selectedRecord.organization
                      )?.label || selectedRecord.organization
                    }
                  />
                  <Row
                    label="Department:"
                    value={
                      selectedRecord.department?.name ||
                      selectedRecord.department_text ||
                      selectedRecord.department
                    }
                  />
                  <Row
                    label="Designation:"
                    value={
                      selectedRecord.designation?.title ||
                      selectedRecord.designation_text ||
                      selectedRecord.designation
                    }
                  />
                  <Row
                    label="Employment Type:"
                    value={selectedRecord.employment_type}
                  />
                  <Row
                    label="Role Tag:"
                    value={
                      selectedRecord.role_tag?.name || selectedRecord.role_tag
                    }
                  />
                  <Row
                    label="Scale Grade:"
                    value={
                      selectedRecord.scale_grade?.name ||
                      selectedRecord.scale_grade
                    }
                  />
                  <Row
                    label="Joining Date:"
                    value={formatDate(
                      selectedRecord.joining_date ||
                        selectedRecord.effective_from
                    )}
                  />
                  <Row
                    label="Effective Till:"
                    value={
                      selectedRecord.effective_till
                        ? formatDate(selectedRecord.effective_till)
                        : ""
                    }
                  />
                  <Row label="Status:" value={selectedRecord.employment_status} />
                  <Row
                    label="On Probation:"
                    value={selectedRecord.is_on_probation ? "Yes" : ""}
                  />
                  {selectedRecord.is_on_probation && (
                    <Row
                      label="Probation End Date:"
                      value={formatDate(selectedRecord.probation_end_date)}
                    />
                  )}
                  <Row
                    label="Current:"
                    value={selectedRecord.is_current ? "Yes" : ""}
                  />
                  <Row
                    label="Reporting Officer (Name & CNIC):"
                    value={reportingOfficerDisplay}
                  />
                </div>
              </div>

              {selectedRecord.salary && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Salary Information
                  </h3>
                  <div className="space-y-2">
                    {selectedRecord.organization === "MBWO" ? (
                      <Row
                        label="Gross Salary:"
                        value={formatCurrency(selectedRecord.salary.gross_salary)}
                      />
                    ) : (
                      <>
                        <Row
                          label="Basic Salary:"
                          value={formatCurrency(selectedRecord.salary.basic_salary)}
                        />
                        <Row
                          label="Medical Allowance:"
                          value={formatCurrency(
                            selectedRecord.salary.medical_allowance
                          )}
                        />
                        <Row
                          label="House Rent:"
                          value={formatCurrency(selectedRecord.salary.house_rent)}
                        />
                        <Row
                          label="Conveyance:"
                          value={formatCurrency(
                            selectedRecord.salary.conveyance_allowance
                          )}
                        />
                        <Row
                          label="Other Allowances:"
                          value={formatCurrency(
                            selectedRecord.salary.other_allowances
                          )}
                        />
                        <Row
                          label="Total Salary:"
                          value={formatCurrency(
                            (selectedRecord.salary.basic_salary || 0) +
                              (selectedRecord.salary.medical_allowance || 0) +
                              (selectedRecord.salary.house_rent || 0) +
                              (selectedRecord.salary.conveyance_allowance || 0) +
                              (selectedRecord.salary.other_allowances || 0)
                          )}
                        />
                      </>
                    )}
                    <Row
                      label="Payment Mode:"
                      value={selectedRecord.salary.payment_mode}
                    />
                  </div>
                </div>
              )}
            </div>

            {(selectedRecord.location || selectedRecord.office_location) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Location Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Row label="Location:" value={formatLocation(selectedRecord)} />
                  {selectedRecord.location?.full_address && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">
                        Full Address:
                      </span>
                      <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        {selectedRecord.location.full_address}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedRecord.contract && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Contract Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Row
                    label="Contract Type:"
                    value={selectedRecord.contract.contract_type}
                  />
                  <Row
                    label="Contract Number:"
                    value={selectedRecord.contract.contract_number}
                  />
                  <Row
                    label="Probation Start:"
                    value={formatDate(selectedRecord.contract.probation_start)}
                  />
                  <Row
                    label="Start Date:"
                    value={formatDate(selectedRecord.contract.start_date)}
                  />
                  <Row
                    label="Probation End:"
                    value={formatDate(selectedRecord.contract.probation_end)}
                  />
                  <Row
                    label="End Date:"
                    value={formatDate(selectedRecord.contract.end_date)}
                  />
                  <Row
                    label="Confirmation Status:"
                    value={selectedRecord.contract.confirmation_status}
                  />
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Renewed:</span>
                    <span className="text-gray-900">
                      {selectedRecord.contract.is_renewed ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Section */}
            {selectedRecord.documents &&
              selectedRecord.documents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Documents
                  </h3>
                  <div className="space-y-3">
                    {selectedRecord.documents.map((doc) => {
                      const serverBaseUrl =
                        import.meta.env.VITE_API_URL?.replace("/api", "") ||
                        "http://localhost:3000";
                      let documentUrl;

                      if (doc.url) {
                        documentUrl = doc.url.startsWith("http")
                          ? doc.url
                          : `${serverBaseUrl}${doc.url}`;
                      } else if (doc.file_path) {
                        // Handle both relative and absolute paths
                        const filePath = doc.file_path.startsWith("uploads/")
                          ? doc.file_path
                          : `uploads/${doc.file_path}`;
                        documentUrl = `${serverBaseUrl}/${filePath}`;
                      } else {
                        console.error(
                          "No valid document URL or file path found:",
                          doc
                        );
                        documentUrl = null;
                      }

                      const isImage =
                        doc.isImage ||
                        /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(
                          doc.file_path || doc.document_name || ""
                        );
                      const isPDF =
                        /\.pdf$/i.test(
                          doc.file_path || doc.document_name || ""
                        ) || doc.mime_type === "application/pdf";
                      const fileIcon = isImage
                        ? "fas fa-image"
                        : "fas fa-file-pdf";

                      return (
                        <div
                          key={doc.id}
                          className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 mb-3">
                              <i
                                className={`${fileIcon} text-red-500 text-lg`}
                              ></i>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {doc.document_name || "Document"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {doc.file_type === "medical_fitness"
                                    ? "Medical Fitness Report"
                                    : doc.file_type === "police_character"
                                    ? "Police Character Certificate"
                                    : doc.file_type === "renewal_report"
                                    ? "Contract Renewal Report"
                                    : "Document"}
                                  <span
                                    className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset ${
                                      selectedRecord.organization === "MBWO"
                                        ? "bg-blue-100 text-blue-800 ring-blue-200"
                                        : selectedRecord.organization ===
                                          "PMBMC"
                                        ? "bg-amber-100 text-amber-800 ring-amber-200"
                                        : selectedRecord.organization === "PSBA"
                                        ? "bg-green-100 text-green-800 ring-green-200"
                                        : "bg-slate-100 text-slate-700 ring-slate-200"
                                    }`}
                                  >
                                    {selectedRecord.organization || ""}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {/* Document Preview */}
                              {documentUrl && isImage && (
                                <div className="relative group">
                                  <img
                                    src={documentUrl}
                                    alt={doc.document_name || "Document"}
                                    className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() =>
                                      window.open(documentUrl, "_blank")
                                    }
                                    onError={(e) => {
                                      console.error(
                                        "Document image failed to load:",
                                        documentUrl
                                      );
                                      e.target.style.display = "none";
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded flex items-center justify-center">
                                    <i className="fas fa-search-plus text-white opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                  </div>
                                </div>
                              )}
                              {documentUrl && isPDF && (
                                <div className="w-12 h-12 rounded border overflow-hidden">
                                  <PDFPreview
                                    url={documentUrl}
                                    fileName={doc.document_name || "Document"}
                                    height="48px"
                                    showControls={false}
                                  />
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  if (documentUrl) {
                                    console.log(
                                      "Opening document URL:",
                                      documentUrl
                                    );
                                    window.open(documentUrl, "_blank");
                                  } else {
                                    alert("Document not available");
                                  }
                                }}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                              >
                                <i className="fas fa-eye mr-1"></i>
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {selectedRecord.remarks && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Remarks
                </h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  {selectedRecord.remarks}
                </p>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <button
                onClick={handleViewHistory}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                View History
              </button>
            </div>
          </div>
        )}
      </EnhancedModal>

      {/* History Modal */}
      <EnhancedModal
        isOpen={showHistoryModal}
        onClose={handleCloseHistoryModal}
        title="Employment History"
        size="xl"
      >
        {selectedRecord && selectedRecord.id && (
          <div className="p-4">
            <HistoryTab employmentId={selectedRecord.id} userId={userId} />
          </div>
        )}
      </EnhancedModal>
    </div>
  );
};

export default EmploymentRecordActions;
