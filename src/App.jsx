import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loadUserPermissions, clearPermissionsCache } from './utils/permissions';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FirstTimeSetup from './components/FirstTimeSetup';
import PendingApproval from './components/PendingApproval';

function App() {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState(null); // 'owner', 'approved', 'pending'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Load user's permissions
        const userPerms = await loadUserPermissions(currentUser.uid);
        
        if (!userPerms) {
          // Check if this is the first user (no roles exist)
          const isFirstUser = await checkIfFirstUser();
          
          if (isFirstUser) {
            setUserStatus('owner');
            setPermissions(null);
          } else {
            // User has no role - waiting for approval
            setUserStatus('pending');
            setPermissions(null);
          }
        } else {
          setUserStatus('approved');
          setPermissions(userPerms);
        }
      } else {
        // User logged out
        clearPermissionsCache();
        setPermissions(null);
        setUserStatus(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function checkIfFirstUser() {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const rolesSnapshot = await getDocs(collection(db, 'roles'));
      return rolesSnapshot.empty;
    } catch (error) {
      console.error('Error checking first user:', error);
      return false;
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (userStatus === 'owner') {
    return <FirstTimeSetup user={user} onComplete={() => window.location.reload()} />;
  }

  if (userStatus === 'pending') {
    return <PendingApproval user={user} />;
  }

  return <Dashboard user={user} permissions={permissions} />;
}

export default App;