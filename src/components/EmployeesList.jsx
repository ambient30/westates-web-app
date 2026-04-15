import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from '../utils/firestoreTracker';
import { db } from '../firebase';
import EmployeeDetailsModal from './EmployeeDetailsModal';
import EditEmployeeModal from './EditEmployeeModal';
import CreateEmployeeModal from './CreateEmployeeModal';

function EmployeesList({ permissions }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Track which groups are expanded (active expanded by default, inactive collapsed)
  const [expandedGroups, setExpandedGroups] = useState({
    active: true,    // Expanded by default
    inactive: false  // Collapsed by default
  });

  useEffect(() => {
    console.log('🔴 Setting up employees listener (all employees)');
    
    // Real-time listener for ALL employees (no filter - let client-side handle grouping)
    const employeesRef = collection(db, 'employees');

    const unsubscribe = onSnapshot(employeesRef, (snapshot) => {
      const employeesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`🔄 Employees updated: ${employeesList.length} total employees`);
      if (employeesList.length > 0) {
        console.log('First employee fields:', Object.keys(employeesList[0]));
      }
      setEmployees(employeesList);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading employees:', error);
      setLoading(false);
    });

    return () => {
      console.log('🔴 Cleaning up employees listener');
      unsubscribe();
    };
  }, []);

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowDetailsModal(false);
    setShowEditModal(false);
    setShowCreateModal(false);
    setSelectedEmployee(null);
  };

  const handleSave = () => {
    handleCloseModals();
    // Real-time listener will auto-update the list
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Group employees by isActive
  const activeEmployees = employees.filter(emp => emp.isActive !== false);
  const inactiveEmployees = employees.filter(emp => emp.isActive === false);

  // Sort each group alphabetically by name
  const sortByName = (a, b) => {
    const nameA = (a.fullName || a.name || '').toLowerCase();
    const nameB = (b.fullName || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  };

  activeEmployees.sort(sortByName);
  inactiveEmployees.sort(sortByName);

  const groups = [
    { 
      key: 'active', 
      label: 'Active', 
      employees: activeEmployees,
      color: '#1a73e8',      // Blue
      bgColor: '#f0f7ff',
      borderColor: '#1a73e8'
    },
    { 
      key: 'inactive', 
      label: 'Inactive', 
      employees: inactiveEmployees,
      color: '#5f6368',      // Gray
      bgColor: '#f5f5f5',
      borderColor: '#9e9e9e'
    }
  ];

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading employees...</div>;
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
          Employees ({employees.length})
        </h2>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          + Add Employee
        </button>
      </div>

      {employees.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#999',
          background: '#f5f5f5',
          borderRadius: '4px'
        }}>
          No employees found. Click "+ Add Employee" to create one.
        </div>
      ) : (
        groups.map(group => {
          const isExpanded = expandedGroups[group.key];
          const employeesInGroup = group.employees;

          // Don't show group if it has no employees
          if (employeesInGroup.length === 0) return null;

          return (
            <div key={group.key} style={{ marginBottom: '12px' }}>
              {/* Collapsible Group Header */}
              <div
                onClick={() => toggleGroup(group.key)}
                style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: group.color,
                  padding: '12px',
                  background: group.bgColor,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: `1px solid ${group.borderColor}`,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Expand/Collapse Arrow */}
                  <span style={{ 
                    fontSize: '14px',
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    display: 'inline-block'
                  }}>
                    ▶
                  </span>
                  <span>{group.label}</span>
                </div>
                <span style={{ 
                  fontSize: '14px',
                  background: group.color,
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px'
                }}>
                  {employeesInGroup.length}
                </span>
              </div>

              {/* Employees in this group (only shown when expanded) */}
              {isExpanded && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '12px',
                  marginTop: '12px',
                  paddingLeft: '24px'
                }}>
                  {employeesInGroup.map(employee => {
                    const displayName = employee.fullName || employee.name || 'Unnamed Employee';
                    const role = employee.role || employee.position || '';
                    
                    return (
                      <div
                        key={employee.id}
                        onClick={() => handleEmployeeClick(employee)}
                        style={{
                          padding: '12px',
                          background: 'white',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          opacity: employee.isActive === false ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          e.currentTarget.style.borderColor = group.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = '#e0e0e0';
                        }}
                      >
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600',
                          marginBottom: '8px',
                          color: '#202124'
                        }}>
                          {displayName}
                        </div>

                        <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
                          {role && (
                            <div>👤 {role}</div>
                          )}
                          {employee.phone && (
                            <div>📞 {employee.phone}</div>
                          )}
                          {employee.email && (
                            <div>✉️ {employee.email}</div>
                          )}
                          {employee.payRate && (
                            <div>💵 ${employee.payRate}/hr</div>
                          )}
                        </div>

                        <div style={{ 
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #f0f0f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '10px', color: '#999' }}>
                            Click to view details
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(employee);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '10px', padding: '4px 8px' }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <EmployeeDetailsModal
          employee={selectedEmployee}
          onClose={handleCloseModals}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          onClose={handleCloseModals}
          onSave={handleSave}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateEmployeeModal
          onClose={handleCloseModals}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default EmployeesList;
