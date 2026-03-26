import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { hasPermission } from '../utils/permissions';

function TimeEntryView({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [expandedSeries, setExpandedSeries] = useState({});

  const canUpdate = hasPermission(permissions, 'jobs', 'update');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load jobs
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const jobsData = jobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);

      // Load employees for dropdown
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmployees(employeesData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Only show jobs with dispatched flaggers
    const filtered = jobs.filter(job => {
      if (!job.dispatchedFlaggers || !job.initialJobDate) return false;
      
      const jobDate = new Date(job.initialJobDate);
      return jobDate >= start && jobDate <= end;
    });

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.initialJobDate);
      const dateB = new Date(b.initialJobDate);
      return dateA - dateB;
    });

    setFilteredJobs(filtered);
  };

  // Group jobs by jobSeries
  const groupedJobs = filteredJobs.reduce((groups, job) => {
    const series = job.jobSeries || job.jobID;
    if (!groups[series]) {
      groups[series] = [];
    }
    groups[series].push(job);
    return groups;
  }, {});

  const toggleSeries = (series) => {
    setExpandedSeries(prev => ({
      ...prev,
      [series]: !prev[series]
    }));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="jobs-header">
        <h2>Time Entry - Payroll & Invoicing</h2>
        <div className="jobs-actions">
          <button onClick={loadData} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Select Date Range</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
            onClick={handleFilter}
            className="btn btn-primary"
            style={{ padding: '10px 24px' }}
          >
            Load Jobs
          </button>
        </div>

        {filteredJobs.length > 0 && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#e8f5e9', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#2e7d32'
          }}>
            Found {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} between {startDate} and {endDate}
          </div>
        )}
      </div>

      {/* Job Series Groups */}
      {filteredJobs.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '60px 24px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#5f6368',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '8px', color: '#202124' }}>No Jobs Found</h3>
          <p>
            {!startDate || !endDate 
              ? 'Select a date range and click "Load Jobs" to enter time' 
              : 'No jobs with dispatched flaggers found in the selected date range'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(groupedJobs).map(([series, seriesJobs]) => {
            const isExpanded = expandedSeries[series];

            return (
              <div key={series} style={{
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
              }}>
                {/* Series Header */}
                <div
                  onClick={() => toggleSeries(series)}
                  style={{
                    padding: '16px 20px',
                    background: isExpanded ? '#e8f0fe' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isExpanded ? '2px solid #1a73e8' : 'none',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px', color: '#5f6368' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '16px', color: '#202124' }}>
                        {series}
                      </span>
                      <span style={{ fontSize: '14px', color: '#5f6368', marginLeft: '12px' }}>
                        ({seriesJobs.length} job{seriesJobs.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#5f6368' }}>
                    {seriesJobs[0].caller} • {seriesJobs[0].location}
                  </div>
                </div>

                {/* Jobs in Series */}
                {isExpanded && (
                  <div style={{ padding: '20px' }}>
                    {seriesJobs.map((job, index) => (
                      <JobTimeEntry
                        key={job.id}
                        job={job}
                        employees={employees}
                        canUpdate={canUpdate}
                        onUpdate={loadData}
                        isLast={index === seriesJobs.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function JobTimeEntry({ job, employees, canUpdate, onUpdate, isLast }) {
  const [timeData, setTimeData] = useState(job.actualHours || {});
  const [saving, setSaving] = useState(false);

  // Parse dispatched flaggers into array
  const flaggers = (job.dispatchedFlaggers || '').split(',').map(f => f.trim()).filter(Boolean);

  const handleTimeChange = (flagger, field, value) => {
    setTimeData(prev => ({
      ...prev,
      [flagger]: {
        ...(prev[flagger] || {}),
        [field]: value
      }
    }));
  };

  const calculateHours = (flagger) => {
    const data = timeData[flagger] || {};
    if (!data.startTime || !data.endTime) return 0;

    // Simple hour calculation (you can make this more sophisticated)
    const start = data.startTime.split(':');
    const end = data.endTime.split(':');
    
    let startMinutes = parseInt(start[0]) * 60 + parseInt(start[1] || 0);
    let endMinutes = parseInt(end[0]) * 60 + parseInt(end[1] || 0);
    
    if (endMinutes < startMinutes) endMinutes += 24 * 60; // Next day
    
    return ((endMinutes - startMinutes) / 60).toFixed(2);
  };

  const handleSave = async () => {
    if (!canUpdate) return;

    setSaving(true);
    try {
      // Calculate hours for each flagger
      const updatedTimeData = { ...timeData };
      flaggers.forEach(flagger => {
        if (updatedTimeData[flagger]?.startTime && updatedTimeData[flagger]?.endTime) {
          updatedTimeData[flagger].hoursWorked = parseFloat(calculateHours(flagger));
        }
      });

      await updateDoc(doc(db, 'jobs', job.id), {
        actualHours: updatedTimeData,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });

      alert('Time data saved successfully!');
      onUpdate();
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      borderBottom: isLast ? 'none' : '1px solid #e0e0e0',
      paddingBottom: isLast ? 0 : '20px',
      marginBottom: isLast ? 0 : '20px'
    }}>
      {/* Job Header */}
      <div style={{
        background: '#f8f9fa',
        padding: '12px 16px',
        borderRadius: '4px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontWeight: '600', fontSize: '16px', color: '#202124' }}>
            {job.jobID}
          </span>
          <span style={{ fontSize: '14px', color: '#5f6368', marginLeft: '12px' }}>
            {job.initialJobDate} • {job.initialJobTime}
          </span>
        </div>
        <span style={{
          padding: '4px 12px',
          background: '#fff3e0',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#e65100'
        }}>
          {job.rateName || 'No Rate'}
        </span>
      </div>

      {/* Flagger Time Entries */}
      {flaggers.map(flagger => {
        const data = timeData[flagger] || {};
        const hours = calculateHours(flagger);

        return (
          <div key={flagger} style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '16px', color: '#1a73e8' }}>
              {flagger}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={data.startTime || ''}
                  onChange={(e) => handleTimeChange(flagger, 'startTime', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
                  End Time
                </label>
                <input
                  type="time"
                  value={data.endTime || ''}
                  onChange={(e) => handleTimeChange(flagger, 'endTime', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
                  Hours Worked
                </label>
                <input
                  type="text"
                  value={hours}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '14px',
                    background: '#f8f9fa'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
                  Travel Hours
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={data.travelHours || ''}
                  onChange={(e) => handleTimeChange(flagger, 'travelHours', e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
                  Sign Stipends
                </label>
                <input
                  type="number"
                  value={data.signStipends || ''}
                  onChange={(e) => handleTimeChange(flagger, 'signStipends', e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              
            </div>
          </div>
        );
      })}

      {/* Save Button */}
      {canUpdate && (
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Time Data'}
          </button>
        </div>
      )}
    </div>
  );
}

export default TimeEntryView;