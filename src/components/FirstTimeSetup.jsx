import { useState } from 'react';
import { doc, setDoc } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { ownerPermissions } from '../utils/permissions';

function FirstTimeSetup({ user, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const ownerRoleId = 'role-owner';
      
      // Create Owner role
      await setDoc(doc(db, 'roles', ownerRoleId), {
        roleName: 'Owner',
        permissions: ownerPermissions,
        createdBy: user.uid,
        createdAt: new Date(),
        isSystemRole: true
      });

      // Create user document with Owner role
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        roleId: ownerRoleId,
        fullName: user.email.split('@')[0],
        createdAt: new Date()
      });

      // Mark system as initialized
      await setDoc(doc(db, '_system', 'initialized'), {
        initializedAt: new Date(),
        initializedBy: user.uid
      });

      onComplete();
    } catch (err) {
      console.error('Setup error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Welcome! 🎉</h1>
        <p style={{ marginBottom: '20px' }}>
          You're the first user! Click below to set up the system as the Owner.
        </p>

        {error && <div className="error-message">{error}</div>}

        <div style={{ 
          background: '#e8f0fe', 
          padding: '16px', 
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>As Owner, you'll be able to:</strong>
          <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
            <li>Manage all jobs, employees, and contractors</li>
            <li>Create custom roles with specific permissions</li>
            <li>Add other users to the system</li>
            <li>View audit logs</li>
          </ul>
        </div>

        <button 
          onClick={handleSetup} 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Setting up...' : 'Become Owner & Continue'}
        </button>
      </div>
    </div>
  );
}

export default FirstTimeSetup;