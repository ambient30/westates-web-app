import { useState } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function generateTimeOptions() {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const minuteStr = minute.toString().padStart(2, '0');
      times.push(`${h12}:${minuteStr} ${ampm}`);
    }
  }
  return times;
}

function ContinueJobModal({ job, onClose, onSave }) {
  const [formData, setFormData] = useState({
    initialJobDate: '',
    initialJobTime: job.initialJobTime || '',
    meetSet: job.meetSet || '',
    location: job.location || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateJobID = async () => {
    try {
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const existingJobs = jobsSnapshot.docs.map(doc => doc.data().jobID).filter(Boolean);
      
      let maxNumber = 0;
      existingJobs.forEach(jobID => {
        const match = jobID.match(/Job-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      return `Job-${maxNumber + 1}`;
    } catch (err) {
      console.error('Error generating job ID:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    if (!formData.initialJobDate) {
      throw new Error('Please select a date for the continued job');
    }

    // Check if original job has a rate
    if (!job.rateId) {
      throw new Error('Original job does not have a rate card assigned. Please edit the original job to add a rate card before continuing it.');
    }

    const newJobID = await generateJobID();

    // Convert date from YYYY-MM-DD to MM/DD/YYYY
    const [year, month, day] = formData.initialJobDate.split('-');
    const formattedDate = `${month}/${day}/${year}`;

    const continuedJobData = {
      jobID: newJobID,
      caller: job.caller || '',
      billing: job.billing || '',
      receiver: job.receiver || '',
      poWoJobNum: job.poWoJobNum || '',
      initialJobDate: formattedDate, // CHANGED: Use formatted date
      initialJobTime: formData.initialJobTime.trim(),
      meetSet: formData.meetSet.trim(),
      jobLength: job.jobLength || '',
      location: formData.location.trim(),
      amountOfFlaggers: job.amountOfFlaggers || '',
      assignedFlaggers: job.dispatchedFlaggers || '',
      dispatchedFlaggers: '',
      equipmentCarrier: '',
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
      jobSeries: job.jobSeries || job.jobID,
      rateId: job.rateId,
      rateName: job.rateName || '',
      hideFromSummary: false,
      custom: job.custom || {},
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || 'unknown',
      updatedBy: auth.currentUser?.email || 'unknown'
    };

    // Create the new continued job
    await setDoc(doc(db, 'jobs', newJobID), continuedJobData);
    
    // Hide the original job from summary
    await updateDoc(doc(db, 'jobs', job.id), {
      hideFromSummary: true,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'unknown'
    });
    
    await logAudit('CONTINUE_JOB', 'jobs', newJobID);

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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Continue Job: {job.jobID}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            {error && <div className="error-message">{error}</div>}

            <div style={{
              background: '#e8f5e9',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#2e7d32'
            }}>
              <strong>Job Series:</strong> {job.jobSeries}
              <br />
              This continued job will be part of the same job series for invoicing.
            </div>

            <div className="form-group">
  <label>Date for Continued Job *</label>
  <input
    type="date"
    name="initialJobDate"
    value={formData.initialJobDate}
    onChange={handleChange}
    required
    style={{
      width: '100%',
      padding: '8px',
      border: '1px solid #dadce0',
      borderRadius: '4px',
      fontSize: '14px'
    }}
  />
</div>

<div className="form-group">
  <label>Time</label>
  <select
    name="initialJobTime"
    value={formData.initialJobTime}
    onChange={handleChange}
    style={{
      width: '100%',
      padding: '8px',
      border: '1px solid #dadce0',
      borderRadius: '4px',
      fontSize: '14px'
    }}
  >
    <option value="">Select time...</option>
    {generateTimeOptions().map(time => (
      <option key={time} value={time}>{time}</option>
    ))}
  </select>
</div>

            <div className="form-group">
              <label>Meet/Set</label>
              <input
                name="meetSet"
                value={formData.meetSet}
                onChange={handleChange}
                placeholder="e.g., Meet at shop"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., I-5 @ Exit 100"
              />
            </div>

            <div style={{
              background: '#fff3e0',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '13px',
              color: '#e65100'
            }}>
              <strong>Note:</strong> Dispatched flaggers will be carried forward as assigned flaggers.
              All other job details (equipment, rates, notes) will be copied from the original job.
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Continue Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContinueJobModal;