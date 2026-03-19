import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function AvailabilityView() {
  const [employees, setEmployees] = useState([]);
  const [timeOffRecords, setTimeOffRecords] = useState([]);
  const [lookupDate, setLookupDate] = useState('');
  const [availability, setAvailability] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

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

      let employeesData = employeesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      let timeOffData = timeOffSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter active employees only
      employeesData = employeesData.filter(emp => emp.isActive !== false);
      employeesData.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

      // Sort time-off by start date
      timeOffData.sort((a, b) => {
        const dateA = parseDate(a.startDate);
        const dateB = parseDate(b.startDate);
        return dateA - dateB;
      });

      setEmployees(employeesData);
      setTimeOffRecords(timeOffData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // If YYYY-MM-DD format (from date picker)
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // If MM/DD/YYYY format (from Firestore)
  if (dateStr.includes('/')) {
    const [month, day, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  return new Date(dateStr);
};

  const isDateInRange = (checkDate, startDate, endDate) => {
    try {
      const check = parseDate(checkDate);
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      
      if (!check || !start || !end) return false;
      
      check.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      return check >= start && check <= end;
    } catch (error) {
      console.error('Date parsing error:', error);
      return false;
    }
  };

  const handleLookup = () => {
  if (!lookupDate) {
    alert('Please select a date');
    return;
  }

  console.log('=== LOOKUP DEBUG ===');
  console.log('Looking up date:', lookupDate);

  const available = [];
  const offAllDay = [];
  const partialDayOff = [];

  employees.forEach(emp => {
    const timeOff = timeOffRecords.find(to => {
      if (to.employeeName === emp.fullName) {
        const inRange = isDateInRange(lookupDate, to.startDate, to.endDate);
        console.log(`${emp.fullName}: checking ${lookupDate} against ${to.startDate} - ${to.endDate} = ${inRange}`);
        return inRange;
      }
      return false;
    });

    if (!timeOff) {
      available.push(emp);
    } else if (timeOff.isPartialDay) {
      partialDayOff.push({ ...emp, timeOff });
    } else {
      offAllDay.push({ ...emp, timeOff });
    }
  });

  console.log('=== END DEBUG ===');

  setAvailability({
    date: lookupDate,
    available,
    offAllDay,
    partialDayOff
  });
};

  const handleDelete = async (timeOffId) => {
    if (!confirm('Are you sure you want to delete this time-off record?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'timeOff', timeOffId));
      await logAudit('DELETE_TIMEOFF', 'timeOff', timeOffId);
      loadData();
      if (availability) {
        handleLookup();
      }
    } catch (err) {
      alert('Error deleting time-off: ' + err.message);
    }
  };

  const getUpcomingTimeOff = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return timeOffRecords
      .filter(to => parseDate(to.startDate) >= today)
      .slice(0, 10);
  };

  const formatDisplayDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
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
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            + Add Time Off
          </button>
          <button onClick={loadData} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Availability Lookup</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '0 0 200px' }}>
            <label>Select Date</label>
            <input
              type="date"
              value={lookupDate}
              onChange={(e) => setLookupDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <button onClick={handleLookup} className="btn btn-primary">
            Check Availability
          </button>
        </div>

        {availability && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>
              Results for {formatDisplayDate(availability.date)}
            </h4>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                background: '#e8f5e9', 
                padding: '12px 16px', 
                borderRadius: '4px',
                fontWeight: '600',
                marginBottom: '8px',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                const content = e.currentTarget.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
              }}
              >
                ✅ Available ({availability.available.length} employees) - Click to expand
              </div>
              <div style={{ display: 'none', padding: '12px', background: '#f8f9fa', borderRadius: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {availability.available.map(emp => (
                    <div key={emp.id} style={{ fontSize: '14px' }}>
                      {emp.fullName} {emp.employeeUID && `(#${emp.employeeUID})`}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {availability.offAllDay.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  background: '#ffebee', 
                  padding: '12px 16px', 
                  borderRadius: '4px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  📅 Off All Day ({availability.offAllDay.length} employees)
                </div>
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '4px' }}>
                  {availability.offAllDay.map(emp => (
                    <div key={emp.id} style={{ 
                      padding: '12px',
                      background: 'white',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {emp.fullName} {emp.employeeUID && `(#${emp.employeeUID})`}
                      </div>
                      <div style={{ fontSize: '13px', color: '#5f6368' }}>
                        {emp.timeOff.reason} • {emp.timeOff.startDate} 
                        {emp.timeOff.startDate !== emp.timeOff.endDate && ` - ${emp.timeOff.endDate}`}
                      </div>
                      {emp.timeOff.notes && (
                        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', fontStyle: 'italic' }}>
                          "{emp.timeOff.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {availability.partialDayOff.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  background: '#fff3e0', 
                  padding: '12px 16px', 
                  borderRadius: '4px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  ⏰ Partial Day Off ({availability.partialDayOff.length} employees)
                </div>
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '4px' }}>
                  {availability.partialDayOff.map(emp => (
                    <div key={emp.id} style={{ 
                      padding: '12px',
                      background: 'white',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {emp.fullName} {emp.employeeUID && `(#${emp.employeeUID})`}
                      </div>
                      <div style={{ fontSize: '13px', color: '#5f6368' }}>
                        {emp.timeOff.reason} • {emp.timeOff.startTime} - {emp.timeOff.endTime}
                      </div>
                      {emp.timeOff.notes && (
                        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', fontStyle: 'italic' }}>
                          "{emp.timeOff.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Upcoming Time Off</h3>
        {getUpcomingTimeOff().length === 0 ? (
          <p style={{ color: '#5f6368' }}>No upcoming time off scheduled</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {getUpcomingTimeOff().map(to => (
              <div key={to.id} style={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {to.employeeName} {to.employeeUID && `(#${to.employeeUID})`}
                  </div>
                  <div style={{ fontSize: '13px', color: '#5f6368' }}>
                    {to.startDate} {to.startDate !== to.endDate && `- ${to.endDate}`} • {to.reason}
                    {to.isPartialDay && ` • ${to.startTime} - ${to.endTime}`}
                  </div>
                  {to.notes && (
                    <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', fontStyle: 'italic' }}>
                      "{to.notes}"
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(to.id)}
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

      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>All Time Off Records</h3>
        {timeOffRecords.length === 0 ? (
          <p style={{ color: '#5f6368' }}>No time off records</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {timeOffRecords.map(to => (
              <div key={to.id} style={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {to.employeeName} {to.employeeUID && `(#${to.employeeUID})`}
                  </div>
                  <div style={{ fontSize: '13px', color: '#5f6368' }}>
                    {to.startDate} {to.startDate !== to.endDate && `- ${to.endDate}`} • {to.reason}
                    {to.isPartialDay && ` • ${to.startTime} - ${to.endTime}`}
                  </div>
                  {to.notes && (
                    <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', fontStyle: 'italic' }}>
                      "{to.notes}"
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#9e9e9e', marginTop: '4px' }}>
                    Added by {to.createdBy}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(to.id)}
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

      {showAddModal && (
        <AddTimeOffModal
          employees={employees}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            loadData();
            if (availability) {
              handleLookup();
            }
          }}
        />
      )}
    </div>
  );
}

function AddTimeOffModal({ employees, onClose, onSave }) {
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeUID: '',
    startDate: '',
    endDate: '',
    isPartialDay: false,
    startTime: '',
    endTime: '',
    reason: 'Vacation',
    customReason: '',
    notes: '',
    approved: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmployeeChange = (e) => {
    const empName = e.target.value;
    const emp = employees.find(employee => employee.fullName === empName);
    
    setFormData(prev => ({
      ...prev,
      employeeName: empName,
      employeeUID: emp ? emp.employeeUID : ''
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'startDate' && !formData.endDate) {
      setFormData(prev => ({ ...prev, endDate: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.employeeName) {
        throw new Error('Please select an employee');
      }

      if (!formData.startDate || !formData.endDate) {
        throw new Error('Please select start and end dates');
      }

      if (formData.isPartialDay && (!formData.startTime || !formData.endTime)) {
        throw new Error('Please enter start and end times for partial day');
      }

      const convertDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-');
        return `${month}/${day}/${year}`;
      };

      const finalReason = formData.reason === 'Other' ? formData.customReason : formData.reason;

      const timeOffData = {
        employeeName: formData.employeeName,
        employeeUID: formData.employeeUID,
        startDate: convertDate(formData.startDate),
        endDate: convertDate(formData.endDate),
        isPartialDay: formData.isPartialDay,
        startTime: formData.isPartialDay ? formData.startTime : '',
        endTime: formData.isPartialDay ? formData.endTime : '',
        reason: finalReason,
        notes: formData.notes,
        approved: formData.approved,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown'
      };

      await addDoc(collection(db, 'timeOff'), timeOffData);
      await logAudit('ADD_TIMEOFF', 'timeOff', formData.employeeName, timeOffData);

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Add Time Off</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Employee *</label>
              <select
                name="employeeName"
                value={formData.employeeName}
                onChange={handleEmployeeChange}
                required
                style={{ width: '100%' }}
              >
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.fullName}>
                    {emp.fullName} {emp.employeeUID && `(#${emp.employeeUID})`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="isPartialDay"
                  checked={formData.isPartialDay}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px' }}
                />
                Partial Day Only
              </label>
            </div>

            {formData.isPartialDay && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Reason *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Vacation', 'Sick', 'Personal', 'Appointment'].map(reason => (
                  <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={formData.reason === reason}
                      onChange={handleChange}
                    />
                    {reason}
                  </label>
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="reason"
                    value="Other"
                    checked={formData.reason === 'Other'}
                    onChange={handleChange}
                  />
                  Other:
                  <input
                    type="text"
                    name="customReason"
                    value={formData.customReason}
                    onChange={handleChange}
                    placeholder="Specify reason"
                    disabled={formData.reason !== 'Other'}
                    style={{ marginLeft: '8px', flex: 1 }}
                  />
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                placeholder="Additional details..."
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="approved"
                  checked={formData.approved}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px' }}
                />
                Approved
              </label>
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