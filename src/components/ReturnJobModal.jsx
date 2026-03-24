import { useState } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';
import ContinueJobModal from './ContinueJobModal';

function ReturnJobModal({ job, onClose, onSave }) {
  const [step, setStep] = useState('initial'); // 'initial', 'weekend_confirm', 'edit_full'
  const [needsChanges, setNeedsChanges] = useState({
    date: false,
    time: false,
    location: false
  });
  const [nextDate, setNextDate] = useState('');
  const [showFullEdit, setShowFullEdit] = useState(false);

  // Calculate next day
  const getNextDay = () => {
    const tomorrow = new Date(job.initialJobDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const handleInitialResponse = (field, value) => {
    setNeedsChanges(prev => ({ ...prev, [field]: value }));
  };

  const handleInitialContinue = () => {
    // Check if any changes are needed
    const anyChanges = Object.values(needsChanges).some(v => v === true);
    
    if (anyChanges) {
      // User wants to change something - show full edit modal
      setShowFullEdit(true);
    } else {
      // No changes needed - proceed with automatic return
      const nextDay = getNextDay();
      setNextDate(formatDate(nextDay));
      
      if (isWeekend(nextDay)) {
        setStep('weekend_confirm');
      } else {
        // Weekday - create job immediately
        createReturnJob(formatDate(nextDay));
      }
    }
  };

  const handleWeekendResponse = (proceed) => {
    if (proceed) {
      // User confirmed weekend return
      createReturnJob(nextDate);
    } else {
      // User wants to pick a different date
      setShowFullEdit(true);
    }
  };

  const createReturnJob = async (dateStr) => {
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

      // Create clean job data - remove Firestore-specific fields
      const { id, createdAt, updatedAt, createdBy, updatedBy, ...cleanJobData } = job;

      // Create new job with same data but new date
      const newJobData = {
        ...cleanJobData,
        jobID: newJobID,
        initialJobDate: dateStr,
        hideFromSummary: false,
        dispatchedFlaggers: '', // Reset dispatch status
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown',
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      };

      console.log('Creating return job:', newJobData);

      await addDoc(collection(db, 'jobs'), newJobData);
      await logAudit('RETURN_JOB', 'jobs', newJobID, { 
        originalJobID: job.jobID,
        returnDate: dateStr
      });

      // Hide original job from summary
      await updateDoc(doc(db, 'jobs', job.id), {
        hideFromSummary: true,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });
      await logAudit('HIDE_JOB', 'jobs', job.jobID, { reason: 'Job returned to next day' });

      onSave();
      onClose();
    } catch (err) {
      console.error('Error creating return job:', err);
      alert('Error creating return job: ' + err.message);
    }
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // If user wants full edit, show the ContinueJobModal instead
  if (showFullEdit) {
    return (
      <ContinueJobModal
        job={job}
        onClose={onClose}
        onSave={onSave}
      />
    );
  }

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>
            {step === 'initial' && 'Return Job to Next Day'}
            {step === 'weekend_confirm' && 'Weekend Return Confirmation'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {step === 'initial' && (
            <>
              <p style={{ marginBottom: '20px', fontSize: '14px', color: '#5f6368' }}>
                This will create a return job for the next day with all the same details. Do you need to change any of the following?
              </p>

              <div style={{ 
                background: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '4px',
                marginBottom: '20px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>
                  {job.jobID}
                </div>
                <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '4px' }}>
                  <strong>Date:</strong> {job.initialJobDate} → {formatDate(getNextDay())}
                </div>
                <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '4px' }}>
                  <strong>Time:</strong> {job.initialJobTime || 'Not set'}
                </div>
                <div style={{ fontSize: '14px', color: '#5f6368' }}>
                  <strong>Location:</strong> {job.location || 'Not set'}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px',
                  background: needsChanges.date ? '#e3f2fd' : 'white',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <span style={{ fontWeight: '500' }}>Change Date?</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleInitialResponse('date', true)}
                      className="btn btn-small"
                      style={{ 
                        background: needsChanges.date ? '#1a73e8' : 'white',
                        color: needsChanges.date ? 'white' : '#5f6368',
                        border: '1px solid #dadce0'
                      }}
                    >
                      Yes
                    </button>
                    <button 
                      onClick={() => handleInitialResponse('date', false)}
                      className="btn btn-small"
                      style={{ 
                        background: !needsChanges.date && needsChanges.date !== null ? '#1a73e8' : 'white',
                        color: !needsChanges.date && needsChanges.date !== null ? 'white' : '#5f6368',
                        border: '1px solid #dadce0'
                      }}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px',
                  background: needsChanges.time ? '#e3f2fd' : 'white',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <span style={{ fontWeight: '500' }}>Change Time?</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleInitialResponse('time', true)}
                      className="btn btn-small"
                      style={{ 
                        background: needsChanges.time ? '#1a73e8' : 'white',
                        color: needsChanges.time ? 'white' : '#5f6368',
                        border: '1px solid #dadce0'
                      }}
                    >
                      Yes
                    </button>
                    <button 
                      onClick={() => handleInitialResponse('time', false)}
                      className="btn btn-small"
                      style={{ 
                        background: !needsChanges.time && needsChanges.time !== null ? '#1a73e8' : 'white',
                        color: !needsChanges.time && needsChanges.time !== null ? 'white' : '#5f6368',
                        border: '1px solid #dadce0'
                      }}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px',
                  background: needsChanges.location ? '#e3f2fd' : 'white',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0'
                }}>
                  <span style={{ fontWeight: '500' }}>Change Location?</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleInitialResponse('location', true)}
                      className="btn btn-small"
                      style={{ 
                        background: needsChanges.location ? '#1a73e8' : 'white',
                        color: needsChanges.location ? 'white' : '#5f6368',
                        border: '1px solid #dadce0'
                      }}
                    >
                      Yes
                    </button>
                    <button 
                      onClick={() => handleInitialResponse('location', false)}
                      className="btn btn-small"
                      style={{ 
                        background: !needsChanges.location && needsChanges.location !== null ? '#1a73e8' : 'white',
                        color: !needsChanges.location && needsChanges.location !== null ? 'white' : '#5f6368',
                        border: '1px solid #dadce0'
                      }}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#5f6368', fontStyle: 'italic' }}>
                Note: Dispatch status will be reset. Assigned flaggers and all other details will remain the same.
              </p>
            </>
          )}

          {step === 'weekend_confirm' && (
            <>
              <div style={{
                background: '#fff3e0',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '2px solid #ff9800'
              }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#e65100', marginBottom: '8px' }}>
                  ⚠️ Weekend Return
                </div>
                <p style={{ fontSize: '14px', color: '#5f6368', marginBottom: '8px' }}>
                  The next day falls on a <strong>{getNextDay().toLocaleDateString('en-US', { weekday: 'long' })}</strong>.
                </p>
                <p style={{ fontSize: '14px', color: '#5f6368' }}>
                  Return Date: <strong>{nextDate}</strong>
                </p>
              </div>

              <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                Are you sure you want to schedule a return on the weekend?
              </p>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          
          {step === 'initial' && (
            <button onClick={handleInitialContinue} className="btn btn-primary">
              Create Return Job
            </button>
          )}

          {step === 'weekend_confirm' && (
            <>
              <button 
                onClick={() => handleWeekendResponse(false)} 
                className="btn btn-secondary"
              >
                No, Choose Different Date
              </button>
              <button 
                onClick={() => handleWeekendResponse(true)} 
                className="btn btn-primary"
                style={{ background: '#ff9800' }}
              >
                Yes, Return on Weekend
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReturnJobModal;