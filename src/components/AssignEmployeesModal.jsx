import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function AssignEmployeesModal({ job, onClose, onSave }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [equipmentCarriers, setEquipmentCarriers] = useState([]);
  const [timeOff, setTimeOff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadTimeOff();
  }, []);

  const loadEmployees = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const employeesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmployees(employeesData);

      // Pre-select already assigned employees
      const assigned = job.assignedFlaggers 
        ? job.assignedFlaggers.split(',').map(name => name.trim()).filter(Boolean)
        : [];
      setSelectedEmployees(assigned);

      // Pre-select equipment carriers
      const carriers = job.equipmentCarrier
        ? job.equipmentCarrier.split(',').map(name => name.trim()).filter(Boolean)
        : [];
      setEquipmentCarriers(carriers);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeOff = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'timeOff'));
      const timeOffData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTimeOff(timeOffData);
    } catch (err) {
      console.error('Error loading time off:', err);
    }
  };

  const getTimeOffForEmployee = (employeeName, jobDate) => {
    if (!jobDate) return null;

    const jobDateObj = new Date(jobDate);
    jobDateObj.setHours(0, 0, 0, 0);

    return timeOff.find(to => {
      if (to.employeeName !== employeeName) return false;

      const startDate = new Date(to.startDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(to.endDate);
      endDate.setHours(0, 0, 0, 0);

      return jobDateObj >= startDate && jobDateObj <= endDate;
    });
  };

  const hasTimeConflict = (employeeName, jobDate, jobTime) => {
    if (!jobDate || !jobTime) return false;

    const employeeTimeOff = getTimeOffForEmployee(employeeName, jobDate);
    if (!employeeTimeOff) return false;

    // Full day off
    if (employeeTimeOff.fullDay) return true;

    // Partial day - check time overlap
    if (employeeTimeOff.startTime && employeeTimeOff.endTime) {
      const jobTimeStr = jobTime.toLowerCase().replace(/\s/g, '');
      const timeOffStart = employeeTimeOff.startTime.toLowerCase().replace(/\s/g, '');
      const timeOffEnd = employeeTimeOff.endTime.toLowerCase().replace(/\s/g, '');

      // Simple time conflict check
      return true; // For now, warn on any partial day overlap
    }

    return false;
  };

  const toggleEmployee = (employeeName) => {
    if (selectedEmployees.includes(employeeName)) {
      setSelectedEmployees(prev => prev.filter(name => name !== employeeName));
      setEquipmentCarriers(prev => prev.filter(name => name !== employeeName));
    } else {
      setSelectedEmployees(prev => [...prev, employeeName]);
    }
  };

  const toggleEquipmentCarrier = (employeeName) => {
    if (equipmentCarriers.includes(employeeName)) {
      setEquipmentCarriers(prev => prev.filter(name => name !== employeeName));
    } else {
      setEquipmentCarriers(prev => [...prev, employeeName]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const assignedNames = selectedEmployees.join(', ');
      const carrierNames = equipmentCarriers.join(', ');

      await updateDoc(doc(db, 'jobs', job.id), {
        assignedFlaggers: assignedNames,
        equipmentCarrier: carrierNames,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });

      await logAudit('ASSIGN_EMPLOYEES', 'jobs', job.jobID, {
        assignedFlaggers: assignedNames,
        equipmentCarrier: carrierNames
      });

      onSave();
      onClose();
    } catch (err) {
      alert('Error assigning employees: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>Loading employees...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Assign Employees: {job.jobID}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div style={{ 
            background: '#f8f9fa', 
            padding: '12px', 
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            <strong>{job.caller}</strong> • {job.location}<br />
            {job.initialJobDate} • {job.initialJobTime}
          </div>

          <p style={{ fontSize: '14px', color: '#5f6368', marginBottom: '16px' }}>
            Select employees to assign. Click the truck icon to designate equipment carriers.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {employees.map(employee => {
              const isSelected = selectedEmployees.includes(employee.fullName);
              const isCarrier = equipmentCarriers.includes(employee.fullName);
              const employeeTimeOff = getTimeOffForEmployee(employee.fullName, job.initialJobDate);
              const hasConflict = hasTimeConflict(employee.fullName, job.initialJobDate, job.initialJobTime);

              return (
                <div
                  key={employee.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    background: isSelected ? '#e8f5e9' : '#fff',
                    border: `2px solid ${isSelected ? '#4caf50' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleEmployee(employee.fullName)}
                    style={{
                      marginRight: '12px',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {employee.fullName}
                      {employeeTimeOff && (
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '12px',
                          color: hasConflict ? '#d32f2f' : '#f57c00',
                          fontWeight: '600'
                        }}>
                          {employeeTimeOff.fullDay ? '📅 Day Off' : '⏰ Partial Day Off'}
                        </span>
                      )}
                    </div>
                    {employeeTimeOff && (
                      <div style={{ fontSize: '12px', color: '#5f6368' }}>
                        {employeeTimeOff.fullDay 
                          ? `Off all day: ${employeeTimeOff.reason || 'No reason'}`
                          : `Off ${employeeTimeOff.startTime} - ${employeeTimeOff.endTime}: ${employeeTimeOff.reason || 'No reason'}`
                        }
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <button
                      onClick={() => toggleEquipmentCarrier(employee.fullName)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        background: isCarrier ? '#ff9800' : '#e0e0e0',
                        color: isCarrier ? 'white' : '#5f6368',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isCarrier ? '🚛 Carrier' : 'Make Carrier'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : `Assign ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignEmployeesModal;