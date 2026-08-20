import React, { useEffect, useMemo, useState } from 'react';
import { locationService } from '../services/locationService';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import { useToastContext } from '../../../components/ui/ToastContainer';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import Pagination from '../../../components/ui/Pagination';
import LocationForm from '../components/LocationForm';
import { useAuthStore } from '../../auth/authStore';

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const LocationManagement = () => {
  const can = useAuthStore((s) => s.can);
  // Operations may keep bazaar trading hours correct but must not rename,
  // add or delete a location — so the page drops to a timings-only mode.
  const canEditAll = can('locations.update') || can('locations.create');
  const canDeleteLoc = can('locations.delete');
  const canEditTiming = canEditAll || can('locations.timing.update');
  const timingOnly = !canEditAll && canEditTiming;

  const [timingFor, setTimingFor] = useState(null); // location being retimed
  const [timingDraft, setTimingDraft] = useState({ opening_time: '', closing_time: '' });
  const [savingTiming, setSavingTiming] = useState(false);
  // Search / filter / paging over the loaded list (the API returns them all)
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [timingFilter, setTimingFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statistics, setStatistics] = useState(null);

  const { showConfirmation } = useConfirmationContext();
  const { showSuccess, showError } = useToastContext();

  useEffect(() => {
    fetchLocations();
    fetchStatistics();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const data = await locationService.getAllLocations();
      if (data.success) setLocations(data.locations); else throw new Error(data.error || 'Failed to fetch locations');
    } catch (e) {
      console.error('Error fetching locations:', e);
      showError('Error fetching locations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const data = await locationService.getLocationStatistics();
      if (data.success) setStatistics(data.statistics);
    } catch {}
  };

  const handleCreate = async (formData) => {
    try {
      setIsSubmitting(true);
      await locationService.createLocation(formData);
      showSuccess('Location created successfully');
      setShowForm(false);
      fetchLocations();
      fetchStatistics();
    } catch (e) {
      console.error('Error creating location:', e);
      showError(e.message || 'Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (formData) => {
    try {
      setIsSubmitting(true);
      await locationService.updateLocation(editing.id, formData);
      showSuccess('Location updated successfully');
      setShowForm(false);
      setEditing(null);
      fetchLocations();
      fetchStatistics();
    } catch (e) {
      console.error('Error updating location:', e);
      showError(e.message || 'Failed to update location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    showConfirmation({
      title: 'Delete Location',
      message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await locationService.deleteLocation(item.id);
          showSuccess('Location deleted successfully');
          fetchLocations();
          fetchStatistics();
        } catch (e) {
          console.error('Error deleting location:', e);
          showError(e.message || 'Failed to delete location');
        }
      }
    });
  };

  const handleEdit = (item) => {
    setEditing(item);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = (formData) => {
    if (editing) handleUpdate(formData); else handleCreate(formData);
  };

  const TYPE_LABELS = {
    BAZAAR: 'Bazaar',
    MOBILE_BAZAAR: 'On the GO',
    SPECIAL_UNIT: 'Special Unit',
    HEAD_OFFICE: 'Head Office',
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locations.filter((l) => {
      if (typeFilter !== 'ALL' && l.type !== typeFilter) return false;
      if (statusFilter === 'ACTIVE' && !l.is_active) return false;
      if (statusFilter === 'INACTIVE' && l.is_active) return false;
      if (timingFilter === 'SET' && !l.opening_time) return false;
      if (timingFilter === 'UNSET' && l.opening_time) return false;
      if (!q) return true;
      return [l.name, l.district && l.district.name, l.city && l.city.name, l.full_address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [locations, search, typeFilter, statusFilter, timingFilter]);

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const firstIndex = (safePage - 1) * pageSize;
  const visible = filtered.slice(firstIndex, firstIndex + pageSize);

  // A filter change can shrink the list under the current page
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const filtersActive =
    search || typeFilter !== 'ALL' || statusFilter !== 'ALL' || timingFilter !== 'ALL';
  const resetFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setTimingFilter('ALL');
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading locations..." />
      </div>
    );
  }

  const openTiming = (loc) => {
    setTimingFor(loc);
    setTimingDraft({
      opening_time: loc.opening_time || '',
      closing_time: loc.closing_time || '',
    });
  };

  const saveTiming = async () => {
    setSavingTiming(true);
    try {
      const res = await locationService.updateTiming(
        timingFor.id,
        timingDraft.opening_time,
        timingDraft.closing_time
      );
      const updated = res.location;
      setLocations((prev) =>
        prev.map((l) =>
          l.id === updated.id
            ? { ...l, opening_time: updated.opening_time, closing_time: updated.closing_time }
            : l
        )
      );
      showSuccess(`Timing updated for ${updated.name}`);
      setTimingFor(null);
    } catch (e) {
      showError(e?.response?.data?.error || 'Failed to update timing');
    } finally {
      setSavingTiming(false);
    }
  };

  // 12-hour preview so the value reads the way it prints on the roster form
  const preview = (t) => {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return '';
    let h = Number(m[1]);
    const mer = h >= 12 ? 'PM' : 'AM';
    h = h % 12 === 0 ? 12 : h % 12;
    return `${h}:${m[2]} ${mer}`;
  };

  const renderTime = (t) => t ? t : '-';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background-secondary)' }}>
      <div className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Location Management</h1>
              <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                {timingOnly
                  ? 'Set bazaar operational (opening and closing) hours — these print on every duty roster form'
                  : 'Manage Head Office and Bazaar locations'}
              </p>
            </div>
            {canEditAll && (
              <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Location
              </button>
            )}
          </div>
        </div>

        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Locations</p>
              <p className="text-2xl font-semibold text-gray-900">{statistics.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{statistics.active}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-semibold text-gray-900">{statistics.inactive}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Types</p>
              <p className="text-2xl font-semibold text-gray-900">{statistics.byType?.length || 0}</p>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Search</label>
              <input
                className="form-input w-full"
                placeholder="Name, district, city or address"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Type</label>
              <select
                className="form-input !w-auto"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All types</option>
                <option value="BAZAAR">Bazaar</option>
                <option value="MOBILE_BAZAAR">On the GO</option>
                <option value="SPECIAL_UNIT">Special Unit</option>
                <option value="HEAD_OFFICE">Head Office</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Status</label>
              <select
                className="form-input !w-auto"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Timing</label>
              <select
                className="form-input !w-auto"
                value={timingFilter}
                onChange={(e) => {
                  setTimingFilter(e.target.value);
                  setPage(1);
                }}
                title="Bazaars with no hours set print the 9:00 AM - 8:00 PM default on roster forms"
              >
                <option value="ALL">Any</option>
                <option value="SET">Hours set</option>
                <option value="UNSET">Using default</option>
              </select>
            </div>
            {filtersActive && (
              <button onClick={resetFilters} className="btn btn-sm btn-ghost">
                Reset
              </button>
            )}
            <span className="text-xs text-gray-500 ml-auto">
              {filtered.length} of {locations.length} location(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visible.map((loc, i) => (
                  <tr key={loc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        <span className="text-gray-400 mr-2">{firstIndex + i + 1}.</span>
                        {loc.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{loc.type}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(loc.district && loc.district.name) || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(loc.city && loc.city.name) || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{renderTime(loc.opening_time)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{renderTime(loc.closing_time)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{loc.manager?.employee?.full_name || loc.manager?.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${loc.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 items-center">
                        {canEditTiming && (
                          <button
                            onClick={() => openTiming(loc)}
                            className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
                            title="Set opening and closing hours"
                          >
                            Timing
                          </button>
                        )}
                        {canEditAll && (
                          <button onClick={() => handleEdit(loc)} className="text-blue-600 hover:text-blue-900" title="Edit location"><PencilIcon className="h-4 w-4" /></button>
                        )}
                        {canDeleteLoc && (
                          <button onClick={() => handleDelete(loc)} className="text-red-600 hover:text-red-900" title="Delete location"><TrashIcon className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {locations.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No locations found. Create your first location.</p>
              </div>
            )}
            {locations.length > 0 && filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No locations match these filters.</p>
                <button onClick={resetFilters} className="btn btn-sm btn-outline mt-2">
                  Reset filters
                </button>
              </div>
            )}
          </div>
          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-200">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
                pageSizeOptions={[25, 50, 100]}
              />
              {totalPages <= 1 && (
                <div className="text-sm text-slate-600">
                  Showing all {filtered.length} location(s)
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <EnhancedModal
        isOpen={!!timingFor}
        onClose={() => setTimingFor(null)}
        title={timingFor ? `Operational timing — ${timingFor.name}` : ''}
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Printed on this bazaar's duty roster form. Leave both blank to use the default of
            9:00 AM to 8:00 PM.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Opening</label>
              <input
                type="time"
                className="form-input w-full"
                value={timingDraft.opening_time}
                onChange={(e) => setTimingDraft((d) => ({ ...d, opening_time: e.target.value }))}
              />
              <div className="text-[11px] text-gray-500 mt-1">{preview(timingDraft.opening_time)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Closing</label>
              <input
                type="time"
                className="form-input w-full"
                value={timingDraft.closing_time}
                onChange={(e) => setTimingDraft((d) => ({ ...d, closing_time: e.target.value }))}
              />
              <div className="text-[11px] text-gray-500 mt-1">{preview(timingDraft.closing_time)}</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setTimingFor(null)} className="btn btn-secondary">Cancel</button>
            <button onClick={saveTiming} disabled={savingTiming} className="btn btn-primary">
              {savingTiming ? 'Saving...' : 'Save timing'}
            </button>
          </div>
        </div>
      </EnhancedModal>

      <EnhancedModal isOpen={showForm} onClose={handleCancel} title={editing ? 'Edit Location' : 'Add New Location'} size="md">
        <LocationForm locationItem={editing} onSubmit={handleSubmit} onCancel={handleCancel} isSubmitting={isSubmitting} />
      </EnhancedModal>
    </div>
  );
};

export default LocationManagement;
