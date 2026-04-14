import { useState } from 'react';
import { collection, addDoc } from '../utils/firestoreTracker';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';
import { showConfirmDialog } from './ConfirmationDialog';

function CreateEmployeeModal({ onClose, onSave }) {
  // ✅ CRITICAL: Initialize with empty object, then use spread operator
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    phone2: '',
    email: '',
    payRate: '',
    isActive: true,
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!formData.fullName) {
      alert('Full Name is required');
      return;
    }

    // Empty employee for comparison
    const emptyEmployee = {
      fullName: '',
      phone: '',
      phone2: '',
      email: '',
      payRate: '',
      isActive: true,
      notes: '',
    };

    // Show confirmation dialog
    const confirmed = await showConfirmDialog(emptyEmployee, formData, "Confirm New Employee");
    
    if (!confirmed) {
      return; // User cancelled
    }

    // Save to Firestore
    try {
      const user = auth.currentUser;
      
      await addDoc(collection(db, 'employees'), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user?.email || 'Unknown',
        updatedBy: user?.email || 'Unknown'
      });

      await logAudit('CREATE_EMPLOYEE', 'employees', null, {
        fullName: formData.fullName
      });

      alert('Employee created successfully!');
      onSave();
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Create New Employee</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1a73e8' }}>
            Employee Information
          </h3>

          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              required
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
              <label>Phone 2</label>
              <input
                type="text"
                value={formData.phone2}
                onChange={(e) => handleChange('phone2', e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label>Pay Rate</label>
              <input
                type="text"
                value={formData.payRate}
                onChange={(e) => handleChange('payRate', e.target.value)}
                placeholder="e.g., 25.00"
              />
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
            Create Employee
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateEmployeeModal;
