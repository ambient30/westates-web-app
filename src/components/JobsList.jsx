import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import EditJobModal from './EditJobModal';
import AssignEmployeesModal from './AssignEmployeesModal';
import JobDetailsModal from './JobDetailsModal';
import DispatchFlaggersModal from './DispatchFlaggersModal';
import ContinueJobModal from './ContinueJobModal';
import FinishJobModal from './FinishJobModal';
import ReturnJobModal from './ReturnJobModal';
import CreateJobModal from './CreateJobModal';

function JobsList({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [assigningJob, setAssigningJob] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [dispatchingJob, setDispatchingJob] = useState(null);
  const [continuingJob, setContinuingJob] = useState(null);
  const [finishingJob, setFinishingJob] = useState(null);
  const [returningJob, setReturningJob] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [activeCarriers, setActiveCarriers] = useState(new Set());
  const [employeeUnsubscribers, setEmployeeUnsubscribers] = useState({});

  const canUpdate = hasPermission(permissions, 'jobs', 'update');

  useEffect(() => {
    console.log('🔴 Setting up REAL-TIME listener for jobs...');
    
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('hideFromSummary', '!=', true)
    );
    
    const unsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        console.log(`🔄 Jobs updated! ${snapshot.docs.length} active jobs`);
        
        const jobsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setJobs(jobsData);
        
        const carriers = new Set();
        jobsData.forEach(job => {
          if (job.equipmentCarrier) {
            const names = job.equipmentCarrier.split(',').map(n => n.trim());
            names.forEach(name => carriers.add(name));
          }
        });
        
        updateEmployeeListeners(carriers);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in jobs listener:', error);
        setLoading(false);
      }
    );
    
    return () => {
      console.log('🔴 Cleaning up jobs listener');
      unsubscribe();
      Object.values(employeeUnsubscribers).forEach(unsub => unsub());
    };
  }, []);

  const updateEmployeeListeners = (newCarriers) => {
    const toAdd = [...newCarriers].filter(name => !activeCarriers.has(name));
    const toRemove = [...activeCarriers].filter(name => !newCarriers.has(name));
    
    toRemove.forEach(name => {
      if (employeeUnsubscribers[name]) {
        console.log(`🔴 Removing listener for employee: ${name}`);
        employeeUnsubscribers[name]();
        const newUnsubs = { ...employeeUnsubscribers };
        delete newUnsubs[name];
        setEmployeeUnsubscribers(newUnsubs);
      }
    });
    
    toAdd.forEach(name => {
      console.log(`🟢 Adding REAL-TIME listener for employee: ${name}`);
      
      const employeeRef = doc(db, 'employees', name);
      
      const unsubscribe = onSnapshot(
        employeeRef,
        (docSnap) => {
          if (docSnap.exists()) {
            console.log(`🔄 Employee updated: ${name}`);
            setEmployees(prev => {
              const filtered = prev.filter(e => e.id !== name);
              return [...filtered, { id: docSnap.id, ...docSnap.data() }];
            });
          } else {
            const employeeQuery = query(
              collection(db, 'employees'),
              where('fullName', '==', name)
            );
            
            onSnapshot(employeeQuery, (querySnap) => {
              if (!querySnap.empty) {
                const empData = { 
                  id: querySnap.docs[0].id, 
                  ...querySnap.docs[0].data() 
                };
                console.log(`🔄 Employee updated (via query): ${name}`);
                setEmployees(prev => {
                  const filtered = prev.filter(e => e.fullName !== name);
                  return [...filtered, empData];
                });
              }
            });
          }
        },
        (error) => {
          console.error(`❌ Error listening to employee ${name}:`, error);
        }
      );
      
      setEmployeeUnsubscribers(prev => ({
        ...prev,
        [name]: unsubscribe
      }));
    });
    
    setActiveCarriers(newCarriers);
    
    if (toAdd.length > 0 || toRemove.length > 0) {
      console.log(`📦 Equipment carriers: ${newCarriers.size} active`);
    }
  };

