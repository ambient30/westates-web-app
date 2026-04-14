import { useState } from 'react';
import { collection, addDoc } from '../utils/firestoreTracker';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';
import { showConfirmDialog } from './ConfirmationDialog';

function CreateContractorModal({ onClose, onSave }) {
  // ✅ CRITICAL: Initialize with empty object, then use spread operator
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    isActive: true,
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!formData.companyName) {
      alert('Company Name is required');
      return;
    }

    // Empty contractor for comparison
    const emptyContractor = {
      companyName: '',
      contactName: '',
      phone: '',
      email: '',
      isActive: true,
      notes: '',
    };

    // Show confirmation dialog
    const confirmed = await showConfirmDialog(emptyContractor, formData, "Confirm New Contractor");
    
    if (!confirmed) {
      return; // User cancelled
    }

    // Save to Firestore
    try {
      const user = auth.currentUser;
      
      await addDoc(collection(db, 'contractors'), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user?.email || 'Unknown',
        updatedBy: user?.email || 'Unknown'
      });

      await logAudit('CREATE_CONTRACTOR', 'contractors', null, {
        companyName: formData.companyName
      });

      alert('Contractor created successfully!');
      onSave();
    } catch (error) {
      console.error('Error creating contractor:', error);
      alert('Failed to create contractor. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Create New Contractor</h2>
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
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Contact Name</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Active
            </label>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
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
          <button onClick={handleCreate} className="btn btn-primary">
            Create Contractor
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateContractorModal;
