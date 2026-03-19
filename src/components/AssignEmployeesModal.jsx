import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function AssignEmployeesModal({ job, onClose, onSave }) {
  const [employees, setEmployees] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [equipmentCarriers, setEquipmentCarriers] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(null);
  const [timeOffRecords, setTimeOffRecords] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesSnap, jobsSnap] = await Promise.all([
        getDocs(collection(db, 'employees')),
        getDocs(collection(db, 'jobs'))
      ]);

      let employeesData = employeesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      let jobsData = jobsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter active employees only
      employeesData = employeesData.filter(emp => emp.isActive !== false);

      // Sort alphabetically
      employeesData.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

      setEmployees(employeesData);
      setAllJobs(jobsData);
	  setTimeOffRecords(timeOffData);

      // Pre-select already assigned employees
      if (job.assignedFlaggers) {
        const assigned = job.assignedFlaggers.split(',').map(name => name.trim());
        const preSelected = employeesData
          .filter(emp => assigned.includes(emp.fullName))
          .map(emp => emp.id);
        setSelectedEmployees(preSelected);
      }

      // Pre-select equipment carriers
      if (job.equipmentCarrier) {
        const carriers = job.equipmentCarrier.split(',').map(name => name.trim());
        const preSelectedCarriers = employeesData
          .filter(emp => carriers.includes(emp.fullName))
          .map(emp => emp.id);
        setEquipmentCarriers(preSelectedCarriers);
      }

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeStatus = (employee) => {
    // Skip checking the current job
    const otherJobs = allJobs.filter(j => j.id !== job.id && j.initialJobDate === job.initialJobDate);
	  const timeOff = timeOffRecords.find(to => {
    return to.employeeName === employee.fullName && isDateInRange(job.initialJobDate, to.startDate, to.endDate);
  });

  if (timeOff) {
    if (timeOff.isPartialDay) {
      // Check if job time conflicts with time-off
      const jobTime = job.initialJobTime;
      const conflict = checkTimeConflict(jobTime, timeOff.startTime, timeOff.endTime);
      
      if (conflict) {
        return {
          status: 'timeoff_partial_conflict',
          timeOff,
          message: `Off ${timeOff.startTime} - ${timeOff.endTime} (${timeOff.reason})`
        };
      } else {
        return {
          status: 'timeoff_partial_available',
          timeOff,
          message: `Partial day off (${timeOff.startTime} - ${timeOff.endTime}), available for job`
        };
      }
    } else {
      return {
        status: 'timeoff',
        timeOff,
        message: `Day off - ${timeOff.reason}`
      };
    }
  }
    for (const otherJob of otherJobs) {
      // Check if dispatched
      if (otherJob.dispatchedFlaggers) {
        const dispatched = otherJob.dispatchedFlaggers.split(',').map(name => name.trim());
        if (dispatched.includes(employee.fullName)) {
          return {
            status: 'dispatched',
            job: otherJob,
            message: `Already dispatched to ${otherJob.jobID}`
          };
        }
      }

      // Check if assigned
      if (otherJob.assignedFlaggers) {
        const assigned = otherJob.assignedFlaggers.split(',').map(name => name.trim());
        if (assigned.includes(employee.fullName)) {
          return {
            status: 'assigned',
            job: otherJob,
            message: `Already assigned to ${otherJob.jobID}`
          };
        }
      }
    }

    return { status: 'available' };
  };
  const isDateInRange = (checkDate, startDate, endDate) => {
  const check = new Date(checkDate);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  check.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return check >= start && check <= end;
};

