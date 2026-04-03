import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Firebase Usage Tracker - Real-Time Version
 * 
 * Listens to Firestore changes and updates in real-time
 * Shows live usage metrics as operations happen
 * 
 * Features:
 * - Real-time updates (no refresh needed)
 * - Color-coded alerts
 * - Live percentage calculations
 * - Auto-updates every 10 seconds as operations are tracked
 */

function FirebaseUsageTracker() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const LIMITS = {
    reads: 50000,
    writes: 20000,
    deletes: 20000
  };

  useEffect(() => {
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'firebaseUsage'),
      (snapshot) => {
        if (snapshot.exists()) {
          setUsage(snapshot.data());
          setIsLive(true);
        } else {
          // Default if not set up yet
          setUsage({
            reads: 0,
            writes: 0,
            deletes: 0,
            lastUpdated: 'Not configured',
            alertThresholds: {
              caution: 50,
              warning: 75,
              critical: 90
            }
          });
          setIsLive(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to usage updates:', error);
        setUsage({
          reads: 0,
          writes: 0,
          deletes: 0,
          lastUpdated: 'Error',
          alertThresholds: {
            caution: 50,
            warning: 75,
            critical: 90
          }
        });
        setIsLive(false);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  if (loading || !usage) {
    return (
      <div style={{ fontSize: '12px', color: '#9e9e9e' }}>
        Loading usage...
      </div>
    );
  }

  const getPercentage = (value, limit) => {
    return ((value / limit) * 100).toFixed(1);
  };

  const getStatusColor = (value, limit) => {
    const percent = (value / limit) * 100;
    const thresholds = usage.alertThresholds;
    
    if (percent >= thresholds.critical) return '#d32f2f'; // Red - critical
    if (percent >= thresholds.warning) return '#ff9800'; // Orange - warning
    if (percent >= thresholds.caution) return '#fbc02d'; // Yellow - caution
    return '#4caf50'; // Green - safe
  };

  const getStatusLabel = (value, limit) => {
    const percent = (value / limit) * 100;
    const thresholds = usage.alertThresholds;
    
    if (percent >= thresholds.critical) return 'CRITICAL';
    if (percent >= thresholds.warning) return 'WARNING';
    if (percent >= thresholds.caution) return 'CAUTION';
    return 'SAFE';
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
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
        {/* Live indicator */}
        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#4caf50',
              animation: 'pulse 2s infinite'
            }} />
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}</style>
          </div>
        )}

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
            <div style={{ 
              marginBottom: '12px',
              padding: '8px',
              background: '#e8f5e9',
              borderRadius: '4px',
              border: '1px solid #4caf50'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#4caf50'
                }} />
                <strong style={{ color: '#2e7d32' }}>Real-Time Tracking Active</strong>
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px', color: '#5f6368' }}>
                Numbers update automatically every 10 seconds
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong>Last Updated:</strong> {usage.lastUpdated}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <strong>Alert Thresholds:</strong>
            </div>
            <div style={{ paddingLeft: '12px', marginBottom: '8px' }}>
              <div style={{ color: '#4caf50' }}>✓ Safe: &lt; {usage.alertThresholds.caution}%</div>
              <div style={{ color: '#fbc02d' }}>⚠ Caution: {usage.alertThresholds.caution}%-{usage.alertThresholds.warning - 1}%</div>
              <div style={{ color: '#ff9800' }}>⚠ Warning: {usage.alertThresholds.warning}%-{usage.alertThresholds.critical - 1}%</div>
              <div style={{ color: '#d32f2f' }}>🚨 Critical: ≥ {usage.alertThresholds.critical}%</div>
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
              <strong>How it works:</strong>
            </div>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
              <li>All Firestore operations are tracked automatically</li>
              <li>Numbers update in real-time (every 10 seconds)</li>
              <li>Counters reset automatically at midnight Pacific</li>
              <li>No manual updates needed!</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default FirebaseUsageTracker;
