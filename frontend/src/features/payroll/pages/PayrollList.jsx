import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Loader from "../../../components/Loader";
import ErrorPage from "../../../components/ErrorPage";
import { displayCNIC, displayPhoneNumber } from "../../../utils/formatters";
import { getImageUrl } from "../../../utils/imageUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import payrollService from "../services/payrollService";
import { departmentService } from "../../settings/services/departmentService";
import { designationService } from "../../settings/services/designationService";
import locationService from "../../settings/services/locationService";
import scaleGradeService from "../../settings/services/scaleGradeService";

const PayrollList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters data
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [scaleGrades, setScaleGrades] = useState([]);

  // Current filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedDepartment, setSelectedDepartment] = useState(
    searchParams.get("department_id") || ""
  );
  const [selectedDesignation, setSelectedDesignation] = useState(
    searchParams.get("designation_title") || ""
  );
  const [selectedLocation, setSelectedLocation] = useState(
    searchParams.get("location_id") || ""
  );
  const [selectedScaleGrade, setSelectedScaleGrade] = useState(
    searchParams.get("scale_grade_id") || ""
  );

  const [page, setPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit,
        search,
        ...(selectedDepartment && { department_id: selectedDepartment }),
        ...(selectedDesignation && { designation_title: selectedDesignation }),
        ...(selectedLocation && { location_id: selectedLocation }),
        ...(selectedScaleGrade && { scale_grade_id: selectedScaleGrade }),
      };

      const result = await payrollService.getPayrollEmployees(params);
      setEmployees(result.employees || []);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError(err.message || "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const [deptsRes, desigsRes, locsRes, scalesRes] = await Promise.all([
        departmentService.getAllDepartments(),
        designationService.getAllDesignations(),
        locationService.getAllLocations(),
        scaleGradeService.getAllScaleGrades(),
      ]);

      setDepartments(
        Array.isArray(deptsRes)
          ? deptsRes
          : deptsRes.departments || deptsRes.data || []
      );
      setDesignations(
        Array.isArray(desigsRes)
          ? desigsRes
          : desigsRes.designations || desigsRes.data || []
      );
      setLocations(
        Array.isArray(locsRes)
          ? locsRes
          : locsRes.locations || locsRes.data || []
      );
      setScaleGrades(
        Array.isArray(scalesRes)
          ? scalesRes
          : scalesRes.scaleGrades || scalesRes.data || []
      );
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page]);

  // Compute filtered designations based on selected department
  const filteredDesignations = useMemo(() => {
    if (!designations || designations.length === 0) return [];

    // Filter by department if selected
    let filtered = selectedDepartment
      ? designations.filter(
          (desig) => desig.department_id === parseInt(selectedDepartment)
        )
      : designations;

    // Deduplicate by title and sort
    const uniqueByTitle = filtered.reduce((acc, desig) => {
      if (!desig.is_deleted) {
        const title = desig.title?.toLowerCase() || "";
        if (!acc[title]) {
          acc[title] = desig;
        }
      }
      return acc;
    }, {});

    return Object.values(uniqueByTitle).sort((a, b) =>
      (a.title || "").localeCompare(b.title || "")
    );
  }, [designations, selectedDepartment]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedDepartment) params.set("department_id", selectedDepartment);
    if (selectedDesignation)
      params.set("designation_title", selectedDesignation);
    if (selectedLocation) params.set("location_id", selectedLocation);
    if (selectedScaleGrade) params.set("scale_grade_id", selectedScaleGrade);
    if (page > 1) params.set("page", page);

    setSearchParams(params);
  }, [
    search,
    selectedDepartment,
    selectedDesignation,
    selectedLocation,
    selectedScaleGrade,
    page,
  ]);

  const handleSearch = () => {
    setPage(1);
    fetchEmployees();
  };

  const handleReset = () => {
    setSearch("");
    setSelectedDepartment("");
    setSelectedDesignation("");
    setSelectedLocation("");
    setSelectedScaleGrade("");
    setPage(1);
  };

  // Reset designation when department changes
  useEffect(() => {
    if (selectedDesignation) {
      // Check if the selected designation is still valid with the current department
      const isStillValid = filteredDesignations.some(
        (desig) => desig.title === selectedDesignation
      );
      if (!isStillValid && selectedDepartment) {
        setSelectedDesignation("");
      }
    }
  }, [selectedDepartment, filteredDesignations, selectedDesignation]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getCurrentEmployment = (employee) => {
    const currentEmployment = employee.employmentRecords?.find(
      (emp) => emp.is_current
    );
    return currentEmployment || employee.employmentRecords?.[0];
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
    return (first + last).toUpperCase();
  };

  if (error) {
    return <ErrorPage error={error} />;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Payroll Management
          </CardTitle>
          <CardDescription>
            View and manage employee payroll information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, CNIC, mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={selectedDepartment || "all"}
              onValueChange={(value) =>
                setSelectedDepartment(value === "all" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Departments</SelectItem>
                {departments
                  .filter((dept) => !dept.is_deleted)
                  .map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedDesignation || "all"}
              onValueChange={(value) =>
                setSelectedDesignation(value === "all" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Designations" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Designations</SelectItem>
                {filteredDesignations.map((desig) => (
                  <SelectItem key={desig.id} value={desig.title}>
                    {desig.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedLocation || "all"}
              onValueChange={(value) =>
                setSelectedLocation(value === "all" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Locations</SelectItem>
                {locations
                  .filter((loc) => !loc.is_deleted)
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedScaleGrade || "all"}
              onValueChange={(value) =>
                setSelectedScaleGrade(value === "all" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Grades</SelectItem>
                {scaleGrades
                  .filter((grade) => !grade.is_deleted)
                  .map((grade) => (
                    <SelectItem key={grade.id} value={grade.id.toString()}>
                      {grade.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <Button onClick={handleSearch}>
              <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Results Summary */}
          {!loading && total > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, total)} of {total} employees
            </div>
          )}

          {/* Table */}
          {loading ? (
            <Loader size="large" text="Loading employees..." />
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No employees found
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Photo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>CNIC</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Scale Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const employment = getCurrentEmployment(employee);
                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            {employee.profile_picture ? (
                              <img
                                src={getImageUrl(employee.profile_picture)}
                                alt={employee.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                {getInitials(employee.full_name)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {employee.full_name || "-"}
                          </TableCell>
                          <TableCell>
                            {employment?.designation?.title || "-"}
                          </TableCell>
                          <TableCell>
                            {employment?.department?.name || "-"}
                          </TableCell>
                          <TableCell>
                            {employment?.location?.name || "-"}
                          </TableCell>
                          <TableCell>
                            {employee.cnic ? displayCNIC(employee.cnic) : "-"}
                          </TableCell>
                          <TableCell>
                            {employee.mobile_number
                              ? displayPhoneNumber(employee.mobile_number)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {employment?.scale_grade?.name || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page === totalPages}
                    onClick={() => handlePageChange(page + 1)}
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

export default PayrollList;