const checkTimeConflict = (jobTime, timeOffStart, timeOffEnd) => {
  if (!jobTime || !timeOffStart || !timeOffEnd) return false;

  // Convert to 24-hour for comparison
  const parseTime = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes; // Return minutes since midnight
  };

  const jobMinutes = parseTime(jobTime);
  const startMinutes = parseTime(timeOffStart);
  const endMinutes = parseTime(timeOffEnd);

  return jobMinutes >= startMinutes && jobMinutes < endMinutes;
};

  const toggleEmployee = (employeeId) => {
  const employee = employees.find(e => e.id === employeeId);
  const status = getEmployeeStatus(employee);

  // If already selected, just remove
  if (selectedEmployees.includes(employeeId)) {
    setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    setEquipmentCarriers(prev => prev.filter(id => id !== employeeId));
    return;
  }

  // If on day off or dispatched, show strong warning
  if (status.status === 'dispatched' || status.status === 'timeoff') {
    setShowWarning({
      employee,
      status,
      action: () => {
        setSelectedEmployees(prev => [...prev, employeeId]);
        setShowWarning(null);
      }
    });
    return;
  }

  // If partial day conflict or just assigned, show lighter warning
  if (status.status === 'assigned' || status.status === 'timeoff_partial_conflict') {
    setShowWarning({
      employee,
      status,
      action: () => {
        setSelectedEmployees(prev => [...prev, employeeId]);
        setShowWarning(null);
      }
    });
    return;
  }

  // Available or partial day but available - add directly
  setSelectedEmployees(prev => [...prev, employeeId]);
};

  const toggleEquipmentCarrier = (employeeId) => {
    if (equipmentCarriers.includes(employeeId)) {
      setEquipmentCarriers(prev => prev.filter(id => id !== employeeId));
    } else {
      setEquipmentCarriers(prev => [...prev, employeeId]);
    }
  };

  const handleSave = async () => {
  setSaving(true);
  try {
    // Get selected employee names
    const assignedNames = employees
      .filter(emp => selectedEmployees.includes(emp.id))
      .map(emp => emp.fullName)
      .join(', ');

    // Get equipment carrier names (just names, equipment comes from employee records)
    const carrierNames = employees
      .filter(emp => equipmentCarriers.includes(emp.id))
      .map(emp => emp.fullName)
      .join(', ');

    const updates = {
      assignedFlaggers: assignedNames,
      equipmentCarrier: carrierNames,
      // Remove the shared equipment fields - we'll get from employee records instead
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'unknown'
    };

    await updateDoc(doc(db, 'jobs', job.id), updates);
    await logAudit('ASSIGN_EMPLOYEES', 'jobs', job.jobID, { 
      assignedFlaggers: assignedNames,
      equipmentCarriers: carrierNames 
    });

    onSave();
    onClose();
  } catch (err) {
    alert('Error saving assignments: ' + err.message);
  } finally {
    setSaving(false);
  }
};

  const filteredEmployees = employees.filter(emp => {
    const search = searchTerm.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(search) ||
      emp.employeeUID?.toString().includes(search) ||
      emp.cellPhone?.toLowerCase().includes(search)
    );
  });

  // Group employees by status
const available = [];
const warnings = [];
const alreadyWorking = [];
const dayOff = [];
const partialDayOff = [];

