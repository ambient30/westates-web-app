import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from '../utils/firestoreTracker';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function DispatchFlaggersModal({ job, onClose, onSave }) {
  const assignedFlaggers = (job.assignedFlaggers || '').split(',').map(f => f.trim()).filter(Boolean);
  
  const [selectedFlaggers, setSelectedFlaggers] = useState(
    assignedFlaggers.reduce((acc, flagger) => {
      acc[flagger] = true;
      return acc;
    }, {})
  );

  const [equipmentCarrier, setEquipmentCarrier] = useState(job.equipmentCarrier || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allJobs, setAllJobs] = useState([]);

  // Load all jobs to check for conflicts
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const jobsSnapshot = await getDocs(collection(db, 'jobs'));
        const jobsData = jobsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllJobs(jobsData);
      } catch (err) {
        console.error('Error loading jobs:', err);
      }
    };
    loadJobs();
  }, []);

  const handleFlaggerToggle = (flagger) => {
    // Check if toggling ON
    if (!selectedFlaggers[flagger]) {
      // Check for conflicts on same date
      const conflictingJobs = allJobs.filter(j => 
        j.initialJobDate === job.initialJobDate && 
        j.id !== job.id &&
        (j.dispatchedFlaggers || '').includes(flagger)
      );

      if (conflictingJobs.length > 0) {
        const jobIDs = conflictingJobs.map(j => j.jobID).join(', ');
        const confirmDispatch = window.confirm(
          `${flagger} is already dispatched to job(s) ${jobIDs} on ${job.initialJobDate}.\n\n` +
          `Do you want to dispatch them to this job as well?`
        );
        
        if (!confirmDispatch) {
          return; // Don't toggle
        }
      }
    }

    // Toggle the selection
    setSelectedFlaggers(prev => ({
      ...prev,
      [flagger]: !prev[flagger]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const dispatched = Object.entries(selectedFlaggers)
        .filter(([_, isSelected]) => isSelected)
        .map(([flagger]) => flagger)
        .join(', ');

      if (!dispatched) {
        throw new Error('Please select at least one flagger to dispatch');
      }

      await updateDoc(doc(db, 'jobs', job.id), {
        dispatchedFlaggers: dispatched,
        equipmentCarrier: equipmentCarrier.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });

      await logAudit('DISPATCH_FLAGGERS', 'jobs', job.jobID);

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
          <h2>Dispatch Flaggers: {job.jobID}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Select Flaggers to Dispatch</label>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '4px'
              }}>
                {assignedFlaggers.length === 0 ? (
                  <p style={{ color: '#5f6368', margin: 0 }}>No flaggers assigned to this job</p>
                ) : (
                  assignedFlaggers.map(flagger => (
                    <label key={flagger} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '8px',
                      background: selectedFlaggers[flagger] ? '#e8f0fe' : 'white',
                      borderRadius: '4px',
                      border: '1px solid #dadce0'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedFlaggers[flagger] || false}
                        onChange={() => handleFlaggerToggle(flagger)}
                      />
                      <span style={{ fontWeight: selectedFlaggers[flagger] ? '600' : '400' }}>
                        {flagger}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Equipment Carrier (Optional)</label>
              <input
                type="text"
                value={equipmentCarrier}
                onChange={(e) => setEquipmentCarrier(e.target.value)}
                placeholder="Enter flagger name carrying equipment"
              />
              <small style={{ color: '#5f6368', fontSize: '12px' }}>
                Which flagger is carrying equipment for this job? Sign stipends will be tracked during time entry.
              </small>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Dispatching...' : 'Dispatch Flaggers'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DispatchFlaggersModal;