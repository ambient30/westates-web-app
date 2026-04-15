import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from '../utils/firestoreTracker';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';
import { showConfirmDialog } from './ConfirmationDialog';

function CreateEmployeeModal({ onClose, onSave }) {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newFieldName, setNewFieldName] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  useEffect(() => {
    // Load one existing employee to get field template
    const loadFieldTemplate = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'employees'));
        
        if (snapshot.docs.length > 0) {
          // Use first employee as template
          const templateEmployee = snapshot.docs[0].data();
          
          // Create empty form with all fields from template
          const emptyForm = {};
          Object.keys(templateEmployee).forEach(key => {
            // Skip metadata fields
            if (['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(key)) {
              return;
            }
            
            // Set to empty based on type
            const value = templateEmployee[key];
            if (typeof value === 'boolean') {
              emptyForm[key] = false;
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              emptyForm[key] = {};
            } else if (Array.isArray(value)) {
              emptyForm[key] = [];
            } else {
              emptyForm[key] = '';
            }
          });
          
          console.log(`📋 Loaded field template from existing employee (${Object.keys(emptyForm).length} fields)`);
          setFormData(emptyForm);
        } else {
          // No employees exist - use basic template
          console.log('📋 No existing employees, using basic template');
          setFormData({
            fullName: '',
            phone: '',
            email: '',
            payRate: '',
            isActive: true,
            notes: '',
          });
        }
      } catch (error) {
        console.error('Error loading template:', error);
        // Fallback to basic template
        setFormData({
          fullName: '',
          phone: '',
          email: '',
          payRate: '',
          isActive: true,
          notes: '',
        });
      } finally {
        setLoading(false);
      }
    };

    loadFieldTemplate();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) {
      alert('Please enter a field name');
      return;
    }

    if (formData.hasOwnProperty(newFieldName)) {
      alert('Field already exists');
      return;
    }

    setFormData(prev => ({ ...prev, [newFieldName]: '' }));
    setNewFieldName('');
    setShowAddField(false);
  };

  const handleRemoveField = (fieldName) => {
    const { [fieldName]: removed, ...rest } = formData;
    setFormData(rest);
  };

  const handleCreate = async () => {
    if (!formData.fullName && !formData.name) {
      alert('Full Name is required');
      return;
    }

    // Empty employee for comparison
    const emptyEmployee = {};
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      if (typeof value === 'boolean') {
        emptyEmployee[key] = false;
      } else if (typeof value === 'object' && value !== null) {
        emptyEmployee[key] = Array.isArray(value) ? [] : {};
      } else {
        emptyEmployee[key] = '';
      }
    });

    const confirmed = await showConfirmDialog(emptyEmployee, formData, "Confirm New Employee");
    
    if (!confirmed) {
      return;
    }

    try {
      const user = auth.currentUser;
      
      await addDoc(collection(db, 'employees'), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user?.email || 'Unknown',
        updatedBy: user?.email || 'Unknown'
      });

      await logAudit('CREATE_EMPLOYEE', 'employees', null, {
        fullName: formData.fullName || formData.name
      });

      alert('Employee created successfully!');
      onSave();
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee. Please try again.');
    }
  };

  const getFieldsToDisplay = () => {
    if (!formData) return [];
    
    const fields = [];
    const basicFields = ['fullName', 'name', 'phone', 'phone2', 'email', 'payRate', 'isActive', 'notes'];
    
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      const fieldType = typeof value;

      fields.push({
        key,
        value,
        type: fieldType,
        isBoolean: fieldType === 'boolean',
        isObject: fieldType === 'object' && value !== null && !Array.isArray(value),
        isArray: Array.isArray(value),
        isCustom: !basicFields.includes(key),
      });
    });

    return fields;
  };

  const generateLabel = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px' }}>
          <div>Loading field template...</div>
        </div>
      </div>
    );
  }

  const fields = getFieldsToDisplay();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Create New Employee</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#1a73e8' }}>
              Employee Information ({fields.length} fields)
            </h3>
            <button 
              onClick={() => setShowAddField(!showAddField)}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              + Add Field
            </button>
          </div>

          {showAddField && (
            <div style={{ 
              padding: '12px', 
              background: '#f0f7ff', 
              borderRadius: '4px', 
              marginBottom: '12px',
              border: '1px solid #1a73e8'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label>Field Name</label>
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="e.g., certifications, emergencyContact"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddCustomField();
                      }
                    }}
                  />
                </div>
                <button 
                  onClick={handleAddCustomField}
                  className="btn btn-primary"
                  style={{ height: '36px' }}
                >
                  Add
                </button>
                <button 
                  onClick={() => setShowAddField(false)}
                  className="btn btn-secondary"
                  style={{ height: '36px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {fields.map(field => {
              if (field.isBoolean) {
                return (
                  <div key={field.key} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData[field.key] || false}
                        onChange={(e) => handleChange(field.key, e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      {generateLabel(field.key)}
                    </label>
                    {field.isCustom && (
                      <button
                        onClick={() => handleRemoveField(field.key)}
                        style={{ 
                          fontSize: '11px', 
                          padding: '2px 6px', 
                          background: '#f44336', 
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              }

              if (field.isObject) {
                return (
                  <div key={field.key} className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>{generateLabel(field.key)} (Object)</label>
                      {field.isCustom && (
                        <button
                          onClick={() => handleRemoveField(field.key)}
                          style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            background: '#f44336', 
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      value={JSON.stringify(formData[field.key], null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          handleChange(field.key, parsed);
                        } catch (err) {
                          handleChange(field.key, e.target.value);
                        }
                      }}
                      rows="4"
                      style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '11px' }}
                    />
                  </div>
                );
              }

              if (field.isArray) {
                return (
                  <div key={field.key} className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>{generateLabel(field.key)} (Array)</label>
                      {field.isCustom && (
                        <button
                          onClick={() => handleRemoveField(field.key)}
                          style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            background: '#f44336', 
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      value={JSON.stringify(formData[field.key], null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          handleChange(field.key, parsed);
                        } catch (err) {
                          handleChange(field.key, e.target.value);
                        }
                      }}
                      rows="3"
                      style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '11px' }}
                    />
                  </div>
                );
              }

              return (
                <div key={field.key} className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>{generateLabel(field.key)}</label>
                    {field.isCustom && (
                      <button
                        onClick={() => handleRemoveField(field.key)}
                        style={{ 
                          fontSize: '11px', 
                          padding: '2px 6px', 
                          background: '#f44336', 
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
              <strong>Total fields:</strong> {fields.length} ({fields.filter(f => f.isCustom).length} custom)
            </p>
          </div>

        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleCreate} className="btn btn-primary">
            Create Employee
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateEmployeeModal;
