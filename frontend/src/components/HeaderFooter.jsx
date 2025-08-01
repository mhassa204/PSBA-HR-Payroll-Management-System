import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDownIcon,
  UserIcon,
  LogOutIcon,
  PaletteIcon,
} from "lucide-react";
import { useColorTheme, ThemeSettingsPanel } from "./ColorThemeProvider";

// Social media icons for footer (using Heroicons)
const TwitterIcon = () => (
  <svg
    className="w-5 h-5 text-gray-600 hover:text-teal-500"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.379 4.482 13.94 13.94 0 01-10.134-5.137 4.92 4.92 0 001.523 6.573 4.903 4.903 0 01-2.229-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.224.085 4.923 4.923 0 004.6 3.419 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21-.005-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg
    className="w-5 h-5 text-gray-600 hover:text-teal-500"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.024-3.037-1.85-3.037-1.852 0-2.136 1.445-2.136 2.939v5.667H9.352V9h3.414v1.561h.048c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.93-2.063-2.077 0-1.148.919-2.078 2.063-2.078 1.144 0 2.063.93 2.063 2.078 0 1.147-.919 2.077-2.063 2.077zm1.777 13.019H3.558V9h3.556v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451c.979 0 1.771-.774 1.771-1.729V1.729C24 .774 23.204 0 22.225 0z" />
  </svg>
);

const GitHubIcon = () => (
  <svg
    className="w-5 h-5 text-gray-600 hover:text-teal-500"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.11.793-.26.793-.577v-2.234c-3.338.724-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.087-.744.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.418-1.304.762-1.604-2.665-.305-5.467-1.334-5.467-5.932 0-1.31.469-2.381 1.236-3.221-.124-.304-.536-1.528.116-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.648.241 2.872.118 3.176.768.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

import { Link } from "react-router-dom";
import useAppNavigation from "../hooks/useAppNavigation";
const Header = () => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);
  const { employees, dashboard, reports, settings, profile } =
    useAppNavigation();
  const { currentTheme } = useColorTheme();

  const handleEmployeesClick = (e) => {
    e.preventDefault();
    employees.toList(); // This will preserve any existing pagination state
  };

  const handleDashboardClick = (e) => {
    e.preventDefault();
    dashboard.toDashboard();
  };

  const handleReportsClick = (e) => {
    e.preventDefault();
    reports.toReports();
  };

  const handleSettingsClick = (e) => {
    e.preventDefault();
    settings.toSettings();
  };

  const handleProfileClick = (e) => {
    e.preventDefault();
    profile.toProfile();
    setIsDropdownOpen(false);
  };

  return (
    <>
      <header
        className="sticky top-0 left-0 w-full z-50 shadow-md"
        style={{
          backgroundColor: "var(--color-background-primary)",
          borderBottom: "1px solid var(--color-border-light)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <button
                onClick={handleEmployeesClick}
                className="text-2xl font-bold transition-colors"
                style={{
                  color: "var(--color-primary-600)",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "var(--color-primary-700)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "var(--color-primary-600)")
                }
              >
                PSBA HR Portal
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex space-x-8">
              <button
                onClick={handleDashboardClick}
                className="font-medium transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "var(--color-primary-600)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "var(--color-text-secondary)")
                }
              >
                Dashboard
              </button>
              <button
                onClick={handleEmployeesClick}
                className="font-medium transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "var(--color-primary-600)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "var(--color-text-secondary)")
                }
              >
                Employees
              </button>
              <button
                onClick={handleReportsClick}
                className="font-medium transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "var(--color-primary-600)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "var(--color-text-secondary)")
                }
              >
                Reports
              </button>
              <button
                onClick={() => navigate("/audit-logs")}
                className="font-medium transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "var(--color-primary-600)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "var(--color-text-secondary)")
                }
              >
                <i className="fas fa-shield-alt mr-2"></i>
                Audit Logs
              </button>
              <button
                onClick={handleSettingsClick}
                className="font-medium transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "var(--color-primary-600)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "var(--color-text-secondary)")
                }
              >
                Settings
              </button>
            </nav>

            {/* Theme Selector and User Profile */}
            <div className="flex items-center space-x-4">
              {/* Theme Selector Button */}
              <button
                onClick={() => setIsThemeSettingsOpen(true)}
                className="p-2 rounded-lg transition-colors"
                style={{
                  color: "var(--color-text-secondary)",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "var(--color-primary-600)";
                  e.target.style.backgroundColor = "var(--color-primary-50)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "var(--color-text-secondary)";
                  e.target.style.backgroundColor = "transparent";
                }}
                title="Theme Settings"
              >
                <PaletteIcon className="w-5 h-5" />
              </button>

              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 focus:outline-none transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                  onMouseEnter={(e) =>
                    (e.target.style.color = "var(--color-primary-600)")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.color = "var(--color-text-secondary)")
                  }
                >
                  <UserIcon className="w-6 h-6" />
                  <span className="hidden sm:inline text-sm font-medium">
                    Mariya
                  </span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>

                {isDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-2 z-10"
                    style={{
                      backgroundColor: "var(--color-background-primary)",
                      border: "1px solid var(--color-border-light)",
                    }}
                  >
                    <button
                      onClick={handleProfileClick}
                      className="block w-full text-left px-4 py-2 text-sm transition-colors"
                      style={{ color: "var(--color-text-primary)" }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor =
                          "var(--color-primary-50)";
                        e.target.style.color = "var(--color-primary-600)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.color = "var(--color-text-primary)";
                      }}
                    >
                      Profile
                    </button>
                    <Link
                      to="/logout"
                      className="block px-4 py-2 text-sm transition-colors"
                      style={{ color: "var(--color-text-primary)" }}
                      onClick={() => setIsDropdownOpen(false)}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor =
                          "var(--color-primary-50)";
                        e.target.style.color = "var(--color-primary-600)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.color = "var(--color-text-primary)";
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <LogOutIcon className="w-4 h-4" />
                        <span>Logout</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Theme Settings Panel */}
      <ThemeSettingsPanel
        isOpen={isThemeSettingsOpen}
        onClose={() => setIsThemeSettingsOpen(false)}
      />
    </>
  );
};

// export { Header };

const Footer = () => {
  return (
    <footer
      className="border-t"
      style={{
        backgroundColor: "var(--color-background-secondary)",
        borderColor: "var(--color-border-light)",
        color: "var(--color-text-secondary)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-bold text-white">YourCompany</h3>
            <p className="mt-2 text-sm text-text-muted">
              Empowering teams through innovative tech. Let’s build the future.
            </p>
            <div className="mt-4 flex space-x-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-light"
              >
                <TwitterIcon className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-light"
              >
                <LinkedInIcon className="w-5 h-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-light"
              >
                <GitHubIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <ul className="mt-2 space-y-2">
              <li>
                <a
                  href="/about"
                  className="text-sm text-text-muted hover:text-primary-light transition"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="/services"
                  className="text-sm text-text-muted hover:text-primary-light transition"
                >
                  Services
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="text-sm text-text-muted hover:text-primary-light transition"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="/careers"
                  className="text-sm text-text-muted hover:text-primary-light transition"
                >
                  Careers
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold text-white">Resources</h3>
            <ul className="mt-2 space-y-2">
              <li>
                <a
                  href="/blog"
                  className="text-sm text-text-muted hover:text-primary-light transition"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="/faq"
                  className="text-sm text-text-muted hover:text-primary-light transition"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="/support"
                  className="text-sm text-text-muted hover:text-primary-light transition"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="/docs"
                  className="text-sm text-text-muted hover:text-primary-light transition"
                >
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-white">Contact</h3>
            <ul className="mt-2 space-y-2 text-sm text-text-muted">
              <li>Email: support@yourcompany.com</li>
              <li>Phone: +92 123 4567890</li>
              <li>Location: Lahore, Pakistan</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-text-muted">
          © {new Date().getFullYear()} YourCompany. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

// export default Footer;

// Export both components
export { Header, Footer };
