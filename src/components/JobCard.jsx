import { useState } from 'react';
import { hasPermission } from '../utils/permissions';
import EditJobModal from './EditJobModal';
import AssignEmployeesModal from './AssignEmployeesModal';

function JobCard({ job, permissions, onUpdate }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const canUpdate = hasPermission(permissions, 'jobs', 'update');
  const canDelete = hasPermission(permissions, 'jobs', 'delete');

  return (
    <>
      <div className="job-card">
        <div className="job-header">
          <span className="job-id">{job.jobID}</span>
          {job.jobSeries && (
            <span className="job-series">{job.jobSeries}</span>
          )}
        </div>

        <div className="job-info">
          <div className="job-info-item">
            <div className="job-info-label">Client</div>
            <div className="job-info-value">{job.caller || 'N/A'}</div>
          </div>
          <div className="job-info-item">
            <div className="job-info-label">Billing</div>
            <div className="job-info-value">{job.billing || 'N/A'}</div>
          </div>
          <div className="job-info-item">
            <div className="job-info-label">Location</div>
            <div className="job-info-value">{job.location || 'N/A'}</div>
          </div>
          <div className="job-info-item">
            <div className="job-info-label">Date</div>
            <div className="job-info-value">{job.initialJobDate || 'N/A'}</div>
          </div>
          <div className="job-info-item">
            <div className="job-info-label">Time</div>
            <div className="job-info-value">{job.initialJobTime || 'N/A'}</div>
          </div>
          <div className="job-info-item">
            <div className="job-info-label">Assigned</div>
            <div className="job-info-value">{job.assignedFlaggers || 'Not assigned'}</div>
          </div>
        </div>

        <div className="job-actions">
          {canUpdate && (
            <button 
              onClick={() => setShowEditModal(true)}
              className="btn btn-secondary btn-small"
            >
              Edit
            </button>
          )}
          {canUpdate && (
            <button 
              onClick={() => setShowAssignModal(true)}
              className="btn btn-secondary btn-small"
            >
              Assign
            </button>
          )}
          <button className="btn btn-secondary btn-small">
            View Details
          </button>
        </div>
      </div>

      {showEditModal && (
        <EditJobModal
          job={job}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            onUpdate();
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
          }}
        />
      )}
    </>
  );
}

export default JobCard;