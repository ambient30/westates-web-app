import { useState } from 'react';

function ContractorDetailsModal({ contractor, onClose }) {
  // ✅ DYNAMIC FIELD DETECTION - Get ALL fields from the actual object
  const getFieldsToDisplay = () => {
    const fields = [];
    
    // Get ALL keys from the object (except internal ones)
    Object.keys(contractor).forEach(key => {
      // Skip Firebase metadata fields
      if (key === 'id') {
        return;
      }

      const value = contractor[key];
      const fieldType = typeof value;

      fields.push({
        key,
        value,
        type: fieldType,
        isBoolean: fieldType === 'boolean',
        isObject: fieldType === 'object' && value !== null && !Array.isArray(value),
        isArray: Array.isArray(value),
        isDate: value?.toDate !== undefined, // Firestore Timestamp
      });
    });

    return fields;
  };

  const fields = getFieldsToDisplay();

  // Generate a readable label from field name
  const generateLabel = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  // Format date/time values
  const formatValue = (field) => {
    if (field.value === null || field.value === undefined || field.value === '') {
      return <span style={{ color: '#999', fontStyle: 'italic' }}>(empty)</span>;
    }

    // Firestore Timestamp
    if (field.isDate) {
      try {
        return field.value.toDate().toLocaleString();
      } catch (err) {
        return String(field.value);
      }
    }

    // Boolean
    if (field.isBoolean) {
      return field.value ? '✓ Yes' : '✗ No';
    }

    // Object
    if (field.isObject) {
      return (
        <pre style={{ 
          margin: 0, 
          fontFamily: 'monospace', 
          fontSize: '11px',
          background: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {JSON.stringify(field.value, null, 2)}
        </pre>
      );
    }

    // Array
    if (field.isArray) {
      return (
        <pre style={{ 
          margin: 0, 
          fontFamily: 'monospace', 
          fontSize: '11px',
          background: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {JSON.stringify(field.value, null, 2)}
        </pre>
      );
    }

    // String/Number
    return String(field.value);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Contractor Details: {contractor.companyName || contractor.name || contractor.id}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1a73e8' }}>
            Contractor Information ({fields.length} fields)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {fields.map(field => (
              <div key={field.key} style={{ 
                display: 'grid', 
                gridTemplateColumns: '200px 1fr',
                gap: '12px',
                padding: '8px',
                background: field.key.startsWith('custom') ? '#fff9e6' : 'white',
                borderRadius: '4px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '12px',
                  color: '#5f6368',
                  display: 'flex',
                  alignItems: 'flex-start',
                  paddingTop: '4px'
                }}>
                  {generateLabel(field.key)}
                  {field.isObject && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#999' }}>(Object)</span>}
                  {field.isArray && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#999' }}>(Array)</span>}
                  {field.isBoolean && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#999' }}>(Boolean)</span>}
                </div>
                <div style={{ 
                  fontSize: '13px',
                  color: '#202124',
                  wordBreak: 'break-word'
                }}>
                  {formatValue(field)}
                </div>
              </div>
            ))}
          </div>

          {/* Debug info */}
          <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
              <strong>Total fields:</strong> {fields.length} | 
              <strong> Contractor ID:</strong> {contractor.id}
            </p>
          </div>

        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContractorDetailsModal;
