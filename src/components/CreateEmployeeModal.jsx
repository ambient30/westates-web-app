import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from '../utils/firestoreTracker';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function CreateEmployeeModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    fullName: '',
    employeeUID: '',
    cellPhone: '',
    secondPhone: '',
    email: '',
    address: '',
    doh: '',
    payRate: '',
    customRate: '',
    isActive: true,
    longTerm: false,
    dmvUnacceptable: false,
    
    // Certifications
    flaggerCardNum: '',
    flaggerCardExpire: '',
    otherCerts: '',
    
    // Insurance
    autoInsurPolicyNum: '',
    autoInsurExpire: '',
    medicalInsurance: '',
    retirement401k: 'No',
    
    // Equipment
    signs: '',
    extraSigns: '',
    cones: '',
    stands: '',
    otherEquipment: '',
    
    // Restrictions
    noFlaggers: '',
    noContractors: '',
    
    notes: ''
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
        employeeUID: formData.employeeUID.trim(),
        cellPhone: formData.cellPhone.trim(),
        secondPhone: formData.secondPhone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        doh: formData.doh.trim(),
        payRate: parseFloat(formData.payRate) || 0,
        customRate: parseFloat(formData.customRate) || 0,
        isActive: formData.isActive,
        longTerm: formData.longTerm,
        dmvUnacceptable: formData.dmvUnacceptable,
        
        // Certifications
        flaggerCardNum: formData.flaggerCardNum.trim(),
        flaggerCardExpire: formData.flaggerCardExpire.trim(),
        otherCerts: formData.otherCerts.trim(),
        
        // Insurance
        autoInsurPolicyNum: formData.autoInsurPolicyNum.trim(),
        autoInsurExpire: formData.autoInsurExpire.trim(),
        medicalInsurance: formData.medicalInsurance.trim(),
        retirement401k: formData.retirement401k.trim(),
        
        // Equipment
        signs: formData.signs.trim(),
        extraSigns: formData.extraSigns.trim(),
        cones: parseInt(formData.cones) || 0,
        stands: parseInt(formData.stands) || 0,
        otherEquipment: formData.otherEquipment.trim(),
        
        // Restrictions
        noFlaggers: formData.noFlaggers.trim(),
        noContractors: formData.noContractors.trim(),
        
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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>Add New Employee</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
            {error && <div className="error-message">{error}</div>}

            {/* Basic Information */}
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1a73e8' }}>Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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
                <label>Employee UID</label>
                <input
                  name="employeeUID"
                  value={formData.employeeUID}
                  onChange={handleChange}
                  placeholder="e.g., 26"
                />
              </div>

              <div className="form-group">
                <label>Cell Phone</label>
                <input
                  name="cellPhone"
                  value={formData.cellPhone}
                  onChange={handleChange}
                  placeholder="458-544-2349"
                />
              </div>

              <div className="form-group">
                <label>Second Phone</label>
                <input
                  name="secondPhone"
                  value={formData.secondPhone}
                  onChange={handleChange}
                  placeholder="541-579-3956"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="87842 Huston Rd Veneta, OR 97487"
                />
              </div>

              <div className="form-group">
                <label>Date of Hire (DOH)</label>
                <input
                  type="date"
                  name="doh"
                  value={formData.doh}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Pay Rate ($/hr) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="payRate"
                  value={formData.payRate}
                  onChange={handleChange}
                  required
                  placeholder="27.50"
                />
              </div>

              <div className="form-group">
                <label>Custom Rate ($/hr)</label>
                <input
                  type="number"
                  step="0.01"
                  name="customRate"
                  value={formData.customRate}
                  onChange={handleChange}
                  placeholder="27.50"
                />
              </div>
            </div>

            {/* Status Flags */}
            <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Status</h3>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <span>Active Employee</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="longTerm"
                  checked={formData.longTerm}
                  onChange={handleChange}
                />
                <span>Long Term</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="dmvUnacceptable"
                  checked={formData.dmvUnacceptable}
                  onChange={handleChange}
                />
                <span>DMV Unacceptable</span>
              </label>
            </div>

            {/* Certifications */}
            <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Certifications</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Flagger Card Number</label>
                <input
                  name="flaggerCardNum"
                  value={formData.flaggerCardNum}
                  onChange={handleChange}
                  placeholder="59431"
                />
              </div>

              <div className="form-group">
                <label>Flagger Card Expiration</label>
                <input
                  type="date"
                  name="flaggerCardExpire"
                  value={formData.flaggerCardExpire}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Other Certifications</label>
                <input
                  name="otherCerts"
                  value={formData.otherCerts}
                  onChange={handleChange}
                  placeholder="ESO-008520 TCS, OSHA JHA/AI/HIC"
                />
              </div>
            </div>

            {/* Insurance & Benefits */}
            <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Insurance & Benefits</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Auto Insurance Policy Number</label>
                <input
                  name="autoInsurPolicyNum"
                  value={formData.autoInsurPolicyNum}
                  onChange={handleChange}
                  placeholder="Geico-0438-59-52-09"
                />
              </div>

              <div className="form-group">
                <label>Auto Insurance Expiration</label>
                <input
                  type="date"
                  name="autoInsurExpire"
                  value={formData.autoInsurExpire}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Medical Insurance</label>
                <input
                  name="medicalInsurance"
                  value={formData.medicalInsurance}
                  onChange={handleChange}
                  placeholder="Opt Out"
                />
              </div>

              <div className="form-group">
                <label>401k Retirement</label>
                <select
                  name="retirement401k"
                  value={formData.retirement401k}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>

            {/* Equipment */}
            <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Equipment</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Sign Sets</label>
                <input
                  name="signs"
                  value={formData.signs}
                  onChange={handleChange}
                  placeholder="1.5 sets"
                />
              </div>

              <div className="form-group">
                <label>Extra Signs</label>
                <input
                  name="extraSigns"
                  value={formData.extraSigns}
                  onChange={handleChange}
                  placeholder="3 RWA"
                />
              </div>

              <div className="form-group">
                <label>Cones (count)</label>
                <input
                  type="number"
                  name="cones"
                  value={formData.cones}
                  onChange={handleChange}
                  placeholder="15"
                />
              </div>

              <div className="form-group">
                <label>Stands (count)</label>
                <input
                  type="number"
                  name="stands"
                  value={formData.stands}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Other Equipment</label>
                <input
                  name="otherEquipment"
                  value={formData.otherEquipment}
                  onChange={handleChange}
                  placeholder="Enter other equipment"
                />
              </div>
            </div>

            {/* Restrictions */}
            <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Restrictions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Do Not Work With (Flaggers)</label>
                <input
                  name="noFlaggers"
                  value={formData.noFlaggers}
                  onChange={handleChange}
                  placeholder="Comma-separated names"
                />
              </div>

              <div className="form-group">
                <label>Do Not Work With (Contractors)</label>
                <input
                  name="noContractors"
                  value={formData.noContractors}
                  onChange={handleChange}
                  placeholder="Comma-separated names"
                />
              </div>
            </div>

            {/* Notes */}
            <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Notes</h3>
            <div className="form-group" style={{ marginBottom: '24px' }}>
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