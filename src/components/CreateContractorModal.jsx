import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function CreateContractorModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    caller: '',
    contractor: '',
    billing: '',
    phone: '',
    email: '',
    rates: '',
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
      if (!formData.caller.trim()) {
        throw new Error('Caller name is required');
      }

      const contractorData = {
        caller: formData.caller.trim(),
        contractor: formData.contractor.trim(),
        billing: formData.billing.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        rates: formData.rates.trim(),
        notes: formData.notes.trim(),
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown',
        updatedBy: auth.currentUser?.email || 'unknown'
      };

      // Use caller as document ID (sanitized)
      const docId = formData.caller.trim().replace(/[\/\\]/g, '-');
      
      await setDoc(doc(db, 'contractors', docId), contractorData);
      await logAudit('CREATE_CONTRACTOR', 'contractors', docId);

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
          <h2>Add New Contractor</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Caller Name *</label>
              <input
                name="caller"
                value={formData.caller}
                onChange={handleChange}
                required
                placeholder="e.g., Will Burks(EPUD)"
              />
            </div>

            <div className="form-group">
              <label>Company Name</label>
              <input
                name="contractor"
                value={formData.contractor}
                onChange={handleChange}
                placeholder="e.g., EPUD"
              />
            </div>

            <div className="form-group">
              <label>Billing Name</label>
              <input
                name="billing"
                value={formData.billing}
                onChange={handleChange}
                placeholder="e.g., EPUD"
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
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@example.com"
              />
            </div>

            <div className="form-group">
              <label>Rate Card</label>
              <input
                name="rates"
                value={formData.rates}
                onChange={handleChange}
                placeholder="e.g., Prevailing Wage"
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
              {loading ? 'Creating...' : 'Create Contractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateContractorModal;