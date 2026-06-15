import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import {
  Users,
  UserCheck,
  Calendar,
  Car,
  Building2,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Activity,
  DollarSign,
  Target,
  Award,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  Zap,
} from "lucide-react";
import dashboardService from "../../../services/dashboardService";
import useToast from "../../../hooks/useToast";
import Loader from "../../../components/Loader";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showError } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getDashboardStats();
      if (response.success) {
        setDashboardData(response.data);
      } else {
        throw new Error(response.error || "Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message);
      showError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Data Available
          </h3>
          <p className="text-gray-600">
            Dashboard data is not available at the moment.
          </p>
        </div>
      </div>
    );
  }

  const { employees, attendance, leaves, travel, departments, recentActivity } =
    dashboardData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 -mx-2 md:-mx-4 lg:-mx-4 -mt-20 lg:-mt-6 -mb-6">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                PSBA Dashboard
              </h1>
              <p className="text-blue-100 text-lg">
                Welcome to PSBA HR Management System
              </p>
              <p className="text-blue-200 text-sm mt-1">
                Real-time insights and analytics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={fetchDashboardData}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <div className="text-right">
                <div className="text-sm text-blue-200">Last Updated</div>
                <div className="text-xs text-blue-300">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
      </div>

      <div className="p-4 space-y-4">
        {/* Data Status Information */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Dashboard Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        employees?.total > 0 ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-gray-700">
                      <strong>{employees?.total || 0}</strong> employees
                      registered
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        attendance?.status === "active"
                          ? "bg-green-500"
                          : attendance?.status === "historical"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-gray-700">
                      <strong>
                        {attendance?.total_attendance_records || 0}
                      </strong>{" "}
                      attendance records
                      {attendance?.status === "historical" && (
                        <span className="text-yellow-600 text-xs ml-1">
                          (historical)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        departments?.total > 0 ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-gray-700">
                      <strong>{departments?.total || 0}</strong> departments
                      active
                    </span>
                  </div>
                </div>
                <p className="text-blue-700 text-sm mt-3">
                  💡 <strong>Tip:</strong> As employees start using the system
                  for attendance, leaves, and travel, more data will appear in
                  the dashboard sections below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Cards with Enhanced Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Employees Card */}
          <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total Employees
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                {employees?.total || 0}
              </div>
              <div className="flex items-center text-blue-100 text-sm">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {employees?.active || 0} active
              </div>
            </CardContent>
          </Card>

          {/* Today's Attendance Card */}
          <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100">
                Today's Attendance
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                {attendance?.today_present || 0}
              </div>
              <div className="flex items-center text-emerald-100 text-sm">
                <Clock className="h-3 w-3 mr-1" />
                {attendance?.status === "no_data"
                  ? "No data available"
                  : attendance?.status === "historical"
                  ? "Historical data only"
                  : `${attendance?.late_arrivals_today || 0} late arrivals`}
              </div>
            </CardContent>
          </Card>

          {/* Pending Leaves Card */}
          <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">
                Pending Leaves
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                {leaves?.pending_approvals || 0}
              </div>
              <div className="flex items-center text-orange-100 text-sm">
                <Target className="h-3 w-3 mr-1" />
                {leaves?.status === "no_data"
                  ? "No leave data"
                  : `${leaves?.this_month || 0} this month`}
              </div>
            </CardContent>
          </Card>

          {/* Travel Claims Card */}
          <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">
                Travel Claims
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Car className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                {travel?.total_claims || 0}
              </div>
              <div className="flex items-center text-purple-100 text-sm">
                <DollarSign className="h-3 w-3 mr-1" />
                {travel?.status === "no_data"
                  ? "No travel data"
                  : `PKR ${
                      travel?.total_approved_amount?.toLocaleString() || 0
                    }`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Charts and Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Employee Distribution with Enhanced Design */}
          <Card className="hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <CardTitle className="flex items-center text-gray-800">
                <Building2 className="h-6 w-6 mr-3 text-blue-600" />
                <span className="text-xl font-bold">Employee Distribution</span>
                <Badge className="ml-auto bg-blue-100 text-blue-800">
                  {Object.keys(employees?.by_department || {}).length}{" "}
                  Departments
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {employees?.by_department &&
              Object.keys(employees.by_department).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(employees.by_department).map(
                    ([dept, count], index) => {
                      const percentage = (count / employees.total) * 100;
                      const colors = [
                        "from-blue-500 to-blue-600",
                        "from-emerald-500 to-emerald-600",
                        "from-orange-500 to-orange-600",
                        "from-purple-500 to-purple-600",
                        "from-pink-500 to-pink-600",
                        "from-cyan-500 to-cyan-600",
                        "from-rose-500 to-rose-600",
                        "from-lime-500 to-lime-600",
                      ];
                      const colorClass = colors[index % colors.length];

                      return (
                        <div key={dept} className="group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                              {dept}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-gray-900">
                                {count}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-1000 ease-out group-hover:shadow-lg`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    No department data available
                  </p>
                  <p className="text-gray-400 text-sm">
                    Employee department assignments will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Analytics with Enhanced Design */}
          <Card className="hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 rounded-t-lg">
              <CardTitle className="flex items-center text-gray-800">
                <Calendar className="h-6 w-6 mr-3 text-orange-600" />
                <span className="text-xl font-bold">Leave Analytics</span>
                <Badge className="ml-auto bg-orange-100 text-orange-800">
                  This Month
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {leaves?.by_type && Object.keys(leaves.by_type).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(leaves.by_type).map(
                    ([type, count], index) => {
                      const colors = [
                        "bg-blue-100 text-blue-800",
                        "bg-emerald-100 text-emerald-800",
                        "bg-orange-100 text-orange-800",
                        "bg-purple-100 text-purple-800",
                        "bg-pink-100 text-pink-800",
                        "bg-cyan-100 text-cyan-800",
                      ];
                      const colorClass = colors[index % colors.length];

                      return (
                        <div
                          key={type}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center">
                            <div
                              className={`w-3 h-3 rounded-full mr-3 ${
                                colorClass.split(" ")[0]
                              }`}
                            ></div>
                            <span className="font-medium text-gray-700 capitalize">
                              {type}
                            </span>
                          </div>
                          <Badge className={colorClass}>{count}</Badge>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No leave data available</p>
                  <p className="text-gray-400 text-sm">
                    Leave applications will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Attendance Chart with Enhanced Design */}
        <Card className="hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
            <CardTitle className="flex items-center text-gray-800">
              <TrendingUp className="h-6 w-6 mr-3 text-green-600" />
              <span className="text-xl font-bold">Weekly Attendance Trend</span>
              <Badge className="ml-auto bg-green-100 text-green-800">
                7 Days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {attendance?.this_week && attendance.this_week.length > 0 ? (
              <div className="grid grid-cols-7 gap-4">
                {attendance.this_week.map((day, index) => {
                  const maxAttendance = Math.max(
                    ...attendance.this_week.map((d) => d.present)
                  );
                  const height =
                    maxAttendance > 0 ? (day.present / maxAttendance) * 100 : 0;

                  return (
                    <div key={index} className="text-center group">
                      <div className="text-xs text-gray-600 mb-2 font-medium">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </div>
                      <div className="relative w-full bg-gray-200 rounded-t-lg h-32 flex items-end group-hover:bg-gray-300 transition-colors">
                        <div
                          className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg transition-all duration-500 ease-out group-hover:from-green-600 group-hover:to-emerald-500"
                          style={{
                            height: `${Math.max(height, 5)}%`,
                          }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {day.present}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-800 mt-2">
                        {day.present}
                      </div>
                      <div className="text-xs text-gray-500">present</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">
                  No attendance data available
                </p>
                <p className="text-gray-400 text-sm">
                  Attendance records will appear here once employees start
                  clocking in
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity with Enhanced Design */}
        <Card className="hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-t-lg">
            <CardTitle className="flex items-center text-gray-800">
              <Clock className="h-6 w-6 mr-3 text-gray-600" />
              <span className="text-xl font-bold">Recent Activity</span>
              <Badge className="ml-auto bg-gray-100 text-gray-800">
                Live Feed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-300 group"
                  >
                    <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                      {activity.type === "employee_added" && (
                        <Users className="h-5 w-5 text-blue-600" />
                      )}
                      {activity.type === "leave_applied" && (
                        <Calendar className="h-5 w-5 text-orange-600" />
                      )}
                      {activity.type === "travel_claim" && (
                        <Car className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-gray-800">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No recent activity</p>
                <p className="text-gray-400 text-sm mt-1">
                  Activity will appear here as it happens
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Overview with Enhanced Design */}
        {departments?.top_departments && (
          <Card className="hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
              <CardTitle className="flex items-center text-gray-800">
                <Building2 className="h-6 w-6 mr-3 text-indigo-600" />
                <span className="text-xl font-bold">Top Departments</span>
                <Badge className="ml-auto bg-indigo-100 text-indigo-800">
                  {departments.top_departments.length} Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.top_departments.map((dept, index) => {
                  const gradients = [
                    "from-blue-500 to-blue-600",
                    "from-emerald-500 to-emerald-600",
                    "from-orange-500 to-orange-600",
                    "from-purple-500 to-purple-600",
                    "from-pink-500 to-pink-600",
                    "from-cyan-500 to-cyan-600",
                  ];
                  const gradient = gradients[index % gradients.length];

                  return (
                    <div key={dept.id} className="group">
                      <div
                        className={`p-6 bg-gradient-to-br ${gradient} rounded-xl text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-lg">{dept.name}</h4>
                          <Award className="h-6 w-6 text-white/80" />
                        </div>
                        <div className="text-3xl font-bold mb-2">
                          {dept.employee_count}
                        </div>
                        <div className="text-sm text-white/80">employees</div>
                        <div className="mt-4 flex items-center text-white/90 text-sm">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          <span>Active Department</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
