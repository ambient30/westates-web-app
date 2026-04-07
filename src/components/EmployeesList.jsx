import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import CreateEmployeeModal from './CreateEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';

function EmployeesList({ permissions }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canUpdate = hasPermission(permissions, 'employees', 'update');
  const canCreate = hasPermission(permissions, 'employees', 'create');

  useEffect(() => {
    console.log('🔴 Setting up REAL-TIME listener for employees...');
    
    // REAL-TIME listener for ACTIVE employees only
    const employeesQuery = query(
      collection(db, 'employees'),
      where('isActive', '==', true)
    );
    
    const unsubscribe = onSnapshot(
      employeesQuery,
      (snapshot) => {
        console.log(`🔄 Employees updated! ${snapshot.docs.length} active employees`);
        
        const employeesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by full name
        employeesData.sort((a, b) => {
          const nameA = a.fullName || '';
          const nameB = b.fullName || '';
          return nameA.localeCompare(nameB);
        });
        
        setEmployees(employeesData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in employees listener:', error);
        setLoading(false);
      }
    );
    
    // Cleanup on unmount
    return () => {
      console.log('🔴 Cleaning up employees listener');
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading employees...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="employees-header">
        <h2>Employees</h2>
        <div className="employees-actions">
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + New Employee
            </button>
          )}
          <div style={{ fontSize: '12px', color: '#4caf50', marginLeft: '12px' }}>
            🟢 Live sync active
          </div>
        </div>
      </div>

      <div className="employees-list">
        {employees.length === 0 ? (
          <div className="empty-state">
            <h3>No active employees found</h3>
            <p>Create your first employee to get started</p>
          </div>
        ) : (
          <div className="employees-grid">
            {employees.map(employee => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                canUpdate={canUpdate}
                onEdit={setEditingEmployee}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateEmployeeModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            // No manual reload needed - onSnapshot handles it!
          }}
        />
      )}

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={() => {
            setEditingEmployee(null);
            // No manual reload needed - onSnapshot handles it!
          }}
        />
      )}
    </div>
  );
}

function EmployeeCard({ employee, canUpdate, onEdit }) {
  return (
    <div className="employee-card">
      <div className="employee-info">
        <h3>{employee.fullName || 'Unnamed Employee'}</h3>
        
        <div className="employee-details">
          {employee.phone && (
            <div className="detail-row">
              <span className="label">Phone:</span>
              <span>{employee.phone}</span>
            </div>
          )}
          
          {employee.email && (
            <div className="detail-row">
              <span className="label">Email:</span>
              <span>{employee.email}</span>
            </div>
          )}
          
          {employee.hourlyRate && (
            <div className="detail-row">
              <span className="label">Hourly Rate:</span>
              <span>${employee.hourlyRate}/hr</span>
            </div>
          )}
          
          {employee.signs && (
            <div className="detail-row">
              <span className="label">Signs:</span>
              <span>{employee.signs}</span>
            </div>
          )}
          
          {employee.cones && (
            <div className="detail-row">
              <span className="label">Cones:</span>
              <span>{employee.cones}</span>
            </div>
          )}
        </div>
      </div>
      
      {canUpdate && (
        <div className="employee-actions">
          <button 
            onClick={() => onEdit(employee)} 
            className="btn btn-secondary btn-small"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

export default EmployeesList;
