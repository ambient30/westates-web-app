import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from '../utils/firestoreTracker';
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
    console.log('🔴 Setting up REAL-TIME listener for time entry jobs...');
    
    const jobsRef = collection(db, 'jobs');
    
    const unsubscribe = onSnapshot(
      jobsRef,
      (snapshot) => {
        console.log(`🔄 Time entry jobs updated! ${snapshot.docs.length} total jobs`);
        
        const jobsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setJobs(jobsData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in time entry listener:', error);
        setLoading(false);
      }
    );
    
    // Load employees
    const employeesRef = collection(db, 'employees');
    const empUnsubscribe = onSnapshot(employeesRef, (snapshot) => {
      const employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmployees(employeesData);
    });
    
    return () => {
      console.log('🔴 Cleaning up time entry listener');
      unsubscribe();
      empUnsubscribe();
    };
  }, []);

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
    <div style={{ padding: '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Job Data Entry</h2>
        <div style={{ fontSize: '11px', color: '#4caf50' }}>
          🟢 Live sync active
        </div>
      </div>

      {/* Date Range Filter */}
      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '4px',
        marginBottom: '16px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
          Select Date Range
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#5f6368' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#5f6368' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>
          <button 
            onClick={handleFilter}
            className="btn btn-primary"
            style={{ padding: '6px 16px', fontSize: '12px' }}
          >
            Load Jobs
          </button>
        </div>

        {filteredJobs.length > 0 && (
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            background: '#e8f5e9', 
            borderRadius: '4px',
            fontSize: '12px',
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
          padding: '40px 20px',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#5f6368',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#202124' }}>No Jobs Found</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {!startDate || !endDate 
              ? 'Select a date range and click "Load Jobs" to enter job data' 
              : 'No jobs with dispatched flaggers found in the selected date range'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(groupedJobs).map(([series, seriesJobs]) => {
            const isExpanded = expandedSeries[series];

            return (
              <div key={series} style={{
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                {/* Series Header */}
                <div
                  onClick={() => toggleSeries(series)}
                  style={{
                    padding: '12px 16px',
                    background: isExpanded ? '#f8f9fa' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#5f6368' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#202124' }}>
                        {series}
                      </span>
                      <span style={{ fontSize: '12px', color: '#5f6368', marginLeft: '8px' }}>
                        ({seriesJobs.length} job{seriesJobs.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#5f6368' }}>
                    {seriesJobs[0].caller} • {seriesJobs[0].location}
                  </div>
                </div>

                {/* Jobs in Series */}
                {isExpanded && (
                  <div style={{ padding: '12px' }}>
                    {seriesJobs.map((job, index) => (
                      <JobDataEntry
                        key={job.id}
                        job={job}
                        employees={employees}
                        canUpdate={canUpdate}
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

function JobDataEntry({ job, employees, canUpdate, isLast }) {
  const [timeData, setTimeData] = useState(job.actualHours || {});
  const [equipmentData, setEquipmentData] = useState(job.actualEquipment || {});
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

  const handleLunchChange = (flagger, isChecked) => {
    if (isChecked) {
      // Show popup
      const applyToAll = window.confirm(
        `Apply lunch break to all flaggers on this job?\n\n` +
        `Click OK to apply to all flaggers.\n` +
        `Click Cancel to apply only to ${flagger}.`
      );

      if (applyToAll) {
        // Apply to all flaggers
        const updated = { ...timeData };
        flaggers.forEach(f => {
          updated[f] = {
            ...(updated[f] || {}),
            hasLunch: true
          };
        });
        setTimeData(updated);
      } else {
        // Apply only to this flagger
        handleTimeChange(flagger, 'hasLunch', true);
      }
    } else {
      // Uncheck
      handleTimeChange(flagger, 'hasLunch', false);
    }
  };

  const handleEquipmentChange = (field, value) => {
    setEquipmentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateHours = (flagger) => {
    const data = timeData[flagger] || {};
    if (!data.startTime || !data.endTime) return { total: 0, regular: 0, ot: 0 };

    const start = data.startTime.split(':');
    const end = data.endTime.split(':');
    
    let startMinutes = parseInt(start[0]) * 60 + parseInt(start[1] || 0);
    let endMinutes = parseInt(end[0]) * 60 + parseInt(end[1] || 0);
    
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    
    let totalMinutes = endMinutes - startMinutes;

    // Deduct lunch (30 minutes)
    if (data.hasLunch) {
      totalMinutes -= 30;
    }

    const totalHours = totalMinutes / 60;
    
    // Simple OT calculation (8 hours regular, rest is OT)
    // This is simplified - actual OT logic is more complex with holidays, weekends, etc.
    const regular = Math.min(totalHours, 8);
    const ot = Math.max(0, totalHours - 8);

    return {
      total: totalHours.toFixed(2),
      regular: regular.toFixed(2),
      ot: ot.toFixed(2)
    };
  };

  const handleSave = async () => {
    if (!canUpdate) return;

    setSaving(true);
    try {
      // Calculate hours for each flagger
      const updatedTimeData = { ...timeData };
      flaggers.forEach(flagger => {
        if (updatedTimeData[flagger]?.startTime && updatedTimeData[flagger]?.endTime) {
          const hours = calculateHours(flagger);
          updatedTimeData[flagger].totalHours = parseFloat(hours.total);
          updatedTimeData[flagger].regularHours = parseFloat(hours.regular);
          updatedTimeData[flagger].otHours = parseFloat(hours.ot);
        }
      });

      await updateDoc(doc(db, 'jobs', job.id), {
        actualHours: updatedTimeData,
        actualEquipment: equipmentData,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });

      alert('Job data saved successfully!');
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      borderBottom: isLast ? 'none' : '1px solid #e0e0e0',
      paddingBottom: isLast ? 0 : '12px',
      marginBottom: isLast ? 0 : '12px'
    }}>
      {/* Job Header */}
      <div style={{
        background: '#f8f9fa',
        padding: '8px 12px',
        borderRadius: '4px',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontWeight: '600', fontSize: '13px', color: '#202124' }}>
            {job.jobID}
          </span>
          <span style={{ fontSize: '11px', color: '#5f6368', marginLeft: '8px' }}>
            {job.initialJobDate} • {job.initialJobTime}
          </span>
        </div>
        <span style={{
          padding: '3px 8px',
          background: '#fff3e0',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: '500',
          color: '#e65100'
        }}>
          {job.rateName || 'No Rate'}
        </span>
      </div>

      {/* Equipment Section */}
      <div style={{
        background: '#f0f4ff',
        border: '1px solid #d0d9ff',
        borderRadius: '4px',
        padding: '10px 12px',
        marginBottom: '12px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#1a73e8' }}>
          Equipment Used This Day
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Sign Sets
            </label>
            <input
              type="number"
              value={equipmentData.signSets || ''}
              onChange={(e) => handleEquipmentChange('signSets', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Indv Signs
            </label>
            <input
              type="text"
              value={equipmentData.indvSigns || ''}
              onChange={(e) => handleEquipmentChange('indvSigns', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Type 2
            </label>
            <input
              type="text"
              value={equipmentData.type2 || ''}
              onChange={(e) => handleEquipmentChange('type2', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Type 3
            </label>
            <input
              type="text"
              value={equipmentData.type3 || ''}
              onChange={(e) => handleEquipmentChange('type3', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Cones
            </label>
            <input
              type="number"
              value={equipmentData.cones || ''}
              onChange={(e) => handleEquipmentChange('cones', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Balloon Lights
            </label>
            <input
              type="number"
              value={equipmentData.balloonLights || ''}
              onChange={(e) => handleEquipmentChange('balloonLights', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Portable Lights
            </label>
            <input
              type="number"
              value={equipmentData.portableLights || ''}
              onChange={(e) => handleEquipmentChange('portableLights', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Trucks
            </label>
            <input
              type="number"
              value={equipmentData.truck || ''}
              onChange={(e) => handleEquipmentChange('truck', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Truck Mileage
            </label>
            <input
              type="number"
              value={equipmentData.truckMileage || ''}
              onChange={(e) => handleEquipmentChange('truckMileage', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              TCP
            </label>
            <input
              type="number"
              value={equipmentData.tcp || ''}
              onChange={(e) => handleEquipmentChange('tcp', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Flagger Time Entries */}
      {flaggers.map(flagger => {
        const data = timeData[flagger] || {};
        const hours = calculateHours(flagger);

        return (
          <div key={flagger} style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            padding: '10px 12px',
            marginBottom: '8px'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px', color: '#1a73e8', fontWeight: '600' }}>
              {flagger}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={data.startTime || ''}
                  onChange={(e) => handleTimeChange(flagger, 'startTime', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
                  End Time
                </label>
                <input
                  type="time"
                  value={data.endTime || ''}
                  onChange={(e) => handleTimeChange(flagger, 'endTime', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
                  Lunch?
                </label>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  height: '24px',
                  paddingTop: '4px'
                }}>
                  <input
                    type="checkbox"
                    checked={data.hasLunch || false}
                    onChange={(e) => handleLunchChange(flagger, e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '10px', marginLeft: '4px', color: '#5f6368' }}>
                    -30 min
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
                  Total Hours
                </label>
                <input
                  type="text"
                  value={hours.total}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '11px',
                    background: '#f8f9fa',
                    fontWeight: '600'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
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
                    padding: '4px 6px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
                  Sign Stipends
                </label>
                <input
                  type="number"
                  value={data.signStipends || ''}
                  onChange={(e) => handleTimeChange(flagger, 'signStipends', e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Save Button */}
      {canUpdate && (
        <div style={{ marginTop: '12px', textAlign: 'right' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 16px' }}
          >
            {saving ? 'Saving...' : 'Save Job Data'}
          </button>
        </div>
      )}
    </div>
  );
}

export default TimeEntryView;
