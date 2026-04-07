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
        
        // Sort alphabetically by full name
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
    <div style={{ padding: '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Employees</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + New Employee
            </button>
          )}
          <div style={{ fontSize: '11px', color: '#4caf50' }}>
            🟢 Live sync active
          </div>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="empty-state">
          <h3>No active employees found</h3>
          <p>Create your first employee to get started</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '8px'
        }}>
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

      {showCreateModal && (
        <CreateEmployeeModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
          }}
        />
      )}

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={() => {
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}

function EmployeeCard({ employee, canUpdate, onEdit }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div 
        onClick={() => setShowDetails(true)}
        style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          padding: '8px 10px',
          cursor: 'pointer',
          transition: 'background 0.2s',
          ':hover': {
            background: '#f8f9fa'
          }
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
      >
        {/* Name */}
        <div style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#202124',
          marginBottom: '4px'
        }}>
          {employee.fullName || 'Unnamed Employee'}
        </div>

        {/* Phone */}
        <div style={{
          fontSize: '11px',
          color: '#5f6368'
        }}>
          {employee.cellPhone || employee.phone || employee.secondPhone || 'No phone'}
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <EmployeeDetailsModal
          employee={employee}
          onClose={() => setShowDetails(false)}
          onEdit={() => {
            setShowDetails(false);
            onEdit(employee);
          }}
          canUpdate={canUpdate}
        />
      )}
    </>
  );
}

function EmployeeDetailsModal({ employee, onClose, onEdit, canUpdate }) {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '2px solid #e0e0e0'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            {employee.fullName || 'Employee Details'}
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px',
              color: '#5f6368'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Contact Info */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px' 
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5f6368' }}>
              Contact Information
            </h3>
            <DetailRow label="Cell Phone" value={employee.cellPhone} />
            <DetailRow label="Phone" value={employee.phone} />
            <DetailRow label="Second Phone" value={employee.secondPhone} />
            <DetailRow label="Email" value={employee.email} />
            <DetailRow label="Address" value={employee.address} />
          </div>

          {/* Pay Info */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px' 
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5f6368' }}>
              Pay Information
            </h3>
            <DetailRow label="Pay Rate" value={employee.payRate ? `$${employee.payRate}/hr` : null} />
            <DetailRow label="Custom Rate" value={employee.customRate ? `$${employee.customRate}/hr` : null} />
            <DetailRow label="OT Starts" value={employee.otStarts ? `${employee.otStarts} hrs` : null} />
            <DetailRow label="Minimum Hours" value={employee.hourMinimum ? `${employee.hourMinimum} hrs` : null} />
            <DetailRow label="401k Retirement" value={employee.retirement401k} />
          </div>

          {/* Equipment */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px' 
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5f6368' }}>
              Equipment
            </h3>
            <DetailRow label="Signs" value={employee.signs} />
            <DetailRow label="Extra Signs" value={employee.extraSigns} />
            <DetailRow label="Cones" value={employee.cones && parseInt(employee.cones) > 0 ? employee.cones : null} />
            <DetailRow label="Stands" value={employee.stands && parseInt(employee.stands) > 0 ? employee.stands : null} />
            <DetailRow label="Other Equipment" value={employee.otherEquipment} />
          </div>

          {/* Certifications & Licenses */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px' 
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5f6368' }}>
              Certifications & Licenses
            </h3>
            <DetailRow label="Certifications" value={employee.certifications} />
            <DetailRow label="Other Certs" value={employee.otherCerts} />
            <DetailRow label="Flagger Card #" value={employee.flaggerCardNum} />
            <DetailRow label="Flagger Card Expires" value={employee.flaggerCardExpire} />
          </div>

          {/* Insurance & Documentation */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px' 
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5f6368' }}>
              Insurance & Documentation
            </h3>
            <DetailRow label="Auto Insurance Policy #" value={employee.autoInsurPolicyNum} />
            <DetailRow label="Auto Insurance Expires" value={employee.autoInsurExpire} />
            <DetailRow label="Medical Insurance" value={employee.medicalInsurance} />
            <DetailRow label="DMV Unacceptable" value={employee.dmvUnacceptable ? 'Yes' : 'No'} />
          </div>

          {/* Employment Details */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px' 
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5f6368' }}>
              Employment Details
            </h3>
            <DetailRow label="Date of Hire" value={employee.doh} />
            <DetailRow label="Long Term" value={employee.longTerm ? 'Yes' : 'No'} />
            <DetailRow label="Employee UID" value={employee.employeeUID} />
            <DetailRow label="Active" value={employee.isActive ? 'Yes' : 'No'} />
          </div>

          {/* Restrictions & Notes */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px' 
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5f6368' }}>
              Restrictions & Notes
            </h3>
            <DetailRow label="No Contractors" value={employee.noContractors} />
            <DetailRow label="No Flaggers" value={employee.noFlaggers} />
            <DetailRow label="Notes" value={employee.notes} />
          </div>

          {/* System Info */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px' 
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5f6368' }}>
              System Information
            </h3>
            <DetailRow label="Created By" value={employee.createdBy} />
            <DetailRow label="Created At" value={employee.createdAt?.toDate?.()?.toLocaleString()} />
            <DetailRow label="Updated By" value={employee.updatedBy} />
            <DetailRow label="Updated At" value={employee.updatedAt?.toDate?.()?.toLocaleString()} />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e0e0e0'
        }}>
          {canUpdate && (
            <button 
              onClick={onEdit}
              className="btn btn-primary"
            >
              Edit Employee
            </button>
          )}
          <button 
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  
  return (
    <div style={{ 
      display: 'flex', 
      marginBottom: '6px',
      fontSize: '12px'
    }}>
      <span style={{ 
        fontWeight: '600', 
        minWidth: '120px',
        color: '#202124'
      }}>
        {label}:
      </span>
      <span style={{ color: '#5f6368' }}>
        {value}
      </span>
    </div>
  );
}

export default EmployeesList;
