import { useState } from 'react';
import { hasPermission } from '../utils/permissions';
import EditJobModal from './EditJobModal';
import AssignEmployeesModal from './AssignEmployeesModal';

function JobDetailsModal({ job, permissions, onClose, onUpdate }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const canUpdate = hasPermission(permissions, 'jobs', 'update');
  const canDelete = hasPermission(permissions, 'jobs', 'delete');

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    if (typeof dateValue === 'string') return dateValue;
    if (dateValue.toDate) return dateValue.toDate().toLocaleDateString();
    return 'N/A';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  // Get custom parameters
  const customParams = job.custom || {};
  const hasCustomParams = Object.keys(customParams).length > 0;

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
          <div className="modal-header">
            <h2>Job Details: {job.jobID}</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            
            {/* Client Information */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Client Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <InfoField label="Job ID" value={job.jobID} />
              <InfoField label="Job Series" value={job.jobSeries} />
              <InfoField label="Caller" value={job.caller} />
              <InfoField label="Billing" value={job.billing} />
              <InfoField label="Receiver" value={job.receiver} />
              <InfoField label="PO/WO/Job #" value={job.poWoJobNum} />
            </div>

            {/* Job Details */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Job Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <InfoField label="Date" value={job.initialJobDate} />
              <InfoField label="Time" value={job.initialJobTime} />
              <InfoField label="Meet/Set" value={job.meetSet} />
              <InfoField label="Job Length" value={job.jobLength} />
              <InfoField label="Location" value={job.location} />
              <InfoField label="Amount of Flaggers" value={job.amountOfFlaggers} />
              <InfoField label="Hide from Summary" value={job.hideFromSummary ? 'Yes' : 'No'} />
            </div>

            {/* Flaggers */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Flaggers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <InfoField label="Assigned Flaggers" value={job.assignedFlaggers} />
              <InfoField label="Dispatched Flaggers" value={job.dispatchedFlaggers} />
            </div>

            {/* Equipment */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Equipment</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <InfoField label="Sign Sets" value={job.signSets} />
              <InfoField label="Individual Signs" value={job.indvSigns} />
              <InfoField label="Cones" value={job.cones} />
              <InfoField label="Type 2" value={job.type2} />
              <InfoField label="Type 3" value={job.type3} />
              <InfoField label="Truck" value={job.truck} />
              <InfoField label="Balloon Lights" value={job.balloonLights} />
              <InfoField label="Portable Lights" value={job.portableLights} />
            </div>

            {/* Equipment Carrier */}
            {job.equipmentCarrier && (
              <>
                <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Equipment Carrier</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <InfoField label="Carrier" value={job.equipmentCarrier} />
                  <InfoField label="Signs" value={job.equipmentCarrierSigns} />
                  <InfoField label="Extra Signs" value={job.equipmentCarrierExtraSigns} />
                  <InfoField label="Cones" value={job.equipmentCarrierCones} />
                </div>
              </>
            )}

            {/* Travel & Billing */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Travel & Billing</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <InfoField label="Travel Time (hrs)" value={job.travelTime} />
              <InfoField label="Travel Miles" value={job.travelMiles} />
            </div>

            {/* Notes */}
            {job.otherNotes && (
              <>
                <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Notes</h3>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '12px', 
                  borderRadius: '4px',
                  marginBottom: '24px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {job.otherNotes}
                </div>
              </>
            )}

            {/* Custom Parameters */}
            {hasCustomParams && (
              <>
                <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Custom Parameters</h3>
                <div style={{ 
                  background: '#fff3e0', 
                  padding: '16px', 
                  borderRadius: '4px',
                  marginBottom: '24px',
                  border: '1px solid #ffb74d'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    {Object.entries(customParams).map(([key, value]) => (
                      <InfoField 
                        key={key} 
                        label={key} 
                        value={formatValue(value)}
                        isCustom={true}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>System Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <InfoField label="Created At" value={formatDate(job.createdAt)} />
              <InfoField label="Updated At" value={formatDate(job.updatedAt)} />
              <InfoField label="Created By" value={job.createdBy} />
              <InfoField label="Updated By" value={job.updatedBy} />
            </div>
          </div>

          <div className="modal-actions">
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
            {canUpdate && (
              <>
                <button onClick={() => setShowAssignModal(true)} className="btn btn-secondary">
                  Assign Flaggers
                </button>
                <button onClick={() => setShowEditModal(true)} className="btn btn-primary">
                  Edit
                </button>
              </>
            )}
            {canDelete && (
              <button className="btn btn-secondary" style={{ color: '#c5221f' }}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditJobModal
          job={job}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            onUpdate();
            onClose();
          }}
        />
      )}

      {showAssignModal && (
        <AssignEmployeesModal
          job={job}
          onClose={() => setShowAssignModal(false)}
          onSave={() => {
            setShowAssignModal(false);
            onUpdate();
            onClose();
          }}
        />
      )}
    </>
  );
}

function InfoField({ label, value, isCustom = false }) {
  return (
    <div>
      <div style={{ 
        fontSize: '12px', 
        color: isCustom ? '#e65100' : '#5f6368', 
        marginBottom: '4px',
        fontWeight: isCustom ? '600' : '400'
      }}>
        {label} {isCustom && '⭐'}
      </div>
      <div style={{ fontSize: '14px', color: '#202124', fontWeight: '500' }}>
        {value || 'N/A'}
      </div>
    </div>
  );
}

export default JobDetailsModal;