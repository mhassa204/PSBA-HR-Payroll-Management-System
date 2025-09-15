import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import { educationLevelService } from '../services/educationLevelService';

const LevelForm = ({ level, onSubmit, onCancel }) => {
  const [name, setName] = useState(level?.name || '');
  const [order, setOrder] = useState(level?.order || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parsed = parseInt(order, 10);
      const orderValue = Number.isFinite(parsed) ? parsed : null;
      const payload = { name, order: orderValue };
      if (level) {
        await educationLevelService.updateLevel(level.id, payload);
      } else {
        await educationLevelService.createLevel(payload);
      }
      onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2">
      <div>
        <label className="block text-sm font-medium mb-2">Level Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input w-full" placeholder="e.g., Matric" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Order</label>
        <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="form-input w-full" placeholder="Optional order for sorting" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? (level ? 'Updating...' : 'Creating...') : (level ? 'Update' : 'Create')}</button>
      </div>
    </form>
  );
};

const EducationLevelManagement = () => {
  const navigate = useNavigate();
  const { showConfirmation } = useConfirmationContext();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();
  const [levels, setLevels] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const load = async () => {
    try {
      setLoadingData(true);
      const data = await educationLevelService.getAllLevels();
      setLevels(Array.isArray(data) ? data : (Array.isArray(data?.levels) ? data.levels : (Array.isArray(data?.educationLevels) ? data.educationLevels : [])));
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = () => { setEditingLevel(null); setIsModalOpen(true); };
  const handleEdit = (l) => { setEditingLevel(l); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingLevel(null); };
  const handleSaved = async () => { await load(); handleClose(); };

  const handleDelete = (level) => {
    showConfirmation({
      title: 'Delete Education Level',
      message: `Are you sure you want to delete "${level.name}"?`,
      type: 'danger',
      action: 'delete',
      onConfirm: async () => {
        await withErrorHandling(async () => {
          await educationLevelService.deleteLevel(level.id);
          await load();
        }, { showAlert: true, customMessage: 'Education level deleted successfully!' });
      }
    });
  };

  if (loadingData) return <LoadingSpinner size="lg" text="Loading education levels..." />;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background-secondary)' }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/settings')} className="p-2 rounded-lg" style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-background-primary)' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-50)' }}>
              <GraduationCap className="w-8 h-8" style={{ color: 'var(--color-primary-600)' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Education Levels</h1>
              <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Create and manage education qualification levels</p>
            </div>
          </div>
        </div>

        {error && (<div className="mb-6"><ErrorMessage error={error} onRetry={clearError} showHomeLink={false} /></div>)}

        <div className="card mb-6">
          <div className="p-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Total Levels: {levels.length}</h3>
            <button onClick={handleCreate} className="btn btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Add Level</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Education Levels</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>Manage standardized education levels used across the app</p>
          </div>
          <div className="p-6">
            {levels.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>No levels found</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Get started by creating your first education level</p>
                <button onClick={handleCreate} className="btn btn-primary"><Plus className="w-4 h-4 mr-2" />Create Level</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(Array.isArray(levels) ? levels : []).map((l) => (
                  <div key={l.id} className="p-6 rounded-lg border hover:shadow-md transition-all" style={{ backgroundColor: 'var(--color-background-primary)', borderColor: 'var(--color-border-light)' }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>{l.name}</h4>
                        {l.order != null && (<p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Order: {l.order}</p>)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(l)} className="p-2 rounded-lg hover:bg-gray-100" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(l)} className="p-2 rounded-lg hover:bg-red-100" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <EnhancedModal isOpen={isModalOpen} onClose={handleClose} title={editingLevel ? 'Edit Education Level' : 'Create Education Level'} size="md">
          <LevelForm level={editingLevel} onSubmit={handleSaved} onCancel={handleClose} />
        </EnhancedModal>
      </div>
    </div>
  );
};

export default EducationLevelManagement;