const categorizeJobs = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(today.getDate() + (6 - today.getDay()));

  const nextWeekEnd = new Date(thisWeekEnd);
  nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);

  const thisWeek = [];
  const nextWeek = [];
  const later = [];
  const potentialReturns = [];
  const brokenJobs = [];

  jobs.forEach(job => {
    if (job.hideFromSummary === true) return;

    if (!job.initialJobDate || !job.initialJobTime) {
      potentialReturns.push(job);
      return;
    }

    const jobDate = new Date(job.initialJobDate);
    jobDate.setHours(0, 0, 0, 0);

    if (isNaN(jobDate.getTime())) {
      brokenJobs.push(job);
      return;
    }

    if (jobDate < today) {
      brokenJobs.push(job);
      return;
    }

    if (jobDate >= today && jobDate <= thisWeekEnd) {
      thisWeek.push(job);
    } else if (jobDate > thisWeekEnd && jobDate <= nextWeekEnd) {
      nextWeek.push(job);
    } else if (jobDate > nextWeekEnd) {
      later.push(job);
    }
  });

  return { thisWeek, nextWeek, later, potentialReturns, brokenJobs };
};

  const { thisWeek, nextWeek, later, potentialReturns, brokenJobs } = categorizeJobs();

if (loading) {
  return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading jobs...</p>
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
      <h2 style={{ margin: 0, fontSize: '20px' }}>Jobs</h2>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {canUpdate && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            + New Job
          </button>
        )}
        <div style={{ fontSize: '11px', color: '#4caf50' }}>
          🟢 Live sync active
        </div>
      </div>
    </div>

    <WeekSection
      title="Broken Jobs"
      jobs={brokenJobs}
      employees={employees}
      color="#d32f2f"
      canUpdate={canUpdate}
      onEdit={setEditingJob}
      onAssign={setAssigningJob}
      onViewDetails={setViewingJob}
      onDispatch={setDispatchingJob}
      onContinue={setContinuingJob}
      onFinish={setFinishingJob}
      onReturn={setReturningJob}
    />

    <WeekSection
      title="This Week"
      jobs={thisWeek}
      employees={employees}
      color="#4caf50"
      canUpdate={canUpdate}
      onEdit={setEditingJob}
      onAssign={setAssigningJob}
      onViewDetails={setViewingJob}
      onDispatch={setDispatchingJob}
      onContinue={setContinuingJob}
      onFinish={setFinishingJob}
      onReturn={setReturningJob}
    />

    <WeekSection
      title="Next Week"
      jobs={nextWeek}
      employees={employees}
      color="#2196f3"
      canUpdate={canUpdate}
      onEdit={setEditingJob}
      onAssign={setAssigningJob}
      onViewDetails={setViewingJob}
      onDispatch={setDispatchingJob}
      onContinue={setContinuingJob}
      onFinish={setFinishingJob}
      onReturn={setReturningJob}
    />

    <WeekSection
      title="Later"
      jobs={later}
      employees={employees}
      color="#9c27b0"
      canUpdate={canUpdate}
      onEdit={setEditingJob}
      onAssign={setAssigningJob}
      onViewDetails={setViewingJob}
      onDispatch={setDispatchingJob}
      onContinue={setContinuingJob}
      onFinish={setFinishingJob}
      onReturn={setReturningJob}
    />

    <WeekSection
      title="Potential Returns"
      jobs={potentialReturns}
      employees={employees}
      color="#ff9800"
      canUpdate={canUpdate}
      onEdit={setEditingJob}
      onAssign={setAssigningJob}
      onViewDetails={setViewingJob}
      onDispatch={setDispatchingJob}
      onContinue={setContinuingJob}
      onFinish={setFinishingJob}
      onReturn={setReturningJob}
    />

    {jobs.filter(j => !j.hideFromSummary).length === 0 && (
      <div className="empty-state">
        <h3>No jobs found</h3>
        <p>Create your first job to get started</p>
      </div>
    )}

    {editingJob && (
      <EditJobModal
        job={editingJob}
        onClose={() => setEditingJob(null)}
        onSave={() => {
          setEditingJob(null);
        }}
      />
    )}

    {assigningJob && (
      <AssignEmployeesModal
        job={assigningJob}
        onClose={() => setAssigningJob(null)}
        onSave={() => {
          setAssigningJob(null);
        }}
      />
    )}

    {viewingJob && (
      <JobDetailsModal
        job={viewingJob}
        permissions={permissions}
        onClose={() => setViewingJob(null)}
        onUpdate={() => {
          setViewingJob(null);
        }}
      />
    )}

    {showCreateModal && (
      <CreateJobModal
        onClose={() => setShowCreateModal(false)}
        onSave={() => {
          setShowCreateModal(false);
        }}
      />
    )}

    {dispatchingJob && (
      <DispatchFlaggersModal
        job={dispatchingJob}
        onClose={() => setDispatchingJob(null)}
        onSave={() => {
          setDispatchingJob(null);
        }}
      />
    )}

    {continuingJob && (
      <ContinueJobModal
        job={continuingJob}
        onClose={() => setContinuingJob(null)}
        onSave={() => {
          setContinuingJob(null);
        }}
      />
    )}

    {finishingJob && (
      <FinishJobModal
        job={finishingJob}
        onClose={() => setFinishingJob(null)}
        onSave={() => {
          setFinishingJob(null);
        }}
      />
    )}

    {returningJob && (
      <ReturnJobModal
        job={returningJob}
        onClose={() => setReturningJob(null)}
        onSave={() => {
          setReturningJob(null);
        }}
      />
    )}
  </div>
);
}

