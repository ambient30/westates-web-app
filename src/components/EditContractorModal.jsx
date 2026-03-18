import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function EditContractorModal({ contractor, onClose, onSave }) {
  const [formData, setFormData] = useState({
    caller: contractor.caller || '',
    contractor: contractor.contractor || '',
    billing: contractor.billing || '',
    phone: contractor.phone || '',
    email: contractor.email || '',
    rates: contractor.rates || '',
    notes: contractor.notes || ''
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
      const updates = {
        caller: formData.caller.trim(),
        contractor: formData.contractor.trim(),
        billing: formData.billing.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        rates: formData.rates.trim(),
        notes: formData.notes.trim(),
        
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      };

      await updateDoc(doc(db, 'contractors', contractor.id), updates);
      await logAudit('UPDATE_CONTRACTOR', 'contractors', contractor.id, updates);

      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Edit Contractor: {contractor.caller}</h2>
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
              />
            </div>

            <div className="form-group">
              <label>Company Name</label>
              <input
                name="contractor"
                value={formData.contractor}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Billing Name</label>
              <input
                name="billing"
                value={formData.billing}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Rate Card</label>
              <input
                name="rates"
                value={formData.rates}
                onChange={handleChange}
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
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditContractorModal;