import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from '../utils/firestoreTracker';
import { db } from '../firebase';

function UserManager() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasWritePermission, setHasWritePermission] = useState(null);

  // Load users and roles
  useEffect(() => {
    console.log('🔴 Setting up users and roles listeners');

    // Test write permission on mount
    const testPermissions = async () => {
      try {
        // Try to read users collection first
        const testRead = await getDocs(collection(db, 'users'));
        console.log('✅ Can read users collection');
        setHasWritePermission(true);
      } catch (error) {
        console.error('❌ Cannot read users collection:', error);
        setHasWritePermission(false);
      }
    };

    testPermissions();

    // Listen to users collection
    const usersUnsubscribe = onSnapshot(
      collection(db, 'users'), 
      (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🔄 Users updated: ${usersList.length} users`);
        setUsers(usersList);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error loading users:', error);
        setLoading(false);
        setHasWritePermission(false);
      }
    );

    // Listen to roles collection
    const rolesUnsubscribe = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const rolesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`🔄 Roles updated: ${rolesList.length} roles`);
      setRoles(rolesList);
    });

    return () => {
      usersUnsubscribe();
      rolesUnsubscribe();
    };
  }, []);

  const handleCreateUser = () => {
    if (hasWritePermission === false) {
      alert('⚠️ PERMISSION ERROR\n\nYou do not have permission to create users.\n\nThis is a Firestore security rules issue. Contact your administrator to update the security rules for the "users" collection.');
      return;
    }
    setShowCreateModal(true);
  };

  const handleEditUser = (user) => {
    if (hasWritePermission === false) {
      alert('⚠️ PERMISSION ERROR\n\nYou do not have permission to edit users.\n\nThis is a Firestore security rules issue. Contact your administrator.');
      return;
    }
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = async (user) => {
    if (hasWritePermission === false) {
      alert('⚠️ PERMISSION ERROR\n\nYou do not have permission to delete users.');
      return;
    }

    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', user.id));
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      if (error.code === 'permission-denied') {
        alert('⚠️ PERMISSION DENIED\n\nYour Firestore security rules do not allow deleting users.\n\nUpdate your security rules to allow this operation.');
      } else {
        alert('Failed to delete user: ' + error.message);
      }
    }
  };

  const handleToggleActive = async (user) => {
    if (hasWritePermission === false) {
      alert('⚠️ PERMISSION ERROR\n\nYou do not have permission to update users.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.id), {
        isActive: !user.isActive,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error toggling user active state:', error);
      if (error.code === 'permission-denied') {
        alert('⚠️ PERMISSION DENIED\n\nYour Firestore security rules do not allow updating users.');
      } else {
        alert('Failed to update user: ' + error.message);
      }
    }
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedUser(null);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading users...</div>;
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ fontSize: '20px', margin: 0 }}>
          User Management ({users.length})
        </h2>
        <button 
          onClick={handleCreateUser}
          className="btn btn-primary"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          + Add User
        </button>
      </div>

      {/* Permission Warning */}
      {hasWritePermission === false && (
        <div style={{
          padding: '16px',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '13px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>⚠️ Limited Permissions</div>
          <div>You can view users but cannot create, edit, or delete them. This is controlled by Firestore security rules. Contact your administrator to grant write access to the "users" collection.</div>
        </div>
      )}

      {/* Users Table */}
      <div style={{ 
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Role</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              const role = roles.find(r => r.id === user.roleId);
              const isActive = user.isActive !== false;

              return (
                <tr 
                  key={user.id}
                  style={{ 
                    borderBottom: '1px solid #e0e0e0',
                    background: index % 2 === 0 ? 'white' : '#fafafa',
                    opacity: isActive ? 1 : 0.6
                  }}
                >
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    {user.displayName || user.name || 'No name'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    <span style={{
                      background: role?.color || '#e0e0e0',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {role?.name || 'No role'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={hasWritePermission === false}
                      style={{
                        background: isActive ? '#4caf50' : '#9e9e9e',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: hasWritePermission === false ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        opacity: hasWritePermission === false ? 0.5 : 1
                      }}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditUser(user)}
                        disabled={hasWritePermission === false}
                        className="btn btn-secondary"
                        style={{ 
                          fontSize: '11px', 
                          padding: '4px 8px',
                          opacity: hasWritePermission === false ? 0.5 : 1,
                          cursor: hasWritePermission === false ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={hasWritePermission === false}
                        style={{
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: hasWritePermission === false ? 'not-allowed' : 'pointer',
                          opacity: hasWritePermission === false ? 0.5 : 1
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles}
          onClose={handleCloseModals}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          roles={roles}
          onClose={handleCloseModals}
        />
      )}
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({ roles, onClose }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    roleId: '',
    isActive: true,
    sendWelcomeEmail: false
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.password) {
      alert('Email and password are required!');
      return;
    }

    if (!formData.roleId) {
      alert('Please select a role!');
      return;
    }

    try {
      // Create user document in Firestore
      const userId = formData.email.split('@')[0];
      
      await setDoc(doc(db, 'users', userId), {
        email: formData.email,
        displayName: formData.displayName,
        roleId: formData.roleId,
        isActive: formData.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      alert('✅ User created successfully!\n\nNote: This creates the Firestore user document. Firebase Authentication user must be created separately via Cloud Functions or Firebase Console.');
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error.code === 'permission-denied') {
        alert('⚠️ PERMISSION DENIED\n\nYour Firestore security rules do not allow creating users in the "users" collection.\n\nTo fix this, update your Firestore security rules to allow authenticated users to create user documents.\n\nExample rule:\nmatch /users/{userId} {\n  allow write: if request.auth != null;\n}');
      } else {
        alert('Failed to create user: ' + error.message);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Create New User</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>

          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select
              value={formData.roleId}
              onChange={(e) => handleChange('roleId', e.target.value)}
            >
              <option value="">Select a role...</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Active
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.sendWelcomeEmail}
                onChange={(e) => handleChange('sendWelcomeEmail', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Send welcome email
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleCreate} className="btn btn-primary">
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, roles, onClose }) {
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    email: user.email || '',
    roleId: user.roleId || '',
    isActive: user.isActive !== false
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        displayName: formData.displayName,
        roleId: formData.roleId,
        isActive: formData.isActive,
        updatedAt: new Date()
      });

      alert('User updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error.code === 'permission-denied') {
        alert('⚠️ PERMISSION DENIED\n\nYour Firestore security rules do not allow updating users.');
      } else {
        alert('Failed to update user: ' + error.message);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!confirm(`Send password reset email to ${user.email}?`)) {
      return;
    }

    alert('ℹ️ PASSWORD RESET\n\nPassword reset functionality requires Firebase Auth Admin SDK (Cloud Functions).\n\nTo implement this:\n1. Create a Cloud Function that calls admin.auth().generatePasswordResetLink()\n2. Send the reset link via email\n3. Connect this button to call that function');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Edit User: {user.email}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Email (read-only)</label>
            <input
              type="email"
              value={formData.email}
              disabled
              style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              value={formData.roleId}
              onChange={(e) => handleChange('roleId', e.target.value)}
            >
              <option value="">Select a role...</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Active
            </label>
          </div>

          <div style={{ 
            marginTop: '16px',
            padding: '12px',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px'
          }}>
            <button
              onClick={handleResetPassword}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Send Password Reset Email
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserManager;
