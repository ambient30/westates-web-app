import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function EditJobModal({ job, onClose, onSave }) {
  const [formData, setFormData] = useState({
    caller: job.caller || '',
    billing: job.billing || '',
    receiver: job.receiver || '',
    poWoJobNum: job.poWoJobNum || '',
    initialJobDate: job.initialJobDate || '',
    initialJobTime: job.initialJobTime || '',
    meetSet: job.meetSet || '',
    jobLength: job.jobLength || '',
    location: job.location || '',
    amountOfFlaggers: job.amountOfFlaggers || '',
    signSets: job.signSets || '',
    indvSigns: job.indvSigns || '',
    cones: job.cones || '',
    type2: job.type2 || '',
    type3: job.type3 || '',
    truck: job.truck || '',
    balloonLights: job.balloonLights || '',
    portableLights: job.portableLights || '',
    travelTime: job.travelTime || '',
    travelMiles: job.travelMiles || '',
    otherNotes: job.otherNotes || '',
    jobSeries: job.jobSeries || ''
  });

  // Custom parameters
  const [customParams, setCustomParams] = useState(
    Object.entries(job.custom || {}).map(([key, value]) => ({
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        caller: formData.caller.trim(),
        billing: formData.billing.trim(),
        receiver: formData.receiver.trim(),
        poWoJobNum: formData.poWoJobNum.trim(),
        initialJobDate: formData.initialJobDate.trim(),
        initialJobTime: formData.initialJobTime.trim(),
        meetSet: formData.meetSet.trim(),
        jobLength: formData.jobLength.trim(),
        location: formData.location.trim(),
        amountOfFlaggers: formData.amountOfFlaggers.trim(),
        signSets: formData.signSets.trim(),
        indvSigns: formData.indvSigns.trim(),
        cones: formData.cones.trim(),
        type2: formData.type2.trim(),
        type3: formData.type3.trim(),
        truck: formData.truck.trim(),
        balloonLights: formData.balloonLights.trim(),
        portableLights: formData.portableLights.trim(),
        travelTime: formData.travelTime.trim(),
        travelMiles: formData.travelMiles.trim(),
        otherNotes: formData.otherNotes.trim(),
        jobSeries: formData.jobSeries.trim(),
        custom: customObj,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      };

      await updateDoc(doc(db, 'jobs', job.id), updates);
      await logAudit('UPDATE_JOB', 'jobs', job.jobID, updates);

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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Edit Job: {job.jobID}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="error-message">{error}</div>}

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Caller</label>
                <input
                  name="caller"
                  value={formData.caller}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Billing</label>
                <input
                  name="billing"
                  value={formData.billing}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Receiver</label>
                <input
                  name="receiver"
                  value={formData.receiver}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>PO/WO/Job #</label>
                <input
                  name="poWoJobNum"
                  value={formData.poWoJobNum}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Job Series</label>
                <input
                  name="jobSeries"
                  value={formData.jobSeries}
                  onChange={handleChange}
                />
              </div>
            </div>

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Job Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Date</label>
                <input
                  name="initialJobDate"
                  value={formData.initialJobDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Time</label>
                <input
                  name="initialJobTime"
                  value={formData.initialJobTime}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Meet/Set</label>
                <input
                  name="meetSet"
                  value={formData.meetSet}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Job Length</label>
                <input
                  name="jobLength"
                  value={formData.jobLength}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Location</label>
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Amount of Flaggers</label>
                <input
                  type="number"
                  name="amountOfFlaggers"
                  value={formData.amountOfFlaggers}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Equipment</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Sign Sets</label>
                <input
                  name="signSets"
                  value={formData.signSets}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Individual Signs</label>
                <input
                  name="indvSigns"
                  value={formData.indvSigns}
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
                <label>Type 2</label>
                <input
                  name="type2"
                  value={formData.type2}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Type 3</label>
                <input
                  name="type3"
                  value={formData.type3}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Truck</label>
                <input
                  name="truck"
                  value={formData.truck}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Balloon Lights</label>
                <input
                  name="balloonLights"
                  value={formData.balloonLights}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Portable Lights</label>
                <input
                  name="portableLights"
                  value={formData.portableLights}
                  onChange={handleChange}
                />
              </div>
            </div>

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Travel & Billing</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Travel Time (hours)</label>
                <input
                  name="travelTime"
                  value={formData.travelTime}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Travel Miles</label>
                <input
                  type="number"
                  name="travelMiles"
                  value={formData.travelMiles}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Notes</h3>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <textarea
                name="otherNotes"
                value={formData.otherNotes}
                onChange={handleChange}
                rows="4"
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

export default EditJobModal;