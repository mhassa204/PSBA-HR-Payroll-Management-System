import React, { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { useAuthStore } from '../../auth/authStore';
import { toastBus } from '../../../utils/toastBus';
import systemSettingsService from '../services/systemSettingsService';

const DatabaseSettings = () => {
  const can = useAuthStore((s) => s.can);
  const [loading, setLoading] = useState(true);
  const [dbInfo, setDbInfo] = useState(null);

  useEffect(() => {
    if (!can('system.database.read')) return;
    (async () => {
      try {
        const data = await systemSettingsService.getDatabase();
        setDbInfo(data);
      } catch (e) {
        // error toast handled globally
      } finally {
        setLoading(false);
      }
    })();
  }, [can]);

  if (!can('system.database.read')) {
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
          <Database className="w-6 h-6" style={{ color: 'var(--color-primary-600)' }} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Database Settings</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Read-only overview of your configured database connection</p>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Connection</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Sensitive details are masked</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Driver" value={dbInfo?.driver || 'postgresql'} />
            <InfoItem label="Host" value={dbInfo?.host || '—'} />
            <InfoItem label="Database" value={dbInfo?.database || '—'} />
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div className="space-y-1">
    <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
    <div className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
  </div>
);

export default DatabaseSettings;
