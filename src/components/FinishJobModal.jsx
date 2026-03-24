import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';
import { useState } from 'react';

function FinishJobModal({ job, onClose, onSave }) {
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        hideFromSummary: true,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });

      await logAudit('FINISH_JOB', 'jobs', job.jobID, { 
        reason: 'Job marked as finished by user' 
      });

      onSave();
      onClose();
    } catch (err) {
      alert('Error finishing job: ' + err.message);
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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Finish Job</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <p style={{ fontSize: '16px', marginBottom: '16px' }}>
            Are you sure you want to finish this job?
          </p>

          <div style={{ 
            background: '#f8f9fa', 
            padding: '16px', 
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '18px' }}>
              {job.jobID}
            </div>
            <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '4px' }}>
              <strong>{job.caller}</strong> • {job.location}
            </div>
            <div style={{ fontSize: '14px', color: '#5f6368' }}>
              {job.initialJobDate} • {job.initialJobTime}
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#5f6368' }}>
            This will hide the job from the summary view. You can still access it in Firestore if needed.
          </p>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            No, Keep Job
          </button>
          <button 
            onClick={handleFinish} 
            className="btn btn-primary"
            style={{ background: '#d32f2f' }}
            disabled={loading}
          >
            {loading ? 'Finishing...' : 'Yes, Finish Job'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinishJobModal;