import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuthStore } from '../../auth/authStore';
import { toastBus } from '../../../utils/toastBus';
import systemSettingsService from '../services/systemSettingsService';

const SecuritySettings = () => {
  const can = useAuthStore((s) => s.can);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    passwordPolicy: { minLength: 8, requireNumber: true, requireUppercase: true, requireSymbol: false },
    sessionMaxAgeMinutes: 60,
    lockoutThreshold: 5,
    twoFactorEnabled: false
  });

  useEffect(() => {
    if (!can('system.security.read')) return;
    (async () => {
      try {
        const data = await systemSettingsService.getSecurity();
        setForm({
          passwordPolicy: {
            minLength: Number(data?.passwordPolicy?.minLength ?? 8),
            requireNumber: !!data?.passwordPolicy?.requireNumber,
            requireUppercase: !!data?.passwordPolicy?.requireUppercase,
            requireSymbol: !!data?.passwordPolicy?.requireSymbol,
          },
          sessionMaxAgeMinutes: Number(data?.sessionMaxAgeMinutes ?? 60),
          lockoutThreshold: Number(data?.lockoutThreshold ?? 5),
          twoFactorEnabled: !!data?.twoFactorEnabled,
        });
      } catch (e) {
        // global error handler shows toast
      } finally {
        setLoading(false);
      }
    })();
  }, [can]);

  const update = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const onSave = async () => {
    if (!can('system.security.update')) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        passwordPolicy: {
          ...form.passwordPolicy,
          minLength: Math.max(6, Number(form.passwordPolicy.minLength || 8)),
        },
        sessionMaxAgeMinutes: Math.max(10, Number(form.sessionMaxAgeMinutes || 60)),
        lockoutThreshold: Math.max(3, Number(form.lockoutThreshold || 5)),
      };
      await systemSettingsService.updateSecurity(payload);
      toastBus.emit({ type: 'success', message: 'Security settings saved.' });
    } catch (e) {
      // handled globally
    } finally {
      setSaving(false);
    }
  };

  if (!can('system.security.read')) {
    return (
      <div className="p-6">
        <div className="text-red-600">Forbidden. You do not have permission.</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-50)' }}>
          <Shield className="w-6 h-6" style={{ color: 'var(--color-primary-600)' }} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Security Settings</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Manage password policies and session settings</p>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Policies</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Changes apply to new sessions and future logins.</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                label="Minimum Password Length"
                type="number"
                min={6}
                value={form.passwordPolicy.minLength}
                onChange={(e) => update('passwordPolicy.minLength', Number(e.target.value))}
              />
              <Toggle
                label="Require Number"
                checked={form.passwordPolicy.requireNumber}
                onChange={(e) => update('passwordPolicy.requireNumber', e.target.checked)}
              />
              <Toggle
                label="Require Uppercase"
                checked={form.passwordPolicy.requireUppercase}
                onChange={(e) => update('passwordPolicy.requireUppercase', e.target.checked)}
              />
              <Toggle
                label="Require Symbol"
                checked={form.passwordPolicy.requireSymbol}
                onChange={(e) => update('passwordPolicy.requireSymbol', e.target.checked)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                label="Session Max Age (minutes)"
                type="number"
                min={10}
                value={form.sessionMaxAgeMinutes}
                onChange={(e) => update('sessionMaxAgeMinutes', Number(e.target.value))}
              />
              <LabeledInput
                label="Lockout Threshold (failed attempts)"
                type="number"
                min={3}
                value={form.lockoutThreshold}
                onChange={(e) => update('lockoutThreshold', Number(e.target.value))}
              />
              <Toggle
                label="Enable Two-Factor Authentication"
                checked={!!form.twoFactorEnabled}
                onChange={(e) => update('twoFactorEnabled', e.target.checked)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                disabled={!can('system.security.update') || saving}
                onClick={onSave}
                className={`px-4 py-2 rounded-lg text-white ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: 'var(--color-primary-600)' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LabeledInput = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{label}</label>
    <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 select-none">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
  </label>
);

export default SecuritySettings;
