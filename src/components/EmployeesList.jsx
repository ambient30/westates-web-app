import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import { logFirestoreOperation } from '../utils/firebaseUsageLogger';
import CreateEmployeeModal from './CreateEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';

function EmployeesList({ permissions }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const canCreate = hasPermission(permissions, 'employees', 'create');
  const canUpdate = hasPermission(permissions, 'employees', 'update');
  const canDelete = hasPermission(permissions, 'employees', 'delete');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const employeesRef = collection(db, 'employees');
      const snapshot = await getDocs(employeesRef);
      
      // LOG THE READS
      await logFirestoreOperation('reads', snapshot.docs.length);
      
      let employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort alphabetically by first name
      employeesData.sort((a, b) => {
        const nameA = a.fullName || '';
        const nameB = b.fullName || '';
        return nameA.localeCompare(nameB);
      });
      
      setEmployees(employeesData);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const search = searchTerm.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search) ||
      emp.cellPhone?.toLowerCase().includes(search) ||
      emp.employeeUID?.toString().includes(search)
    );
  });

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
      <div className="jobs-header">
        <h2>Employees</h2>
        <div className="jobs-actions">
          <input
            type="text"
            placeholder="Search employees..."
            className="search-box"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + New Employee
            </button>
          )}
          <button onClick={loadEmployees} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="empty-state">
          <h3>No employees found</h3>
          <p>
            {searchTerm 
              ? 'Try a different search term' 
              : 'No employees in the system yet'}
          </p>
        </div>
      ) : (
        <div className="compact-grid">
          {filteredEmployees.map(employee => (
            <EmployeeCard 
              key={employee.id} 
              employee={employee}
              onClick={() => setSelectedEmployee(employee)}
            />
          ))}
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailsModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onEdit={() => {
            setEditingEmployee(selectedEmployee);
            setSelectedEmployee(null);
          }}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onUpdate={loadEmployees}
        />
      )}

      {showCreateModal && (
        <CreateEmployeeModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            loadEmployees();
          }}
        />
      )}

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={() => {
            setEditingEmployee(null);
            loadEmployees();
          }}
        />
      )}
    </div>
  );
}

function EmployeeCard({ employee, onClick }) {
  return (
    <div 
      className="employee-card-compact" 
      onClick={onClick}
    >
      <div className="employee-card-header">
        <span className="employee-name">{employee.fullName || 'Unknown'}</span>
        {employee.employeeUID && (
          <span className="employee-uid">#{employee.employeeUID}</span>
        )}
      </div>
      
      <div className="employee-card-body">
        <div className="employee-info-row">
          <span className="info-icon">📱</span>
          <span className="info-text">{employee.cellPhone || 'No phone'}</span>
        </div>
        <div className="employee-info-row">
          <span className="info-icon">
            {employee.isActive ? '✅' : '⏸️'}
          </span>
          <span className="info-text">
            {employee.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmployeeDetailsModal({ employee, onClose, onEdit, canUpdate, canDelete, onUpdate }) {
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    if (typeof dateValue === 'string') return dateValue;
    if (dateValue.toDate) return dateValue.toDate().toLocaleDateString();
    return 'N/A';
  };

  const formatBoolean = (value) => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return 'N/A';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return formatBoolean(value);
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  // Get custom parameters
  const customParams = employee.custom || {};
  const hasCustomParams = Object.keys(customParams).length > 0;

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>{employee.fullName || 'Employee Details'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Contact Information */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Contact Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <InfoField label="Full Name" value={employee.fullName} />
            <InfoField label="Employee UID" value={employee.employeeUID} />
            <InfoField label="Cell Phone" value={employee.cellPhone} />
            <InfoField label="Second Phone" value={employee.secondPhone} />
            <InfoField label="Email" value={employee.email} />
            <InfoField label="Address" value={employee.address} />
          </div>

          {/* Employment Information */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Employment Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <InfoField label="Status" value={employee.isActive ? 'Active' : 'Inactive'} />
            <InfoField label="Date of Hire" value={formatDate(employee.doh)} />
            <InfoField label="Pay Rate" value={employee.payRate ? `$${employee.payRate}/hr` : 'N/A'} />
            <InfoField label="Custom Rate" value={employee.customRate ? `$${employee.customRate}/hr` : 'N/A'} />
            <InfoField label="Long Term" value={formatBoolean(employee.longTerm)} />
            <InfoField label="DMV Unacceptable" value={formatBoolean(employee.dmvUnacceptable)} />
          </div>

          {/* Certifications & Licenses */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Certifications & Licenses</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <InfoField label="Flagger Card #" value={employee.flaggerCardNum} />
            <InfoField label="Flagger Card Expiry" value={formatDate(employee.flaggerCardExpire)} />
            <InfoField label="Auto Insurance Expiry" value={formatDate(employee.autoInsurExpire)} />
            <InfoField label="Auto Insurance Policy #" value={employee.autoInsurPolicyNum} />
            <InfoField label="Other Certifications" value={employee.otherCerts} />
          </div>

          {/* Equipment & Capabilities */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Equipment & Capabilities</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <InfoField label="Signs" value={employee.signs} />
            <InfoField label="Extra Signs" value={employee.extraSigns} />
            <InfoField label="Cones" value={employee.cones} />
            <InfoField label="Stands" value={employee.stands} />
            <InfoField label="Other Equipment" value={employee.otherEquipment} />
          </div>

          {/* Restrictions & Preferences */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Restrictions & Preferences</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <InfoField label="No Contractors" value={employee.noContractors} />
            <InfoField label="No Flaggers" value={employee.noFlaggers} />
          </div>

          {/* Benefits */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Benefits</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <InfoField label="Medical Insurance" value={employee.medicalInsurance} />
            <InfoField label="401(k)" value={employee.retirement401k} />
          </div>

          {/* Notes */}
          {employee.notes && (
            <>
              <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Notes</h3>
              <div style={{ 
                background: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '4px',
                marginBottom: '24px',
                whiteSpace: 'pre-wrap'
              }}>
                {employee.notes}
              </div>
            </>
          )}

          {/* Custom Parameters */}
          {hasCustomParams && (
            <>
              <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Custom Parameters</h3>
              <div style={{ 
                background: '#fff3e0', 
                padding: '16px', 
                borderRadius: '4px',
                marginBottom: '24px',
                border: '1px solid #ffb74d'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  {Object.entries(customParams).map(([key, value]) => (
                    <InfoField 
                      key={key} 
                      label={key} 
                      value={formatValue(value)}
                      isCustom={true}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>System Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <InfoField label="Created At" value={formatDate(employee.createdAt)} />
            <InfoField label="Updated At" value={formatDate(employee.updatedAt)} />
            <InfoField label="Created By" value={employee.createdBy} />
            <InfoField label="Updated By" value={employee.updatedBy} />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          {canUpdate && (
            <button onClick={onEdit} className="btn btn-primary">
              Edit
            </button>
          )}
          {canDelete && (
            <button className="btn btn-secondary" style={{ color: '#c5221f' }}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, isCustom = false }) {
  return (
    <div>
      <div style={{ 
        fontSize: '12px', 
        color: isCustom ? '#e65100' : '#5f6368', 
        marginBottom: '4px',
        fontWeight: isCustom ? '600' : '400'
      }}>
        {label} {isCustom && '⭐'}
      </div>
      <div style={{ fontSize: '14px', color: '#202124', fontWeight: '500' }}>
        {value || 'N/A'}
      </div>
    </div>
  );
}

export default EmployeesList;
