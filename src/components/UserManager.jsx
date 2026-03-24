import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import { logAudit } from '../utils/auditLog';

function UserManager({ permissions }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canCreate = hasPermission(permissions, 'users', 'create');
  const canUpdate = hasPermission(permissions, 'users', 'update');
  const canDelete = hasPermission(permissions, 'users', 'delete');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersSnap, rolesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'roles'))
      ]);

      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const rolesData = rolesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.roleName || 'Unknown';
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="jobs-header">
        <h2>Users</h2>
        <div className="jobs-actions">
          <button onClick={() => setShowInviteModal(true)} className="btn btn-primary">
            + Add User
          </button>
          <button onClick={loadData} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      <div className="jobs-grid">
        {users.map(user => (
          <UserCard 
            key={user.id}
            user={user}
            roleName={getRoleName(user.roleId)}
            roles={roles}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onUpdate={loadData}
          />
        ))}
      </div>

      {showInviteModal && (
        <InviteUserModal
          roles={roles}
          onClose={() => setShowInviteModal(false)}
          onSave={loadData}
        />
      )}
    </div>
  );
}

function UserCard({ user, roleName, roles, canUpdate, canDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.roleId || roles[0]?.id);
  const isPending = !user.roleId;

  const handleUpdateRole = async () => {
    try {
      await setDoc(doc(db, 'users', user.id), {
        ...user,
        roleId: selectedRole,
        updatedAt: new Date()
      }, { merge: true });

      await logAudit('UPDATE_USER', 'users', user.id, { roleId: selectedRole });
      setEditing(false);
      onUpdate();
    } catch (error) {
      alert('Error updating user: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove user ${user.email}?`)) return;

    try {
      await deleteDoc(doc(db, 'users', user.id));
      await logAudit('DELETE_USER', 'users', user.id);
      onUpdate();
    } catch (error) {
      alert('Error deleting user: ' + error.message);
    }
  };

  return (
    <div className="job-card">
      <div className="job-header">
        <span className="job-id">{user.fullName || user.email}</span>
        {isPending && (
          <span className="job-series" style={{ background: '#fdd835', color: '#000' }}>
            Pending
          </span>
        )}
      </div>

      <div className="job-info">
        <div className="job-info-item">
          <div className="job-info-label">Email</div>
          <div className="job-info-value">{user.email}</div>
        </div>
        <div className="job-info-item">
          <div className="job-info-label">Role</div>
          <div className="job-info-value">
            {editing ? (
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.roleName}</option>
                ))}
              </select>
            ) : (
              isPending ? 'No role assigned' : roleName
            )}
          </div>
        </div>
      </div>

      <div className="job-actions">
        {canUpdate && !editing && (
          <button onClick={() => setEditing(true)} className="btn btn-primary btn-small">
            {isPending ? 'Assign Role' : 'Change Role'}
          </button>
        )}
        {editing && (
          <>
            <button onClick={handleUpdateRole} className="btn btn-primary btn-small">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary btn-small">
              Cancel
            </button>
          </>
        )}
        {canDelete && (
          <button onClick={handleDelete} className="btn btn-secondary btn-small">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function InviteUserModal({ roles, onClose, onSave }) {
  const [searchEmail, setSearchEmail] = useState('');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleId, setRoleId] = useState(roles[0]?.id || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      // Get all Firebase Auth users
      // Note: This won't work in client-side code
      // For now, we'll just let admins manually enter email
      
      // In production, you'd use Firebase Admin SDK on the backend
      // or have users sign up first, then approve them
    } catch (error) {
      console.error('Error loading pending users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!searchEmail) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);

    try {
      // Search for this email in Firebase Auth
      // Since we can't do this client-side, we'll create a placeholder
      
      alert(`Instructions for adding ${searchEmail}:\n\n1. Have them sign up at the login page\n2. They'll see "Pending Approval" message\n3. Come back here and assign them a role\n4. They refresh and can access the system`);
      
      onClose();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add User</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div style={{ 
            background: '#e8f0fe', 
            padding: '16px', 
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            <strong>How to add users:</strong>
            <ol style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.6' }}>
              <li>Have the new user go to the login page</li>
              <li>They should click "Sign Up" and create an account</li>
              <li>They'll see a "Pending Approval" message</li>
              <li>You'll see them appear in the Users list below</li>
              <li>Assign them a role by clicking "Change Role"</li>
              <li>They refresh their page and can access the system</li>
            </ol>
          </div>

          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <strong>Currently pending approval:</strong>
            <p style={{ marginTop: '8px', color: '#5f6368' }}>
              Check the main Users list to see users waiting for role assignment.
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-primary">
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserManager;