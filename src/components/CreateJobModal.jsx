// Example: How to add confirmation dialog to CreateJobModal.jsx
// For CREATE operations, we compare against empty/default values

import { useState } from 'react';
import { collection, addDoc } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { showConfirmDialog } from './ConfirmationDialog';
import ConfirmationDialog from './ConfirmationDialog';

function CreateJobModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    jobID: '',
    caller: '',
    billing: '',
    location: '',
    // ... all fields start empty
  });
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChanges, setPendingChanges] = useState([]);

  const fieldLabels = {
    jobID: 'Job ID',
    caller: 'Caller',
    billing: 'Billing',
    location: 'Location',
    assignedFlaggers: 'Assigned Flaggers',
    // ... all field labels
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    // For CREATE, compare against empty object to show what's being added
    const emptyJob = {
      jobID: '',
      caller: '',
      billing: '',
      location: '',
      // ... all fields empty
    };
    
    const changes = compareObjects(emptyJob, formData, fieldLabels);
    
    if (changes.length === 0) {
      alert('Please fill in at least one field');
      return;
    }
    
    // Show what's being created
    setPendingChanges(changes);
    setShowConfirmation(true);
  };

  const handleConfirmedCreate = async () => {
    setShowConfirmation(false);
    
    try {
      await addDoc(collection(db, 'jobs'), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      alert('Job created successfully!');
      onSave();
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job');
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setPendingChanges([]);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Create New Job</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="modal-content">
            {/* Form fields */}
          </div>

          <div className="modal-actions">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleCreate} className="btn btn-primary">
              Create Job
            </button>
          </div>
        </div>
      </div>

      {showConfirmation && (
        <ConfirmationDialog
          changes={pendingChanges}
          title="Confirm New Job"
          onConfirm={handleConfirmedCreate}
          onCancel={handleCancelConfirmation}
        />
      )}
    </>
  );
}

export default CreateJobModal;
