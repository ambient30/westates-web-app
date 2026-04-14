import { useState } from 'react';
import { doc, updateDoc } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { logAudit } from '../utils/auditLog';
import { showConfirmDialog } from './ConfirmationDialog';

function EditJobModal({ job, permissions, onClose, onSave }) {
  // Store original job for comparison
  const originalJob = { ...job };

  // Initialize formData with ALL fields from job (automatically includes rateId, attachedFiles, etc.)
  const [formData, setFormData] = useState({ ...job });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomChange = (customField, value) => {
    setFormData(prev => ({
      ...prev,
      custom: {
        ...prev.custom,
        [customField]: value
      }
    }));
  };

  const handleSave = async () => {
    // Show confirmation dialog with dynamic comparison
    const confirmed = await showConfirmDialog(originalJob, formData, "Confirm Job Changes");
    
    if (!confirmed) {
      return; // User cancelled or no changes detected
    }

    // Proceed with save
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        ...formData,
        updatedAt: new Date()
      });

      // Log the update
      await logAudit('UPDATE_JOB', 'jobs', job.id, {
        jobID: formData.jobID
      });

      alert('Job updated successfully!');
      onSave();
    } catch (error) {
      console.error('Error updating job:', error);
      alert('Failed to update job. Please try again.');
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

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Client Information */}
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', marginTop: '16px', color: '#1a73e8' }}>
            Client Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label>Job ID *</label>
              <input
                type="text"
                value={formData.jobID || ''}
                onChange={(e) => handleChange('jobID', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Job Series</label>
              <input
                type="text"
                value={formData.jobSeries || ''}
                onChange={(e) => handleChange('jobSeries', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Caller</label>
              <input
                type="text"
                value={formData.caller || ''}
                onChange={(e) => handleChange('caller', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Billing</label>
              <input
                type="text"
                value={formData.billing || ''}
                onChange={(e) => handleChange('billing', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Receiver</label>
              <input
                type="text"
                value={formData.receiver || ''}
                onChange={(e) => handleChange('receiver', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>PO/WO/Job #</label>
              <input
                type="text"
                value={formData.poWoJobNum || ''}
                onChange={(e) => handleChange('poWoJobNum', e.target.value)}
              />
            </div>
          </div>

          {/* Job Details */}
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', marginTop: '16px', color: '#1a73e8' }}>
            Job Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label>Date</label>
              <input
                type="text"
                value={formData.initialJobDate || ''}
                onChange={(e) => handleChange('initialJobDate', e.target.value)}
                placeholder="MM/DD/YYYY"
              />
            </div>

            <div className="form-group">
              <label>Time</label>
              <input
                type="text"
                value={formData.initialJobTime || ''}
                onChange={(e) => handleChange('initialJobTime', e.target.value)}
                placeholder="8:00 AM"
              />
            </div>

            <div className="form-group">
              <label>Meet/Set</label>
              <input
                type="text"
                value={formData.meetSet || ''}
                onChange={(e) => handleChange('meetSet', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Job Length</label>
              <input
                type="text"
                value={formData.jobLength || ''}
                onChange={(e) => handleChange('jobLength', e.target.value)}
                placeholder="e.g., 8 hours"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Amount of Flaggers</label>
              <input
                type="text"
                value={formData.amountOfFlaggers || ''}
                onChange={(e) => handleChange('amountOfFlaggers', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>
              <input
                type="checkbox"
                checked={formData.hideFromSummary || false}
                onChange={(e) => handleChange('hideFromSummary', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Hide from Summary
            </label>
          </div>

          {/* Flaggers */}
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', marginTop: '16px', color: '#1a73e8' }}>
            Flaggers
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label>Assigned Flaggers</label>
              <input
                type="text"
                value={formData.assignedFlaggers || ''}
                onChange={(e) => handleChange('assignedFlaggers', e.target.value)}
                placeholder="Comma-separated names"
              />
            </div>

            <div className="form-group">
              <label>Dispatched Flaggers</label>
              <input
                type="text"
                value={formData.dispatchedFlaggers || ''}
                onChange={(e) => handleChange('dispatchedFlaggers', e.target.value)}
                placeholder="Comma-separated names"
              />
            </div>
          </div>

          {/* Equipment */}
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', marginTop: '16px', color: '#1a73e8' }}>
            Equipment
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label>Sign Sets</label>
              <input
                type="text"
                value={formData.signSets || ''}
                onChange={(e) => handleChange('signSets', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Individual Signs</label>
              <input
                type="text"
                value={formData.indvSigns || ''}
                onChange={(e) => handleChange('indvSigns', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Cones</label>
              <input
                type="text"
                value={formData.cones || ''}
                onChange={(e) => handleChange('cones', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Type 2</label>
              <input
                type="text"
                value={formData.type2 || ''}
                onChange={(e) => handleChange('type2', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Type 3</label>
              <input
                type="text"
                value={formData.type3 || ''}
                onChange={(e) => handleChange('type3', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Truck</label>
              <input
                type="text"
                value={formData.truck || ''}
                onChange={(e) => handleChange('truck', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Balloon Lights</label>
              <input
                type="text"
                value={formData.balloonLights || ''}
                onChange={(e) => handleChange('balloonLights', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Portable Lights</label>
              <input
                type="text"
                value={formData.portableLights || ''}
                onChange={(e) => handleChange('portableLights', e.target.value)}
              />
            </div>
          </div>

          {/* Equipment Carrier */}
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', marginTop: '16px', color: '#1a73e8' }}>
            Equipment Carrier
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label>Equipment Carrier</label>
              <input
                type="text"
                value={formData.equipmentCarrier || ''}
                onChange={(e) => handleChange('equipmentCarrier', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Signs</label>
              <input
                type="text"
                value={formData.equipmentCarrierSigns || ''}
                onChange={(e) => handleChange('equipmentCarrierSigns', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Extra Signs</label>
              <input
                type="text"
                value={formData.equipmentCarrierExtraSigns || ''}
                onChange={(e) => handleChange('equipmentCarrierExtraSigns', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Cones</label>
              <input
                type="text"
                value={formData.equipmentCarrierCones || ''}
                onChange={(e) => handleChange('equipmentCarrierCones', e.target.value)}
              />
            </div>
          </div>

          {/* Travel & Billing */}
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', marginTop: '16px', color: '#1a73e8' }}>
            Travel & Billing
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label>Travel Time (hrs)</label>
              <input
                type="text"
                value={formData.travelTime || ''}
                onChange={(e) => handleChange('travelTime', e.target.value)}
                placeholder="e.g., 1.5"
              />
            </div>

            <div className="form-group">
              <label>Travel Miles</label>
              <input
                type="text"
                value={formData.travelMiles || ''}
                onChange={(e) => handleChange('travelMiles', e.target.value)}
                placeholder="e.g., 50"
              />
            </div>
          </div>

          {/* Notes */}
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', marginTop: '16px', color: '#1a73e8' }}>
            Notes
          </h3>

          <div className="form-group">
            <label>Other Notes</label>
            <textarea
              value={formData.otherNotes || ''}
              onChange={(e) => handleChange('otherNotes', e.target.value)}
              rows="4"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Custom Parameters (if any) */}
          {Object.keys(formData.custom || {}).length > 0 && (
            <>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', marginTop: '16px', color: '#e65100' }}>
                Custom Parameters ⭐
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {Object.entries(formData.custom).map(([key, value]) => (
                  <div key={key} className="form-group">
                    <label style={{ color: '#e65100' }}>{key}</label>
                    <input
                      type="text"
                      value={value || ''}
                      onChange={(e) => handleCustomChange(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditJobModal;