filteredEmployees.forEach(emp => {
  const status = getEmployeeStatus(emp);
  
  if (status.status === 'available') {
    available.push(emp);
  } else if (status.status === 'timeoff') {
    dayOff.push({ ...emp, statusInfo: status });
  } else if (status.status === 'timeoff_partial_conflict') {
    partialDayOff.push({ ...emp, statusInfo: status });
  } else if (status.status === 'timeoff_partial_available') {
    partialDayOff.push({ ...emp, statusInfo: status });
  } else if (status.status === 'assigned') {
    warnings.push({ ...emp, statusInfo: status });
  } else if (status.status === 'dispatched') {
    alreadyWorking.push({ ...emp, statusInfo: status });
  }
});

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
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
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
          <div className="modal-header">
            <h2>Assign Employees: {job.jobID}</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Job Info */}
            <div style={{ 
              background: '#f8f9fa', 
              padding: '12px', 
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <strong>{job.caller}</strong> • {job.location} • {job.initialJobDate} {job.initialJobTime}
            </div>

            {/* Search */}
            <div className="form-group">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {/* Currently Assigned */}
            {selectedEmployees.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1a73e8' }}>
                  Currently Assigned ({selectedEmployees.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {employees.filter(emp => selectedEmployees.includes(emp.id)).map(emp => (
                    <div
                      key={emp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px',
                        background: '#e8f0fe',
                        border: '2px solid #1a73e8',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500' }}>
                          {emp.fullName}
                          {emp.employeeUID && (
                            <span style={{ 
                              marginLeft: '8px',
                              fontSize: '12px',
                              color: '#1a73e8',
                              background: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              #{emp.employeeUID}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#5f6368' }}>
                          {emp.cellPhone || 'No phone'}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleEmployee(emp.id)}
                        className="btn btn-secondary btn-small"
                        style={{ color: '#d32f2f' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment Carriers */}
            {selectedEmployees.length > 0 && (
              <div style={{ 
                marginBottom: '16px',
                padding: '16px',
                background: '#fff3e0',
                borderRadius: '8px',
                border: '2px solid #ffb74d'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#e65100' }}>
                  Equipment Carriers (Select who brings equipment)
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {employees.filter(emp => selectedEmployees.includes(emp.id)).map(emp => (
                    <label 
                      key={emp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        background: equipmentCarriers.includes(emp.id) ? '#fff8e1' : 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: equipmentCarriers.includes(emp.id) ? '1px solid #ffb74d' : '1px solid #e0e0e0'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={equipmentCarriers.includes(emp.id)}
                        onChange={() => toggleEquipmentCarrier(emp.id)}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontWeight: '500' }}>{emp.fullName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Available Employees */}
            {available.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#43a047' }}>
                  ✅ Available ({available.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {available.map(emp => (
                    <EmployeeRow
                      key={emp.id}
                      employee={emp}
                      isSelected={selectedEmployees.includes(emp.id)}
                      onToggle={() => toggleEmployee(emp.id)}
                      statusColor="#43a047"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Warning - Assigned but not dispatched */}
            {warnings.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#f57c00' }}>
                  ⚠️ Warnings ({warnings.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {warnings.map(emp => (
                    <EmployeeRow
                      key={emp.id}
                      employee={emp}
                      isSelected={selectedEmployees.includes(emp.id)}
                      onToggle={() => toggleEmployee(emp.id)}
                      statusColor="#f57c00"
                      statusMessage={emp.statusInfo.message}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Already Working - Dispatched */}
            {alreadyWorking.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#d32f2f' }}>
                  🔴 Already Working ({alreadyWorking.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {alreadyWorking.map(emp => (
                    <EmployeeRow
                      key={emp.id}
                      employee={emp}
                      isSelected={selectedEmployees.includes(emp.id)}
                      onToggle={() => toggleEmployee(emp.id)}
                      statusColor="#d32f2f"
                      statusMessage={emp.statusInfo.message}
                    />
                  ))}
                </div>
              </div>
            )}
			
			{/* Day Off */}
{dayOff.length > 0 && (
  <div style={{ marginBottom: '16px' }}>
    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#9e9e9e' }}>
      📅 Day Off ({dayOff.length})
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {dayOff.map(emp => (
        <EmployeeRow
          key={emp.id}
          employee={emp}
          isSelected={selectedEmployees.includes(emp.id)}
          onToggle={() => toggleEmployee(emp.id)}
          statusColor="#9e9e9e"
          statusMessage={emp.statusInfo.message}
        />
      ))}
    </div>
  </div>
)}

{/* Partial Day Off */}
{partialDayOff.length > 0 && (
  <div style={{ marginBottom: '16px' }}>
    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#f57c00' }}>
      ⏰ Partial Day Off ({partialDayOff.length})
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {partialDayOff.map(emp => (
        <EmployeeRow
          key={emp.id}
          employee={emp}
          isSelected={selectedEmployees.includes(emp.id)}
          onToggle={() => toggleEmployee(emp.id)}
          statusColor="#f57c00"
          statusMessage={emp.statusInfo.message}
        />
      ))}
    </div>
  </div>
)}

            {filteredEmployees.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#5f6368' }}>
                No employees found
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : `Save ${selectedEmployees.length} Assignment${selectedEmployees.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>

      {/* Warning Dialog */}
      {showWarning && (
  <div className="modal-overlay" style={{ zIndex: 10000 }}>
    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
      <div className="modal-header">
        <h2>⚠️ {showWarning.status.status === 'timeoff' ? 'Employee Day Off' : 'Warning'}</h2>
      </div>
      <div className="modal-content">
        <p style={{ marginBottom: '16px', fontSize: '16px' }}>
          <strong>{showWarning.employee.fullName}</strong> {
            showWarning.status.status === 'timeoff' 
              ? 'has the day off:'
              : showWarning.status.status === 'dispatched' 
              ? 'is already dispatched to another job:'
              : showWarning.status.status.includes('timeoff')
              ? 'has a partial day off:'
              : 'is already assigned to another job:'
          }
        </p>
        
        {showWarning.status.timeOff ? (
          <div style={{ 
            background: showWarning.status.status === 'timeoff' ? '#ffebee' : '#fff3e0',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <strong>{showWarning.status.timeOff.reason}</strong><br />
            {showWarning.status.timeOff.isPartialDay ? (
              <>
                {showWarning.status.timeOff.startTime} - {showWarning.status.timeOff.endTime}<br />
                Job starts: {job.initialJobTime}
              </>
            ) : (
              <>
                {showWarning.status.timeOff.startDate}
                {showWarning.status.timeOff.startDate !== showWarning.status.timeOff.endDate && 
                  ` - ${showWarning.status.timeOff.endDate}`}
              </>
            )}
            {showWarning.status.timeOff.notes && (
              <>
                <br />
                <span style={{ fontStyle: 'italic' }}>"{showWarning.status.timeOff.notes}"</span>
              </>
            )}
          </div>
        ) : showWarning.status.job && (
          <div style={{ 
            background: showWarning.status.status === 'dispatched' ? '#ffebee' : '#fff3e0',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <strong>{showWarning.status.job.jobID}</strong><br />
            {showWarning.status.job.caller} • {showWarning.status.job.location}<br />
            {showWarning.status.job.initialJobTime}
          </div>
        )}
        
        <p style={{ fontSize: '14px', color: '#5f6368' }}>
          Do you want to assign them anyway?
        </p>
      </div>
      <div className="modal-actions">
        <button 
          onClick={() => setShowWarning(null)} 
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button 
          onClick={showWarning.action} 
          className="btn btn-primary"
          style={{ background: '#f57c00' }}
        >
          Assign Anyway
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
}

function EmployeeRow({ employee, isSelected, onToggle, statusColor, statusMessage }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        border: `2px solid ${isSelected ? statusColor : '#e0e0e0'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        background: isSelected ? `${statusColor}15` : 'white',
        transition: 'all 0.2s'
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {}}
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
          {employee.employeeUID && (
            <span style={{ 
              marginLeft: '8px',
              fontSize: '12px',
              color: statusColor,
              background: 'white',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              #{employee.employeeUID}
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#5f6368' }}>
          {employee.cellPhone || 'No phone'}
        </div>
        {statusMessage && (
          <div style={{ fontSize: '12px', color: statusColor, fontWeight: '500', marginTop: '4px' }}>
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignEmployeesModal;