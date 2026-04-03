import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from '../utils/firestoreTracker';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function AvailabilityView({ permissions }) {
  const [employees, setEmployees] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [availabilityResults, setAvailabilityResults] = useState(null);
  const [showAddTimeOff, setShowAddTimeOff] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesSnap, timeOffSnap] = await Promise.all([
        getDocs(collection(db, 'employees')),
        getDocs(collection(db, 'timeOff'))
      ]);

      const employeesData = employeesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const timeOffData = timeOffSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setEmployees(employeesData.sort((a, b) => 
        (a.fullName || '').localeCompare(b.fullName || '')
      ));
      setTimeOffRequests(timeOffData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = () => {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    const checkDate = new Date(selectedDate);
    const available = [];
    const unavailable = [];

    employees.forEach(emp => {
      const empTimeOff = timeOffRequests.filter(req => {
        if (req.employeeId !== emp.id) return false;
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        return checkDate >= start && checkDate <= end;
      });

      if (empTimeOff.length > 0) {
        unavailable.push({
          employee: emp,
          timeOff: empTimeOff
        });
      } else {
        available.push(emp);
      }
    });

    setAvailabilityResults({ available, unavailable, date: selectedDate });
  };

  const upcomingTimeOff = timeOffRequests.filter(t => {
    const endDate = new Date(t.endDate);
    return endDate >= new Date();
  }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const handleDeleteTimeOff = async (timeOffId) => {
    if (!confirm('Delete this time off entry?')) return;

    try {
      await deleteDoc(doc(db, 'timeOff', timeOffId));
      await logAudit('DELETE_TIME_OFF', 'timeOff', timeOffId);
      loadData();
    } catch (err) {
      alert('Error deleting time off: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading availability...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="jobs-header">
        <h2>Employee Availability</h2>
        <div className="jobs-actions">
          <button onClick={() => setShowAddTimeOff(true)} className="btn btn-primary">
            + Add Time Off
          </button>
          <button onClick={loadData} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {/* Availability Lookup */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Availability Lookup</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <button 
            onClick={checkAvailability}
            className="btn btn-primary"
            style={{ padding: '10px 24px' }}
          >
            Check Availability
          </button>
        </div>

        {availabilityResults && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginBottom: '12px', color: '#202124' }}>
              Results for {new Date(availabilityResults.date).toLocaleDateString()}
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Available */}
              <div>
                <div style={{
                  background: '#e8f5e9',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2e7d32'
                }}>
                  ✓ Available ({availabilityResults.available.length})
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {availabilityResults.available.map(emp => (
                    <div key={emp.id} style={{
                      padding: '8px 12px',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      fontSize: '14px'
                    }}>
                      {emp.fullName}
                    </div>
                  ))}
                </div>
              </div>

              {/* Unavailable */}
              <div>
                <div style={{
                  background: '#ffebee',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#c62828'
                }}>
                  ✗ Unavailable ({availabilityResults.unavailable.length})
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {availabilityResults.unavailable.map(({ employee, timeOff }) => (
                    <div key={employee.id} style={{
                      padding: '8px 12px',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      fontSize: '14px'
                    }}>
                      <div style={{ fontWeight: '500' }}>{employee.fullName}</div>
                      <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '2px' }}>
                        {timeOff[0].reason || 'Time off'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Time Off */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Upcoming Time Off</h3>
        {upcomingTimeOff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5f6368' }}>
            No upcoming time off scheduled
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingTimeOff.map(t => (
              <div key={t.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #e0e0e0'
              }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {t.employeeName} {t.employeeNumber && `(#${t.employeeNumber})`}
                  </div>
                  <div style={{ fontSize: '14px', color: '#5f6368' }}>
                    {new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}
                    {t.reason && ` • ${t.reason}`}
                    {t.timeRange && ` • ${t.timeRange}`}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTimeOff(t.id)}
                  className="btn btn-secondary btn-small"
                  style={{ color: '#d32f2f' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Time Off Records */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>All Time Off Records</h3>
        {timeOffRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5f6368' }}>
            No time off records
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {timeOffRequests
              .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
              .map(t => {
                const isPast = new Date(t.endDate) < new Date();
                return (
                  <div key={t.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: isPast ? '#fafafa' : '#f8f9fa',
                    borderRadius: '4px',
                    border: '1px solid #e0e0e0',
                    opacity: isPast ? 0.6 : 1
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {t.employeeName} {t.employeeNumber && `(#${t.employeeNumber})`}
                      </div>
                      <div style={{ fontSize: '14px', color: '#5f6368' }}>
                        {new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}
                        {t.reason && ` • ${t.reason}`}
                        {t.timeRange && ` • ${t.timeRange}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTimeOff(t.id)}
                      className="btn btn-secondary btn-small"
                      style={{ color: '#d32f2f' }}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {showAddTimeOff && (
        <AddTimeOffModal
          employees={employees}
          onClose={() => setShowAddTimeOff(false)}
          onSave={() => {
            setShowAddTimeOff(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AddTimeOffModal({ employees, onClose, onSave }) {
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedEmployee = employees.find(e => e.id === employeeId);
      
      const timeOffData = {
        employeeId,
        employeeName: selectedEmployee?.fullName || 'Unknown',
        employeeNumber: selectedEmployee?.custom?.employeeNumber || null,
        startDate,
        endDate,
        reason,
        timeRange,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown'
      };

      await addDoc(collection(db, 'timeOff'), timeOffData);
      await logAudit('ADD_TIME_OFF', 'timeOff', employeeId, { startDate, endDate, reason });

      onSave();
    } catch (err) {
      alert('Error adding time off: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Add Time Off</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="form-group">
              <label>Employee *</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} {emp.custom?.employeeNumber && `(#${emp.custom.employeeNumber})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Time Range (optional)</label>
              <input
                type="text"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                placeholder="e.g., 12:00 - 16:45"
              />
            </div>

            <div className="form-group">
              <label>Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="3"
                placeholder="e.g., Vacation"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Time Off'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AvailabilityView;