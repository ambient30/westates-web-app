import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function AssignEmployeesModal({ job, onClose, onSave }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'employees'));
      let employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter active employees only
      employeesData = employeesData.filter(emp => emp.isActive !== false);

      // Sort alphabetically
      employeesData.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

      setEmployees(employeesData);

      // Pre-select already assigned employees
      if (job.assignedFlaggers) {
        const assigned = job.assignedFlaggers.split(',').map(name => name.trim());
        const preSelected = employeesData
          .filter(emp => assigned.includes(emp.fullName))
          .map(emp => emp.id);
        setSelectedEmployees(preSelected);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get selected employee names
      const assignedNames = employees
        .filter(emp => selectedEmployees.includes(emp.id))
        .map(emp => emp.fullName)
        .join(', ');

      await updateDoc(doc(db, 'jobs', job.id), {
        assignedFlaggers: assignedNames,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });

      await logAudit('ASSIGN_EMPLOYEES', 'jobs', job.jobID, { assignedFlaggers: assignedNames });

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Assign Employees: {job.jobID}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
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

          {/* Selected Count */}
          <div style={{ 
            marginBottom: '12px',
            fontSize: '14px',
            color: '#5f6368'
          }}>
            {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
          </div>

          {/* Employee List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredEmployees.map(emp => {
              const isSelected = selectedEmployees.includes(emp.id);
              return (
                <div
                  key={emp.id}
                  onClick={() => toggleEmployee(emp.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    border: `2px solid ${isSelected ? '#1a73e8' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? '#e8f0fe' : 'white',
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
                </div>
              );
            })}
          </div>

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
            {saving ? 'Saving...' : `Assign ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignEmployeesModal;