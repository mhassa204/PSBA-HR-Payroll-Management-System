import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Settings as SettingsIcon,
  Database,
  Shield
} from 'lucide-react';
import { toastBus } from '../../../utils/toastBus';
import { useAuthStore } from '../../auth/authStore';

const SettingsDashboard = () => {
  const navigate = useNavigate();
  const can = useAuthStore((s) => s.can);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role?.name === 'Super Admin';

  const settingsCategories = [
    {
      title: 'System Configuration',
      description: 'System-wide settings and configurations',
      icon: SettingsIcon,
      superOnly: true,
      items: [
        {
          name: 'Database Settings',
          description: 'Database configuration and maintenance',
          path: '/settings/database',
          icon: Database,
          color: 'purple',
          required: ['system.database.read']
        },
        {
          name: 'Security Settings',
          description: 'Security and access control settings',
          path: '/settings/security',
          icon: Shield,
          color: 'red',
          required: ['system.security.read']
        }
      ]
    },
    {
      title: 'Organization Structure',
      description: 'Manage departments, designations, and organizational hierarchy',
      icon: Building2,
      items: [
        {
          name: 'Departments',
          description: 'Create and manage company departments',
          path: '/settings/departments',
          icon: Building2,
          color: 'blue',
          required: ['departments.read']
        },
        {
          name: 'Designations',
          description: 'Manage job titles and positions',
          path: '/settings/designations',
          icon: Users,
          color: 'green',
          required: ['designations.read']
        },
        {
          name: 'Role Tags',
          description: 'Manage employment role tags and categories',
          path: '/settings/role-tags',
          icon: Users,
          color: 'indigo',
          required: ['role-tags.read']
        },
        {
          name: 'Scale Grades',
          description: 'Manage employment scales and grades',
          path: '/settings/scale-grades',
          icon: Users,
          color: 'purple',
          required: ['scale-grades.read']
        },
        {
          name: 'Locations',
          description: 'Manage Head Office and Bazaar locations',
          path: '/settings/locations',
          icon: Building2,
          color: 'blue',
          required: ['locations.read']
        },
        {
          name: 'Devices',
          description: 'Manage attendance devices (IP/Port) and their locations',
          path: '/settings/devices',
          icon: Users,
          color: 'indigo',
          required: ['devices.read']
        },
        {
          name: 'Roles',
          description: 'Manage system roles and permissions',
          path: '/settings/roles',
          icon: Shield,
          color: 'orange',
          required: ['roles.read'],
          superOnly: true
        },
        {
          name: 'Districts',
          description: 'Manage districts list',
          path: '/settings/districts',
          icon: Building2,
          color: 'blue',
          required: ['districts.read']
        },
        {
          name: 'Cities',
          description: 'Manage cities by district',
          path: '/settings/cities',
          icon: Building2,
          color: 'green',
          required: ['cities.read']
        },
        {
          name: 'Education Levels',
          description: 'Manage education qualification levels',
          path: '/settings/education-levels',
          icon: Users,
          color: 'indigo',
          required: ['education-levels.read']
        }
        ,
        {
          name: 'Travel Rates',
          description: 'Manage per-km and per-diem rates by grade',
          path: '/settings/travel-rates',
          icon: Users,
          color: 'red',
          required: ['travel.rates.read']
        }
      ]
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
      red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
    };
    return colorMap[color] || 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100';
  };

  const canSeeItem = (item) => {
    if (item.superOnly && !isSuperAdmin) return false;
    if (item.required && item.required.length > 0) {
      return item.required.some((p) => can(p));
    }
    return true;
  };

  const filteredCategories = settingsCategories
    .filter((cat) => (cat.superOnly ? isSuperAdmin : true))
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(canSeeItem)
    }))
    .filter((cat) => cat.items.length > 0);

  const handleItemClick = (item) => {
    if (!canSeeItem(item)) {
      toastBus.emit({ type: 'error', message: 'Forbidden. You do not have permission.' });
      return;
    }
    if (item.path) {
      navigate(item.path);
    } else {
      toastBus.emit({ type: 'info', message: 'This setting is coming soon.' });
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-background-secondary)" }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
              <SettingsIcon className="w-8 h-8" style={{ color: "var(--color-primary-600)" }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                Settings
              </h1>
              <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                Manage system configuration and organization structure
              </p>
            </div>
          </div>
        </div>

        {/* Settings Categories */}
        <div className="space-y-8">
          {filteredCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="card">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <category.icon className="w-6 h-6" style={{ color: "var(--color-primary-600)" }} />
                  <h3 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {category.title}
                  </h3>
                </div>
                <p style={{ color: "var(--color-text-secondary)" }}>
                  {category.description}
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 transform hover:scale-105 ${getColorClasses(item.color)}`}
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <item.icon className="w-6 h-6" />
                        <h4 className="font-semibold text-lg">{item.name}</h4>
                      </div>
                      <p className="text-sm opacity-80">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsDashboard;
