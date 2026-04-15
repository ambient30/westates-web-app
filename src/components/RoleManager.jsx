import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from '../utils/firestoreTracker';
import { db } from '../firebase';

// Available tabs/features for permission management
const AVAILABLE_PERMISSIONS = [
  { id: 'jobs', name: 'Jobs', description: 'View and manage jobs' },
  { id: 'employees', name: 'Employees', description: 'View and manage employees' },
  { id: 'contractors', name: 'Contractors', description: 'View and manage contractors' },
  { id: 'timeEntry', name: 'Time Entry', description: 'Enter and manage time' },
  { id: 'availability', name: 'Availability', description: 'Manage employee availability' },
  { id: 'invoicing', name: 'Invoicing', description: 'View and generate invoices' },
  { id: 'payroll', name: 'Payroll', description: 'View and generate payroll' },
  { id: 'pinks', name: 'Pinks', description: 'View pink sheets' },
  { id: 'rates', name: 'Rates', description: 'Manage rate cards' },
  { id: 'users', name: 'User Management', description: 'Manage system users' },
  { id: 'roles', name: 'Role Management', description: 'Manage user roles' },
  { id: 'settings', name: 'Settings', description: 'System settings' },
  { id: 'auditLog', name: 'Audit Log', description: 'View audit logs' }
];

// ✅ CORRECT permission levels matching your existing roles
const PERMISSION_LEVELS = ['read', 'create', 'update', 'delete'];

