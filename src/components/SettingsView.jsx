import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

function SettingsView({ permissions }) {
  const [settings, setSettings] = useState({
    signStipendAmount: 25
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data());
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.signStipendAmount || settings.signStipendAmount <= 0) {
      alert('Please enter a valid stipend amount');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
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
    <div>
      <div className="jobs-header">
        <h2>System Settings</h2>
      </div>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <h3 style={{ marginBottom: '24px', color: '#1a73e8' }}>Payroll Settings</h3>
        
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px', 
            fontWeight: '500',
            color: '#202124'
          }}>
            Sign Stipend Amount (per stipend)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: '600', color: '#5f6368' }}>$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.signStipendAmount}
              onChange={(e) => setSettings({ ...settings, signStipendAmount: parseFloat(e.target.value) || 0 })}
              style={{
                width: '150px',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #dadce0',
                borderRadius: '4px'
              }}
            />
          </div>
          <small style={{ color: '#5f6368', fontSize: '13px', display: 'block', marginTop: '8px' }}>
            This is the amount paid to equipment carriers per sign stipend. Applied to all employees company-wide.
          </small>
        </div>

        <div style={{ 
          padding: '16px',
          background: '#e8f0fe',
          borderRadius: '4px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#1967d2'
        }}>
          <strong>Note:</strong> Changes to this setting will apply to all future payroll calculations. 
          Previously generated payroll reports will not be affected.
        </div>

        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ marginRight: '12px' }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={loadSettings}
            className="btn btn-secondary"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;