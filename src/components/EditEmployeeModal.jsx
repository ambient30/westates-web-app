import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function EditEmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    fullName: employee.fullName || '',
    employeeUID: employee.employeeUID || '',
    cellPhone: employee.cellPhone || '',
    secondPhone: employee.secondPhone || '',
    email: employee.email || '',
    address: employee.address || '',
    doh: employee.doh || '',
    payRate: employee.payRate || '',
    customRate: employee.customRate || '',
    isActive: employee.isActive !== undefined ? employee.isActive : true,
    longTerm: employee.longTerm || false,
    dmvUnacceptable: employee.dmvUnacceptable || false,
    
    // Certifications
    flaggerCardNum: employee.flaggerCardNum || '',
    flaggerCardExpire: employee.flaggerCardExpire || '',
    otherCerts: employee.otherCerts || '',
    
    // Insurance
    autoInsurPolicyNum: employee.autoInsurPolicyNum || '',
    autoInsurExpire: employee.autoInsurExpire || '',
    medicalInsurance: employee.medicalInsurance || '',
    retirement401k: employee.retirement401k || 'No',
    
    // Equipment
    signs: employee.signs || '',
    extraSigns: employee.extraSigns || '',
    cones: employee.cones || '',
    stands: employee.stands || '',
    otherEquipment: employee.otherEquipment || '',
    
    // Restrictions
    noFlaggers: employee.noFlaggers || '',
    noContractors: employee.noContractors || '',
    
    notes: employee.notes || ''
  });

  // Custom parameters
  const [customParams, setCustomParams] = useState(
    Object.entries(employee.custom || {}).map(([key, value]) => ({
      key,
      value: String(value),
      type: typeof value
    }))
  );

  // New parameter being added
  const [newParam, setNewParam] = useState({ key: '', value: '', type: 'string' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleCustomParamChange = (index, field, value) => {
    const updated = [...customParams];
    updated[index][field] = value;
    setCustomParams(updated);
  };

  const removeCustomParam = (index) => {
    setCustomParams(customParams.filter((_, i) => i !== index));
  };

  const addNewParam = () => {
    if (!newParam.key.trim()) {
      alert('Parameter name is required');
      return;
    }

    let convertedValue = newParam.value;
    if (newParam.type === 'number') {
      convertedValue = parseFloat(newParam.value) || 0;
    } else if (newParam.type === 'boolean') {
      convertedValue = newParam.value === 'true';
    }

    setCustomParams([
      ...customParams,
      {
        key: newParam.key.trim(),
        value: convertedValue,
        type: newParam.type
      }
    ]);

    setNewParam({ key: '', value: '', type: 'string' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Build custom parameters object
      const customObj = {};
      customParams.forEach(param => {
        let value = param.value;
        if (param.type === 'number') {
          value = parseFloat(value) || 0;
        } else if (param.type === 'boolean') {
          value = value === 'true' || value === true;
        }
        customObj[param.key] = value;
      });

      const updates = {
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
        custom: customObj,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      };

      await updateDoc(doc(db, 'employees', employee.id), updates);
      await logAudit('UPDATE_EMPLOYEE', 'employees', employee.id, updates);

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
          <h2>Edit Employee: {employee.fullName}</h2>
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
                />
              </div>

              <div className="form-group">
                <label>Employee UID</label>
                <input
                  name="employeeUID"
                  value={formData.employeeUID}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Cell Phone</label>
                <input
                  name="cellPhone"
                  value={formData.cellPhone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Second Phone</label>
                <input
                  name="secondPhone"
                  value={formData.secondPhone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
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
                />
              </div>

              <div className="form-group">
                <label>Extra Signs</label>
                <input
                  name="extraSigns"
                  value={formData.extraSigns}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Cones (count)</label>
                <input
                  type="number"
                  name="cones"
                  value={formData.cones}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Stands (count)</label>
                <input
                  type="number"
                  name="stands"
                  value={formData.stands}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Other Equipment</label>
                <input
                  name="otherEquipment"
                  value={formData.otherEquipment}
                  onChange={handleChange}
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
                />
              </div>

              <div className="form-group">
                <label>Do Not Work With (Contractors)</label>
                <input
                  name="noContractors"
                  value={formData.noContractors}
                  onChange={handleChange}
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
              />
            </div>

            {/* Custom Parameters */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Custom Parameters</h3>
            
            {customParams.map((param, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  value={param.key}
                  onChange={(e) => handleCustomParamChange(index, 'key', e.target.value)}
                  placeholder="Parameter name"
                  style={{ flex: '1', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                />
                <select
                  value={param.type}
                  onChange={(e) => handleCustomParamChange(index, 'type', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                >
                  <option value="string">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">True/False</option>
                </select>
                {param.type === 'boolean' ? (
                  <select
                    value={String(param.value)}
                    onChange={(e) => handleCustomParamChange(index, 'value', e.target.value)}
                    style={{ flex: '2', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    type={param.type === 'number' ? 'number' : 'text'}
                    value={param.value}
                    onChange={(e) => handleCustomParamChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    style={{ flex: '2', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeCustomParam(index)}
                  className="btn btn-secondary btn-small"
                  style={{ color: '#d32f2f' }}
                >
                  Remove
                </button>
              </div>
            ))}

            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              background: '#f8f9fa', 
              borderRadius: '4px',
              border: '2px dashed #dadce0'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                Add New Parameter
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={newParam.key}
                  onChange={(e) => setNewParam({ ...newParam, key: e.target.value })}
                  placeholder="Parameter name"
                  style={{ flex: '1', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                />
                <select
                  value={newParam.type}
                  onChange={(e) => setNewParam({ ...newParam, type: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                >
                  <option value="string">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">True/False</option>
                </select>
                {newParam.type === 'boolean' ? (
                  <select
                    value={newParam.value}
                    onChange={(e) => setNewParam({ ...newParam, value: e.target.value })}
                    style={{ flex: '2', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    type={newParam.type === 'number' ? 'number' : 'text'}
                    value={newParam.value}
                    onChange={(e) => setNewParam({ ...newParam, value: e.target.value })}
                    placeholder="Value"
                    style={{ flex: '2', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                  />
                )}
                <button
                  type="button"
                  onClick={addNewParam}
                  className="btn btn-primary btn-small"
                >
                  Add
                </button>
              </div>
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

export default EditEmployeeModal;