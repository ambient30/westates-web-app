import { useState } from 'react';
import { doc, updateDoc } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { logAudit } from '../utils/auditLog';
import { showConfirmDialog } from './ConfirmationDialog';

function EditContractorModal({ contractor, onClose, onSave }) {
  // Store original for comparison
  const originalContractor = { ...contractor };

  // ✅ CRITICAL: Use spread operator to copy ALL fields (including unknown ones)
  const [formData, setFormData] = useState({ ...contractor });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Show confirmation dialog with ALL changes
    const confirmed = await showConfirmDialog(originalContractor, formData, "Confirm Contractor Changes");
    
    if (!confirmed) {
      return; // User cancelled or no changes
    }

    // Save to Firestore
    try {
      await updateDoc(doc(db, 'contractors', contractor.id), {
        ...formData,
        updatedAt: new Date()
      });

      await logAudit('UPDATE_CONTRACTOR', 'contractors', contractor.id, {
        companyName: formData.companyName
      });

      alert('Contractor updated successfully!');
      onSave();
    } catch (error) {
      console.error('Error updating contractor:', error);
      alert('Failed to update contractor. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Edit Contractor: {contractor.companyName}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1a73e8' }}>
            Contractor Information
          </h3>

          <div className="form-group">
            <label>Company Name *</label>
            <input
              type="text"
              value={formData.companyName || ''}
              onChange={(e) => handleChange('companyName', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Contact Name</label>
            <input
              type="text"
              value={formData.contactName || ''}
              onChange={(e) => handleChange('contactName', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive || false}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Active
            </label>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="3"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditContractorModal;
