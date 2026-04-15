import { useState } from 'react';
import { doc, updateDoc } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { logAudit } from '../utils/auditLog';
import { showConfirmDialog } from './ConfirmationDialog';

function EditEmployeeModal({ employee, onClose, onSave }) {
  // Store original for comparison
  const originalEmployee = { ...employee };

  // ✅ CRITICAL: Copy ALL fields using spread operator
  const [formData, setFormData] = useState({ ...employee });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Show confirmation with ALL changes
    const confirmed = await showConfirmDialog(originalEmployee, formData, "Confirm Employee Changes");
    
    if (!confirmed) {
      return;
    }

    try {
      await updateDoc(doc(db, 'employees', employee.id), {
        ...formData,
        updatedAt: new Date()
      });

      await logAudit('UPDATE_EMPLOYEE', 'employees', employee.id, {
        fullName: formData.fullName || formData.name || 'Unknown'
      });

      alert('Employee updated successfully!');
      onSave();
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee. Please try again.');
    }
  };

  // ✅ DYNAMIC FIELD DETECTION - Get ALL fields from the actual object
  const getFieldsToDisplay = () => {
    const fields = [];
    
    // Get ALL keys from the object (except internal Firebase ones)
    Object.keys(formData).forEach(key => {
      // Skip Firebase metadata fields
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || 
          key === 'createdBy' || key === 'updatedBy') {
        return;
      }

      const value = formData[key];
      const fieldType = typeof value;

      fields.push({
        key,
        value,
        type: fieldType,
        isBoolean: fieldType === 'boolean',
        isObject: fieldType === 'object' && value !== null && !Array.isArray(value),
        isArray: Array.isArray(value),
      });
    });

    return fields;
  };

  const fields = getFieldsToDisplay();

  // Generate a readable label from field name
  const generateLabel = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1') // camelCase to spaces
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .replace(/_/g, ' '); // underscores to spaces
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Edit Employee: {formData.fullName || formData.name || employee.id}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1a73e8' }}>
            Employee Information ({fields.length} fields)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {fields.map(field => {
              // Boolean field (checkbox)
              if (field.isBoolean) {
                return (
                  <div key={field.key} className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData[field.key] || false}
                        onChange={(e) => handleChange(field.key, e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      {generateLabel(field.key)}
                    </label>
                  </div>
                );
              }

              // Object field (JSON textarea)
              if (field.isObject) {
                return (
                  <div key={field.key} className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>{generateLabel(field.key)} (Object)</label>
                    <textarea
                      value={JSON.stringify(formData[field.key], null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          handleChange(field.key, parsed);
                        } catch (err) {
                          // Invalid JSON, just update the raw value
                          handleChange(field.key, e.target.value);
                        }
                      }}
                      rows="4"
                      style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '11px' }}
                    />
                  </div>
                );
              }

              // Array field (JSON textarea)
              if (field.isArray) {
                return (
                  <div key={field.key} className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>{generateLabel(field.key)} (Array)</label>
                    <textarea
                      value={JSON.stringify(formData[field.key], null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          handleChange(field.key, parsed);
                        } catch (err) {
                          // Invalid JSON, just update the raw value
                          handleChange(field.key, e.target.value);
                        }
                      }}
                      rows="3"
                      style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '11px' }}
                    />
                  </div>
                );
              }

              // String/Number field (text input)
              return (
                <div key={field.key} className="form-group">
                  <label>{generateLabel(field.key)}</label>
                  <input
                    type="text"
                    value={formData[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          {/* Debug info */}
          <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
              <strong>Total fields:</strong> {fields.length} | 
              <strong> Object ID:</strong> {employee.id}
            </p>
          </div>

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

export default EditEmployeeModal;
