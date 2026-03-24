import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { hasPermission } from '../utils/permissions';
import { logAudit } from '../utils/auditLog';

function RatesManager({ permissions }) {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);

  const canCreate = hasPermission(permissions, 'rates', 'create');
  const canUpdate = hasPermission(permissions, 'rates', 'update');
  const canDelete = hasPermission(permissions, 'rates', 'delete');

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'rates'));
      const ratesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      ratesData.sort((a, b) => (a.rateName || '').localeCompare(b.rateName || ''));
      setRates(ratesData);
    } catch (err) {
      console.error('Error loading rates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rate) => {
    if (!confirm(`Delete rate "${rate.rateName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'rates', rate.id));
      await logAudit('DELETE_RATE', 'rates', rate.id);
      loadRates();
    } catch (err) {
      alert('Error deleting rate: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading rates...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="jobs-header">
        <h2>Rate Cards</h2>
        <div className="jobs-actions">
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + New Rate
            </button>
          )}
          <button onClick={loadRates} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {rates.length === 0 ? (
        <div className="empty-state">
          <h3>No rates found</h3>
          <p>Create your first rate card to get started</p>
        </div>
      ) : (
        <div className="jobs-grid">
          {rates.map(rate => (
            <RateCard
              key={rate.id}
              rate={rate}
              onEdit={canUpdate ? () => setEditingRate(rate) : null}
              onDelete={canDelete ? () => handleDelete(rate) : null}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <RateModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            loadRates();
          }}
        />
      )}

      {editingRate && (
        <RateModal
          rate={editingRate}
          onClose={() => setEditingRate(null)}
          onSave={() => {
            setEditingRate(null);
            loadRates();
          }}
        />
      )}
    </div>
  );
}

function RateCard({ rate, onEdit, onDelete }) {
  const isPrevailingWage = rate.flaggerPay > 0;

  return (
    <div className="job-card">
      <div className="job-header">
        <span className="job-id">{rate.rateName}</span>
        {isPrevailingWage && (
          <span className="job-series" style={{ background: '#9c27b0' }}>
            Prevailing Wage
          </span>
        )}
      </div>

      <div className="job-info">
        <div className="job-info-item">
          <div className="job-info-label">Flagger Hours</div>
          <div className="job-info-value">${rate.flaggerHours}/hr</div>
        </div>
        <div className="job-info-item">
          <div className="job-info-label">Flagger OT</div>
          <div className="job-info-value">${rate.flaggerHoursOT}/hr</div>
        </div>
        {isPrevailingWage && (
          <>
            <div className="job-info-item">
              <div className="job-info-label">Flagger Pay</div>
              <div className="job-info-value">${rate.flaggerPay}/hr</div>
            </div>
            <div className="job-info-item">
              <div className="job-info-label">Fringe Benefit</div>
              <div className="job-info-value">${rate.fringeBenefit}/hr</div>
            </div>
          </>
        )}
        <div className="job-info-item">
          <div className="job-info-label">Hour Minimum</div>
          <div className="job-info-value">{rate.hourMinimum} hrs</div>
        </div>
        <div className="job-info-item">
          <div className="job-info-label">OT Starts</div>
          <div className="job-info-value">After {rate.otStarts} hrs</div>
        </div>
        <div className="job-info-item">
          <div className="job-info-label">Travel Time</div>
          <div className="job-info-value">${rate.travelTime}/hr</div>
        </div>
        <div className="job-info-item">
          <div className="job-info-label">Mileage</div>
          <div className="job-info-value">${rate.mileage}/mi</div>
        </div>
      </div>

      <div style={{ marginTop: '12px', fontSize: '13px', color: '#5f6368' }}>
        {rate.overtimeNights && (
          <div style={{ marginBottom: '4px' }}>
            <strong>OT Nights:</strong> {rate.overtimeNights}
          </div>
        )}
        {rate.weekendDuration && (
          <div>
            <strong>Weekends:</strong> {rate.weekendDuration}
          </div>
        )}
      </div>

      <div className="job-actions">
        {onEdit && (
          <button onClick={onEdit} className="btn btn-secondary btn-small">
            Edit
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="btn btn-secondary btn-small" style={{ color: '#d32f2f' }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function RateModal({ rate, onClose, onSave }) {
  const [formData, setFormData] = useState({
    rateName: rate?.rateName || '',
    
    // Flagger rates
    flaggerHours: rate?.flaggerHours || '',
    flaggerHoursOT: rate?.flaggerHoursOT || '',
    flaggerPay: rate?.flaggerPay || 0,
    fringeBenefit: rate?.fringeBenefit || 0,
    
    // Job rules
    hourMinimum: rate?.hourMinimum || 4,
    otStarts: rate?.otStarts || 8,
    holiday: rate?.holiday || 2,
    
    // Travel & mileage
    travelTime: rate?.travelTime || '',
    mileage: rate?.mileage || 0.52,
    truckMileage: rate?.truckMileage || 1.15,
    
    // Equipment rates
    signs: rate?.signs || 12.5,
    cones: rate?.cones || 1.5,
    type2: rate?.type2 || 7.5,
    type3: rate?.type3 || 15,
    truck: rate?.truck || 100,
    tcp: rate?.tcp || 195,
    balloonLights: rate?.balloonLights || 150,
    portableLights: rate?.portableLights || 75,
    
    // OT rules
    overtimeNights: rate?.overtimeNights || '',
    weekendDuration: rate?.weekendDuration || ''
  });

  // Custom parameters
  const [customParams, setCustomParams] = useState(
    Object.entries(rate?.custom || {}).map(([key, value]) => ({
      key,
      value: String(value),
      type: typeof value
    }))
  );

  // New parameter being added
  const [newParam, setNewParam] = useState({ key: '', value: '', type: 'string' });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

      const rateData = {
        rateName: formData.rateName.trim(),
        
        // Flagger rates
        flaggerHours: parseFloat(formData.flaggerHours) || 0,
        flaggerHoursOT: parseFloat(formData.flaggerHoursOT) || 0,
        flaggerPay: parseFloat(formData.flaggerPay) || 0,
        fringeBenefit: parseFloat(formData.fringeBenefit) || 0,
        
        // Job rules
        hourMinimum: parseInt(formData.hourMinimum) || 4,
        otStarts: parseInt(formData.otStarts) || 8,
        holiday: parseInt(formData.holiday) || 2,
        
        // Travel & mileage
        travelTime: parseFloat(formData.travelTime) || 0,
        mileage: parseFloat(formData.mileage) || 0,
        truckMileage: parseFloat(formData.truckMileage) || 0,
        
        // Equipment rates
        signs: parseFloat(formData.signs) || 0,
        cones: parseFloat(formData.cones) || 0,
        type2: parseFloat(formData.type2) || 0,
        type3: parseFloat(formData.type3) || 0,
        truck: parseFloat(formData.truck) || 0,
        tcp: parseFloat(formData.tcp) || 0,
        balloonLights: parseFloat(formData.balloonLights) || 0,
        portableLights: parseFloat(formData.portableLights) || 0,
        
        // OT rules
        overtimeNights: formData.overtimeNights.trim(),
        weekendDuration: formData.weekendDuration.trim(),
        
        // Custom parameters
        custom: customObj,
        
        updatedAt: serverTimestamp()
      };

      if (rate) {
        // Update existing
        await updateDoc(doc(db, 'rates', rate.id), rateData);
        await logAudit('UPDATE_RATE', 'rates', rate.id);
      } else {
        // Create new
        rateData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'rates'), rateData);
        await logAudit('CREATE_RATE', 'rates', rateData.rateName);
      }

      onSave();
      onClose();
    } catch (err) {
      alert('Error saving rate: ' + err.message);
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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>{rate ? 'Edit Rate' : 'Create New Rate'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-group">
              <label>Rate Name *</label>
              <input
                name="rateName"
                value={formData.rateName}
                onChange={handleChange}
                required
                placeholder="e.g., New, ODOT, BOLI Prevailing Wage"
              />
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#1a73e8' }}>Flagger Billing Rates</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Flagger Hours ($/hr) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="flaggerHours"
                  value={formData.flaggerHours}
                  onChange={handleChange}
                  required
                  placeholder="39.70"
                />
              </div>

              <div className="form-group">
                <label>Flagger OT ($/hr) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="flaggerHoursOT"
                  value={formData.flaggerHoursOT}
                  onChange={handleChange}
                  required
                  placeholder="59.55"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#1a73e8' }}>
              Flagger Pay Rates (Prevailing Wage Only)
            </h3>
            <p style={{ fontSize: '14px', color: '#5f6368', marginBottom: '12px' }}>
              Leave at 0 for regular jobs where employees use their own pay rate
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Flagger Pay ($/hr)</label>
                <input
                  type="number"
                  step="0.01"
                  name="flaggerPay"
                  value={formData.flaggerPay}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>Fringe Benefit ($/hr)</label>
                <input
                  type="number"
                  step="0.01"
                  name="fringeBenefit"
                  value={formData.fringeBenefit}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#1a73e8' }}>Job Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Hour Minimum *</label>
                <input
                  type="number"
                  name="hourMinimum"
                  value={formData.hourMinimum}
                  onChange={handleChange}
                  required
                  placeholder="4"
                />
              </div>

              <div className="form-group">
                <label>OT Starts (hrs) *</label>
                <input
                  type="number"
                  name="otStarts"
                  value={formData.otStarts}
                  onChange={handleChange}
                  required
                  placeholder="8"
                />
              </div>

              <div className="form-group">
                <label>Holiday Multiplier</label>
                <input
                  type="number"
                  name="holiday"
                  value={formData.holiday}
                  onChange={handleChange}
                  placeholder="2"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#1a73e8' }}>Travel & Mileage</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Travel Time ($/hr) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="travelTime"
                  value={formData.travelTime}
                  onChange={handleChange}
                  required
                  placeholder="39.70"
                />
              </div>

              <div className="form-group">
                <label>Mileage ($/mi) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  required
                  placeholder="0.52"
                />
              </div>

              <div className="form-group">
                <label>Truck Mileage ($/mi)</label>
                <input
                  type="number"
                  step="0.01"
                  name="truckMileage"
                  value={formData.truckMileage}
                  onChange={handleChange}
                  placeholder="1.15"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#1a73e8' }}>Equipment Rates</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Signs ($/each)</label>
                <input
                  type="number"
                  step="0.01"
                  name="signs"
                  value={formData.signs}
                  onChange={handleChange}
                  placeholder="12.50"
                />
              </div>

              <div className="form-group">
                <label>Cones ($/each)</label>
                <input
                  type="number"
                  step="0.01"
                  name="cones"
                  value={formData.cones}
                  onChange={handleChange}
                  placeholder="1.50"
                />
              </div>

              <div className="form-group">
                <label>Type 2 ($)</label>
                <input
                  type="number"
                  step="0.01"
                  name="type2"
                  value={formData.type2}
                  onChange={handleChange}
                  placeholder="7.50"
                />
              </div>

              <div className="form-group">
                <label>Type 3 ($)</label>
                <input
                  type="number"
                  step="0.01"
                  name="type3"
                  value={formData.type3}
                  onChange={handleChange}
                  placeholder="15"
                />
              </div>

              <div className="form-group">
                <label>Truck ($)</label>
                <input
                  type="number"
                  step="0.01"
                  name="truck"
                  value={formData.truck}
                  onChange={handleChange}
                  placeholder="100"
                />
              </div>

              <div className="form-group">
                <label>TCP ($)</label>
                <input
                  type="number"
                  step="0.01"
                  name="tcp"
                  value={formData.tcp}
                  onChange={handleChange}
                  placeholder="195"
                />
              </div>

              <div className="form-group">
                <label>Balloon Lights ($)</label>
                <input
                  type="number"
                  step="0.01"
                  name="balloonLights"
                  value={formData.balloonLights}
                  onChange={handleChange}
                  placeholder="150"
                />
              </div>

              <div className="form-group">
                <label>Portable Lights ($)</label>
                <input
                  type="number"
                  step="0.01"
                  name="portableLights"
                  value={formData.portableLights}
                  onChange={handleChange}
                  placeholder="75"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#1a73e8' }}>Overtime Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Overtime Nights</label>
                <input
                  name="overtimeNights"
                  value={formData.overtimeNights}
                  onChange={handleChange}
                  placeholder="6pm - 6am"
                />
              </div>

              <div className="form-group">
                <label>Weekend Duration</label>
                <input
                  name="weekendDuration"
                  value={formData.weekendDuration}
                  onChange={handleChange}
                  placeholder="Saturday, Sunday"
                />
              </div>
            </div>

            {/* Custom Parameters */}
            <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#1a73e8' }}>Custom Parameters</h3>
            
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
              {loading ? 'Saving...' : (rate ? 'Update Rate' : 'Create Rate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RatesManager;