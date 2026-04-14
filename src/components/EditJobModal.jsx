// SUPER SIMPLE EXAMPLE: Using Dynamic Confirmation
// Works with ANY object - no need to list fields!

import { useState } from 'react';
import { doc, updateDoc } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { showConfirmDialog } from './ConfirmationDialog';

function EditJobModal({ job, onClose, onSave }) {
  // Store original job for comparison
  const [originalJob] = useState(job);
  
  // Your form data (initialize with job values)
  const [formData, setFormData] = useState({ ...job });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // THAT'S IT! Super simple save with confirmation
  const handleSave = async () => {
    // Show confirmation - automatically detects ALL changes including custom params!
    const confirmed = await showConfirmDialog(originalJob, formData, "Confirm Job Changes");
    
    if (!confirmed) {
      return; // User cancelled or no changes
    }
    
    // Save to Firestore
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        ...formData,
        updatedAt: new Date()
      });
      
      alert('Job updated successfully!');
      onSave();
    } catch (error) {
      console.error('Error updating job:', error);
      alert('Failed to update job');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Job: {job.jobID}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* Your form fields */}
          <div className="form-group">
            <label>Caller</label>
            <input
              type="text"
              value={formData.caller || ''}
              onChange={(e) => handleChange('caller', e.target.value)}
            />
          </div>
          
          {/* ... all other fields ... */}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditJobModal;

// ============================================
// THAT'S IT! 
// - No field lists needed
// - No manual labels needed
// - Automatically handles custom parameters
// - Works with ANY object (jobs, employees, etc.)
// ============================================
