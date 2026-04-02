import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

function FirebaseUsageTracker() {
  const [usage, setUsage] = useState({
    reads: 0,
    writes: 0,
    deletes: 0,
    lastReset: null,
    loading: true
  });
  const [debugInfo, setDebugInfo] = useState('');

  const LIMITS = {
    reads: 50000,
    writes: 20000,
    deletes: 20000
  };

  useEffect(() => {
    loadUsage();
    // Refresh every 5 seconds
    const interval = setInterval(loadUsage, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUsage = async () => {
    try {
      const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
      console.log('🔍 Loading usage for date:', today);
      
      const usageRef = doc(db, 'firebaseUsage', today);
      const usageDoc = await getDoc(usageRef);
      
      console.log('📄 Document exists?', usageDoc.exists());
      
      if (usageDoc.exists()) {
        const data = usageDoc.data();
        console.log('✅ Usage data loaded:', data);
        setUsage({ 
          reads: data.reads || 0,
          writes: data.writes || 0,
          deletes: data.deletes || 0,
          lastReset: data.lastReset || today,
          loading: false 
        });
        setDebugInfo(`✅ Loaded: R:${data.reads} W:${data.writes} D:${data.deletes}`);
      } else {
        console.log('📝 Creating new usage document for today');
        // Initialize today's usage document
        const newUsage = {
          reads: 0,
          writes: 0,
          deletes: 0,
          lastReset: today
        };
        await setDoc(usageRef, newUsage);
        console.log('✅ New document created');
        setUsage({ ...newUsage, loading: false });
        setDebugInfo('📝 New document created');
      }
    } catch (err) {
      console.error('❌ Error loading Firebase usage:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      setUsage(prev => ({ ...prev, loading: false }));
      setDebugInfo(`❌ Error: ${err.code || err.message}`);
    }
  };

  const getPercentage = (value, limit) => {
    return ((value / limit) * 100).toFixed(1);
  };

  const getStatusColor = (value, limit) => {
    const percent = (value / limit) * 100;
    if (percent >= 90) return '#d32f2f'; // Red - critical
    if (percent >= 75) return '#ff9800'; // Orange - warning
    if (percent >= 50) return '#fbc02d'; // Yellow - caution
    return '#4caf50'; // Green - safe
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  if (usage.loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        fontSize: '12px',
        color: '#5f6368'
      }}>
        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
        <span>Loading usage...</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
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

        {/* Refresh indicator */}
        <button
          onClick={loadUsage}
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
          title="Refresh usage data (auto-refreshes every 5 seconds)"
        >
          🔄
        </button>
      </div>
      
      {/* Debug info */}
      <div style={{
        fontSize: '10px',
        color: '#5f6368',
        padding: '2px 12px'
      }}>
        {debugInfo} | Check browser console (F12) for details
      </div>
    </div>
  );
}

export default FirebaseUsageTracker;
