import { useEffect, useState } from 'react';
import { auth } from '../firebase';

/**
 * AUTH DEBUG - Add temporarily to see authentication status
 * This helps diagnose permission issues
 */
function AuthDebug() {
  const [authInfo, setAuthInfo] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthInfo({
          email: user.email,
          uid: user.uid,
          authenticated: true
        });
        console.log('✅ User authenticated:', {
          email: user.email,
          uid: user.uid
        });
      } else {
        setAuthInfo({ authenticated: false });
        console.log('❌ No user authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  if (!authInfo) {
    return <div style={{ fontSize: '12px', color: '#5f6368' }}>Checking auth...</div>;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      background: authInfo.authenticated ? '#e8f5e9' : '#ffebee',
      padding: '12px',
      borderRadius: '4px',
      border: `2px solid ${authInfo.authenticated ? '#4caf50' : '#d32f2f'}`,
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
        {authInfo.authenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
      </div>
      {authInfo.authenticated && (
        <>
          <div>Email: {authInfo.email}</div>
          <div style={{ fontSize: '10px', color: '#5f6368' }}>
            UID: {authInfo.uid.substring(0, 8)}...
          </div>
        </>
      )}
      <div style={{ marginTop: '8px', fontSize: '10px', color: '#5f6368' }}>
        Remove this component after testing
      </div>
    </div>
  );
}

export default AuthDebug;
