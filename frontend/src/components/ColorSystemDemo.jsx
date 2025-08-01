import React from 'react';
import { useColorTheme, ColorThemeSelector, CustomColorPicker } from './ColorThemeProvider';

const ColorSystemDemo = () => {
  const { getColor, currentTheme } = useColorTheme();

  const statusExamples = [
    { status: 'Active', value: 'active' },
    { status: 'Terminated', value: 'terminated' },
    { status: 'Resigned', value: 'resigned' },
    { status: 'On Leave', value: 'on-leave' },
  ];

  const buttonExamples = [
    { label: 'Primary Button', variant: 'primary' },
    { label: 'Secondary Button', variant: 'secondary' },
    { label: 'Success Button', variant: 'success' },
    { label: 'Warning Button', variant: 'warning' },
    { label: 'Error Button', variant: 'error' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-primary-600)' }}>
          Global Color System Demo
        </h1>
        <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
          Centralized color management for consistent theming across the application
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Current Theme: <span className="font-semibold">{currentTheme}</span>
        </p>
      </div>

      {/* Theme Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <ColorThemeSelector />
        </div>
        <div className="card p-6">
          <CustomColorPicker />
        </div>
      </div>

      {/* Color Palette Display */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Color Palette
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Primary Colors */}
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Primary</h3>
            <div className="space-y-1">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
                <div
                  key={shade}
                  className="h-8 rounded flex items-center justify-center text-xs font-medium"
                  style={{
                    backgroundColor: `var(--color-primary-${shade})`,
                    color: shade >= 500 ? 'white' : 'black'
                  }}
                >
                  {shade}
                </div>
              ))}
            </div>
          </div>

          {/* Success Colors */}
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Success</h3>
            <div className="space-y-1">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
                <div
                  key={shade}
                  className="h-8 rounded flex items-center justify-center text-xs font-medium"
                  style={{
                    backgroundColor: `var(--color-success-${shade})`,
                    color: shade >= 500 ? 'white' : 'black'
                  }}
                >
                  {shade}
                </div>
              ))}
            </div>
          </div>

          {/* Warning Colors */}
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Warning</h3>
            <div className="space-y-1">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
                <div
                  key={shade}
                  className="h-8 rounded flex items-center justify-center text-xs font-medium"
                  style={{
                    backgroundColor: `var(--color-warning-${shade})`,
                    color: shade >= 500 ? 'white' : 'black'
                  }}
                >
                  {shade}
                </div>
              ))}
            </div>
          </div>

          {/* Error Colors */}
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Error</h3>
            <div className="space-y-1">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
                <div
                  key={shade}
                  className="h-8 rounded flex items-center justify-center text-xs font-medium"
                  style={{
                    backgroundColor: `var(--color-error-${shade})`,
                    color: shade >= 500 ? 'white' : 'black'
                  }}
                >
                  {shade}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Button Examples */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Button Variants
        </h2>
        <div className="flex flex-wrap gap-4">
          {buttonExamples.map(({ label, variant }) => (
            <button
              key={variant}
              className={`btn btn-${variant}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Status Badges */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Status Badges
        </h2>
        <div className="flex flex-wrap gap-4">
          {statusExamples.map(({ status, value }) => (
            <span
              key={value}
              className={`px-3 py-1 rounded-full text-sm font-medium status-${value}`}
            >
              {status}
            </span>
          ))}
        </div>
      </div>

      {/* Form Elements */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Form Elements
        </h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="form-label required">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="form-input w-full px-3 py-2 rounded-lg"
            />
          </div>
          <div>
            <label className="form-label">Message</label>
            <textarea
              placeholder="Enter your message"
              rows={3}
              className="form-input w-full px-3 py-2 rounded-lg"
            />
          </div>
          <div>
            <label className="form-label">Country</label>
            <select className="form-input w-full px-3 py-2 rounded-lg">
              <option>Select a country</option>
              <option>United States</option>
              <option>Pakistan</option>
              <option>United Kingdom</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Example */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Table Example
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                <td className="px-4 py-3">John Doe</td>
                <td className="px-4 py-3">
                  <span className="status-active">Active</span>
                </td>
                <td className="px-4 py-3">Developer</td>
                <td className="px-4 py-3">
                  <button className="btn btn-secondary btn-sm">Edit</button>
                </td>
              </tr>
              <tr className="table-row border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                <td className="px-4 py-3">Jane Smith</td>
                <td className="px-4 py-3">
                  <span className="status-on-leave">On Leave</span>
                </td>
                <td className="px-4 py-3">Designer</td>
                <td className="px-4 py-3">
                  <button className="btn btn-secondary btn-sm">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          How to Use Global Colors
        </h2>
        <div className="space-y-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <div>
            <h3 className="font-semibold mb-2">1. CSS Custom Properties:</h3>
            <code className="bg-gray-100 px-2 py-1 rounded">
              style={`{{ backgroundColor: 'var(--color-primary-600)' }}`}
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">2. CSS Classes:</h3>
            <code className="bg-gray-100 px-2 py-1 rounded">
              className="btn btn-primary"
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">3. React Hook:</h3>
            <code className="bg-gray-100 px-2 py-1 rounded">
              const {`{ getColor }`} = useColorTheme(); const primaryColor = getColor('primary.600');
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">4. Change Theme:</h3>
            <code className="bg-gray-100 px-2 py-1 rounded">
              const {`{ applyTheme }`} = useColorTheme(); applyTheme('green');
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorSystemDemo;
