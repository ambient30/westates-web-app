import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { hasPermission, defaultPermissions } from '../utils/permissions';
import { logAudit } from '../utils/auditLog';

function RoleManager({ permissions }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingRole, setCreatingRole] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const canCreate = hasPermission(permissions, 'roles', 'create');
  const canUpdate = hasPermission(permissions, 'roles', 'update');
  const canDelete = hasPermission(permissions, 'roles', 'delete');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'roles'));
      const rolesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="jobs-header">
        <h2>Roles</h2>
        <div className="jobs-actions">
          <button onClick={() => setCreatingRole(true)} className="btn btn-primary">
            + Add Role
          </button>
          <button onClick={loadRoles} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      <div className="jobs-grid">
        {roles.map(role => (
          <RoleCard 
            key={role.id} 
            role={role} 
            onEdit={canUpdate ? setEditingRole : null}
            onDelete={canDelete ? loadRoles : null}
          />
        ))}
      </div>

      {creatingRole && (
        <RoleModal
          role={null}
          onClose={() => setCreatingRole(false)}
          onSave={() => {
            setCreatingRole(false);
            loadRoles();
          }}
        />
      )}

      {editingRole && (
        <RoleModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSave={() => {
            setEditingRole(null);
            loadRoles();
          }}
        />
      )}
    </div>
  );
}

function RoleCard({ role, onEdit, onDelete }) {
  const handleDelete = async () => {
    if (role.isSystemRole) {
      alert('Cannot delete system role');
      return;
    }

    if (!confirm(`Delete role "${role.roleName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'roles', role.id));
      await logAudit('DELETE_ROLE', 'roles', role.id);
      onDelete();
    } catch (error) {
      alert('Error deleting role: ' + error.message);
    }
  };

  const permissionCount = Object.values(role.permissions).reduce((count, perms) => {
    return count + Object.values(perms).filter(p => p === true).length;
  }, 0);

  return (
    <div className="job-card">
      <div className="job-header">
        <span className="job-id">{role.roleName}</span>
        {role.isSystemRole && (
          <span className="job-series">System Role</span>
        )}
      </div>

      <div className="job-info">
        <div className="job-info-item">
          <div className="job-info-label">Permissions</div>
          <div className="job-info-value">{permissionCount} granted</div>
        </div>
        <div className="job-info-item">
          <div className="job-info-label">Created</div>
          <div className="job-info-value">
            {role.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
          </div>
        </div>
      </div>

      <div className="job-actions">
        {onEdit && (
          <button onClick={() => onEdit(role)} className="btn btn-secondary btn-small">
            Edit
          </button>
        )}
        {onDelete && !role.isSystemRole && (
          <button onClick={handleDelete} className="btn btn-secondary btn-small">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function RoleModal({ role, onClose, onSave }) {
  const [roleName, setRoleName] = useState(role?.roleName || '');
  const [perms, setPerms] = useState(role?.permissions || JSON.parse(JSON.stringify(defaultPermissions)));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const roleData = {
        roleName,
        permissions: perms,
        updatedAt: new Date()
      };

      if (role) {
        // Update existing
        await updateDoc(doc(db, 'roles', role.id), roleData);
        await logAudit('UPDATE_ROLE', 'roles', role.id, { roleName });
      } else {
        // Create new
        roleData.createdBy = auth.currentUser.uid;
        roleData.createdAt = new Date();
        roleData.isSystemRole = false;
        
        const docRef = await addDoc(collection(db, 'roles'), roleData);
        await logAudit('CREATE_ROLE', 'roles', docRef.id, { roleName });
      }

      onSave();
      onClose();
    } catch (error) {
      alert('Error saving role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (collection, action) => {
    setPerms(prev => ({
      ...prev,
      [collection]: {
        ...prev[collection],
        [action]: !prev[collection][action]
      }
    }));
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const collections = ['jobs', 'employees', 'contractors', 'rates', 'users', 'roles'];
  const actions = ['create', 'read', 'update', 'delete'];

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>{role ? 'Edit Role' : 'Create New Role'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="form-group">
              <label>Role Name</label>
              <input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
                placeholder="e.g., Office Manager, Field Supervisor"
              />
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>Permissions</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Collection</th>
                    {actions.map(action => (
                      <th key={action} style={{ textAlign: 'center', padding: '12px', textTransform: 'capitalize' }}>
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {collections.map(coll => (
                    <tr key={coll} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '12px', textTransform: 'capitalize', fontWeight: '500' }}>
                        {coll}
                      </td>
                      {actions.map(action => (
                        <td key={action} style={{ textAlign: 'center', padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={perms[coll]?.[action] || false}
                            onChange={() => togglePermission(coll, action)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px', textTransform: 'capitalize', fontWeight: '500' }}>
                      Audit Log
                    </td>
                    <td colSpan="3"></td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <input
                        type="checkbox"
                        checked={perms.auditLog?.read || false}
                        onChange={() => setPerms(prev => ({
                          ...prev,
                          auditLog: { read: !prev.auditLog?.read }
                        }))}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RoleManager;