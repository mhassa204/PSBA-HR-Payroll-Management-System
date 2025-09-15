import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import { districtService } from '../services/districtService';

const DistrictForm = ({ district, onSubmit, onCancel }) => {
  const [name, setName] = useState(district?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (district) {
        await districtService.updateDistrict(district.id, { name });
      } else {
        await districtService.createDistrict({ name });
      }
      onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2">
      <div>
        <label className="block text-sm font-medium mb-2">District Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input w-full"
          placeholder="e.g., Lahore"
          required
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (district ? 'Updating...' : 'Creating...') : (district ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
};

const DistrictManagement = () => {
  const navigate = useNavigate();
  const { showConfirmation } = useConfirmationContext();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();
  const [districts, setDistricts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const load = async () => {
    try {
      setLoadingData(true);
      const data = await districtService.getAllDistricts();
      setDistricts(data.districts || data || []);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = () => { setEditingDistrict(null); setIsModalOpen(true); };
  const handleEdit = (d) => { setEditingDistrict(d); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingDistrict(null); };
  const handleSaved = async () => { await load(); handleClose(); };

  const handleDelete = (district) => {
    showConfirmation({
      title: 'Delete District',
      message: `Are you sure you want to delete "${district.name}"?`,
      type: 'danger',
      action: 'delete',
      onConfirm: async () => {
        await withErrorHandling(async () => {
          await districtService.deleteDistrict(district.id);
          await load();
        }, { showAlert: true, customMessage: 'District deleted successfully!' });
      }
    });
  };

  if (loadingData) return <LoadingSpinner size="lg" text="Loading districts..." />;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background-secondary)' }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/settings')} className="p-2 rounded-lg" style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-background-primary)' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-50)' }}>
              <Building2 className="w-8 h-8" style={{ color: 'var(--color-primary-600)' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>District Management</h1>
              <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Create and manage districts</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6"><ErrorMessage error={error} onRetry={clearError} showHomeLink={false} /></div>
        )}

        <div className="card mb-6">
          <div className="p-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Total Districts: {districts.length}</h3>
            <button onClick={handleCreate} className="btn btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Add District</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Districts</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>Manage your districts list</p>
          </div>
          <div className="p-6">
            {districts.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>No districts found</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Get started by creating your first district</p>
                <button onClick={handleCreate} className="btn btn-primary"><Plus className="w-4 h-4 mr-2" />Create District</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {districts.map((d) => (
                  <div key={d.id} className="p-6 rounded-lg border hover:shadow-md transition-all" style={{ backgroundColor: 'var(--color-background-primary)', borderColor: 'var(--color-border-light)' }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>{d.name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(d)} className="p-2 rounded-lg hover:bg-gray-100" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(d)} className="p-2 rounded-lg hover:bg-red-100" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <EnhancedModal isOpen={isModalOpen} onClose={handleClose} title={editingDistrict ? 'Edit District' : 'Create District'} size="md">
          <DistrictForm district={editingDistrict} onSubmit={handleSaved} onCancel={handleClose} />
        </EnhancedModal>
      </div>
    </div>
  );
};

export default DistrictManagement;