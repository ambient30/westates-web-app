import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import { FIREBASE_USAGE_CONFIG } from '../config/firebaseUsageConfig';

function SettingsView({ permissions }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  
  // Firebase usage tracking state
  const [usageReads, setUsageReads] = useState(FIREBASE_USAGE_CONFIG.current.reads);
  const [usageWrites, setUsageWrites] = useState(FIREBASE_USAGE_CONFIG.current.writes);
  const [usageDeletes, setUsageDeletes] = useState(FIREBASE_USAGE_CONFIG.current.deletes);
  const [usageDate, setUsageDate] = useState(FIREBASE_USAGE_CONFIG.current.lastUpdated);

  const canUpdate = hasPermission(permissions, 'jobs', 'update');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data());
      } else {
        // Initialize with defaults
        const defaultSettings = {
          signStipend: 0,
          overtimeStarts: 8,
          minimumHours: 4,
          holidayMultiplier: 2.0,
          overtimeMultiplier: 1.5,
          mileageThreshold: 60,
          travelTimeThreshold: 1.0,
          companyName: 'Westates Flagman',
          timezone: 'America/Los_Angeles'
        };
        await setDoc(doc(db, 'settings', 'global'), defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      alert('Error loading settings. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = (field, value) => {
    setConfirmModal({
      field,
      oldValue: settings[field],
      newValue: value,
      onConfirm: async () => {
        try {
          setSaving(true);
          await updateDoc(doc(db, 'settings', 'global'), {
            [field]: value
          });
          setSettings({ ...settings, [field]: value });
          setConfirmModal(null);
          setEditMode(false);
        } catch (err) {
          console.error('Error updating setting:', err);
          alert('Error updating setting. Check console for details.');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleUpdateFirebaseUsage = () => {
    setConfirmModal({
      field: 'Firebase Usage Tracking',
      oldValue: `Reads: ${FIREBASE_USAGE_CONFIG.current.reads}, Writes: ${FIREBASE_USAGE_CONFIG.current.writes}, Deletes: ${FIREBASE_USAGE_CONFIG.current.deletes}`,
      newValue: `Reads: ${usageReads}, Writes: ${usageWrites}, Deletes: ${usageDeletes}`,
      message: 'This will update the firebaseUsageConfig.js file. You will need to manually copy the generated code.',
      onConfirm: () => {
        // Generate updated config
        const updatedConfig = `export const FIREBASE_USAGE_CONFIG = {
  current: {
    reads: ${usageReads},
    writes: ${usageWrites},
    deletes: ${usageDeletes},
    lastUpdated: '${usageDate}'
  },
  alertThresholds: {
    caution: ${FIREBASE_USAGE_CONFIG.alertThresholds.caution},
    warning: ${FIREBASE_USAGE_CONFIG.alertThresholds.warning},
    critical: ${FIREBASE_USAGE_CONFIG.alertThresholds.critical}
  }
};`;
        
        navigator.clipboard.writeText(updatedConfig);
        alert('✅ Config copied to clipboard!\n\nPaste this into:\n/src/config/firebaseUsageConfig.js\n\nThen refresh the page to see updated metrics.');
        setConfirmModal(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '8px' }}>⚙️ System Settings</h2>
        <p style={{ color: '#5f6368', fontSize: '14px' }}>
          Manage global configuration for payroll, billing, and system tracking
        </p>
      </div>

      {/* Firebase Usage Tracking Section */}
      <Section title="📊 Firebase Usage Tracking">
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            padding: '12px', 
            background: '#e8f0fe', 
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #1a73e8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>🔗</span>
              <strong style={{ color: '#1a73e8' }}>Quick Link to Firebase Console:</strong>
            </div>
            <a 
              href="https://console.firebase.google.com/project/westates-job-system/usage" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#1a73e8',
                textDecoration: 'none',
                fontSize: '14px',
                display: 'inline-block',
                padding: '8px 16px',
                background: 'white',
                borderRadius: '4px',
                border: '1px solid #1a73e8'
              }}
            >
              Open Firebase Usage Dashboard →
            </a>
            <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '8px' }}>
              Copy today's read/write/delete counts and paste them below
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <SettingInput
              label="Reads"
              value={usageReads}
              onChange={(e) => setUsageReads(parseInt(e.target.value) || 0)}
              type="number"
              min="0"
              helpText="Total document reads today"
            />
            <SettingInput
              label="Writes"
              value={usageWrites}
              onChange={(e) => setUsageWrites(parseInt(e.target.value) || 0)}
              type="number"
              min="0"
              helpText="Total document writes today"
            />
            <SettingInput
              label="Deletes"
              value={usageDeletes}
              onChange={(e) => setUsageDeletes(parseInt(e.target.value) || 0)}
              type="number"
              min="0"
              helpText="Total document deletes today"
            />
            <SettingInput
              label="Date"
              value={usageDate}
              onChange={(e) => setUsageDate(e.target.value)}
              type="text"
              placeholder="4/2/2026"
              helpText="Date of these metrics"
            />
          </div>

          <button
            onClick={handleUpdateFirebaseUsage}
            disabled={!canUpdate}
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
          >
            📋 Copy Updated Config to Clipboard
          </button>
        </div>
      </Section>

      {/* Payroll Settings Section */}
      <Section title="💰 Payroll Settings">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <SettingCard
            label="Sign Stipend"
            value={`$${settings.signStipend}`}
            description="Additional pay for employees bringing signs"
            editable={canUpdate}
            onEdit={() => {
              const newValue = prompt('Enter new sign stipend amount:', settings.signStipend);
              if (newValue !== null && !isNaN(newValue)) {
                handleUpdateSetting('signStipend', parseFloat(newValue));
              }
            }}
          />
          
          <SettingCard
            label="Overtime Starts At"
            value={`${settings.overtimeStarts} hours`}
            description="Daily hours before overtime kicks in"
            editable={canUpdate}
            onEdit={() => {
              const newValue = prompt('Enter hours before overtime:', settings.overtimeStarts);
              if (newValue !== null && !isNaN(newValue)) {
                handleUpdateSetting('overtimeStarts', parseFloat(newValue));
              }
            }}
          />

          <SettingCard
            label="Minimum Hours"
            value={`${settings.minimumHours} hours`}
            description="Minimum paid hours per day"
            editable={canUpdate}
            onEdit={() => {
              const newValue = prompt('Enter minimum hours:', settings.minimumHours);
              if (newValue !== null && !isNaN(newValue)) {
                handleUpdateSetting('minimumHours', parseFloat(newValue));
              }
            }}
          />

          <SettingCard
            label="Overtime Multiplier"
            value={`${settings.overtimeMultiplier}×`}
            description="Overtime pay rate multiplier"
            editable={canUpdate}
            onEdit={() => {
              const newValue = prompt('Enter overtime multiplier (e.g., 1.5 for time-and-a-half):', settings.overtimeMultiplier);
              if (newValue !== null && !isNaN(newValue)) {
                handleUpdateSetting('overtimeMultiplier', parseFloat(newValue));
              }
            }}
          />

          <SettingCard
            label="Holiday Multiplier"
            value={`${settings.holidayMultiplier}×`}
            description="Holiday pay rate multiplier"
            editable={canUpdate}
            onEdit={() => {
              const newValue = prompt('Enter holiday multiplier (e.g., 2.0 for double time):', settings.holidayMultiplier);
              if (newValue !== null && !isNaN(newValue)) {
                handleUpdateSetting('holidayMultiplier', parseFloat(newValue));
              }
            }}
          />
        </div>
      </Section>

      {/* Billing Settings Section */}
      <Section title="🧾 Billing Settings">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <SettingCard
            label="Mileage Threshold"
            value={`${settings.mileageThreshold} miles`}
            description="Minimum roundtrip miles to bill mileage"
            editable={canUpdate}
            onEdit={() => {
              const newValue = prompt('Enter mileage threshold:', settings.mileageThreshold);
              if (newValue !== null && !isNaN(newValue)) {
                handleUpdateSetting('mileageThreshold', parseFloat(newValue));
              }
            }}
          />

          <SettingCard
            label="Travel Time Threshold"
            value={`${settings.travelTimeThreshold} hours`}
            description="Minimum hours after deduction to bill travel"
            editable={canUpdate}
            onEdit={() => {
              const newValue = prompt('Enter travel time threshold:', settings.travelTimeThreshold);
              if (newValue !== null && !isNaN(newValue)) {
                handleUpdateSetting('travelTimeThreshold', parseFloat(newValue));
              }
            }}
          />
        </div>
      </Section>

      {/* Company Info Section */}
      <Section title="🏢 Company Information">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <SettingCard
            label="Company Name"
            value={settings.companyName}
            description="Display name for the company"
            editable={canUpdate}
            onEdit={() => {
              const newValue = prompt('Enter company name:', settings.companyName);
              if (newValue !== null && newValue.trim() !== '') {
                handleUpdateSetting('companyName', newValue.trim());
              }
            }}
          />

          <SettingCard
            label="Timezone"
            value={settings.timezone}
            description="Timezone for all date/time calculations"
            editable={canUpdate}
            onEdit={() => {
              const newValue = prompt('Enter timezone (e.g., America/Los_Angeles):', settings.timezone);
              if (newValue !== null && newValue.trim() !== '') {
                handleUpdateSetting('timezone', newValue.trim());
              }
            }}
          />
        </div>
      </Section>

      {/* Permissions Warning */}
      {!canUpdate && (
        <div style={{
          padding: '16px',
          background: '#fff3e0',
          border: '1px solid #ff9800',
          borderRadius: '8px',
          marginTop: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <strong style={{ color: '#e65100' }}>Read-Only Access</strong>
          </div>
          <p style={{ margin: '8px 0 0 28px', color: '#5f6368', fontSize: '14px' }}>
            You don't have permission to edit these settings. Contact an administrator to make changes.
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmationModal
          field={confirmModal.field}
          oldValue={confirmModal.oldValue}
          newValue={confirmModal.newValue}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

// Section component
function Section({ title, children }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '24px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '18px',
        fontWeight: '600',
        color: '#202124'
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// Setting Card component
function SettingCard({ label, value, description, editable, onEdit }) {
  return (
    <div style={{
      padding: '16px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
            {label}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#202124' }}>
            {value}
          </div>
        </div>
        {editable && (
          <button
            onClick={onEdit}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '16px',
              color: '#1a73e8'
            }}
            title="Edit"
          >
            ✏️
          </button>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#5f6368' }}>
        {description}
      </div>
    </div>
  );
}

// Setting Input component
function SettingInput({ label, value, onChange, type, min, placeholder, helpText }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          border: '1px solid #dadce0',
          borderRadius: '4px',
          marginBottom: '4px'
        }}
      />
      {helpText && (
        <div style={{ fontSize: '11px', color: '#5f6368' }}>
          {helpText}
        </div>
      )}
    </div>
  );
}

// Confirmation Modal component
function ConfirmationModal({ field, oldValue, newValue, message, onConfirm, onCancel, saving }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>⚠️ Confirm Change</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="modal-content">
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#d32f2f' }}>You are about to change a system setting!</strong>
          </div>

          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>Setting:</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{field}</div>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>Current Value:</div>
              <div style={{ fontSize: '14px', color: '#d32f2f' }}>{oldValue?.toString()}</div>
            </div>
            
            <div>
              <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>New Value:</div>
              <div style={{ fontSize: '14px', color: '#4caf50', fontWeight: '600' }}>{newValue?.toString()}</div>
            </div>
          </div>

          {message && (
            <div style={{
              padding: '12px',
              background: '#fff3e0',
              border: '1px solid #ff9800',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {message}
            </div>
          )}

          <div style={{
            padding: '12px',
            background: '#ffebee',
            border: '1px solid #d32f2f',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#c62828'
          }}>
            <strong>⚠️ Warning:</strong> This change will affect all payroll calculations and billing going forward. Make sure this is correct!
          </div>
        </div>

        <div className="modal-actions">
          <button 
            onClick={onCancel} 
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="btn btn-primary"
            style={{ background: '#d32f2f' }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Yes, Update Setting'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
