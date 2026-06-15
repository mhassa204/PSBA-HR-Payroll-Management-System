import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useToastContext } from '../../../components/ui/ToastContainer';
import { userService } from '../../users/services/userService';
import { districtService } from '../services/districtService';
import { cityService } from '../services/cityService';

const Segmented = ({ value, onChange, options }) => (
  <div className="inline-flex rounded-md shadow-sm border overflow-hidden" style={{ borderColor: 'var(--color-border-light)' }}>
    {options.map((opt) => (
      <button
        type="button"
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-3 py-2 text-sm font-medium transition-colors ${
          value === opt.value ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-800'
        } ${opt.className || ''}`}
        aria-pressed={value === opt.value}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const SearchableSelect = ({ value, onChange, options, placeholder }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [query, options]);
  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || '';
  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : selectedLabel}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="form-input w-full"
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-secondary hover:text-primary"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onChange(''); setQuery(''); }}
        >
          Clear
        </button>
      )}
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md max-h-60 overflow-auto dropdown-scroll" role="listbox" style={{ borderColor: 'var(--color-border-light)' }}>
          {filtered.length ? filtered.map(opt => (
            <div
              key={opt.value}
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(opt.value); setQuery(''); setOpen(false); }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-primary-light"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {opt.label}
            </div>
          )) : (
            <div className="px-3 py-2 text-sm text-muted">No options</div>
          )}
        </div>
      )}
    </div>
  );
};

const LocationForm = ({ locationItem, onSubmit, onCancel, isSubmitting }) => {
  const { showError } = useToastContext();
  const [formData, setFormData] = useState({
    name: '',
    type: 'BAZAAR',
    district_id: '',
    city_id: '',
    full_address: '',
    opening_time: '',
    closing_time: '',
    is_active: true,
    manager_user_id: ''
  });
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [managerQuery, setManagerQuery] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

  const formatUserLabel = (u) => (u.employee?.full_name ? `${u.employee.full_name} — ` : '') + u.email;

  const filteredManagers = useMemo(() => {
    const base = (managers || []).filter((u) => u.role?.name !== 'Super Admin');
    const q = managerQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((u) => {
      const name = u.employee?.full_name?.toLowerCase() || '';
      const email = u.email?.toLowerCase() || '';
      return name.includes(q) || email.includes(q);
    });
  }, [managerQuery, managers]);

  useEffect(() => {
    if (locationItem) {
      setFormData({
        name: locationItem.name || '',
        type: locationItem.type || 'BAZAAR',
        district_id: locationItem.district?.id || locationItem.district_id || '',
        city_id: locationItem.city?.id || locationItem.city_id || '',
        full_address: locationItem.full_address || '',
        opening_time: locationItem.opening_time || '',
        closing_time: locationItem.closing_time || '',
        is_active: locationItem.is_active ?? true,
        manager_user_id: locationItem.manager?.id || ''
      });
      if (locationItem.manager) {
        setManagerQuery(formatUserLabel(locationItem.manager));
      }
    } else {
      setFormData((prev) => ({ ...prev, type: 'BAZAAR', is_active: true }));
      setManagerQuery('');
    }
  }, [locationItem]);

  useEffect(() => {
    // Load users to populate manager dropdown
    const load = async () => {
      try {
        setLoadingManagers(true);
        const data = await userService.getAllUsers();
        const list = data?.users || [];
        setManagers(list);
      } catch (e) {
        console.error('Failed to load users for manager dropdown:', e);
      } finally {
        setLoadingManagers(false);
      }
    };
    load();
  }, []);

  // Load district options (IDs)
  useEffect(() => {
    (async () => {
      try {
        const data = await districtService.getAllDistricts();
        const districts = (data?.districts || data || []).map(d => ({ value: d.id, label: d.name }));
        setDistrictOptions(districts);
      } catch (e) {
        setDistrictOptions([]);
      }
    })();
  }, []);

  // Load city options filtered by selected district
  useEffect(() => {
    (async () => {
      try {
        const params = formData.district_id ? { district_id: formData.district_id } : {};
        const data = await cityService.getAllCities(params);
        const cities = (data?.cities || data || []).map(c => ({ value: c.id, label: c.name }));
        setCityOptions(cities);
        if (formData.city_id && !cities.some(c => String(c.value) === String(formData.city_id))) {
          setFormData(prev => ({ ...prev, city_id: '' }));
        }
      } catch (e) {
        setCityOptions([]);
      }
    })();
  }, [formData.district_id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return showError('Location name is required');
    const payload = {
      ...formData,
      opening_time: formData.opening_time || null,
      closing_time: formData.closing_time || null,
      manager_user_id: formData.manager_user_id ? Number(formData.manager_user_id) : null
    };
    onSubmit(payload);
  };

  const onPickManager = (u) => {
    setFormData((p) => ({ ...p, manager_user_id: u?.id || '' }));
    setManagerQuery(u ? formatUserLabel(u) : '');
    setManagerOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {/* Basic Info */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Basic Info</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Provide a clear name and choose the location type.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label required">Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input w-full"
              placeholder="e.g., Lahore Head Office or Liberty Market Bazaar"
            />
          </div>
          <div>
            <label className="form-label">Type</label>
            <div className="flex items-center gap-3">
              <Segmented
                value={formData.type}
                onChange={(val) => setFormData((p) => ({ ...p, type: val }))}
                options={[
                  { value: 'HEAD_OFFICE', label: 'Head Office' },
                  { value: 'BAZAAR', label: 'Bazaar' }
                ]}
              />
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Select whether this location is the main head office or a bazaar/site.
            </p>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Address</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Optional details to help identify the exact place.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">District</label>
            <SearchableSelect
              value={formData.district_id}
              onChange={(val) => setFormData(prev => ({ ...prev, district_id: val }))}
              options={districtOptions}
              placeholder={districtOptions.length ? 'Select district' : 'No districts found'}
            />
          </div>
          <div>
            <label className="form-label">City</label>
            <SearchableSelect
              value={formData.city_id}
              onChange={(val) => setFormData(prev => ({ ...prev, city_id: val }))}
              options={cityOptions}
              placeholder={formData.district_id ? (cityOptions.length ? 'Select city' : 'No cities found') : 'Select district first (optional)'}
            />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Full Address</label>
            <textarea
              name="full_address"
              value={formData.full_address}
              onChange={handleChange}
              className="form-input w-full"
              rows={3}
              placeholder="Street, Area, City, Postal code"
            />
          </div>
        </div>
      </div>

      {/* Operational Hours */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Operational Hours</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Optional: opening and closing times (24-hour).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Opens at</label>
            <input type="time" name="opening_time" value={formData.opening_time} onChange={handleChange} className="form-input w-full" />
          </div>
          <div>
            <label className="form-label">Closes at</label>
            <input type="time" name="closing_time" value={formData.closing_time} onChange={handleChange} className="form-input w-full" />
          </div>
        </div>
      </div>

      {/* Status & Manager */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Status & Manager</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Set active state and optionally assign a manager.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
            <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Active</label>
          </div>
          <div>
            <label className="form-label">Manager</label>
            <div className="relative">
              <input
                type="text"
                value={managerQuery}
                onChange={(e) => { setManagerQuery(e.target.value); setManagerOpen(true); }}
                onFocus={() => setManagerOpen(true)}
                onBlur={() => setTimeout(() => setManagerOpen(false), 120)}
                className="form-input w-full pr-20"
                placeholder="Search user by name or email"
                role="combobox"
                aria-expanded={managerOpen}
                aria-controls="manager-options"
                aria-autocomplete="list"
              />
              {formData.manager_user_id && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-secondary hover:text-primary"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPickManager(null)}
                >
                  Clear
                </button>
              )}
              {managerOpen && (
                <div
                  id="manager-options"
                  className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md max-h-60 overflow-auto dropdown-scroll"
                  style={{ borderColor: 'var(--color-border-light)' }}
                  role="listbox"
                >
                  {loadingManagers ? (
                    <div className="px-3 py-2 text-sm text-muted">Loading users...</div>
                  ) : filteredManagers.length > 0 ? (
                    filteredManagers.map((u) => (
                      <div
                        key={u.id}
                        role="option"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPickManager(u)}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-light`}
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {formatUserLabel(u)}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted">No users match your search</div>
                  )}
                </div>
              )}
            </div>
            {locationItem?.manager && (
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Current: {locationItem.manager.employee?.full_name || locationItem.manager.email}
              </p>
            )}
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Choose a user to set as manager, or leave blank.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (locationItem ? 'Update Location' : 'Create Location')}
        </button>
      </div>
    </form>
  );
};

LocationForm.propTypes = {
  locationItem: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool
};

export default LocationForm;
