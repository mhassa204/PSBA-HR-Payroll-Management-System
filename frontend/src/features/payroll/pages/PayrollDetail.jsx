import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Loader from "../../../components/Loader";
import ErrorPage from "../../../components/ErrorPage";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import payrollService from "../services/payrollService";
import { displayCNIC } from "../../../utils/formatters";
import useToast from "../../../hooks/useToast";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import Modal from "../../../components/ui/Modal";
import { useAuthStore } from "../../auth/authStore";
import { EyeIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

const PayrollDetail = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payrollData, setPayrollData] = useState(null);
  const [existingPayrolls, setExistingPayrolls] = useState([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingPayroll, setViewingPayroll] = useState(null);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [editingArrears, setEditingArrears] = useState("0");
  const [editingDeductions, setEditingDeductions] = useState("0");
  const [updating, setUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPayrollId, setDeletingPayrollId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Input fields for arrears and deductions
  const [arrears, setArrears] = useState("0");
  const [otherDeductions, setOtherDeductions] = useState("0");

  const { showToast } = useToast();
  const can = useAuthStore((s) => s.can);
  const user = useAuthStore((s) => s.user);

  // Check if user can write payroll (Accounts role or Super Admin)
  const canWritePayroll =
    can("payroll.write") || user?.role?.name === "Super Admin";

  // Month selector - default to current month
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1
  );

  // Generate year options (current year and previous 2 years)
  const yearOptions = [];
  for (let i = 0; i < 3; i++) {
    yearOptions.push(currentDate.getFullYear() - i);
  }

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const fetchPayrollDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await payrollService.getEmployeePayrollDetails(
        employeeId,
        selectedYear,
        selectedMonth
      );
      setPayrollData(data);
    } catch (err) {
      console.error("Error fetching payroll details:", err);
      setError(err.message || "Failed to fetch payroll details");
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingPayrolls = async () => {
    if (!employeeId) return;

    setLoadingPayrolls(true);
    try {
      const result = await payrollService.getPayrollsByEmployee(employeeId);
      // Filter out deleted payrolls (backend should already filter, but double-check)
      // Create a new array reference to ensure React detects the state change
      const activePayrolls = Array.isArray(result.payrolls)
        ? result.payrolls.filter((p) => !p.is_deleted)
        : [];

      // Use functional update to ensure React detects the change
      setExistingPayrolls(() => activePayrolls);
    } catch (err) {
      console.error("Error fetching existing payrolls:", err);
      // Set empty array on error to clear stale data
      setExistingPayrolls([]);
    } finally {
      setLoadingPayrolls(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchPayrollDetails();
      fetchExistingPayrolls();
      // Reset input fields when month/year changes
      setArrears("0");
      setOtherDeductions("0");
    }
  }, [employeeId, selectedYear, selectedMonth]);

  const handleCreatePayrollClick = () => {
    if (!payrollData || !canWritePayroll) return;
    setShowConfirmModal(true);
  };

  const handleConfirmCreatePayroll = async () => {
    if (!payrollData) return;

    setShowConfirmModal(false);
    setCreating(true);
    try {
      const { employee, employment, salary, attendance, payroll, period } =
        payrollData;

      // Calculate adjusted basic salary (for completeness)
      const adjustedBasicSalary =
        attendance.total_month_days > 0
          ? (salary.basic_salary / attendance.total_month_days) *
            attendance.salary_days
          : 0;

      const payrollPayload = {
        year: selectedYear,
        month: selectedMonth,
        employee_name: employee.full_name,
        employee_cnic: employee.cnic || null,
        designation: employment.designation || null,
        department: employment.department || null,
        location: employment.location || null,
        bank_name: salary.bank_name_primary || null,
        account_number: salary.bank_account_primary || null,
        branch_code: salary.bank_branch_code || null,
        basic_salary: salary.basic_salary || 0,
        medical_allowance: salary.medical_allowance || 0,
        house_rent: salary.house_rent || 0,
        conveyance_allowance: salary.conveyance_allowance || 0,
        other_allowances: salary.other_allowances || 0,
        total_salary: salary.total_salary || 0,
        total_month_days: attendance.total_month_days || 0,
        working_days: attendance.working_days || 0,
        weekly_off_count: attendance.weekly_off_count || 0,
        approved_leaves: attendance.approved_leaves || 0,
        present_days: attendance.present_days || 0,
        absents: attendance.absents || 0,
        salary_days: attendance.salary_days || 0,
        adjusted_basic_salary: adjustedBasicSalary,
        adjusted_total_salary: payroll.adjusted_total_salary || 0,
        arrears: parseFloat(arrears) || 0,
        other_deductions: parseFloat(otherDeductions) || 0,
      };

      await payrollService.createPayroll(employeeId, payrollPayload);

      // Close confirmation modal
      setShowConfirmModal(false);

      // Reset input fields
      setArrears("0");
      setOtherDeductions("0");

      // Show success message
      showToast("Payroll created successfully", "success");

      // Refresh payrolls list (await to ensure it completes)
      // Add a small delay to ensure backend has fully committed
      await new Promise((resolve) => setTimeout(resolve, 100));
      await fetchExistingPayrolls();
    } catch (err) {
      console.error("Error creating payroll:", err);
      showToast(err.message || "Failed to create payroll", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleProcessPayroll = async (payrollId) => {
    try {
      await payrollService.processPayroll(payrollId);
      showToast("Payroll processed successfully", "success");

      // Add a small delay to ensure backend has fully committed
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Refresh the list (await to ensure it completes)
      await fetchExistingPayrolls();
    } catch (err) {
      console.error("Error processing payroll:", err);
      showToast(err.message || "Failed to process payroll", "error");
    }
  };

  const handleViewPayroll = async (payrollId) => {
    try {
      const result = await payrollService.getPayrollById(payrollId);
      setViewingPayroll(result.payroll);
      setShowViewModal(true);
    } catch (err) {
      console.error("Error fetching payroll:", err);
      showToast(err.message || "Failed to fetch payroll details", "error");
    }
  };

  const handleEditPayroll = async (payrollId) => {
    try {
      const result = await payrollService.getPayrollById(payrollId);
      const payroll = result.payroll;
      setEditingPayroll(payroll);
      setEditingArrears(payroll.arrears?.toString() || "0");
      setEditingDeductions(payroll.other_deductions?.toString() || "0");
      setShowEditModal(true);
    } catch (err) {
      console.error("Error fetching payroll:", err);
      showToast(err.message || "Failed to fetch payroll details", "error");
    }
  };

  const handleUpdatePayroll = async () => {
    if (!editingPayroll) return;

    setUpdating(true);
    try {
      await payrollService.updatePayroll(editingPayroll.id, {
        arrears: editingArrears,
        other_deductions: editingDeductions,
      });

      // Close modal and reset state
      setShowEditModal(false);
      setEditingPayroll(null);
      setEditingArrears("0");
      setEditingDeductions("0");

      showToast("Payroll updated successfully", "success");

      // Add a small delay to ensure backend has fully committed
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Refresh the list (await to ensure it completes)
      await fetchExistingPayrolls();
    } catch (err) {
      console.error("Error updating payroll:", err);
      showToast(err.message || "Failed to update payroll", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (payrollId) => {
    setDeletingPayrollId(payrollId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPayrollId || deleting) return;

    setDeleting(true);
    try {
      const payrollIdToDelete = deletingPayrollId;
      await payrollService.deletePayroll(payrollIdToDelete);

      // Close modal and reset state immediately
      setShowDeleteModal(false);
      setDeletingPayrollId(null);
      setDeleting(false);

      // Show success message
      showToast("Payroll deleted successfully", "success");

      // Add a small delay to ensure backend has fully committed
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Refresh the list
      await fetchExistingPayrolls();
    } catch (err) {
      console.error("Error deleting payroll:", err);
      showToast(err.message || "Failed to delete payroll", "error");
      setDeleting(false);
    }
  };

  const getMonthName = (month) => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[month - 1] || "";
  };

  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (error) {
    return <ErrorPage error={error} />;
  }

  if (loading) {
    return <Loader size="large" text="Loading payroll details..." />;
  }

  if (!payrollData) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12 text-gray-500">
          No payroll data available
        </div>
      </div>
    );
  }

  const { employee, employment, salary, attendance, payroll, period } =
    payrollData;

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/payroll")}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Payroll
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Payroll Details
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {employee?.full_name || "Employee"}
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Period Info */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Period:</span> {period?.start} to{" "}
            {period?.end}
          </div>
        </CardContent>
      </Card>

      {/* Employee Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">{employee?.full_name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Employee ID</p>
                <p className="font-semibold">{employee?.employee_id || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">CNIC</p>
                <p className="font-semibold">
                  {employee?.cnic ? displayCNIC(employee.cnic) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Designation</p>
                <p className="font-semibold">
                  {employment?.designation || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-semibold">{employment?.department || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold">{employment?.location || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Bank Name</p>
                <p className="font-semibold">
                  {salary?.bank_name_primary || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Account Number</p>
                <p className="font-semibold">
                  {salary?.bank_account_primary || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Branch Code</p>
                <p className="font-semibold">
                  {salary?.bank_branch_code || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Basic Salary</span>
              <span className="font-semibold">
                {formatCurrency(salary?.basic_salary || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Medical Allowance</span>
              <span className="font-semibold">
                {formatCurrency(salary?.medical_allowance || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">House Rent</span>
              <span className="font-semibold">
                {formatCurrency(salary?.house_rent || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Conveyance Allowance</span>
              <span className="font-semibold">
                {formatCurrency(salary?.conveyance_allowance || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Other Allowances</span>
              <span className="font-semibold">
                {formatCurrency(salary?.other_allowances || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 mt-2">
              <span className="text-lg font-semibold text-gray-900">
                Total Salary
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(salary?.total_salary || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance & Deductions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Total Month Days</span>
              <span className="font-semibold">
                {attendance?.total_month_days || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Working Days</span>
              <span className="font-semibold">
                {attendance?.working_days || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Weekly Offs</span>
              <span className="font-semibold">
                {attendance?.weekly_off_count || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Approved Leaves</span>
              <span className="font-semibold">
                {attendance?.approved_leaves || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Present Days</span>
              <span className="font-semibold text-green-600">
                {attendance?.present_days || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Absents</span>
              <span className="font-semibold text-red-600">
                {attendance?.absents || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 mt-2">
              <span className="font-semibold text-gray-900">Salary Days</span>
              <span className="font-bold text-gray-900">
                {attendance?.salary_days || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Calculation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Adjusted Total Salary</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(payroll?.adjusted_total_salary || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Arrears</span>
              {canWritePayroll ? (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={arrears}
                  onChange={(e) => setArrears(e.target.value)}
                  className="w-32 text-right"
                  placeholder="0.00"
                />
              ) : (
                <span className="font-semibold">
                  {formatCurrency(parseFloat(arrears) || 0)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Other Deductions</span>
              {canWritePayroll ? (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(e.target.value)}
                  className="w-32 text-right"
                  placeholder="0.00"
                />
              ) : (
                <span className="font-semibold text-red-600">
                  {formatCurrency(parseFloat(otherDeductions) || 0)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center py-4 border-t-2 border-gray-300 mt-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-4">
              <span className="text-lg font-bold text-gray-900">
                Net Payable
              </span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(
                  (payroll?.adjusted_total_salary || 0) +
                    (parseFloat(arrears) || 0) -
                    (parseFloat(otherDeductions) || 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Payroll Button */}
      {canWritePayroll && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleCreatePayrollClick}
              disabled={creating || !payrollData}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {creating ? "Creating..." : "Create Payroll"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal */}
      {payrollData && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmCreatePayroll}
          title="Confirm Payroll Creation"
          message="Please review the payroll details before creating the record."
          confirmText="Create Payroll"
          cancelText="Cancel"
          type="info"
          isLoading={creating}
          details={
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Employee Information */}
              <div className="border-b pb-3">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Employee Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>{" "}
                    <span className="font-medium">
                      {payrollData.employee?.full_name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Employee ID:</span>{" "}
                    <span className="font-medium">
                      {payrollData.employee?.employee_id || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">CNIC:</span>{" "}
                    <span className="font-medium">
                      {payrollData.employee?.cnic
                        ? displayCNIC(payrollData.employee.cnic)
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Designation:</span>{" "}
                    <span className="font-medium">
                      {payrollData.employment?.designation || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Department:</span>{" "}
                    <span className="font-medium">
                      {payrollData.employment?.department || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>{" "}
                    <span className="font-medium">
                      {payrollData.employment?.location || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="border-b pb-3">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Bank Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Bank Name:</span>{" "}
                    <span className="font-medium">
                      {payrollData.salary?.bank_name_primary || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Account No:</span>{" "}
                    <span className="font-medium">
                      {payrollData.salary?.bank_account_primary || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Branch Code:</span>{" "}
                    <span className="font-medium">
                      {payrollData.salary?.bank_branch_code || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="border-b pb-3">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Salary Breakdown
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Basic Salary:</span>
                    <span className="font-medium">
                      {formatCurrency(payrollData.salary?.basic_salary || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Medical Allowance:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        payrollData.salary?.medical_allowance || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">House Rent:</span>
                    <span className="font-medium">
                      {formatCurrency(payrollData.salary?.house_rent || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conveyance Allowance:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        payrollData.salary?.conveyance_allowance || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other Allowances:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        payrollData.salary?.other_allowances || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="font-semibold text-gray-700">
                      Total Salary:
                    </span>
                    <span className="font-bold">
                      {formatCurrency(payrollData.salary?.total_salary || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="border-b pb-3">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Attendance Summary
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Period:</span>{" "}
                    <span className="font-medium">
                      {payrollData.period?.start} to {payrollData.period?.end}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Month Days:</span>{" "}
                    <span className="font-medium">
                      {payrollData.attendance?.total_month_days || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Working Days:</span>{" "}
                    <span className="font-medium">
                      {payrollData.attendance?.working_days || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Weekly Offs:</span>{" "}
                    <span className="font-medium">
                      {payrollData.attendance?.weekly_off_count || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Approved Leaves:</span>{" "}
                    <span className="font-medium">
                      {payrollData.attendance?.approved_leaves || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Present Days:</span>{" "}
                    <span className="font-medium text-green-600">
                      {payrollData.attendance?.present_days || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Absents:</span>{" "}
                    <span className="font-medium text-red-600">
                      {payrollData.attendance?.absents || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Salary Days:</span>{" "}
                    <span className="font-medium">
                      {payrollData.attendance?.salary_days || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payroll Calculation */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Payroll Calculation
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Adjusted Total Salary:
                    </span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(
                        payrollData.payroll?.adjusted_total_salary || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Arrears:</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(arrears) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other Deductions:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(parseFloat(otherDeductions) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t mt-2">
                    <span className="font-bold text-lg text-gray-900">
                      Net Payable:
                    </span>
                    <span className="font-bold text-lg text-gray-900">
                      {formatCurrency(
                        (payrollData.payroll?.adjusted_total_salary || 0) +
                          (parseFloat(arrears) || 0) -
                          (parseFloat(otherDeductions) || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          }
        />
      )}

      {/* Existing Payrolls List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Payrolls</CardTitle>
          <CardDescription>
            List of payroll records for this employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPayrolls ? (
            <div className="text-center py-4 text-gray-500">Loading...</div>
          ) : existingPayrolls.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No payroll records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Processed At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingPayrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell>{payroll.year}</TableCell>
                      <TableCell>{getMonthName(payroll.month)}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(payroll.period_start).toLocaleDateString()} -{" "}
                        {new Date(payroll.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(payroll.net_payable || 0)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            payroll.status === "PROCESSED"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {payroll.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(payroll.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {payroll.processed_at
                          ? new Date(payroll.processed_at).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPayroll(payroll.id)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View Payroll Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          {payroll.status === "CREATED" && canWritePayroll && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPayroll(payroll.id)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                title="Edit Payroll"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(payroll.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete Payroll"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleProcessPayroll(payroll.id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Process Payroll"
                              >
                                Process
                              </Button>
                            </>
                          )}
                          {payroll.status === "CREATED" && !canWritePayroll && (
                            <span className="text-sm text-gray-500">
                              Pending Processing
                            </span>
                          )}
                          {payroll.status === "PROCESSED" && (
                            <span className="text-sm text-gray-500">
                              Processed
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Payroll Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewingPayroll(null);
        }}
        title="Payroll Details"
        size="xl"
      >
        {viewingPayroll && (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Employee Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Employee Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.employee_name || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">CNIC:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.employee_cnic
                      ? displayCNIC(viewingPayroll.employee_cnic)
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Designation:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.designation || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Department:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.department || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Location:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.location || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Bank Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Bank Name:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.bank_name || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Account Number:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.account_number || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Branch Code:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.branch_code || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Salary Breakdown */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Salary Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Basic Salary:</span>
                  <span className="font-medium">
                    {formatCurrency(viewingPayroll.basic_salary || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Medical Allowance:</span>
                  <span className="font-medium">
                    {formatCurrency(viewingPayroll.medical_allowance || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">House Rent:</span>
                  <span className="font-medium">
                    {formatCurrency(viewingPayroll.house_rent || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conveyance Allowance:</span>
                  <span className="font-medium">
                    {formatCurrency(viewingPayroll.conveyance_allowance || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Other Allowances:</span>
                  <span className="font-medium">
                    {formatCurrency(viewingPayroll.other_allowances || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>Total Salary:</span>
                  <span>
                    {formatCurrency(viewingPayroll.total_salary || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Attendance Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Period:</span>{" "}
                  <span className="font-medium">
                    {new Date(viewingPayroll.period_start).toLocaleDateString()}{" "}
                    to{" "}
                    {new Date(viewingPayroll.period_end).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total Month Days:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.total_month_days || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Working Days:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.working_days || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Weekly Offs:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.weekly_off_count || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Approved Leaves:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.approved_leaves || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Present Days:</span>{" "}
                  <span className="font-medium text-green-600">
                    {viewingPayroll.present_days || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Absents:</span>{" "}
                  <span className="font-medium text-red-600">
                    {viewingPayroll.absents || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Salary Days:</span>{" "}
                  <span className="font-medium">
                    {viewingPayroll.salary_days || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Payroll Calculation */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Payroll Calculation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Adjusted Basic Salary:</span>
                  <span className="font-medium">
                    {formatCurrency(viewingPayroll.adjusted_basic_salary || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Adjusted Total Salary:</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(viewingPayroll.adjusted_total_salary || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Arrears:</span>
                  <span className="font-medium">
                    {formatCurrency(viewingPayroll.arrears || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Other Deductions:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(viewingPayroll.other_deductions || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 font-bold text-lg">
                  <span>Net Payable:</span>
                  <span>{formatCurrency(viewingPayroll.net_payable || 0)}</span>
                </div>
              </div>
            </div>

            {/* Status Info */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Status:</span>{" "}
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      viewingPayroll.status === "PROCESSED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {viewingPayroll.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Created At:</span>{" "}
                  <span className="font-medium">
                    {new Date(viewingPayroll.createdAt).toLocaleString()}
                  </span>
                </div>
                {viewingPayroll.processed_at && (
                  <>
                    <div>
                      <span className="text-gray-600">Processed At:</span>{" "}
                      <span className="font-medium">
                        {new Date(viewingPayroll.processed_at).toLocaleString()}
                      </span>
                    </div>
                    {viewingPayroll.processedBy && (
                      <div>
                        <span className="text-gray-600">Processed By:</span>{" "}
                        <span className="font-medium">
                          {viewingPayroll.processedBy.email}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Payroll Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPayroll(null);
          setEditingArrears("0");
          setEditingDeductions("0");
        }}
        title="Edit Payroll"
        size="lg"
      >
        {editingPayroll && (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You can only edit Arrears and Other
                Deductions. All other fields are read-only and calculated
                automatically.
              </p>
            </div>

            {/* Employee Info Summary */}
            <div className="border-b pb-4">
              <h3 className="text-md font-semibold mb-2 text-gray-900">
                Employee: {editingPayroll.employee_name}
              </h3>
              <p className="text-sm text-gray-600">
                {getMonthName(editingPayroll.month)} {editingPayroll.year}
              </p>
            </div>

            {/* Current Values Display */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 mb-2">
                Current Payroll Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Adjusted Total Salary:</span>{" "}
                  <span className="font-medium text-blue-600">
                    {formatCurrency(editingPayroll.adjusted_total_salary || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Current Net Payable:</span>{" "}
                  <span className="font-medium">
                    {formatCurrency(editingPayroll.net_payable || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arrears
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingArrears}
                  onChange={(e) => setEditingArrears(e.target.value)}
                  className="w-full"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Deductions
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingDeductions}
                  onChange={(e) => setEditingDeductions(e.target.value)}
                  className="w-full"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Preview Net Payable */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">
                  New Net Payable:
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(
                    (editingPayroll.adjusted_total_salary || 0) +
                      (parseFloat(editingArrears) || 0) -
                      (parseFloat(editingDeductions) || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPayroll(null);
                  setEditingArrears("0");
                  setEditingDeductions("0");
                }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePayroll}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updating ? "Updating..." : "Update Payroll"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingPayrollId(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Payroll"
        message="Are you sure you want to delete this payroll? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        action="delete"
        isLoading={deleting}
      />
    </div>
  );
};

export default PayrollDetail;
