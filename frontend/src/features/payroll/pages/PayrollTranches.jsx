import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "../../../utils/formatters";
import Loader from "../../../components/Loader";
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
import { Checkbox } from "../../../components/ui/checkbox";
import payrollService from "../services/payrollService";
import payrollTranchService from "../services/payrollTranchService";
import { departmentService } from "../../settings/services/departmentService";
import { designationService } from "../../settings/services/designationService";
import locationService from "../../settings/services/locationService";
import scaleGradeService from "../../settings/services/scaleGradeService";
import useToast from "../../../hooks/useToast";
import {
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const PayrollTranches = () => {
  const { showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(true);
  const [tranches, setTranches] = useState([]);
  const [underProcessPayrolls, setUnderProcessPayrolls] = useState([]);
  const [selectedPayrolls, setSelectedPayrolls] = useState(new Set());
  const [tranchPage, setTranchPage] = useState(1);
  const [payrollPage, setPayrollPage] = useState(1);
  const [tranchTotalPages, setTranchTotalPages] = useState(1);
  const [payrollTotalPages, setPayrollTotalPages] = useState(1);

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [cnicFilter, setCnicFilter] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [scaleGradeFilter, setScaleGradeFilter] = useState("");
  const [amountOperator, setAmountOperator] = useState("");
  const [amountValue, setAmountValue] = useState("");

  // Filter options
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [scaleGrades, setScaleGrades] = useState([]);

  // Create tranch
  const [tranchName, setTranchName] = useState("");
  const [creatingTranch, setCreatingTranch] = useState(false);

  const limit = 20;

  // Fetch existing tranches
  const fetchTranches = async () => {
    try {
      const result = await payrollTranchService.getAllTranches(
        tranchPage,
        limit
      );
      setTranches(result.tranches || []);
      setTranchTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching tranches:", err);
      showError(err.message || "Failed to fetch tranches");
    }
  };

  // Fetch under-process payrolls
  const fetchUnderProcessPayrolls = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (nameFilter) filters.name = nameFilter;
      if (cnicFilter) filters.cnic = cnicFilter;
      if (mobileFilter) filters.mobile = mobileFilter;
      if (designationFilter) filters.designation = designationFilter;
      // Convert department ID to name
      if (departmentFilter && departmentFilter !== "all") {
        const dept = departments.find(
          (d) => d.id.toString() === departmentFilter
        );
        if (dept) filters.department = dept.name;
      }
      // Convert location ID to name
      if (locationFilter && locationFilter !== "all") {
        const loc = locations.find((l) => l.id.toString() === locationFilter);
        if (loc) filters.location = loc.name;
      }
      if (scaleGradeFilter) filters.scaleGrade = scaleGradeFilter;
      if (amountOperator && amountValue) {
        filters.amountOperator = amountOperator;
        filters.amountValue = amountValue;
      }

      const result = await payrollService.getUnderProcessPayrolls(
        filters,
        payrollPage,
        limit
      );
      setUnderProcessPayrolls(result.payrolls || []);
      setPayrollTotalPages(result.pagination?.totalPages || 1);
      // Clear selections when filters change
      setSelectedPayrolls(new Set());
    } catch (err) {
      console.error("Error fetching under-process payrolls:", err);
      showError(err.message || "Failed to fetch payrolls");
    } finally {
      setLoading(false);
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const [depts, desigs, locs, scales] = await Promise.all([
        departmentService.getAllDepartments(),
        designationService.getAllDesignations(),
        locationService.getAllLocations(),
        scaleGradeService.getAllScaleGrades(),
      ]);
      setDepartments(depts.departments || []);
      setDesignations(desigs.designations || []);
      setLocations(locs.locations || []);
      setScaleGrades(scales.scaleGrades || []);
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  };

  useEffect(() => {
    fetchTranches();
    fetchFilterOptions();
  }, [tranchPage]);

  useEffect(() => {
    fetchUnderProcessPayrolls();
  }, [
    payrollPage,
    nameFilter,
    cnicFilter,
    mobileFilter,
    designationFilter,
    departmentFilter,
    locationFilter,
    scaleGradeFilter,
    amountOperator,
    amountValue,
    departments,
    locations,
  ]);

  // Calculate total payable for selected payrolls
  const totalPayable = useMemo(() => {
    return Array.from(selectedPayrolls).reduce((sum, payrollId) => {
      const payroll = underProcessPayrolls.find(
        (p) => p.id === parseInt(payrollId)
      );
      return sum + (parseFloat(payroll?.net_payable) || 0);
    }, 0);
  }, [selectedPayrolls, underProcessPayrolls]);

  // Filtered payrolls for selection
  const filteredPayrollIds = useMemo(() => {
    return underProcessPayrolls.map((p) => p.id.toString());
  }, [underProcessPayrolls]);

  // Select all handler
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPayrolls(new Set(filteredPayrollIds));
    } else {
      setSelectedPayrolls(new Set());
    }
  };

  // Individual checkbox handler
  const handleSelectPayroll = (payrollId, checked) => {
    const newSet = new Set(selectedPayrolls);
    if (checked) {
      newSet.add(payrollId.toString());
    } else {
      newSet.delete(payrollId.toString());
    }
    setSelectedPayrolls(newSet);
  };

  // Check if all filtered payrolls are selected
  const allSelected =
    filteredPayrollIds.length > 0 &&
    filteredPayrollIds.every((id) => selectedPayrolls.has(id));

  // Create tranch
  const handleCreateTranch = async () => {
    if (selectedPayrolls.size === 0) {
      showError("Please select at least one payroll");
      return;
    }

    setCreatingTranch(true);
    try {
      const payrollIds = Array.from(selectedPayrolls).map((id) => parseInt(id));
      await payrollTranchService.createTranch(payrollIds, tranchName || null);
      showSuccess("Tranch created successfully");
      setTranchName("");
      setSelectedPayrolls(new Set());
      await fetchTranches();
      await fetchUnderProcessPayrolls();
    } catch (err) {
      console.error("Error creating tranch:", err);
      showError(err.message || "Failed to create tranch");
    } finally {
      setCreatingTranch(false);
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
    return monthNames[month - 1] || `Month ${month}`;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payroll Tranches</h1>
      </div>

      {/* Existing Tranches Section */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Tranches</CardTitle>
          <CardDescription>
            List of all created payroll tranches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tranches.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No tranches found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payroll Count</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tranches.map((tranch) => (
                    <TableRow key={tranch.id}>
                      <TableCell className="font-mono text-sm">
                        {tranch.code}
                      </TableCell>
                      <TableCell>{tranch.name || "-"}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(tranch.total_amount || 0)}
                      </TableCell>
                      <TableCell>{tranch.payroll_count || 0}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(tranch.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {tranch.createdBy?.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: View tranch details
                            showInfo("View tranch details - Coming soon");
                          }}
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {tranchTotalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTranchPage((p) => Math.max(1, p - 1))}
                    disabled={tranchPage === 1}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {tranchPage} of {tranchTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTranchPage((p) => Math.min(tranchTotalPages, p + 1))
                    }
                    disabled={tranchPage === tranchTotalPages}
                  >
                    Next
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Tranch Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create Tranch</CardTitle>
          <CardDescription>
            Select under-process payrolls to create a tranch
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            <Input
              placeholder="Employee Name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
            <Input
              placeholder="CNIC"
              value={cnicFilter}
              onChange={(e) => setCnicFilter(e.target.value)}
            />
            <Input
              placeholder="Mobile"
              value={mobileFilter}
              onChange={(e) => setMobileFilter(e.target.value)}
            />
            <Input
              placeholder="Designation"
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
            />
            <Select
              value={departmentFilter}
              onValueChange={(value) =>
                setDepartmentFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Departments</SelectItem>
                {departments
                  .filter((d) => !d.is_deleted)
                  .map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={locationFilter}
              onValueChange={(value) =>
                setLocationFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Locations</SelectItem>
                {locations
                  .filter((l) => !l.is_deleted)
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={scaleGradeFilter}
              onValueChange={(value) =>
                setScaleGradeFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Scale Grade" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Scale Grades</SelectItem>
                {scaleGrades
                  .filter((sg) => !sg.is_deleted)
                  .map((scale) => (
                    <SelectItem key={scale.id} value={scale.id.toString()}>
                      {scale.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select
                value={amountOperator}
                onValueChange={(value) =>
                  setAmountOperator(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Amount" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                  <SelectItem value="equal">Equal To</SelectItem>
                </SelectContent>
              </Select>
              {amountOperator && amountOperator !== "all" && (
                <Input
                  type="number"
                  placeholder="Amount"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Selected Summary */}
          {selectedPayrolls.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-blue-900">
                    {selectedPayrolls.size} payroll(s) selected
                  </p>
                  <p className="text-sm text-blue-700">
                    Total Payable: {formatCurrency(totalPayable)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tranch Name (Optional)"
                    value={tranchName}
                    onChange={(e) => setTranchName(e.target.value)}
                    className="w-48"
                  />
                  <Button
                    onClick={handleCreateTranch}
                    disabled={creatingTranch || selectedPayrolls.size === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {creatingTranch ? "Creating..." : "Create Tranch"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Under-Process Payrolls Table */}
          {loading ? (
            <Loader />
          ) : underProcessPayrolls.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No under-process payrolls found
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>CNIC</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Year/Month</TableHead>
                    <TableHead>Net Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {underProcessPayrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPayrolls.has(payroll.id.toString())}
                          onCheckedChange={(checked) =>
                            handleSelectPayroll(payroll.id, checked)
                          }
                        />
                      </TableCell>
                      <TableCell>{payroll.employee_name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {payroll.employee_cnic || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payroll.employee?.mobile_number || "-"}
                      </TableCell>
                      <TableCell>{payroll.designation || "-"}</TableCell>
                      <TableCell>{payroll.department || "-"}</TableCell>
                      <TableCell>{payroll.location || "-"}</TableCell>
                      <TableCell>
                        {getMonthName(payroll.month)} {payroll.year}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payroll.net_payable || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {payrollTotalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPayrollPage((p) => Math.max(1, p - 1))}
                    disabled={payrollPage === 1}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {payrollPage} of {payrollTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPayrollPage((p) => Math.min(payrollTotalPages, p + 1))
                    }
                    disabled={payrollPage === payrollTotalPages}
                  >
                    Next
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollTranches;
