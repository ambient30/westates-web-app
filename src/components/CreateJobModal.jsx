import { useState } from 'react';
import { collection, addDoc } from '../utils/firestoreTracker';
import { db, auth } from '../firebase';
import { hasPermission } from '../utils/permissions';
import { logAudit } from '../utils/auditLog';
import { showConfirmDialog } from './ConfirmationDialog';

function CreateJobModal({ permissions, onClose, onSave }) {
  const [formData, setFormData] = useState({
    // Client Information
    jobID: '',
    jobSeries: '',
    caller: '',
    billing: '',
    receiver: '',
    poWoJobNum: '',
    
    // Job Details
    initialJobDate: '',
    initialJobTime: '',
    meetSet: '',
    jobLength: '',
    location: '',
    amountOfFlaggers: '',
    hideFromSummary: false,
    
    // Flaggers
    assignedFlaggers: '',
    dispatchedFlaggers: '',
    
    // Equipment - all text to handle flexible formats
    signSets: '',
    indvSigns: '',
    cones: '',
    type2: '',
    type3: '',
    truck: '',
    balloonLights: '',
    portableLights: '',
    
    // Equipment Carrier
    equipmentCarrier: '',
    equipmentCarrierSigns: '',
    equipmentCarrierExtraSigns: '',
    equipmentCarrierCones: '',
    
    // Travel & Billing
    travelTime: '',
    travelMiles: '',
    
    // Notes
    otherNotes: '',
    
    // Custom parameters
    custom: {},
  });

  const canCreate = hasPermission(permissions, 'jobs', 'create');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!canCreate) {
      alert('You do not have permission to create jobs');
      return;
    }

    // Validate required fields
    if (!formData.jobID) {
      alert('Job ID is required');
      return;
    }

    // Create empty object to compare against
    const emptyJob = {
      jobID: '',
      jobSeries: '',
      caller: '',
      billing: '',
      receiver: '',
      poWoJobNum: '',
      initialJobDate: '',
      initialJobTime: '',
      meetSet: '',
      jobLength: '',
      location: '',
      amountOfFlaggers: '',
      hideFromSummary: false,
      assignedFlaggers: '',
      dispatchedFlaggers: '',
      signSets: '',
      indvSigns: '',
      cones: '',
      type2: '',
      type3: '',
      truck: '',
      balloonLights: '',
      portableLights: '',
      equipmentCarrier: '',
      equipmentCarrierSigns: '',
      equipmentCarrierExtraSigns: '',
      equipmentCarrierCones: '',
      travelTime: '',
      travelMiles: '',
      otherNotes: '',
      custom: {},
    };

    // Show confirmation dialog
    const confirmed = await showConfirmDialog(emptyJob, formData, "Confirm New Job");
    
    if (!confirmed) {
      return; // User cancelled or no fields filled
    }

    // Proceed with creation
    try {
      const user = auth.currentUser;
      
      await addDoc(collection(db, 'jobs'), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user?.email || 'Unknown',
        updatedBy: user?.email || 'Unknown'
      });

      // Log the creation
      await logAudit('CREATE_JOB', 'jobs', null, {
        jobID: formData.jobID
      });

      alert('Job created successfully!');
      onSave();
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job. Please try again.');
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
          <h2>Create New Job</h2>
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
                value={formData.jobID}
                onChange={(e) => handleChange('jobID', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Job Series</label>
              <input
                type="text"
                value={formData.jobSeries}
                onChange={(e) => handleChange('jobSeries', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Caller</label>
              <input
                type="text"
                value={formData.caller}
                onChange={(e) => handleChange('caller', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Billing</label>
              <input
                type="text"
                value={formData.billing}
                onChange={(e) => handleChange('billing', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Receiver</label>
              <input
                type="text"
                value={formData.receiver}
                onChange={(e) => handleChange('receiver', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>PO/WO/Job #</label>
              <input
                type="text"
                value={formData.poWoJobNum}
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
                type="date"
                value={formData.initialJobDate}
                onChange={(e) => handleChange('initialJobDate', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={formData.initialJobTime}
                onChange={(e) => handleChange('initialJobTime', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Meet/Set</label>
              <input
                type="text"
                value={formData.meetSet}
                onChange={(e) => handleChange('meetSet', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Job Length</label>
              <input
                type="text"
                value={formData.jobLength}
                onChange={(e) => handleChange('jobLength', e.target.value)}
                placeholder="e.g., 8 hours"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Amount of Flaggers</label>
              <input
                type="text"
                value={formData.amountOfFlaggers}
                onChange={(e) => handleChange('amountOfFlaggers', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>
              <input
                type="checkbox"
                checked={formData.hideFromSummary}
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
                value={formData.assignedFlaggers}
                onChange={(e) => handleChange('assignedFlaggers', e.target.value)}
                placeholder="Comma-separated names"
              />
            </div>

            <div className="form-group">
              <label>Dispatched Flaggers</label>
              <input
                type="text"
                value={formData.dispatchedFlaggers}
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
                value={formData.signSets}
                onChange={(e) => handleChange('signSets', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Individual Signs</label>
              <input
                type="text"
                value={formData.indvSigns}
                onChange={(e) => handleChange('indvSigns', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Cones</label>
              <input
                type="text"
                value={formData.cones}
                onChange={(e) => handleChange('cones', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Type 2</label>
              <input
                type="text"
                value={formData.type2}
                onChange={(e) => handleChange('type2', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Type 3</label>
              <input
                type="text"
                value={formData.type3}
                onChange={(e) => handleChange('type3', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Truck</label>
              <input
                type="text"
                value={formData.truck}
                onChange={(e) => handleChange('truck', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Balloon Lights</label>
              <input
                type="text"
                value={formData.balloonLights}
                onChange={(e) => handleChange('balloonLights', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Portable Lights</label>
              <input
                type="text"
                value={formData.portableLights}
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
                value={formData.equipmentCarrier}
                onChange={(e) => handleChange('equipmentCarrier', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Signs</label>
              <input
                type="text"
                value={formData.equipmentCarrierSigns}
                onChange={(e) => handleChange('equipmentCarrierSigns', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Extra Signs</label>
              <input
                type="text"
                value={formData.equipmentCarrierExtraSigns}
                onChange={(e) => handleChange('equipmentCarrierExtraSigns', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Cones</label>
              <input
                type="text"
                value={formData.equipmentCarrierCones}
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
                value={formData.travelTime}
                onChange={(e) => handleChange('travelTime', e.target.value)}
                placeholder="e.g., 1.5"
              />
            </div>

            <div className="form-group">
              <label>Travel Miles</label>
              <input
                type="text"
                value={formData.travelMiles}
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
              value={formData.otherNotes}
              onChange={(e) => handleChange('otherNotes', e.target.value)}
              rows="4"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          {canCreate && (
            <button onClick={handleCreate} className="btn btn-primary">
              Create Job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateJobModal;
