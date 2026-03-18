import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function CreateEmployeeModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    fullName: '',
    cellPhone: '',
    secondPhone: '',
    email: '',
    address: '',
    payRate: '',
    customRate: '',
    longTerm: false,
    flaggerCardNum: '',
    flaggerCardExpire: '',
    autoInsurExpire: '',
    autoInsurPolicyNum: '',
    otherCerts: '',
    signs: '',
    extraSigns: '',
    cones: '',
    stands: '',
    otherEquipment: '',
    dmvUnacceptable: false,
    noContractors: '',
    noFlaggers: '',
    medicalInsurance: '',
    retirement401k: '',
    notes: '',
    doh: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getNextEmployeeUID = async () => {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(collection(db, 'employees'));
      
      const uids = snapshot.docs
        .map(doc => doc.data().employeeUID)
        .filter(uid => uid && !isNaN(uid));
      
      const maxUID = uids.length > 0 ? Math.max(...uids) : 0;
      return maxUID + 1;
    } catch (error) {
      console.error('Error getting next UID:', error);
      return Date.now(); // Fallback
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.fullName.trim()) {
        throw new Error('Full name is required');
      }

      // Auto-assign employee UID
      const employeeUID = await getNextEmployeeUID();

      const employeeData = {
        fullName: formData.fullName.trim(),
        employeeUID: employeeUID,
        cellPhone: formData.cellPhone.trim(),
        secondPhone: formData.secondPhone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        
        isActive: true,
        doh: formData.doh,
        
        payRate: parseFloat(formData.payRate) || 0,
        customRate: parseFloat(formData.customRate) || 0,
        longTerm: formData.longTerm,
        
        flaggerCardNum: formData.flaggerCardNum.trim(),
        flaggerCardExpire: formData.flaggerCardExpire,
        autoInsurExpire: formData.autoInsurExpire,
        autoInsurPolicyNum: formData.autoInsurPolicyNum.trim(),
        otherCerts: formData.otherCerts.trim(),
        
        signs: formData.signs.trim(),
        extraSigns: formData.extraSigns.trim(),
        cones: parseInt(formData.cones) || 0,
        stands: parseInt(formData.stands) || 0,
        otherEquipment: formData.otherEquipment.trim(),
        
        dmvUnacceptable: formData.dmvUnacceptable,
        noContractors: formData.noContractors.trim(),
        noFlaggers: formData.noFlaggers.trim(),
        
        medicalInsurance: formData.medicalInsurance.trim(),
        retirement401k: formData.retirement401k.trim(),
        
        notes: formData.notes.trim(),
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown',
        updatedBy: auth.currentUser?.email || 'unknown'
      };

      await setDoc(doc(db, 'employees', formData.fullName.trim()), employeeData);
      await logAudit('CREATE_EMPLOYEE', 'employees', formData.fullName.trim(), { employeeUID });

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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Add New Employee</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="error-message">{error}</div>}

            {/* Contact Information */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Contact Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="First Last"
                />
              </div>

              <div className="form-group">
                <label>Cell Phone</label>
                <input
                  name="cellPhone"
                  value={formData.cellPhone}
                  onChange={handleChange}
                  placeholder="(541) 555-1234"
                />
              </div>

              <div className="form-group">
                <label>Second Phone</label>
                <input
                  name="secondPhone"
                  value={formData.secondPhone}
                  onChange={handleChange}
                  placeholder="(541) 555-5678"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>
            </div>

            {/* Employment Information */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Employment Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Date of Hire</label>
                <input
                  type="date"
                  name="doh"
                  value={formData.doh}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Pay Rate ($/hr)</label>
                <input
                  type="number"
                  name="payRate"
                  value={formData.payRate}
                  onChange={handleChange}
                  min="0"
                  step="0.50"
                  placeholder="25.00"
                />
              </div>

              <div className="form-group">
                <label>Custom Rate ($/hr)</label>
                <input
                  type="number"
                  name="customRate"
                  value={formData.customRate}
                  onChange={handleChange}
                  min="0"
                  step="0.50"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="longTerm"
                    checked={formData.longTerm}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  Long Term Employee
                </label>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="dmvUnacceptable"
                    checked={formData.dmvUnacceptable}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  DMV Unacceptable
                </label>
              </div>
            </div>

            {/* Certifications */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Certifications & Licenses</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Flagger Card #</label>
                <input
                  name="flaggerCardNum"
                  value={formData.flaggerCardNum}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Flagger Card Expiry</label>
                <input
                  type="date"
                  name="flaggerCardExpire"
                  value={formData.flaggerCardExpire}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Auto Insurance Expiry</label>
                <input
                  type="date"
                  name="autoInsurExpire"
                  value={formData.autoInsurExpire}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Auto Insurance Policy #</label>
                <input
                  name="autoInsurPolicyNum"
                  value={formData.autoInsurPolicyNum}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Other Certifications</label>
                <input
                  name="otherCerts"
                  value={formData.otherCerts}
                  onChange={handleChange}
                  placeholder="First Aid, CPR, etc."
                />
              </div>
            </div>

            {/* Equipment */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Equipment & Capabilities</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Signs</label>
                <input
                  name="signs"
                  value={formData.signs}
                  onChange={handleChange}
                  placeholder="1 1/2 sets"
                />
              </div>

              <div className="form-group">
                <label>Extra Signs</label>
                <input
                  name="extraSigns"
                  value={formData.extraSigns}
                  onChange={handleChange}
                  placeholder="Arrow board"
                />
              </div>

              <div className="form-group">
                <label>Cones</label>
                <input
                  type="number"
                  name="cones"
                  value={formData.cones}
                  onChange={handleChange}
                  min="0"
                  placeholder="50"
                />
              </div>

              <div className="form-group">
                <label>Stands</label>
                <input
                  type="number"
                  name="stands"
                  value={formData.stands}
                  onChange={handleChange}
                  min="0"
                  placeholder="4"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Other Equipment</label>
                <input
                  name="otherEquipment"
                  value={formData.otherEquipment}
                  onChange={handleChange}
                  placeholder="Traffic vest, radio, etc."
                />
              </div>
            </div>

            {/* Restrictions */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Restrictions & Preferences</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>No Contractors</label>
                <input
                  name="noContractors"
                  value={formData.noContractors}
                  onChange={handleChange}
                  placeholder="ODOT, etc."
                />
              </div>

              <div className="form-group">
                <label>No Flaggers</label>
                <input
                  name="noFlaggers"
                  value={formData.noFlaggers}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Benefits */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Benefits</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Medical Insurance</label>
                <input
                  name="medicalInsurance"
                  value={formData.medicalInsurance}
                  onChange={handleChange}
                  placeholder="Yes/No"
                />
              </div>

              <div className="form-group">
                <label>401(k)</label>
                <input
                  name="retirement401k"
                  value={formData.retirement401k}
                  onChange={handleChange}
                  placeholder="Yes/No"
                />
              </div>
            </div>

            {/* Notes */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Notes</h3>
            <div className="form-group">
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