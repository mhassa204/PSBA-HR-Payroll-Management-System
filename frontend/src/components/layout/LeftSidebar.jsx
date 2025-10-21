import React, { useEffect, useLayoutEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/authStore";
import "../../styles/sidebar.css";
import ProfilePicture from "../ui/ProfilePicture";
import axios from "../../lib/axios";
import { getTravelCapabilities } from "../../services/travelService";

// Simple SVG Icon Components
const HomeIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </svg>
);

const ChartBarIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const CogIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const ViewColumnsIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 10h16M4 14h16M4 18h16"
    />
  </svg>
);

const UserIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
    />
  </svg>
);

const PlaneIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.5 21l-1-4-5-3v-2l5-3 1-4 8.5 7-8.5 7z"
    />
  </svg>
);

const LeftSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const can = useAuthStore((s) => s.can);
  const user = useAuthStore((s) => s.user);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const STORAGE_KEY = "leftSidebar.expandedItems";
  const [travelCaps, setTravelCaps] = useState({
    canCreateOrOwn: false,
    canViewAll: false,
    isOps: false,
    isEstablishment: false,
    isDG: false,
    isAccountsApprover: false,
    isSuperAdmin: user?.role?.name === "Super Admin",
  });

  // Fetch current user's employee record (for avatar)
  const [employee, setEmployee] = useState(null);
  const [empLoading, setEmpLoading] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const loadEmployee = async () => {
      if (!user?.employee_id) {
        if (isMounted) setEmployee(null);
        return;
      }
      try {
        setEmpLoading(true);
        const res = await axios.get(`/employees/${user.employee_id}`, {
          suppress403Toast: true,
        });
        if (isMounted) setEmployee(res.data?.employee || null);
      } catch (e) {
        // Silently ignore (no permission or not found); fallback avatar will show
        if (isMounted) setEmployee(null);
      } finally {
        if (isMounted) setEmpLoading(false);
      }
    };
    loadEmployee();
    return () => {
      isMounted = false;
    };
  }, [user?.employee_id]);

  // Rehydrate expanded state from storage before paint to avoid flicker
  useLayoutEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        setExpandedItems(new Set(saved));
      }
    } catch (_) {
      /* noop */
    }
  }, []);

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(expandedItems))
    );
  }, [expandedItems]);

  // Fetch travel capabilities
  useEffect(() => {
    (async () => {
      try {
        const caps = await getTravelCapabilities();
        setTravelCaps(caps || {});
      } catch (_) {}
    })();
  }, []);

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: HomeIcon,
      description: "Overview & Analytics",
      color: "bg-blue-600",
      show: () => can("dashboard.read"),
    },
    {
      name: "Employees",
      href: "/employees",
      icon: UsersIcon,
      description: "Manage Team",
      color: "bg-emerald-600",
      show: () => can("employees.read"),
      children: [
        {
          name: "All Employees",
          href: "/employees",
          icon: ViewColumnsIcon,
          show: () => can("employees.read"),
        },
        {
          name: "Add Employee",
          href: "/employees/create",
          icon: PlusIcon,
          show: () => can("employees.create"),
        },
      ],
    },
    {
      name: "Duty Roster",
      href: "/rosters",
      icon: CalendarIcon,
      description: "Shifts & Schedules",
      color: "bg-teal-600",
      show: () => can("roster.read"),
      children: [
        {
          name: "All Rosters",
          href: "/rosters",
          icon: ViewColumnsIcon,
          show: () => can("roster.read"),
        },
        {
          name: "Create Roster",
          href: "/rosters/create",
          icon: PlusIcon,
          show: () => can("roster.create"),
        },
      ],
    },
    {
      name: "Users",
      href: "/users",
      icon: UserIcon,
      description: "System Access",
      color: "bg-purple-600",
      show: () => can("users.read"),
      children: [
        {
          name: "All Users",
          href: "/users",
          icon: ViewColumnsIcon,
          show: () => can("users.read"),
        },
        {
          name: "Add User",
          href: "/users/create",
          icon: PlusIcon,
          show: () => can("users.manage"),
        },
      ],
    },
    {
      name: "Reports",
      href: "/reports",
      icon: ChartBarIcon,
      description: "Analytics",
      color: "bg-indigo-600",
      show: () => can("reports.read"),
    },
    {
      name: "Attendance",
      href: "/attendance",
      icon: CalendarIcon,
      description: "Device Logs",
      color: "bg-sky-600",
      show: () => can("attendance.read"),
      children: [
        {
          name: "Locations",
          href: "/attendance/locations",
          icon: ViewColumnsIcon,
          show: () => can("attendance.read"),
        },
        {
          name: "Devices",
          href: "/attendance/devices",
          icon: ViewColumnsIcon,
          show: () => can("attendance.read"),
        },
      ],
    },
    {
      name: "Leave",
      href: "/attendance/leave", // changed base so we can exclude it from Attendance active logic
      icon: CalendarIcon,
      description: "Leave & Entitlements",
      color: "bg-rose-600",
      show: () => can("leaves.read") || can("leaves.apply"),
      children: [
        {
          name: "Leave Management",
          href: "/attendance/leaves",
          icon: ViewColumnsIcon,
          show: () => can("leaves.read"),
        },
        {
          name: "Leave Bank",
          href: "/attendance/leave-bank",
          icon: ViewColumnsIcon,
          show: () => can("leaves.read"),
        },
        {
          name: "Leave Apply",
          href: "/attendance/leave-apply",
          icon: ViewColumnsIcon,
          show: () => can("leaves.apply"),
        },
        {
          name: "Leave Approvals",
          href: "/attendance/leave-approvals",
          icon: ViewColumnsIcon,
          show: () =>
            can("leaves.read") || can("leaves.status") || can("leaves.apply"),
        },
      ],
    },
    {
      name: "Audit Logs",
      href: "/audit-logs",
      icon: ShieldCheckIcon,
      description: "Security",
      color: "bg-yellow-600",
      show: () => can("audit.read"),
    },
    {
      name: "Travel",
      href: "/travel",
      icon: PlaneIcon,
      description: "TADA",
      color: "bg-fuchsia-600",
      show: () => true,
      children: [
        {
          name: "Requests",
          href: "/travel/requests",
          icon: ViewColumnsIcon,
          show: () =>
            travelCaps.canCreateOrOwn ||
            can("travel.create") ||
            travelCaps.isAccountsApprover,
        },
        {
          name: "Manage Requests",
          href: "/travel/manage",
          icon: ViewColumnsIcon,
          show: () => {
            // Hide for department/location-type accounts (no employee mapping) except Operations department
            if (!user?.employee_id && !travelCaps.isOps) return false;
            // Otherwise apply existing capability/permission gates
            return (
              travelCaps.isSuperAdmin ||
              travelCaps.isEstablishment ||
              travelCaps.isOps ||
              travelCaps.isAccountsApprover ||
              !!travelCaps.canViewAll ||
              !!travelCaps.canManageRequests ||
              can("travel.manage") ||
              can("travel.request.approve.dg") ||
              can("travel.claim.verify.establishment") ||
              can("travel.request.approve.ops") ||
              can("travel.claim.approve.ops") ||
              can("travel.claim.process.start")
            );
          },
        },
        {
          name: "Approvals",
          href: "/travel/approvals",
          icon: ViewColumnsIcon,
          show: () => {
            // Hide for department/location-type accounts (no employee mapping) except Operations department
            if (!user?.employee_id && !travelCaps.isOps) return false;
            // Otherwise visible to employee-linked users OR users with manage/approval capabilities
            return (
              (!!user?.employee_id && can("travel.read")) ||
              can("travel.manage") ||
              can("travel.request.approve.dg") ||
              can("travel.request.approve.ops") ||
              travelCaps.isEstablishment ||
              travelCaps.isOps ||
              travelCaps.isDG
            );
          },
        },
        {
          name: "Expense Claims",
          href: "/travel/expense-claims",
          icon: ViewColumnsIcon,
          show: () => can("travel.claim.read"),
        },
        {
          name: "Claim Approvals",
          href: "/travel/expense-claim-approvals",
          icon: ViewColumnsIcon,
          show: () => {
            // Show for Accounts, Establishment, and Operations department users (even if no employee mapping)
            if (
              travelCaps.isAccountsApprover ||
              travelCaps.isEstablishment ||
              travelCaps.isOps
            )
              return true;
            // Preserve existing behavior for normal employee-based users
            return !!user?.employee_id && can("travel.claim.read");
          },
        },
        {
          name: "Accounts Tranches",
          href: "/travel/accounts/tranches",
          icon: ViewColumnsIcon,
          show: () =>
            travelCaps.isAccountsApprover || can("travel.claim.process.start"),
        },
        {
          name: "TADA Managed Entry",
          href: "/travel/manual",
          icon: ViewColumnsIcon,
          show: () => travelCaps.isSuperAdmin,
        },
      ],
    },
    {
      name: "Settings",
      href: "/settings",
      icon: CogIcon,
      description: "Configuration",
      color: "bg-gray-600",
      show: () =>
        can("departments.read") ||
        can("designations.read") ||
        can("role-tags.read") ||
        can("scale-grades.read") ||
        can("locations.read") ||
        can("devices.read") ||
        can("roles.read") ||
        can("districts.read") ||
        can("cities.read") ||
        can("education-levels.read") ||
        can("travel.rates.read"),
      children: [
        {
          name: "Departments",
          href: "/settings/departments",
          icon: ViewColumnsIcon,
          show: () => can("departments.read"),
        },
        {
          name: "Designations",
          href: "/settings/designations",
          icon: ViewColumnsIcon,
          show: () => can("designations.read"),
        },
        {
          name: "Role Tags",
          href: "/settings/role-tags",
          icon: ViewColumnsIcon,
          show: () => can("role-tags.read"),
        },
        {
          name: "Scale Grades",
          href: "/settings/scale-grades",
          icon: ViewColumnsIcon,
          show: () => can("scale-grades.read"),
        },
        {
          name: "Locations",
          href: "/settings/locations",
          icon: ViewColumnsIcon,
          show: () => can("locations.read"),
        },
        {
          name: "Devices",
          href: "/settings/devices",
          icon: ViewColumnsIcon,
          show: () => can("devices.read"),
        },
        {
          name: "Roles",
          href: "/settings/roles",
          icon: ViewColumnsIcon,
          show: () => can("roles.read"),
        },
        {
          name: "Districts",
          href: "/settings/districts",
          icon: ViewColumnsIcon,
          show: () => can("districts.read"),
        },
        {
          name: "Cities",
          href: "/settings/cities",
          icon: ViewColumnsIcon,
          show: () => can("cities.read"),
        },
        {
          name: "Education Levels",
          href: "/settings/education-levels",
          icon: ViewColumnsIcon,
          show: () => can("education-levels.read"),
        },
        {
          name: "Travel Rates",
          href: "/settings/travel-rates",
          icon: ViewColumnsIcon,
          show: () => can("travel.rates.read"),
        },
      ],
    },
  ];
  const isChildActive = (children) => {
    return children?.some((child) => location.pathname.startsWith(child.href));
  };

  const computeActive = (item) => {
    const p = location.pathname;
    if (item.name === "Attendance") {
      if (p.startsWith("/attendance/leave")) return false; // exclude leave section
      return p === "/attendance" || p.startsWith("/attendance");
    }
    if (item.name === "Leave") {
      return p.startsWith("/attendance/leave");
    }
    if (item.href === "/dashboard") {
      return p === "/dashboard" || p === "/";
    }
    return p.startsWith(item.href);
  };

  // Auto-expand any parent whose child is active
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children && isChildActive(item.children)) {
        setExpandedItems((prev) => {
          if (prev.has(item.name)) return prev;
          const s = new Set(prev);
          s.add(item.name);
          return s;
        });
      }
    });
  }, [location.pathname]);

  // Ensure Settings expands on visiting /settings root
  useEffect(() => {
    if (location.pathname.startsWith("/settings")) {
      setExpandedItems((prev) => {
        if (prev.has("Settings")) return prev;
        const s = new Set(prev);
        s.add("Settings");
        return s;
      });
    }
  }, [location.pathname]);

  const toggleExpanded = (itemName) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const handleNavigation = (href, parentName) => {
    if (parentName) {
      setExpandedItems((prev) => {
        const s = new Set(prev);
        s.add(parentName);
        return s;
      });
    }
    navigate(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="fixed left-0 top-0 h-full w-72 bg-slate-800 border-r border-slate-600 shadow-xl z-50">
      <div className="h-full flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            {/* Replaced HR badge with logo image */}
            <img
              src="/psba.png"
              alt="PSBA"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-white">PSBA Portal</h1>
              <p className="text-sm text-slate-300">Human Resources</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation
            .filter((item) => item.show())
            .map((item) => {
              const isItemActive =
                computeActive(item) || isChildActive(item.children);
              const isExpanded = expandedItems.has(item.name);
              const visibleChildren = (item.children || []).filter((ch) =>
                ch.show ? ch.show() : true
              );

              return (
                <div key={item.name} className="space-y-1">
                  {/* Main Navigation Item */}
                  <button
                    onClick={() => {
                      visibleChildren.length
                        ? toggleExpanded(item.name)
                        : handleNavigation(item.href);
                    }}
                    className={`
                    group w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200
                    ${
                      isItemActive
                        ? item.color + " text-white shadow-md"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }
                  `}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`
                      p-2 rounded-md transition-all duration-200
                      ${
                        isItemActive
                          ? "bg-white/20 text-white"
                          : "text-slate-400 group-hover:text-white"
                      }
                    `}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{item.name}</div>
                        <div
                          className={`text-xs ${
                            isItemActive ? "text-white/80" : "text-slate-400"
                          }`}
                        >
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {visibleChildren.length > 0 && (
                      <div
                        className={`
                      transition-transform duration-300
                      ${isExpanded ? "rotate-90" : "rotate-0"}
                    `}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Sub-navigation */}
                  {visibleChildren.length > 0 && isExpanded && (
                    <div className="ml-8 space-y-1">
                      {visibleChildren.map((child) => {
                        const isChildActive = location.pathname === child.href;

                        return (
                          <button
                            key={child.name}
                            onClick={() =>
                              handleNavigation(child.href, item.name)
                            }
                            className={`
                            w-full flex items-center space-x-3 p-2 rounded-md transition-all duration-200 text-left
                            ${
                              isChildActive
                                ? "bg-slate-700 text-white"
                                : "text-slate-400 hover:text-white hover:bg-slate-700"
                            }
                          `}
                          >
                            <child.icon className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {child.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-600">
          <div className="bg-slate-700 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              {/* Show employee profile picture if available; otherwise placeholder icon */}
              {employee ? (
                <ProfilePicture
                  employee={employee}
                  size="md"
                  className="shadow"
                  onClick={() => navigate("/profile")}
                />
              ) : (
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  {employee?.full_name || user?.email || "User"}
                </p>
                <p className="text-xs text-slate-300">
                  {user?.role?.name || ""}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