function RoleManager() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    console.log('🔴 Setting up roles listener');

    const unsubscribe = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const rolesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`🔄 Roles updated: ${rolesList.length} roles`);
      if (rolesList.length > 0) {
        console.log('Sample role:', rolesList[0]);
      }
      setRoles(rolesList);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading roles:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateRole = () => {
    setShowCreateModal(true);
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  const handleDeleteRole = async (role) => {
    if (!confirm(`Delete role "${role.name || role.roleName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'roles', role.id));
      alert('Role deleted successfully!');
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role: ' + error.message);
    }
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedRole(null);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading roles...</div>;
  }

  if (roles.length === 0) {
    return (
      <div style={{ padding: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ fontSize: '20px', margin: 0 }}>
            Role Management (0)
          </h2>
          <button 
            onClick={handleCreateRole}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            + Add Role
          </button>
        </div>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#999',
          background: '#f5f5f5',
          borderRadius: '4px'
        }}>
          No roles found. Click "+ Add Role" to create one.
        </div>
        
        {showCreateModal && (
          <CreateRoleModal onClose={handleCloseModals} />
        )}
      </div>
    );
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
          Role Management ({roles.length})
        </h2>
        <button 
          onClick={handleCreateRole}
          className="btn btn-primary"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          + Add Role
        </button>
      </div>

      {/* Roles Grid */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '16px'
      }}>
        {roles.map(role => {
          const permissions = role.permissions || {};
          const permissionCount = Object.keys(permissions).length;
          const roleName = role.name || role.roleName || 'Unnamed Role';

          return (
            <div
              key={role.id}
              style={{
                background: 'white',
                border: '2px solid ' + (role.color || '#e0e0e0'),
                borderRadius: '8px',
                padding: '16px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  background: role.color || '#e0e0e0',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  {roleName}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEditRole(role)}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role)}
                    style={{
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ 
                fontSize: '13px',
                color: '#5f6368',
                marginBottom: '12px',
                minHeight: '40px'
              }}>
                {role.description || 'No description'}
              </div>

              <div style={{
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                  Permissions ({permissionCount})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Object.entries(permissions).map(([key, perms]) => {
                    const feature = AVAILABLE_PERMISSIONS.find(p => p.id === key);
                    if (!feature) return null;

                    // ✅ Check permissions using YOUR format
                    const hasRead = perms?.read === true;
                    const hasCreate = perms?.create === true;
                    const hasUpdate = perms?.update === true;
                    const hasDelete = perms?.delete === true;

                    let accessLevel = '';
                    if (hasRead && hasCreate && hasUpdate && hasDelete) {
                      accessLevel = 'Full';
                    } else if (hasRead && hasUpdate) {
                      accessLevel = 'Edit';
                    } else if (hasRead) {
                      accessLevel = 'View';
                    } else {
                      accessLevel = 'Custom';
                    }

                    return (
                      <span
                        key={key}
                        style={{
                          background: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          border: '1px solid #e0e0e0'
                        }}
                      >
                        {feature.name}: {accessLevel}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <CreateRoleModal onClose={handleCloseModals} />
      )}

      {showEditModal && selectedRole && (
        <EditRoleModal role={selectedRole} onClose={handleCloseModals} />
      )}
    </div>
  );
}

// Create Role Modal
function CreateRoleModal({ onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1a73e8',
    permissions: {}
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (featureId, level) => {
    setFormData(prev => {
      const currentPerms = prev.permissions[featureId] || {};
      
      // ✅ Use YOUR permission format: {read: true, create: true, etc.}
      const newPerms = {
        ...currentPerms,
        [level]: !currentPerms[level]
      };

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [featureId]: newPerms
        }
      };
    });
  };

  const handleCreate = async () => {
    if (!formData.name) {
      alert('Role name is required!');
      return;
    }

    try {
      const roleId = formData.name.toLowerCase().replace(/\s+/g, '_');
      
      // ✅ Save in YOUR format exactly
      await setDoc(doc(db, 'roles', roleId), {
        name: formData.name,
        roleName: formData.name,  // Add both for compatibility
        description: formData.description,
        color: formData.color,
        permissions: formData.permissions,  // Already in correct format
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      alert('Role created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Failed to create role: ' + error.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>Create New Role</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="form-group">
            <label>Role Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Manager, Supervisor, Admin"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe this role's responsibilities..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              style={{ width: '100px', height: '40px' }}
            />
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: '600', marginTop: '20px', marginBottom: '12px' }}>
            Permissions
          </h3>

          <PermissionsMatrix
            permissions={formData.permissions}
            onPermissionToggle={handlePermissionToggle}
          />
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleCreate} className="btn btn-primary">
            Create Role
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Role Modal
function EditRoleModal({ role, onClose }) {
  const [formData, setFormData] = useState({
    name: role.name || role.roleName || '',
    description: role.description || '',
    color: role.color || '#1a73e8',
    permissions: role.permissions || {}
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (featureId, level) => {
    setFormData(prev => {
      const currentPerms = prev.permissions[featureId] || {};
      
      const newPerms = {
        ...currentPerms,
        [level]: !currentPerms[level]
      };

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [featureId]: newPerms
        }
      };
    });
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'roles', role.id), {
        name: formData.name,
        roleName: formData.name,
        description: formData.description,
        color: formData.color,
        permissions: formData.permissions,
        updatedAt: new Date()
      });

      alert('Role updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role: ' + error.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>Edit Role: {role.name || role.roleName}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="form-group">
            <label>Role Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              style={{ width: '100px', height: '40px' }}
            />
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: '600', marginTop: '20px', marginBottom: '12px' }}>
            Permissions
          </h3>

          <PermissionsMatrix
            permissions={formData.permissions}
            onPermissionToggle={handlePermissionToggle}
          />
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

// Permissions Matrix
function PermissionsMatrix({ permissions, onPermissionToggle }) {
  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', width: '30%' }}>
              Feature
            </th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', width: '17.5%' }}>
              Read
            </th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', width: '17.5%' }}>
              Create
            </th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', width: '17.5%' }}>
              Update
            </th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', width: '17.5%' }}>
              Delete
            </th>
          </tr>
        </thead>
        <tbody>
          {AVAILABLE_PERMISSIONS.map((feature, index) => {
            const featurePerms = permissions[feature.id] || {};

            return (
              <tr
                key={feature.id}
                style={{
                  background: index % 2 === 0 ? 'white' : '#fafafa',
                  borderBottom: '1px solid #e0e0e0'
                }}
              >
                <td style={{ padding: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>
                    {feature.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5f6368' }}>
                    {feature.description}
                  </div>
                </td>
                {PERMISSION_LEVELS.map(level => (
                  <td key={level} style={{ padding: '12px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={featurePerms[level] === true}
                      onChange={() => onPermissionToggle(feature.id, level)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default RoleManager;
