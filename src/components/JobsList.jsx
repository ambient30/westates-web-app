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
  
  // Track which equipment carriers we're listening to
  const [activeCarriers, setActiveCarriers] = useState(new Set());
  const [employeeUnsubscribers, setEmployeeUnsubscribers] = useState({});

  const canUpdate = hasPermission(permissions, 'jobs', 'update');

  useEffect(() => {
    console.log('🔴 Setting up REAL-TIME listener for jobs...');
    
    // REAL-TIME listener for jobs
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
        
        // Extract equipment carriers from updated jobs
        const carriers = new Set();
        jobsData.forEach(job => {
          if (job.equipmentCarrier) {
            const names = job.equipmentCarrier.split(',').map(n => n.trim());
            names.forEach(name => carriers.add(name));
          }
        });
        
        // Update equipment carrier listeners
        updateEmployeeListeners(carriers);
        
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in jobs listener:', error);
        setLoading(false);
      }
    );
    
    // Cleanup on unmount
    return () => {
      console.log('🔴 Cleaning up jobs listener');
      unsubscribe();
      // Clean up all employee listeners
      Object.values(employeeUnsubscribers).forEach(unsub => unsub());
    };
  }, []);

  // Manage real-time listeners for equipment carrier employees
  const updateEmployeeListeners = (newCarriers) => {
    // Find carriers to add
    const toAdd = [...newCarriers].filter(name => !activeCarriers.has(name));
    
    // Find carriers to remove
    const toRemove = [...activeCarriers].filter(name => !newCarriers.has(name));
    
    // Remove old listeners
    toRemove.forEach(name => {
      if (employeeUnsubscribers[name]) {
        console.log(`🔴 Removing listener for employee: ${name}`);
        employeeUnsubscribers[name]();
        const newUnsubs = { ...employeeUnsubscribers };
        delete newUnsubs[name];
        setEmployeeUnsubscribers(newUnsubs);
      }
    });
    
    // Add new listeners
    toAdd.forEach(name => {
      console.log(`🟢 Adding REAL-TIME listener for employee: ${name}`);
      
      // Try direct doc access first
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
            // Try querying by fullName if direct access fails
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
  <div>
    <div className="jobs-header">
      <h2>Jobs</h2>
      <div className="jobs-actions">
        {canUpdate && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            + New Job
          </button>
        )}
        <div style={{ fontSize: '12px', color: '#4caf50', marginLeft: '12px' }}>
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
          // No manual reload needed - onSnapshot handles it!
        }}
      />
    )}

    {assigningJob && (
      <AssignEmployeesModal
        job={assigningJob}
        onClose={() => setAssigningJob(null)}
        onSave={() => {
          setAssigningJob(null);
          // No manual reload needed - onSnapshot handles it!
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
          // No manual reload needed - onSnapshot handles it!
        }}
      />
    )}
	
	{showCreateModal && (
  <CreateJobModal
    onClose={() => setShowCreateModal(false)}
    onSave={() => {
      setShowCreateModal(false);
      // No manual reload needed - onSnapshot handles it!
    }}
  />
)}

    {dispatchingJob && (
      <DispatchFlaggersModal
        job={dispatchingJob}
        onClose={() => setDispatchingJob(null)}
        onSave={() => {
          setDispatchingJob(null);
          // No manual reload needed - onSnapshot handles it!
        }}
      />
    )}
	{continuingJob && (
  <ContinueJobModal
    job={continuingJob}
    onClose={() => setContinuingJob(null)}
    onSave={() => {
      setContinuingJob(null);
      // No manual reload needed - onSnapshot handles it!
    }}
  />
)}
{finishingJob && (
  <FinishJobModal
    job={finishingJob}
    onClose={() => setFinishingJob(null)}
    onSave={() => {
      setFinishingJob(null);
      // No manual reload needed - onSnapshot handles it!
    }}
  />
)}
{returningJob && (
  <ReturnJobModal
    job={returningJob}
    onClose={() => setReturningJob(null)}
    onSave={() => {
      setReturningJob(null);
      // No manual reload needed - onSnapshot handles it!
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
    <div style={{ marginBottom: '32px' }}>
      <div style={{ 
        background: color,
        padding: '16px 20px',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'white', margin: 0 }}>
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
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{
          background: '#f8f9fa',
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          fontWeight: '600',
          fontSize: '14px',
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

  const formatEquipmentCarrier = () => {
    if (employeeData.length === 0) return '-';
    
    return employeeData.map(emp => {
      const parts = [];
      
      if (emp.signs) parts.push(emp.signs);
      if (emp.extraSigns) parts.push(emp.extraSigns);
      if (emp.cones) parts.push(`${emp.cones} cones`);
      
      const nameParts = emp.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) : '';
      const formattedName = lastInitial ? `${firstName} ${lastInitial}` : firstName;
      
      if (parts.length > 0) {
        return `${formattedName} - ${parts.join(', ')}`;
      } else {
        return `${formattedName} - No equipment`;
      }
    }).join('\n');
  };

  const handleRowClick = (e) => {
    if (e.target.tagName !== 'BUTTON') {
      onViewDetails && onViewDetails(job);
    }
  };

  return (
    <div 
      className="job-row"
      onClick={handleRowClick}
    >
      <div style={{ flex: '0 0 180px', minWidth: '180px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
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
                lineHeight: '1.4'
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
              lineHeight: '1.4'
            }}
          >
            [Unassigned]
          </div>
        ))}
        {assignedFlaggers.length === 0 && amountOfFlaggers === 0 && (
          <div style={{ color: '#d32f2f', fontStyle: 'italic' }}>
            No flaggers needed
          </div>
        )}
      </div>

      <div style={{ flex: '0 0 80px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Length
        </div>
        <div>{job.jobLength || '-'}</div>
      </div>

      <div style={{ flex: '0 0 80px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Time
        </div>
        <div>{job.initialJobTime || 'TBD'}</div>
      </div>

      <div style={{ flex: '0 0 120px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Billing
        </div>
        <div>{job.billing || '-'}</div>
      </div>

      <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Location
        </div>
        <div>{job.location || '-'}</div>
      </div>

      <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Equipment
        </div>
        <div style={{ fontSize: '13px', whiteSpace: 'pre-line' }}>
          {formatEquipmentCarrier()}
        </div>
      </div>

      {canUpdate && (
  <div style={{ flex: '0 0 420px', display: 'flex', gap: '4px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onFinish(job);
      }}
      className="btn btn-secondary btn-small"
      style={{ background: '#d32f2f', color: 'white' }}
    >
      Finish
    </button>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onReturn(job);
      }}
      className="btn btn-secondary btn-small"
      style={{ background: '#ff9800', color: 'white' }}
    >
      Return
    </button>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onContinue(job);
      }}
      className="btn btn-secondary btn-small"
      style={{ background: '#4caf50', color: 'white' }}
    >
      Continue
    </button>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onDispatch(job);
      }}
      className="btn btn-secondary btn-small"
    >
      Dispatch
    </button>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onAssign(job);
      }}
      className="btn btn-secondary btn-small"
    >
      Assign
    </button>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onEdit(job);
      }}
      className="btn btn-secondary btn-small"
    >
      Edit
    </button>
  </div>
)}
    </div>
  );
}

export default JobsList;
