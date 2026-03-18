import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

function PendingApproval({ user }) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Account Pending Approval</h1>
        <p style={{ marginBottom: '20px', color: '#5f6368' }}>
          Your account has been created, but an administrator needs to assign you a role before you can access the system.
        </p>

        <div style={{ 
          background: '#fef7e0', 
          padding: '16px', 
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          border: '1px solid #fdd835'
        }}>
          <strong>Next Steps:</strong>
          <ol style={{ marginTop: '8px', marginLeft: '20px' }}>
            <li>Contact your system administrator</li>
            <li>Ask them to assign you a role in the Users section</li>
            <li>Refresh this page once they've done so</li>
          </ol>
        </div>

        <div style={{
          background: '#f8f9fa',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>Signed in as:</strong> {user.email}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            Refresh Status
          </button>
          <button 
            onClick={handleSignOut} 
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default PendingApproval;