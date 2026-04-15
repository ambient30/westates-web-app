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

  useEffect(() => {
    console.log('🔴 Setting up employees listener (active only)');
    
    // Real-time listener for active employees only
    const employeesQuery = query(
      collection(db, 'employees'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(employeesQuery, (snapshot) => {
      const employeesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`🔄 Employees updated: ${employeesList.length} active employees`);
      setEmployees(employeesList);
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

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '12px'
      }}>
        {employees.map(employee => (
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
              ':hover': {
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#1a73e8';
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
              {employee.fullName || employee.name || 'Unnamed Employee'}
            </div>

            <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
              {employee.phone && (
                <div>📞 {employee.phone}</div>
              )}
              {employee.email && (
                <div>✉️ {employee.email}</div>
              )}
              {employee.payRate && (
                <div>💰 ${employee.payRate}/hr</div>
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
        ))}
      </div>

      {employees.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#999',
          background: '#f5f5f5',
          borderRadius: '4px'
        }}>
          No active employees found. Click "+ Add Employee" to create one.
        </div>
      )}

      {/* Details Modal - Uses dynamic EmployeeDetailsModal */}
      {showDetailsModal && selectedEmployee && (
        <EmployeeDetailsModal
          employee={selectedEmployee}
          onClose={handleCloseModals}
        />
      )}

      {/* Edit Modal - Uses dynamic EditEmployeeModal */}
      {showEditModal && selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          permissions={permissions}
          onClose={handleCloseModals}
          onSave={handleSave}
        />
      )}

      {/* Create Modal - Uses dynamic CreateEmployeeModal */}
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
