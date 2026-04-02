import { useState } from 'react';

/**
 * Manual Firebase Usage Tracker
 * 
 * How to use:
 * 1. Check Firebase Console daily/weekly
 * 2. Update the numbers in firebaseUsageConfig.js
 * 3. Dashboard automatically shows the updated numbers with color-coded alerts
 * 
 * No Firestore calls = Zero overhead
 */

// Import configuration (you'll create this file)
import { FIREBASE_USAGE_CONFIG } from '../config/firebaseUsageConfig';

function FirebaseUsageTracker() {
  const [showSettings, setShowSettings] = useState(false);

  const LIMITS = {
    reads: 50000,
    writes: 20000,
    deletes: 20000
  };

  // Get today's usage from config
  const usage = FIREBASE_USAGE_CONFIG.current || {
    reads: 0,
    writes: 0,
    deletes: 0,
    lastUpdated: 'Never'
  };

  const getPercentage = (value, limit) => {
    return ((value / limit) * 100).toFixed(1);
  };

  const getStatusColor = (value, limit) => {
    const percent = (value / limit) * 100;
    const thresholds = FIREBASE_USAGE_CONFIG.alertThresholds;
    
    if (percent >= thresholds.critical) return '#d32f2f'; // Red - critical
    if (percent >= thresholds.warning) return '#ff9800'; // Orange - warning
    if (percent >= thresholds.caution) return '#fbc02d'; // Yellow - caution
    return '#4caf50'; // Green - safe
  };

  const getStatusLabel = (value, limit) => {
    const percent = (value / limit) * 100;
    const thresholds = FIREBASE_USAGE_CONFIG.alertThresholds;
    
    if (percent >= thresholds.critical) return 'CRITICAL';
    if (percent >= thresholds.warning) return 'WARNING';
    if (percent >= thresholds.caution) return 'CAUTION';
    return 'SAFE';
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const copyConfigTemplate = () => {
    const template = `// Copy today's numbers from Firebase Console and paste them here
export const FIREBASE_USAGE_CONFIG = {
  current: {
    reads: ${usage.reads},
    writes: ${usage.writes},
    deletes: ${usage.deletes},
    lastUpdated: '${new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}'
  },
  alertThresholds: {
    caution: 50,  // Yellow alert at 50%
    warning: 75,  // Orange alert at 75%
    critical: 90  // Red alert at 90%
  }
};`;
    
    navigator.clipboard.writeText(template);
    alert('Config template copied to clipboard! Paste in /src/config/firebaseUsageConfig.js');
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '12px',
        padding: '4px 12px',
        background: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e0e0e0'
      }}>
        {/* Reads */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: '600', color: '#5f6368' }}>Reads:</span>
          <span style={{ 
            fontWeight: '600', 
            color: getStatusColor(usage.reads, LIMITS.reads) 
          }}>
            {formatNumber(usage.reads)}
          </span>
          <span style={{ color: '#9e9e9e' }}>/ {formatNumber(LIMITS.reads)}</span>
          <span style={{ 
            fontSize: '10px', 
            color: getStatusColor(usage.reads, LIMITS.reads),
            fontWeight: '600'
          }}>
            ({getPercentage(usage.reads, LIMITS.reads)}%)
          </span>
        </div>

        {/* Separator */}
        <div style={{ 
          width: '1px', 
          height: '20px', 
          background: '#e0e0e0' 
        }}></div>

        {/* Writes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: '600', color: '#5f6368' }}>Writes:</span>
          <span style={{ 
            fontWeight: '600', 
            color: getStatusColor(usage.writes, LIMITS.writes) 
          }}>
            {formatNumber(usage.writes)}
          </span>
          <span style={{ color: '#9e9e9e' }}>/ {formatNumber(LIMITS.writes)}</span>
          <span style={{ 
            fontSize: '10px', 
            color: getStatusColor(usage.writes, LIMITS.writes),
            fontWeight: '600'
          }}>
            ({getPercentage(usage.writes, LIMITS.writes)}%)
          </span>
        </div>

        {/* Separator */}
        <div style={{ 
          width: '1px', 
          height: '20px', 
          background: '#e0e0e0' 
        }}></div>

        {/* Deletes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: '600', color: '#5f6368' }}>Deletes:</span>
          <span style={{ 
            fontWeight: '600', 
            color: getStatusColor(usage.deletes, LIMITS.deletes) 
          }}>
            {formatNumber(usage.deletes)}
          </span>
          <span style={{ color: '#9e9e9e' }}>/ {formatNumber(LIMITS.deletes)}</span>
          <span style={{ 
            fontSize: '10px', 
            color: getStatusColor(usage.deletes, LIMITS.deletes),
            fontWeight: '600'
          }}>
            ({getPercentage(usage.deletes, LIMITS.deletes)}%)
          </span>
        </div>

        {/* Settings button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '14px',
            color: '#5f6368',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px'
          }}
          onMouseOver={(e) => e.target.style.background = '#e8eaed'}
          onMouseOut={(e) => e.target.style.background = 'none'}
          title="Usage info & settings"
        >
          ℹ️
        </button>
      </div>

      {/* Info/Settings Panel */}
      {showSettings && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: '16px',
          minWidth: '350px',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Firebase Usage Info</h3>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#5f6368'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '12px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Last Updated:</strong> {usage.lastUpdated}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <strong>Alert Thresholds:</strong>
            </div>
            <div style={{ paddingLeft: '12px', marginBottom: '8px' }}>
              <div style={{ color: '#4caf50' }}>✓ Safe: &lt; {FIREBASE_USAGE_CONFIG.alertThresholds.caution}%</div>
              <div style={{ color: '#fbc02d' }}>⚠ Caution: {FIREBASE_USAGE_CONFIG.alertThresholds.caution}%-{FIREBASE_USAGE_CONFIG.alertThresholds.warning - 1}%</div>
              <div style={{ color: '#ff9800' }}>⚠ Warning: {FIREBASE_USAGE_CONFIG.alertThresholds.warning}%-{FIREBASE_USAGE_CONFIG.alertThresholds.critical - 1}%</div>
              <div style={{ color: '#d32f2f' }}>🚨 Critical: ≥ {FIREBASE_USAGE_CONFIG.alertThresholds.critical}%</div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong>Current Status:</strong>
            </div>
            <div style={{ paddingLeft: '12px', marginBottom: '12px' }}>
              <div style={{ color: getStatusColor(usage.reads, LIMITS.reads) }}>
                Reads: {getStatusLabel(usage.reads, LIMITS.reads)}
              </div>
              <div style={{ color: getStatusColor(usage.writes, LIMITS.writes) }}>
                Writes: {getStatusLabel(usage.writes, LIMITS.writes)}
              </div>
              <div style={{ color: getStatusColor(usage.deletes, LIMITS.deletes) }}>
                Deletes: {getStatusLabel(usage.deletes, LIMITS.deletes)}
              </div>
            </div>
          </div>

          <div style={{ 
            borderTop: '1px solid #e0e0e0', 
            paddingTop: '12px',
            fontSize: '11px',
            color: '#5f6368'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>How to update numbers:</strong>
            </div>
            <ol style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
              <li>Go to Firebase Console → Usage tab</li>
              <li>Copy today's read/write/delete counts</li>
              <li>Update <code>/src/config/firebaseUsageConfig.js</code></li>
              <li>Refresh page to see new numbers</li>
            </ol>
            
            <button
              onClick={copyConfigTemplate}
              style={{
                background: '#1a73e8',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                width: '100%'
              }}
            >
              📋 Copy Config Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FirebaseUsageTracker;
