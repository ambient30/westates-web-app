import { useState } from 'react';
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
    custom: job.custom || {}
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('edit');
  const [keepAssignments, setKeepAssignments] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmEdit = () => {
    if (!formData.initialJobDate) {
      setError('Please enter a job date');
      return;
    }
    setError('');
    setStep('assign');
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

      // Create new job
      const newJobData = {
        ...formData,
        jobID: newJobID,
        jobSeries: job.jobSeries || '',
        assignedFlaggers: keepAssign ? formData.assignedFlaggers : '',
        dispatchedFlaggers: keepDispatch ? (job.dispatchedFlaggers || '') : '',
        equipmentCarrier: keepAssign ? formData.equipmentCarrier : '',
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown',
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      };

      console.log('Creating new job with dispatched:', newJobData.dispatchedFlaggers);

      await addDoc(collection(db, 'jobs'), newJobData);
      await logAudit('CONTINUE_JOB', 'jobs', newJobID, { 
        originalJobID: job.jobID,
        newDate: formData.initialJobDate,
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
      setStep('dispatch');
    }
  };

  const handleDispatchDecision = (keep) => {
    createNewJob(true, keep);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>
            {step === 'edit' && 'Continue Job to Next Day'}
            {step === 'assign' && 'Keep Assigned Flaggers?'}
            {step === 'dispatch' && 'Keep Dispatched Status?'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {error && <div className="error-message">{error}</div>}

          {step === 'edit' && (
            <>
              <p style={{ marginBottom: '16px', color: '#5f6368', fontSize: '14px' }}>
                Review and edit the job details for the next day. Original job will be hidden from summary.
              </p>

              <div className="form-group">
                <label>Job Date *</label>
                <input
                  type="text"
                  name="initialJobDate"
                  value={formData.initialJobDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Time</label>
                <input
                  type="text"
                  name="initialJobTime"
                  value={formData.initialJobTime}
                  onChange={handleChange}
                  placeholder="e.g., 7:00 AM"
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
                <label>Location</label>
                <input
                  type="text"
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

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="otherNotes"
                  value={formData.otherNotes}
                  onChange={handleChange}
                  rows="3"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                />
              </div>
            </>
          )}

          {step === 'assign' && (
            <>
              <p style={{ marginBottom: '16px', fontSize: '14px' }}>
                Do you want to keep the same assigned flaggers for the new job?
              </p>
              
              {formData.assignedFlaggers && (
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '12px', 
                  borderRadius: '4px',
                  marginBottom: '16px'
                }}>
                  <strong>Currently Assigned:</strong><br />
                  {formData.assignedFlaggers}
                </div>
              )}

              {formData.equipmentCarrier && (
                <div style={{ 
                  background: '#fff3e0', 
                  padding: '12px', 
                  borderRadius: '4px',
                  marginBottom: '16px'
                }}>
                  <strong>Equipment Carriers:</strong><br />
                  {formData.equipmentCarrier}
                </div>
              )}
            </>
          )}

          {step === 'dispatch' && (
            <>
              <p style={{ marginBottom: '16px', fontSize: '14px' }}>
                Do you want to mark the same flaggers as dispatched for the new job?
              </p>
              
              {job.dispatchedFlaggers && (
                <div style={{ 
                  background: '#e8f5e9', 
                  padding: '12px', 
                  borderRadius: '4px',
                  marginBottom: '16px'
                }}>
                  <strong>Currently Dispatched:</strong><br />
                  {job.dispatchedFlaggers}
                </div>
              )}

              <p style={{ fontSize: '13px', color: '#5f6368', fontStyle: 'italic' }}>
                Note: If you select "No", flaggers will be assigned but not dispatched (shown in red).
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
                No, Clear Assignments
              </button>
              <button 
                onClick={() => handleAssignDecision(true)} 
                className="btn btn-primary"
              >
                Yes, Keep Assignments
              </button>
            </>
          )}

          {step === 'dispatch' && (
            <>
              <button 
                onClick={() => handleDispatchDecision(false)} 
                className="btn btn-secondary"
              >
                No, Reset Dispatch
              </button>
              <button 
                onClick={() => handleDispatchDecision(true)} 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Yes, Keep Dispatched'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContinueJobModal;