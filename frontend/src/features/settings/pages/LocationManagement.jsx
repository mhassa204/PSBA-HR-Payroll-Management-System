import React, { useEffect, useState } from 'react';
import { locationService } from '../services/locationService';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import { useToastContext } from '../../../components/ui/ToastContainer';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import LocationForm from '../components/LocationForm';

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading locations..." />
      </div>
    );
  }

  const renderTime = (t) => t ? t : '-';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background-secondary)' }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Location Management</h1>
              <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Manage Head Office and Bazaar locations</p>
            </div>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Location
            </button>
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
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Locations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{loc.name}</div></td>
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
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(loc)} className="text-blue-600 hover:text-blue-900"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(loc)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {locations.length === 0 && (<div className="text-center py-12"><p className="text-gray-500">No locations found. Create your first location.</p></div>)}
          </div>
        </div>
      </div>

      <EnhancedModal isOpen={showForm} onClose={handleCancel} title={editing ? 'Edit Location' : 'Add New Location'} size="md">
        <LocationForm locationItem={editing} onSubmit={handleSubmit} onCancel={handleCancel} isSubmitting={isSubmitting} />
      </EnhancedModal>
    </div>
  );
};

export default LocationManagement;
