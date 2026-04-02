import { useState } from 'react';
import { logFirestoreOperation } from '../utils/firebaseUsageLogger';

/**
 * TEST COMPONENT - Add this temporarily to Dashboard to test logging
 * Remove after confirming it works
 */
function FirebaseUsageTest() {
  const [testStatus, setTestStatus] = useState('');

  const testLogging = async () => {
    try {
      setTestStatus('Testing...');
      
      // Test logging 10 reads
      await logFirestoreOperation('reads', 10);
      
      // Test logging 5 writes
      await logFirestoreOperation('writes', 5);
      
      // Test logging 2 deletes
      await logFirestoreOperation('deletes', 2);
      
      setTestStatus('✅ Logged: 10 reads, 5 writes, 2 deletes. Refresh tracker to see!');
      
      setTimeout(() => setTestStatus(''), 5000);
    } catch (err) {
      setTestStatus('❌ Error: ' + err.message);
      console.error('Test error:', err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: '2px solid #1a73e8',
      zIndex: 9999
    }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '600', 
        marginBottom: '8px',
        color: '#202124'
      }}>
        Firebase Usage Test
      </div>
      <button
        onClick={testLogging}
        style={{
          background: '#1a73e8',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          width: '100%'
        }}
      >
        Test Logging
      </button>
      {testStatus && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: testStatus.startsWith('✅') ? '#4caf50' : '#d32f2f',
          wordWrap: 'break-word',
          maxWidth: '250px'
        }}>
          {testStatus}
        </div>
      )}
      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#5f6368'
      }}>
        Click to add test operations to tracker.
        Remove this component after testing.
      </div>
    </div>
  );
}

export default FirebaseUsageTest;
