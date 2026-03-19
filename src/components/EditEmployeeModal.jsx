import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function EditEmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    // Standard fields
    fullName: employee.fullName || '',
    cellPhone: employee.cellPhone || '',
    secondPhone: employee.secondPhone || '',
    email: employee.email || '',
    address: employee.address || '',
    payRate: employee.payRate || '',
    customRate: employee.customRate || '',
    longTerm: employee.longTerm || false,
    flaggerCardNum: employee.flaggerCardNum || '',
    flaggerCardExpire: employee.flaggerCardExpire || '',
    autoInsurExpire: employee.autoInsurExpire || '',
    autoInsurPolicyNum: employee.autoInsurPolicyNum || '',
    otherCerts: employee.otherCerts || '',
    signs: employee.signs || '',
    extraSigns: employee.extraSigns || '',
    cones: employee.cones || '',
    stands: employee.stands || '',
    otherEquipment: employee.otherEquipment || '',
    dmvUnacceptable: employee.dmvUnacceptable || false,
    noContractors: employee.noContractors || '',
    noFlaggers: employee.noFlaggers || '',
    medicalInsurance: employee.medicalInsurance || '',
    retirement401k: employee.retirement401k || '',
    notes: employee.notes || '',
    doh: employee.doh || '',
    isActive: employee.isActive !== false
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

    // Convert value to correct type
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
        cellPhone: formData.cellPhone.trim(),
        secondPhone: formData.secondPhone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        
        isActive: formData.isActive,
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h2>Edit Employee: {employee.fullName}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="error-message">{error}</div>}

            {/* Employee UID (read-only) */}
            <div style={{ 
              background: '#e8f0fe', 
              padding: '12px', 
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <strong>Employee UID:</strong> #{employee.employeeUID}
            </div>

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

              <div className="form-group">
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
            </div>

            {/* Employment Information */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Employment Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  Active Employee
                </label>
              </div>

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
                <label>Cones</label>
                <input
                  type="number"
                  name="cones"
                  value={formData.cones}
                  onChange={handleChange}
                  min="0"
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
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Restrictions & Preferences</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>No Contractors</label>
                <input
                  name="noContractors"
                  value={formData.noContractors}
                  onChange={handleChange}
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
                />
              </div>

              <div className="form-group">
                <label>401(k)</label>
                <input
                  name="retirement401k"
                  value={formData.retirement401k}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Notes */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Notes</h3>
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
            
            {/* Existing custom parameters */}
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

            {/* Add new parameter */}
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