function WeekSection({ title, jobs, employees, color, canUpdate, onEdit, onAssign, onViewDetails, onDispatch, onContinue, onFinish, onReturn }) {
  if (jobs.length === 0) return null;

  const jobsByDate = {};
  jobs.forEach(job => {
    const date = job.initialJobDate;
    if (!jobsByDate[date]) {
      jobsByDate[date] = [];
    }
    jobsByDate[date].push(job);
  });

  const sortedDates = Object.keys(jobsByDate).sort((a, b) => {
    return new Date(a) - new Date(b);
  });

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Section header - smaller */}
      <div style={{ 
        background: color,
        padding: '8px 12px',
        borderRadius: '4px',
        marginBottom: '8px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'white', margin: 0 }}>
          {title}
        </h3>
      </div>

      {sortedDates.map(date => (
        <DateGroup
          key={date}
          date={date}
          jobs={jobsByDate[date]}
          employees={employees}
          canUpdate={canUpdate}
          onEdit={onEdit}
          onAssign={onAssign}
          onViewDetails={onViewDetails}
          onDispatch={onDispatch}
          onContinue={onContinue}
          onFinish={onFinish}
          onReturn={onReturn}
        />
      ))}
    </div>
  );
}

function DateGroup({ date, jobs, employees, canUpdate, onEdit, onAssign, onViewDetails, onDispatch, onContinue, onFinish, onReturn }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        background: 'white',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0'
      }}>
        {/* Date header - smaller */}
        <div style={{
          background: '#f8f9fa',
          padding: '6px 10px',
          borderBottom: '1px solid #e0e0e0',
          fontWeight: '600',
          fontSize: '12px',
          color: '#5f6368'
        }}>
          {formatDate(date)}
        </div>
        
        {jobs.map(job => (
          <JobRow
            key={job.id}
            job={job}
            employees={employees}
            canUpdate={canUpdate}
            onEdit={onEdit}
            onAssign={onAssign}
            onViewDetails={onViewDetails}
            onDispatch={onDispatch}
            onContinue={onContinue}
            onFinish={onFinish}
            onReturn={onReturn}
          />
        ))}
      </div>
    </div>
  );
}

