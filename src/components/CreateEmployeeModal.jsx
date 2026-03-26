import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function CreateEmployeeModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    payRate: '', // ADD THIS
    certifications: '',
    signs: '',
    extraSigns: '',
    cones: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.fullName.trim()) {
        throw new Error('Full name is required');
      }

      const employeeData = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        payRate: parseFloat(formData.payRate) || 0, // ADD THIS
        certifications: formData.certifications.trim(),
        signs: formData.signs.trim(),
        extraSigns: formData.extraSigns.trim(),
        cones: formData.cones.trim(),
        notes: formData.notes.trim(),
        custom: {},
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown',
        updatedBy: auth.currentUser?.email || 'unknown'
      };

      const docId = formData.fullName.trim().replace(/[\/\\]/g, '-');
      
      await setDoc(doc(db, 'employees', docId), employeeData);
      await logAudit('CREATE_EMPLOYEE', 'employees', docId);

      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Add New Employee</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Full Name *</label>
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="e.g., John Smith"
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(541) 555-1234"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.phone}
                onChange={handleChange}
                placeholder="john@example.com"
              />
            </div>

            {/* ADD THIS FIELD */}
            <div className="form-group">
              <label>Pay Rate ($/hr) *</label>
              <input
                type="number"
                step="0.01"
                name="payRate"
                value={formData.payRate}
                onChange={handleChange}
                required
                placeholder="25.00"
              />
            </div>

            <div className="form-group">
              <label>Certifications</label>
              <input
                name="certifications"
                value={formData.certifications}
                onChange={handleChange}
                placeholder="e.g., ATSSA, Flagger"
              />
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#1a73e8' }}>Equipment</h3>

            <div className="form-group">
              <label>Sign Sets</label>
              <input
                name="signs"
                value={formData.signs}
                onChange={handleChange}
                placeholder="e.g., 1.5 sets"
              />
            </div>

            <div className="form-group">
              <label>Extra Signs</label>
              <input
                name="extraSigns"
                value={formData.extraSigns}
                onChange={handleChange}
                placeholder="e.g., arrow board"
              />
            </div>

            <div className="form-group">
              <label>Cones</label>
              <input
                name="cones"
                value={formData.cones}
                onChange={handleChange}
                placeholder="e.g., 50"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateEmployeeModal;