import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash, Eye } from "lucide-react";
import EnhancedModal from "../../../components/ui/EnhancedModal";
import TabbedEmploymentForm from "./TabbedEmploymentForm";

const EmploymentRecordActions = ({
  employmentRecords = [],
  onEdit,
  onDelete,
  employeeName,
  userId,
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const organizationOptions = [
    { value: "MBWO", label: "Model Bazaar Welfare Organization (MBWO) - 2010-2016" },
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
      console.error("❌ EmploymentRecordActions: onEdit callback not provided!");
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
      console.error("❌ EmploymentRecordActions: onDelete callback not provided!");
    }
  };





  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedRecord(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "N/A";
    return `PKR ${Number(amount).toLocaleString()}`;
  };

  // New: location formatter without city/district
  const formatLocation = (rec) => {
    const loc = rec?.location;
    const sanitizeBazaar = (val) => {
      if (!val) return '';
      if (typeof val !== 'string') return '';
      const t = val.trim();
      if (!t || t.toLowerCase() === 'null') return '';
      // If numeric-like (e.g., '99'), avoid showing raw ID
      if (/^\d+$/.test(t)) return '';
      return t;
    };
    if (loc && typeof loc === 'object') {
      if (loc.type === 'HEAD_OFFICE') return 'Head Office';
      if (loc.type === 'HEAD_QUARTER') return 'Head Quarter';
      if (loc.type === 'BAZAAR') {
        const name = sanitizeBazaar(loc.bazaar_name);
        return name ? `Bazaar - ${name}` : 'Bazaar';
      }
      if (loc.type === 'SAHULAT_BAZAAR') {
        const name = sanitizeBazaar(loc.bazaar_name);
        return name ? `Sahulat Bazaar - ${name}` : 'Sahulat Bazaar';
      }
    }
    return rec?.office_location || 'N/A';
  };

  if (employmentRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-briefcase text-6xl mb-4 text-gray-300"></i>
        <h4 className="text-xl font-semibold mb-2 text-gray-900">No Employment Records</h4>
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
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getOrganizationColor(record.organization) }}
                ></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {record.designation?.title || record.designation || "N/A"}
                </h3>
                {record.is_current && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Current
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Organization:</span>
                  <span className="ml-2 text-gray-900">
                    {organizationOptions.find(opt => opt.value === record.organization)?.label || record.organization || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Department:</span>
                  <span className="ml-2 text-gray-900">
                    {record.department?.name || record.department || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Employment Type:</span>
                  <span className="ml-2 text-gray-900">
                    {record.employment_type || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Effective From:</span>
                  <span className="ml-2 text-gray-900">
                    {formatDate(record.effective_from)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Effective Till:</span>
                  <span className="ml-2 text-gray-900">
                    {record.effective_till ? formatDate(record.effective_till) : "Present"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Status:</span>
                  <span className="ml-2 text-gray-900">
                    {record.employment_status || "N/A"}
                  </span>
                </div>
                {record.salary && (
                  <div>
                    <span className="font-medium text-gray-600">
                      {record.organization === 'MBWO' ? 'Gross Salary:' : 'Total Salary:'}
                    </span>
                    <span className="ml-2 text-gray-900">
                      {record.organization === 'MBWO' 
                        ? formatCurrency(record.salary.gross_salary)
                        : formatCurrency(
                            (record.salary.basic_salary || 0) +
                            (record.salary.medical_allowance || 0) +
                            (record.salary.house_rent || 0) +
                            (record.salary.conveyance_allowance || 0) +
                            (record.salary.other_allowances || 0)
                          )
                      }
                    </span>
                  </div>
                )}
                {record.location && (
                  <div>
                    <span className="font-medium text-gray-600">Location:</span>
                    <span className="ml-2 text-gray-900">{formatLocation(record)}</span>
                  </div>
                )}
                {record.contract && (
                  <div>
                    <span className="font-medium text-gray-600">Contract Type:</span>
                    <span className="ml-2 text-gray-900">
                      {record.contract.contract_type || "N/A"}
                    </span>
                  </div>
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
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Employment Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Organization:</span>
                    <span className="text-gray-900">
                      {organizationOptions.find(opt => opt.value === selectedRecord.organization)?.label || selectedRecord.organization || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Department:</span>
                    <span className="text-gray-900">
                      {selectedRecord.department?.name || selectedRecord.department || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Designation:</span>
                    <span className="text-gray-900">
                      {selectedRecord.designation?.title || selectedRecord.designation || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Employment Type:</span>
                    <span className="text-gray-900">
                      {selectedRecord.employment_type || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Role Tag:</span>
                    <span className="text-gray-900">
                      {selectedRecord.role_tag?.name || selectedRecord.role_tag || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Scale Grade:</span>
                    <span className="text-gray-900">
                      {selectedRecord.scale_grade?.name || selectedRecord.scale_grade || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Effective From:</span>
                    <span className="text-gray-900">
                      {formatDate(selectedRecord.effective_from)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Effective Till:</span>
                    <span className="text-gray-900">
                      {selectedRecord.effective_till ? formatDate(selectedRecord.effective_till) : "Present"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Status:</span>
                    <span className="text-gray-900">
                      {selectedRecord.employment_status || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Current:</span>
                    <span className="text-gray-900">
                      {selectedRecord.is_current ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Reporting Officer ID:</span>
                    <span className="text-gray-900">
                      {selectedRecord.reporting_officer_id || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedRecord.salary && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Salary Information
                  </h3>
                  <div className="space-y-2">
                    {selectedRecord.organization === 'MBWO' ? (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Gross Salary:</span>
                        <span className="text-gray-900">
                          {formatCurrency(selectedRecord.salary.gross_salary)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Basic Salary:</span>
                          <span className="text-gray-900">
                            {formatCurrency(selectedRecord.salary.basic_salary)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Medical Allowance:</span>
                          <span className="text-gray-900">
                            {formatCurrency(selectedRecord.salary.medical_allowance)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">House Rent:</span>
                          <span className="text-gray-900">
                            {formatCurrency(selectedRecord.salary.house_rent)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Conveyance:</span>
                          <span className="text-gray-900">
                            {formatCurrency(selectedRecord.salary.conveyance_allowance)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Other Allowances:</span>
                          <span className="text-gray-900">
                            {formatCurrency(selectedRecord.salary.other_allowances)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-medium text-gray-600">Total Salary:</span>
                          <span className="text-gray-900 font-semibold">
                            {formatCurrency(
                              (selectedRecord.salary.basic_salary || 0) +
                              (selectedRecord.salary.medical_allowance || 0) +
                              (selectedRecord.salary.house_rent || 0) +
                              (selectedRecord.salary.conveyance_allowance || 0) +
                              (selectedRecord.salary.other_allowances || 0)
                            )}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Payment Mode:</span>
                      <span className="text-gray-900">
                        {selectedRecord.salary.payment_mode || "N/A"}
                      </span>
                    </div>
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
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Location:</span>
                    <span className="text-gray-900">{formatLocation(selectedRecord)}</span>
                  </div>
                  {selectedRecord.location?.full_address && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">Full Address:</span>
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
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Contract Type:</span>
                    <span className="text-gray-900">
                      {selectedRecord.contract.contract_type || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Contract Number:</span>
                    <span className="text-gray-900">
                      {selectedRecord.contract.contract_number || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Start Date:</span>
                    <span className="text-gray-900">
                      {formatDate(selectedRecord.contract.start_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">End Date:</span>
                    <span className="text-gray-900">
                      {formatDate(selectedRecord.contract.end_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Confirmation Status:</span>
                    <span className="text-gray-900">
                      {selectedRecord.contract.confirmation_status || "N/A"}
                    </span>
                  </div>
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
            {(selectedRecord.documents && selectedRecord.documents.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Documents
                </h3>
                <div className="space-y-3">
                  {selectedRecord.documents.map((doc) => {
                    const serverBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                    let documentUrl;
                    
                    if (doc.url) {
                      documentUrl = doc.url.startsWith('http') ? doc.url : `${serverBaseUrl}${doc.url}`;
                    } else if (doc.file_path) {
                      // Handle both relative and absolute paths
                      const filePath = doc.file_path.startsWith('uploads/') ? doc.file_path : `uploads/${doc.file_path}`;
                      documentUrl = `${serverBaseUrl}/${filePath}`;
                    } else {
                      console.error('No valid document URL or file path found:', doc);
                      documentUrl = null;
                    }

                    const isImage = doc.isImage || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.file_path || doc.document_name || '');
                    const fileIcon = isImage ? 'fas fa-image' : 'fas fa-file-pdf';

                    return (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <i className={`${fileIcon} text-red-500 text-lg`}></i>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {doc.document_name || 'Document'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {doc.file_type === 'medical_fitness' ? 'Medical Fitness Report' : 
                                 doc.file_type === 'police_character' ? 'Police Character Certificate' :
                                 doc.file_type === 'renewal_report' ? 'Contract Renewal Report' :
                                 'Document'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Document Preview */}
                            {documentUrl && isImage && (
                              <div className="relative group">
                                <img
                                  src={documentUrl}
                                  alt={doc.document_name || 'Document'}
                                  className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => window.open(documentUrl, '_blank')}
                                  onError={(e) => {
                                    console.error("Document image failed to load:", documentUrl);
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded flex items-center justify-center">
                                  <i className="fas fa-search-plus text-white opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </div>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                if (documentUrl) {
                                  console.log('Opening document URL:', documentUrl);
                                  window.open(documentUrl, '_blank');
                                } else {
                                  alert('Document not available');
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
          </div>
        )}
      </EnhancedModal>


    </div>
  );
};

export default EmploymentRecordActions;