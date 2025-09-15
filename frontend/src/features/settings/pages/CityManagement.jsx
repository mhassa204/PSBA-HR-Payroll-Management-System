import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import { cityService } from '../services/cityService';
import { districtService } from '../services/districtService';

const CityForm = ({ city, districts, onSubmit, onCancel }) => {
  const [name, setName] = useState(city?.name || '');
  const [districtId, setDistrictId] = useState(city?.district_id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { name, district_id: parseInt(districtId) };
      if (city) {
        await cityService.updateCity(city.id, payload);
      } else {
        await cityService.createCity(payload);
      }
      onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2">
      <div>
        <label className="block text-sm font-medium mb-2">City Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input w-full" placeholder="e.g., Gulberg" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">District</label>
        <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} className="form-select w-full" required>
          <option value="">Select district</option>
          {districts.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? (city ? 'Updating...' : 'Creating...') : (city ? 'Update' : 'Create')}</button>
      </div>
    </form>
  );
};

const CityManagement = () => {
  const navigate = useNavigate();
  const { showConfirmation } = useConfirmationContext();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filterDistrict, setFilterDistrict] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const load = async () => {
    try {
      setLoadingData(true);
      const [dists, citiesData] = await Promise.all([
        districtService.getAllDistricts(),
        cityService.getAllCities(filterDistrict ? { district_id: filterDistrict } : {})
      ]);
      setDistricts(dists.districts || dists || []);
      setCities(citiesData.cities || citiesData || []);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { load(); }, [filterDistrict]);

  const handleCreate = () => { setEditingCity(null); setIsModalOpen(true); };
  const handleEdit = (c) => { setEditingCity(c); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingCity(null); };
  const handleSaved = async () => { await load(); handleClose(); };

  const handleDelete = (city) => {
    showConfirmation({
      title: 'Delete City',
      message: `Are you sure you want to delete "${city.name}"?`,
      type: 'danger',
      action: 'delete',
      onConfirm: async () => {
        await withErrorHandling(async () => {
          await cityService.deleteCity(city.id);
          await load();
        }, { showAlert: true, customMessage: 'City deleted successfully!' });
      }
    });
  };

  if (loadingData) return <LoadingSpinner size="lg" text="Loading cities..." />;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background-secondary)' }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/settings')} className="p-2 rounded-lg" style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-background-primary)' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-50)' }}>
              <MapPin className="w-8 h-8" style={{ color: 'var(--color-primary-600)' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>City Management</h1>
              <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Create and manage cities by district</p>
            </div>
          </div>
        </div>

        {error && (<div className="mb-6"><ErrorMessage error={error} onRetry={clearError} showHomeLink={false} /></div>)}

        <div className="card mb-6">
          <div className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm">Filter by District:</label>
              <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} className="form-select">
                <option value="">All</option>
                {districts.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
            <button onClick={handleCreate} className="btn btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Add City</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Cities</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>Manage cities and their district association</p>
          </div>
          <div className="p-6">
            {cities.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>No cities found</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Get started by creating your first city</p>
                <button onClick={handleCreate} className="btn btn-primary"><Plus className="w-4 h-4 mr-2" />Create City</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cities.map((c) => (
                  <div key={c.id} className="p-6 rounded-lg border hover:shadow-md transition-all" style={{ backgroundColor: 'var(--color-background-primary)', borderColor: 'var(--color-border-light)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>{c.name}</h4>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>District: {c.district?.name || c.district_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(c)} className="p-2 rounded-lg hover:bg-gray-100" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(c)} className="p-2 rounded-lg hover:bg-red-100" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <EnhancedModal isOpen={isModalOpen} onClose={handleClose} title={editingCity ? 'Edit City' : 'Create City'} size="md">
          <CityForm city={editingCity} districts={districts} onSubmit={handleSaved} onCancel={handleClose} />
        </EnhancedModal>
      </div>
    </div>
  );
};

export default CityManagement;