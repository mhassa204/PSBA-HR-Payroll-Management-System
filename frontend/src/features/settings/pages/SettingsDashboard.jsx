import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Settings as SettingsIcon,
  Database,
  Shield,
  Palette
} from 'lucide-react';

const SettingsDashboard = () => {
  const navigate = useNavigate();

  const settingsCategories = [
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
          color: 'blue'
        },
        {
          name: 'Designations',
          description: 'Manage job titles and positions',
          path: '/settings/designations',
          icon: Users,
          color: 'green'
        },
        {
          name: 'Role Tags',
          description: 'Manage employment role tags and categories',
          path: '/settings/role-tags',
          icon: Users,
          color: 'indigo'
        },
        {
          name: 'Scale Grades',
          description: 'Manage employment scales and grades',
          path: '/settings/scale-grades',
          icon: Users,
          color: 'purple'
        }
      ]
    },
    {
      title: 'System Configuration',
      description: 'System-wide settings and configurations',
      icon: SettingsIcon,
      items: [
        {
          name: 'Database Settings',
          description: 'Database configuration and maintenance',
          path: '/settings/database',
          icon: Database,
          color: 'purple'
        },
        {
          name: 'Security Settings',
          description: 'Security and access control settings',
          path: '/settings/security',
          icon: Shield,
          color: 'red'
        },
        {
          name: 'Theme Settings',
          description: 'Customize application appearance',
          path: '/settings/themes',
          icon: Palette,
          color: 'indigo'
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
          {settingsCategories.map((category, categoryIndex) => (
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
                      onClick={() => navigate(item.path)}
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
