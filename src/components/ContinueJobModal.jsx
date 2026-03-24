import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function ContinueJobModal({ job, onClose, onSave }) {
  const tomorrow = new Date(job.initialJobDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const [formData, setFormData] = useState({
    caller: job.caller || '',
    billing: job.billing || '',
    receiver: job.receiver || '',
    poWoJobNum: job.poWoJobNum || '',
    initialJobDate: tomorrowStr,
    initialJobTime: job.initialJobTime || '',
    meetSet: job.meetSet || '',
    jobLength: job.jobLength || '',
    location: job.location || '',
    amountOfFlaggers: job.amountOfFlaggers || '',
    assignedFlaggers: job.assignedFlaggers || '',
    dispatchedFlaggers: '',
    equipmentCarrier: job.equipmentCarrier || '',
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
    hideFromSummary: false,
    custom: { ...job.custom } || {}
  });

  const [customFields, setCustomFields] = useState(
    Object.entries(job.custom || {}).map(([key, value]) => ({ key, value: String(value) }))
  );

  // Flagger selection states
  const originalFlaggers = (job.assignedFlaggers || '').split(',').map(name => name.trim()).filter(Boolean);
  const originalDispatched = (job.dispatchedFlaggers || '').split(',').map(name => name.trim()).filter(Boolean);
  const originalCarriers = (job.equipmentCarrier || '').split(',').map(name => name.trim()).filter(Boolean);

  const [selectedFlaggers, setSelectedFlaggers] = useState(
    originalFlaggers.map(name => ({ name, selected: true }))
  );
  const [selectedDispatched, setSelectedDispatched] = useState(
    originalDispatched.map(name => ({ name, selected: true }))
  );
  const [selectedCarriers, setSelectedCarriers] = useState(
    originalCarriers.map(name => ({ name, selected: true }))
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('edit');
  const [keepAssignments, setKeepAssignments] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (index, field, value) => {
    const newCustomFields = [...customFields];
    newCustomFields[index][field] = value;
    setCustomFields(newCustomFields);
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const toggleFlaggerSelection = (index) => {
    const newSelected = [...selectedFlaggers];
    newSelected[index].selected = !newSelected[index].selected;
    setSelectedFlaggers(newSelected);
  };

  const toggleDispatchedSelection = (index) => {
    const newSelected = [...selectedDispatched];
    newSelected[index].selected = !newSelected[index].selected;
    setSelectedDispatched(newSelected);
  };

  const toggleCarrierSelection = (index) => {
    const newSelected = [...selectedCarriers];
    newSelected[index].selected = !newSelected[index].selected;
    setSelectedCarriers(newSelected);
  };

  const handleConfirmEdit = () => {
    // Update custom fields in formData
    const customObj = {};
    customFields.forEach(field => {
      if (field.key && field.key.trim()) {
        customObj[field.key] = field.value;
      }
    });
    setFormData(prev => ({ ...prev, custom: customObj }));

    setError('');
    
    // If no assigned flaggers, skip to creation
    if (originalFlaggers.length === 0) {
      createNewJob(false, false);
    } else {
      setStep('assign');
    }
  };

  const createNewJob = async (keepAssign, keepDispatch) => {
    setLoading(true);
    setError('');

    try {
      // Generate new Job ID
      const jobsSnap = await getDocs(collection(db, 'jobs'));
      const existingJobs = jobsSnap.docs.map(doc => doc.data().jobID).filter(Boolean);
      
      let newJobNumber = 1;
      existingJobs.forEach(jobID => {
        const match = jobID.match(/Job-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num >= newJobNumber) {
            newJobNumber = num + 1;
          }
        }
      });
      
      const newJobID = `Job-${newJobNumber}`;

      // Build custom object from custom fields
      const customObj = {};
      customFields.forEach(field => {
        if (field.key && field.key.trim()) {
          customObj[field.key] = field.value;
        }
      });

      // Build assigned and dispatched strings from selections
      let assignedFlaggersStr = '';
      let dispatchedFlaggersStr = '';
      let equipmentCarrierStr = '';

      if (keepAssign) {
        const selected = selectedFlaggers.filter(f => f.selected).map(f => f.name);
        assignedFlaggersStr = selected.join(', ');

        const selectedCarr = selectedCarriers.filter(c => c.selected).map(c => c.name);
        equipmentCarrierStr = selectedCarr.join(', ');

        if (keepDispatch) {
          const selectedDisp = selectedDispatched.filter(f => f.selected).map(f => f.name);
          dispatchedFlaggersStr = selectedDisp.join(', ');
        }
      }

      // Create new job
      const newJobData = {
        ...formData,
        custom: customObj,
        jobID: newJobID,
        jobSeries: job.jobSeries || '',
        assignedFlaggers: assignedFlaggersStr,
        dispatchedFlaggers: dispatchedFlaggersStr,
        equipmentCarrier: equipmentCarrierStr,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown',
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      };

      console.log('Creating new job with data:', newJobData);

      await addDoc(collection(db, 'jobs'), newJobData);
      await logAudit('CONTINUE_JOB', 'jobs', newJobID, { 
        originalJobID: job.jobID,
        newDate: formData.initialJobDate || 'No date',
        keepAssignments: keepAssign,
        keepDispatched: keepDispatch
      });

      // Hide original job from summary
      await updateDoc(doc(db, 'jobs', job.id), {
        hideFromSummary: true,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });
      await logAudit('HIDE_JOB', 'jobs', job.jobID, { reason: 'Continued to next day' });

      onSave();
      onClose();
    } catch (err) {
      console.error('Error continuing job:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDecision = (keep) => {
    setKeepAssignments(keep);
    if (!keep) {
      createNewJob(false, false);
    } else {
      // Get list of selected flaggers
      const selectedFlaggerNames = selectedFlaggers.filter(f => f.selected).map(f => f.name);
      
      // Filter dispatched flaggers to only those who are also selected for assignment
      const availableDispatched = selectedDispatched.filter(d => 
        selectedFlaggerNames.includes(d.name)
      );
      
      // Update selectedDispatched to only include those still assigned
      setSelectedDispatched(availableDispatched);
      
      // Check if any flaggers were dispatched AND are still selected
      if (availableDispatched.length === 0) {
        createNewJob(true, false);
      } else {
        setStep('dispatch');
      }
    }
  };

  const handleDispatchDecision = (keep) => {
    createNewJob(true, keep);
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
          <h2>
            {step === 'edit' && 'Continue Job to Next Day'}
            {step === 'assign' && 'Select Flaggers & Equipment Carriers'}
            {step === 'dispatch' && 'Select Flaggers to Dispatch'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="error-message">{error}</div>}

          {step === 'edit' && (
            <>
              <p style={{ marginBottom: '16px', color: '#5f6368', fontSize: '14px' }}>
                Review and edit ALL job details. Leave date/time blank to create a "Potential Return" job.
              </p>

              {/* Basic Info */}
              <h3 style={{ marginBottom: '12px', color: '#1a73e8', fontSize: '16px' }}>Basic Information</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label>Job Date</label>
                  <input
                    type="text"
                    name="initialJobDate"
                    value={formData.initialJobDate}
                    onChange={handleChange}
                    placeholder="Leave blank for Potential Return"
                  />
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="text"
                    name="initialJobTime"
                    value={formData.initialJobTime}
                    onChange={handleChange}
                    placeholder="Leave blank for Potential Return"
                  />
                </div>

                <div className="form-group">
                  <label>Caller</label>
                  <input
                    type="text"
                    name="caller"
                    value={formData.caller}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Billing</label>
                  <input
                    type="text"
                    name="billing"
                    value={formData.billing}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Receiver</label>
                  <input
                    type="text"
                    name="receiver"
                    value={formData.receiver}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>PO/WO/Job #</label>
                  <input
                    type="text"
                    name="poWoJobNum"
                    value={formData.poWoJobNum}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Meet/Set</label>
                  <input
                    type="text"
                    name="meetSet"
                    value={formData.meetSet}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Job Length</label>
                  <input
                    type="text"
                    name="jobLength"
                    value={formData.jobLength}
                    onChange={handleChange}
                    placeholder="e.g., 8 hours, 2 days"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              {/* Flaggers */}
              <h3 style={{ marginBottom: '12px', color: '#1a73e8', fontSize: '16px' }}>Flaggers</h3>
              
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Amount of Flaggers</label>
                <input
                  type="number"
                  name="amountOfFlaggers"
                  value={formData.amountOfFlaggers}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              {/* Equipment */}
              <h3 style={{ marginBottom: '12px', color: '#1a73e8', fontSize: '16px' }}>Equipment</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label>Sign Sets</label>
                  <input
                    type="text"
                    name="signSets"
                    value={formData.signSets}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Individual Signs</label>
                  <input
                    type="text"
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
                    type="text"
                    name="type2"
                    value={formData.type2}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Type 3</label>
                  <input
                    type="text"
                    name="type3"
                    value={formData.type3}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Truck</label>
                  <input
                    type="text"
                    name="truck"
                    value={formData.truck}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Balloon Lights</label>
                  <input
                    type="text"
                    name="balloonLights"
                    value={formData.balloonLights}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Portable Lights</label>
                  <input
                    type="text"
                    name="portableLights"
                    value={formData.portableLights}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Travel & Billing */}
              <h3 style={{ marginBottom: '12px', color: '#1a73e8', fontSize: '16px' }}>Travel & Billing</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label>Travel Time (hours)</label>
                  <input
                    type="text"
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

              {/* Notes */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Notes</label>
                <textarea
                  name="otherNotes"
                  value={formData.otherNotes}
                  onChange={handleChange}
                  rows="3"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                />
              </div>

              {/* Custom Parameters */}
              <h3 style={{ marginBottom: '12px', color: '#1a73e8', fontSize: '16px' }}>Custom Parameters</h3>
              
              {customFields.length === 0 ? (
                <p style={{ color: '#5f6368', fontSize: '14px', marginBottom: '16px' }}>
                  No custom parameters. Click "Add Custom Field" to add one.
                </p>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  {customFields.map((field, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>Parameter Name</label>
                        <input
                          type="text"
                          value={field.key}
                          onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                          placeholder="e.g., pilotCarDriver"
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>Value</label>
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                          placeholder="e.g., Dylan"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        className="btn btn-secondary btn-small"
                        style={{ color: '#d32f2f' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addCustomField}
                className="btn btn-secondary btn-small"
              >
                + Add Custom Field
              </button>
            </>
          )}

          {step === 'assign' && (
            <>
              <h3 style={{ marginBottom: '12px', color: '#1a73e8', fontSize: '16px' }}>Select Flaggers to Assign</h3>
              
              {selectedFlaggers.length > 0 ? (
                <div style={{ marginBottom: '24px' }}>
                  {selectedFlaggers.map((flagger, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={flagger.selected}
                        onChange={() => toggleFlaggerSelection(index)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '16px', fontWeight: '500' }}>
                        {flagger.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#5f6368', fontStyle: 'italic', marginBottom: '24px' }}>
                  No flaggers were assigned to the original job.
                </p>
              )}

              <h3 style={{ marginBottom: '12px', color: '#1a73e8', fontSize: '16px' }}>Select Equipment Carriers</h3>
              
              {selectedCarriers.length > 0 ? (
                <div style={{ marginBottom: '16px' }}>
                  {selectedCarriers.map((carrier, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: '#fff3e0',
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={carrier.selected}
                        onChange={() => toggleCarrierSelection(index)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '16px', fontWeight: '500' }}>
                        {carrier.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#5f6368', fontStyle: 'italic' }}>
                  No equipment carriers were assigned to the original job.
                </p>
              )}
            </>
          )}

          {step === 'dispatch' && (
            <>
              <p style={{ marginBottom: '16px', fontSize: '14px' }}>
                Select which flaggers should be marked as dispatched for the new job.
              </p>
              
              {selectedDispatched.length > 0 ? (
                <div style={{ marginBottom: '16px' }}>
                  {selectedDispatched.map((flagger, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: '#e8f5e9',
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={flagger.selected}
                        onChange={() => toggleDispatchedSelection(index)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '16px', fontWeight: '500' }}>
                        {flagger.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#5f6368', fontStyle: 'italic' }}>
                  No flaggers were dispatched in the original job (or none of the dispatched flaggers are being assigned to the new job).
                </p>
              )}

              <p style={{ fontSize: '13px', color: '#5f6368', fontStyle: 'italic' }}>
                Note: Unselected flaggers will be assigned but not dispatched (shown in red).
              </p>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          
          {step === 'edit' && (
            <button onClick={handleConfirmEdit} className="btn btn-primary">
              Continue
            </button>
          )}

          {step === 'assign' && (
            <>
              <button 
                onClick={() => handleAssignDecision(false)} 
                className="btn btn-secondary"
              >
                Don't Assign Anyone
              </button>
              <button 
                onClick={() => handleAssignDecision(true)} 
                className="btn btn-primary"
              >
                Assign Selected
              </button>
            </>
          )}

          {step === 'dispatch' && (
            <>
              <button 
                onClick={() => handleDispatchDecision(false)} 
                className="btn btn-secondary"
              >
                Don't Dispatch Anyone
              </button>
              <button 
                onClick={() => handleDispatchDecision(true)} 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Dispatch Selected'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContinueJobModal;