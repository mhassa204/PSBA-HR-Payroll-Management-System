import React, { useEffect, useLayoutEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "../../features/auth/authStore";

/**
 * Modern Sidebar Navigation
 *
 * Features:
 * - Clean, professional design
 * - Active state indicators
 * - Responsive behavior
 * - Accessibility support
 * - Icon-based navigation
 */

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: HomeIcon,
    description: "Overview and analytics",
    show: () => can("dashboard.read"),
  },
  {
    name: "Employees",
    href: "/employees",
    icon: UsersIcon,
    description: "Manage employee records",
    children: [
      { name: "All Employees", href: "/employees" },
      { name: "Add Employee", href: "/employees/new" },
      { name: "Employee Reports", href: "/employees/reports" },
    ],
  },
  {
    name: "Employment",
    href: "/employment",
    icon: BriefcaseIcon,
    description: "Employment management",
    children: [
      { name: "Employment Records", href: "/employment" },
      { name: "New Employment", href: "/employment/new" },
      { name: "Contracts", href: "/employment/contracts" },
    ],
  },
  {
    name: "Documents",
    href: "/documents",
    icon: DocumentTextIcon,
    description: "Document management",
  },
  {
    name: "Reports",
    href: "/reports",
    icon: ChartBarIcon,
    description: "Analytics and reports",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: CogIcon,
    description: "System configuration",
    children: [
      { name: "Departments", href: "/settings/departments" },
      { name: "Designations", href: "/settings/designations" },
      { name: "Role Tags", href: "/settings/role-tags" },
      { name: "Scale Grades", href: "/settings/scale-grades" },
      { name: "Locations", href: "/settings/locations" },
      { name: "Roles", href: "/settings/roles" },
      // New entries
      { name: "Districts", href: "/settings/districts" },
      { name: "Cities", href: "/settings/cities" },
      { name: "Education Levels", href: "/settings/education-levels" },
    ],
  },
];

