import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function DispatchFlaggersModal({ job, onClose, onSave }) {
  const assignedFlaggers = job.assignedFlaggers 
    ? job.assignedFlaggers.split(',').map(name => name.trim()).filter(Boolean)
    : [];
  
  const dispatchedFlaggers = job.dispatchedFlaggers 
    ? job.dispatchedFlaggers.split(',').map(name => name.trim()).filter(Boolean)
    : [];

  const [selectedFlaggers, setSelectedFlaggers] = useState(dispatchedFlaggers);
  const [saving, setSaving] = useState(false);

  const toggleFlagger = (flaggerName) => {
    if (selectedFlaggers.includes(flaggerName)) {
      setSelectedFlaggers(prev => prev.filter(name => name !== flaggerName));
    } else {
      setSelectedFlaggers(prev => [...prev, flaggerName]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dispatchedNames = selectedFlaggers.join(', ');
      
      await updateDoc(doc(db, 'jobs', job.id), {
        dispatchedFlaggers: dispatchedNames,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });

      await logAudit('DISPATCH_FLAGGERS', 'jobs', job.jobID, { 
        dispatchedFlaggers: dispatchedNames 
      });

      onSave();
      onClose();
    } catch (err) {
      alert('Error dispatching flaggers: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDispatchAll = () => {
    setSelectedFlaggers(assignedFlaggers);
  };

  const handleClearAll = () => {
    setSelectedFlaggers([]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Dispatch Flaggers: {job.jobID}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* Job Info */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            <strong>{job.caller}</strong> • {job.location}<br />
            {job.initialJobDate} • {job.initialJobTime}
          </div>

          <p style={{ fontSize: '14px', color: '#5f6368', marginBottom: '16px' }}>
            Select flaggers who have been dispatched/confirmed for this job. Dispatched flaggers will show in <strong>black</strong>, undispatched in <strong style={{ color: '#d32f2f' }}>red</strong>.
          </p>

          {assignedFlaggers.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#5f6368',
              background: '#f8f9fa',
              borderRadius: '4px'
            }}>
              No flaggers assigned to this job
            </div>
          ) : (
            <>
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={handleDispatchAll}
                  className="btn btn-secondary btn-small"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className="btn btn-secondary btn-small"
                >
                  Clear All
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {assignedFlaggers.map((flagger, idx) => {
                  const isDispatched = selectedFlaggers.includes(flagger);
                  return (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        background: isDispatched ? '#e8f5e9' : '#ffebee',
                        border: `2px solid ${isDispatched ? '#43a047' : '#d32f2f'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isDispatched}
                        onChange={() => toggleFlagger(flagger)}
                        style={{ 
                          marginRight: '12px',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: '500',
                          color: isDispatched ? '#43a047' : '#d32f2f'
                        }}>
                          {flagger}
                        </div>
                        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '2px' }}>
                          {isDispatched ? '✅ Dispatched' : '⏳ Not dispatched'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : `Dispatch ${selectedFlaggers.length} Flagger${selectedFlaggers.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DispatchFlaggersModal;