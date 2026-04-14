import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { compareObjectsDynamic } from '../utils/fieldUtils';

/**
 * ConfirmationDialog - Shows before/after comparison of changes
 * Now uses DYNAMIC field detection!
 */

function ConfirmationDialog({ changes, onConfirm, onCancel, title = "Confirm Changes" }) {
  if (!changes || changes.length === 0) {
    // No changes detected - auto-confirm
    setTimeout(() => onConfirm(), 0);
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>⚠️ {title}</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="modal-content">
          <p style={{ 
            fontSize: '14px', 
            color: '#5f6368', 
            marginBottom: '20px',
            fontWeight: '500'
          }}>
            You are about to change the following {changes.length} field{changes.length > 1 ? 's' : ''}:
          </p>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '4px'
          }}>
            {changes.map((change, index) => (
              <div 
                key={index}
                style={{
                  background: change.label.includes('⭐') ? '#fff3e0' : '#f8f9fa',
                  padding: '12px',
                  borderRadius: '4px',
                  border: change.label.includes('⭐') ? '1px solid #ffb74d' : '1px solid #e0e0e0'
                }}
              >
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: change.label.includes('⭐') ? '#e65100' : '#1a73e8',
                  marginBottom: '8px'
                }}>
                  {change.label}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: '#d32f2f',
                      minWidth: '40px'
                    }}>
                      OLD:
                    </span>
                    <span style={{ 
                      fontSize: '13px', 
                      color: '#5f6368',
                      fontStyle: change.oldValue ? 'normal' : 'italic'
                    }}>
                      {change.oldValue || '(empty)'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: '#0f9d58',
                      minWidth: '40px'
                    }}>
                      NEW:
                    </span>
                    <span style={{ 
                      fontSize: '13px', 
                      color: '#202124',
                      fontWeight: '500'
                    }}>
                      {change.newValue || '(empty)'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: '#fff3e0',
            padding: '12px',
            borderRadius: '4px',
            marginTop: '20px',
            fontSize: '12px',
            color: '#e65100',
            border: '1px solid #ffb74d'
          }}>
            ⚠️ <strong>Warning:</strong> This action cannot be undone. Review the changes carefully before confirming.
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-primary">
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Show confirmation dialog - returns a promise
 * Now uses DYNAMIC comparison!
 * 
 * @param {Object} original - Original object
 * @param {Object} updated - Updated object
 * @param {String} title - Dialog title
 * @returns {Promise<Boolean>} True if confirmed, false if cancelled
 */
export function showConfirmDialog(original, updated, title = "Confirm Changes") {
  // Use dynamic comparison
  const changes = compareObjectsDynamic(original, updated);
  
  return new Promise((resolve) => {
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      const container = document.getElementById('confirmation-dialog-container');
      if (container) {
        document.body.removeChild(container);
      }
    };
    
    // If no changes, auto-confirm
    if (changes.length === 0) {
      resolve(false); // Return false to indicate no changes
      return;
    }
    
    // Create container
    const container = document.createElement('div');
    container.id = 'confirmation-dialog-container';
    document.body.appendChild(container);
    
    // Render dialog
    const root = createRoot(container);
    root.render(
      <ConfirmationDialog 
        changes={changes}
        title={title}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  });
}

export default ConfirmationDialog;