const Sidebar = ({ isOpen, onClose, currentPath }) => {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const can = useAuthStore((s) => s.can);
  const isSuper =
    user?.role?.name === "Super Admin" ||
    (user?.permissions || []).includes("*");
  // Build navigation dynamically
  const nav = React.useMemo(() => {
    const base = [...navigation];
    return base;
  }, [canAccounts]);

  // Track expanded parents so they don't collapse on navigation
  const [expandedItems, setExpandedItems] = useState(new Set());
  const STORAGE_KEY = "sidebar.expandedItems";

  // Rehydrate expanded state from storage before paint to avoid collapse flicker
  useLayoutEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        setExpandedItems(new Set(saved));
      }
    } catch (_) {
      /* ignore */
    }
  }, []);

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(expandedItems))
    );
  }, [expandedItems]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (href) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  // Parent is considered active only on exact match (child active should not highlight parent)
  const isParentExactActive = (href) => {
    if (href === "/dashboard")
      return location.pathname === "/dashboard" || location.pathname === "/";
    return location.pathname === href;
  };

  const isChildActive = (children) => {
    return children?.some((child) => location.pathname === child.href);
  };

  const toggleExpanded = (name) => {
    setExpandedItems((prev) => {
      const s = new Set(prev);
      if (s.has(name)) s.delete(name);
      else s.add(name);
      return s;
    });
  };

  // Auto-expand parents when a child route is active
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

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center">
              {/* Replaced text badge with logo image */}
              <img
                src="/psba.png"
                alt="PSBA"
                className="h-8 w-8 rounded-lg object-cover"
              />
              <span className="ml-3 text-xl font-semibold text-gray-900">
                PSBA Portal
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {nav.map((item) => {
                    const hasChildren =
                      Array.isArray(item.children) && item.children.length > 0;
                    const expanded =
                      hasChildren &&
                      (expandedItems.has(item.name) ||
                        isChildActive(item.children));
                    return (
                      <li key={item.name}>
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(item.name)}
                            className={`
                              w-full group flex items-center justify-between rounded-md p-3 text-sm leading-6 font-medium transition-colors
                              ${
                                isParentExactActive(item.href) &&
                                !isChildActive(item.children)
                                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                              }
                            `}
                          >
                            <div className="flex items-center gap-x-3">
                              <item.icon
                                className={`h-5 w-5 shrink-0 ${
                                  isParentExactActive(item.href) &&
                                  !isChildActive(item.children)
                                    ? "text-blue-600"
                                    : "text-gray-400 group-hover:text-blue-600"
                                }`}
                                aria-hidden="true"
                              />
                              <div>
                                <div>{item.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                            <svg
                              className={`h-4 w-4 text-gray-400 transition-transform ${
                                expanded ? "rotate-90" : ""
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        ) : (
                          <Link
                            to={item.href}
                            className={`
                              group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-medium transition-colors
                              ${
                                isActive(item.href)
                                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                              }
                            `}
                          >
                            <item.icon
                              className={`h-5 w-5 shrink-0 ${
                                isActive(item.href)
                                  ? "text-blue-600"
                                  : "text-gray-400 group-hover:text-blue-600"
                              }`}
                              aria-hidden="true"
                            />
                            <div className="flex-1">
                              <div>{item.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        )}

                        {/* Sub-navigation */}
                        {hasChildren && expanded && (
                          <ul className="mt-2 ml-8 space-y-1">
                            {item.children.map((child) => (
                              <li key={child.name}>
                                <Link
                                  to={child.href}
                                  onClick={() =>
                                    setExpandedItems((prev) => {
                                      const s = new Set(prev);
                                      s.add(item.name);
                                      return s;
                                    })
                                  }
                                  className={`
                                    block rounded-md py-2 px-3 text-sm leading-6 transition-colors
                                    ${
                                      location.pathname === child.href
                                        ? "text-blue-600 bg-blue-50 font-medium"
                                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                                    }
                                  `}
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
              {/* Logout button at bottom */}
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 w-full items-center"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400 group-hover:text-red-600" />
                  <span>Logout</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden ${isOpen ? "relative z-50" : "hidden"}`}>
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button type="button" className="-m-2.5 p-2.5" onClick={onClose}>
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>

            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
              {/* Mobile Logo */}
              <div className="flex h-16 shrink-0 items-center">
                <div className="flex items-center">
                  {/* Replaced text badge with logo image */}
                  <img
                    src="/psba.png"
                    alt="PSBA"
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                  <span className="ml-3 text-xl font-semibold text-gray-900">
                    PSBA Portal
                  </span>
                </div>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {nav.map((item) => {
                        const hasChildren =
                          Array.isArray(item.children) &&
                          item.children.length > 0;
                        const expanded =
                          hasChildren &&
                          (expandedItems.has(item.name) ||
                            isChildActive(item.children));
                        return (
                          <li key={item.name}>
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(item.name)}
                                className={`
                                  w-full group flex items-center justify-between rounded-md p-3 text-sm leading-6 font-medium
                                  ${
                                    isParentExactActive(item.href) &&
                                    !isChildActive(item.children)
                                      ? "bg-blue-50 text-blue-700"
                                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                  }
                                `}
                              >
                                <div className="flex items-center gap-x-3">
                                  <item.icon
                                    className={`h-5 w-5 shrink-0 ${
                                      isParentExactActive(item.href) &&
                                      !isChildActive(item.children)
                                        ? "text-blue-600"
                                        : "text-gray-400 group-hover:text-blue-600"
                                    }`}
                                  />
                                  <div>
                                    <div>{item.name}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {item.description}
                                    </div>
                                  </div>
                                </div>
                                <svg
                                  className={`h-4 w-4 text-gray-400 transition-transform ${
                                    expanded ? "rotate-90" : ""
                                  }`}
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            ) : (
                              <Link
                                to={item.href}
                                onClick={onClose}
                                className={`
                                  group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-medium
                                  ${
                                    isActive(item.href)
                                      ? "bg-blue-50 text-blue-700"
                                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                                  }
                                `}
                              >
                                <item.icon
                                  className={`h-5 w-5 shrink-0 ${
                                    isActive(item.href)
                                      ? "text-blue-600"
                                      : "text-gray-400 group-hover:text-blue-600"
                                  }`}
                                />
                                <div>
                                  <div>{item.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {item.description}
                                  </div>
                                </div>
                              </Link>
                            )}

                            {/* Sub-navigation */}
                            {hasChildren && expanded && (
                              <ul className="mt-2 ml-8 space-y-1">
                                {item.children.map((child) => (
                                  <li key={child.name}>
                                    <Link
                                      to={child.href}
                                      onClick={() => {
                                        onClose();
                                        setExpandedItems((prev) => {
                                          const s = new Set(prev);
                                          s.add(item.name);
                                          return s;
                                        });
                                      }}
                                      className={`
                                        block rounded-md py-2 px-3 text-sm leading-6 transition-colors
                                        ${
                                          location.pathname === child.href
                                            ? "text-blue-600 bg-blue-50 font-medium"
                                            : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                                        }
                                      `}
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                  {/* Logout button at bottom */}
                  <li className="mt-auto">
                    <button
                      onClick={handleLogout}
                      className="group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 w-full items-center"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400 group-hover:text-red-600" />
                      <span>Logout</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentPath: PropTypes.string.isRequired,
};

export default Sidebar;