function JobRow({ job, employees, canUpdate, onEdit, onAssign, onViewDetails, onDispatch, onContinue, onFinish, onReturn }) {
  const [employeeData, setEmployeeData] = useState([]);
  
  useEffect(() => {
    if (job.equipmentCarrier && employees.length > 0) {
      const carriers = job.equipmentCarrier.split(',').map(name => name.trim());
      const carrierData = carriers.map(carrierName => {
        return employees.find(emp => emp.fullName === carrierName);
      }).filter(Boolean);
      setEmployeeData(carrierData);
    }
  }, [job.equipmentCarrier, employees]);

  const assignedFlaggers = job.assignedFlaggers 
    ? job.assignedFlaggers.split(',').map(name => name.trim()).filter(Boolean)
    : [];
  
  const dispatchedFlaggers = job.dispatchedFlaggers 
    ? job.dispatchedFlaggers.split(',').map(name => name.trim()).filter(Boolean)
    : [];

  const amountOfFlaggers = parseInt(job.amountOfFlaggers) || 0;
  const placeholdersNeeded = Math.max(0, amountOfFlaggers - assignedFlaggers.length);

  // Format equipment requested for job
  const formatEquipmentRequested = () => {
    const equipment = [];
    
    // Add each equipment type only if it has a value and isn't 0
    if (job.signSets && parseInt(job.signSets) > 0) {
      equipment.push(`${job.signSets} set${parseInt(job.signSets) > 1 ? 's' : ''}`);
    }
    if (job.indvSigns && parseInt(job.indvSigns) > 0) {
      equipment.push(job.indvSigns);
    }
    if (job.type2 && parseInt(job.type2) > 0) {
      equipment.push(job.type2);
    }
    if (job.type3 && parseInt(job.type3) > 0) {
      equipment.push(job.type3);
    }
    if (job.cones && parseInt(job.cones) > 0) {
      equipment.push(`${job.cones} cones`);
    }
    if (job.balloonLights && parseInt(job.balloonLights) > 0) {
      equipment.push(`${job.balloonLights} balloon light${parseInt(job.balloonLights) > 1 ? 's' : ''}`);
    }
    if (job.portableLights && parseInt(job.portableLights) > 0) {
      equipment.push(`${job.portableLights} portable light${parseInt(job.portableLights) > 1 ? 's' : ''}`);
    }
    if (job.truck && parseInt(job.truck) > 0) {
      equipment.push(`${job.truck} truck${parseInt(job.truck) > 1 ? 's' : ''}`);
    }
    
    return equipment.length > 0 ? equipment.join(', ') : '-';
  };

  // Format equipment carriers
  const formatEquipmentCarriers = () => {
    if (!job.equipmentCarrier) return '-';
    return job.equipmentCarrier;
  };

  const handleRowClick = (e) => {
    if (e.target.tagName !== 'BUTTON') {
      onViewDetails && onViewDetails(job);
    }
  };

  return (
    <div 
      onClick={handleRowClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 60px 60px 80px 100px 100px 140px 1fr 140px 180px',
        gap: '8px',
        padding: '8px 10px',
        borderBottom: '1px solid #f0f0f0',
        fontSize: '12px',
        alignItems: 'center',
        cursor: 'pointer',
        ':hover': {
          background: '#fafafa'
        }
      }}
    >
      {/* Flaggers */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', marginBottom: '2px', fontSize: '11px' }}>
          Flaggers
        </div>
        {assignedFlaggers.map((flagger, idx) => {
          const isDispatched = dispatchedFlaggers.includes(flagger);
          return (
            <div 
              key={idx}
              style={{ 
                color: isDispatched ? '#202124' : '#d32f2f',
                fontWeight: isDispatched ? '400' : '600',
                fontSize: '11px'
              }}
            >
              {flagger}
            </div>
          );
        })}
        {[...Array(placeholdersNeeded)].map((_, idx) => (
          <div 
            key={`placeholder-${idx}`}
            style={{ 
              color: '#9e9e9e',
              fontStyle: 'italic',
              fontSize: '11px'
            }}
          >
            [Unassigned]
          </div>
        ))}
      </div>

      {/* Job Length */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', marginBottom: '2px', fontSize: '11px' }}>
          Length
        </div>
        <div>{job.jobLength || '-'}</div>
      </div>

      {/* Time */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', marginBottom: '2px', fontSize: '11px' }}>
          Time
        </div>
        <div>{job.initialJobTime || '-'}</div>
      </div>

      {/* Meet/Set */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', marginBottom: '2px', fontSize: '11px' }}>
          Meet/Set
        </div>
        <div>{job.meetSet || '-'}</div>
      </div>

      {/* Caller */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', marginBottom: '2px', fontSize: '11px' }}>
          Caller
        </div>
        <div>{job.caller || '-'}</div>
      </div>

      {/* Billing */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', marginBottom: '2px', fontSize: '11px' }}>
          Billing
        </div>
        <div>{job.billing || '-'}</div>
      </div>

      {/* Location */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', marginBottom: '2px', fontSize: '11px' }}>
          Location
        </div>
        <div>{job.location || '-'}</div>
      </div>

      {/* Equipment Requested */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', marginBottom: '2px', fontSize: '11px' }}>
          Equipment
        </div>
        <div>{formatEquipmentRequested()}</div>
      </div>

      {/* Equipment Carriers */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', marginBottom: '2px', fontSize: '11px' }}>
          Carriers
        </div>
        <div>{formatEquipmentCarriers()}</div>
      </div>

      {/* Action Buttons */}
      {canUpdate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* First row: Finish, Return, Continue */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFinish(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ 
                background: '#d32f2f', 
                color: 'white',
                fontSize: '10px',
                padding: '4px 8px'
              }}
            >
              Finish
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onReturn(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ 
                background: '#ff9800', 
                color: 'white',
                fontSize: '10px',
                padding: '4px 8px'
              }}
            >
              Return
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onContinue(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ 
                background: '#4caf50', 
                color: 'white',
                fontSize: '10px',
                padding: '4px 8px'
              }}
            >
              Continue
            </button>
          </div>
          
          {/* Second row: Dispatch, Assign, Edit */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDispatch(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ fontSize: '10px', padding: '4px 8px' }}
            >
              Dispatch
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAssign(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ fontSize: '10px', padding: '4px 8px' }}
            >
              Assign
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ fontSize: '10px', padding: '4px 8px' }}
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobsList;
