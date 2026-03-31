import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
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
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [assigningJob, setAssigningJob] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [dispatchingJob, setDispatchingJob] = useState(null);
  const [continuingJob, setContinuingJob] = useState(null);
  const [finishingJob, setFinishingJob] = useState(null);
  const [returningJob, setReturningJob] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canUpdate = hasPermission(permissions, 'jobs', 'update');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'jobs'));
      const jobsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
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
    // Skip jobs with hideFromSummary
    if (job.hideFromSummary === true) return;

    // Potential Returns: Jobs without date or time
    if (!job.initialJobDate || !job.initialJobTime) {
      potentialReturns.push(job);
      return;
    }

    const jobDate = new Date(job.initialJobDate);
    jobDate.setHours(0, 0, 0, 0);

    // Check if date is valid
    if (isNaN(jobDate.getTime())) {
      brokenJobs.push(job);
      return;
    }

    // Broken Jobs: Past jobs that should have been removed
    if (jobDate < today) {
      brokenJobs.push(job);
      return;
    }

    // Categorize future jobs
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
        <button onClick={loadJobs} className="btn btn-secondary">
          Refresh
        </button>
      </div>
    </div>

    <WeekSection
      title="Broken Jobs"
      jobs={brokenJobs}
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
          loadJobs();
        }}
      />
    )}

    {assigningJob && (
      <AssignEmployeesModal
        job={assigningJob}
        onClose={() => setAssigningJob(null)}
        onSave={() => {
          setAssigningJob(null);
          loadJobs();
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
          loadJobs();
        }}
      />
    )}
	
	{showCreateModal && (
  <CreateJobModal
    onClose={() => setShowCreateModal(false)}
    onSave={() => {
      setShowCreateModal(false);
      loadJobs();
    }}
  />
)}

    {dispatchingJob && (
      <DispatchFlaggersModal
        job={dispatchingJob}
        onClose={() => setDispatchingJob(null)}
        onSave={() => {
          setDispatchingJob(null);
          loadJobs();
        }}
      />
    )}
	{continuingJob && (
  <ContinueJobModal
    job={continuingJob}
    onClose={() => setContinuingJob(null)}
    onSave={() => {
      setContinuingJob(null);
      loadJobs();
    }}
  />
)}
{finishingJob && (
  <FinishJobModal
    job={finishingJob}
    onClose={() => setFinishingJob(null)}
    onSave={() => {
      setFinishingJob(null);
      loadJobs();
    }}
  />
)}
{returningJob && (
  <ReturnJobModal
    job={returningJob}
    onClose={() => setReturningJob(null)}
    onSave={() => {
      setReturningJob(null);
      loadJobs();
    }}
  />
)}
  </div>
);
}

function WeekSection({ title, jobs, color, canUpdate, onEdit, onAssign, onViewDetails, onDispatch, onContinue, onFinish, onReturn }) {
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
      {/* Thinner section header */}
      <div style={{ 
        background: color,
        padding: '6px 12px',
        borderRadius: '4px',
        marginBottom: '8px'
      }}>
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'white', margin: 0 }}>
          {title}
        </h3>
      </div>

      {sortedDates.map(date => (
        <DateGroup
          key={date}
          date={date}
          jobs={jobsByDate[date]}
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

function DateGroup({ date, jobs, canUpdate, onEdit, onAssign, onViewDetails, onDispatch, onContinue, onFinish, onReturn }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        background: 'white',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0'
      }}>
        {/* Thinner date header */}
        <div style={{
          background: '#f8f9fa',
          padding: '8px 12px',
          borderBottom: '1px solid #e0e0e0',
          fontWeight: '600',
          fontSize: '13px',
          color: '#5f6368'
        }}>
          {formatDate(date)}
        </div>
        
        {jobs.map(job => (
          <JobRow
            key={job.id}
            job={job}
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

function JobRow({ job, canUpdate, onEdit, onAssign, onViewDetails, onDispatch, onContinue, onFinish, onReturn }) {
  const [employeeData, setEmployeeData] = useState([]);
  
  useEffect(() => {
    if (job.equipmentCarrier) {
      loadEmployeeEquipment();
    }
  }, [job.equipmentCarrier]);

  const loadEmployeeEquipment = async () => {
    try {
      const carriers = job.equipmentCarrier.split(',').map(name => name.trim());
      const employeesSnap = await getDocs(collection(db, 'employees'));
      const employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const carrierData = carriers.map(carrierName => {
        return employees.find(emp => emp.fullName === carrierName);
      }).filter(Boolean);
      
      setEmployeeData(carrierData);
    } catch (err) {
      console.error('Error loading employee equipment:', err);
    }
  };

  const assignedFlaggers = job.assignedFlaggers 
    ? job.assignedFlaggers.split(',').map(name => name.trim()).filter(Boolean)
    : [];
  
  const dispatchedFlaggers = job.dispatchedFlaggers 
    ? job.dispatchedFlaggers.split(',').map(name => name.trim()).filter(Boolean)
    : [];

  const amountOfFlaggers = parseInt(job.amountOfFlaggers) || 0;
  const placeholdersNeeded = Math.max(0, amountOfFlaggers - assignedFlaggers.length);

  const formatSignCarriers = () => {
    if (!job.equipmentCarrier) return '-';
    if (employeeData.length === 0) return job.equipmentCarrier; // Show names while loading
    
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
        return `${formattedName} - ${parts.join(',')}`;
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
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '8px 12px',
        borderBottom: '1px solid #e0e0e0',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      {/* 1. Flaggers - FIRST */}
      <div style={{ flex: '0 0 160px', minWidth: '160px' }}>
        <div style={{ fontWeight: '600', fontSize: '11px', color: '#5f6368', marginBottom: '2px' }}>
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
                lineHeight: '1.3',
                fontSize: '12px'
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
              lineHeight: '1.3',
              fontSize: '12px'
            }}
          >
            [Unassigned]
          </div>
        ))}
        {assignedFlaggers.length === 0 && amountOfFlaggers === 0 && (
          <div style={{ color: '#d32f2f', fontStyle: 'italic', fontSize: '12px' }}>
            No flaggers
          </div>
        )}
      </div>

      {/* 2. Job Length */}
      <div style={{ flex: '0 0 70px' }}>
        <div style={{ fontWeight: '600', fontSize: '11px', color: '#5f6368', marginBottom: '2px' }}>
          Length
        </div>
        <div style={{ fontSize: '12px' }}>{job.jobLength || '-'}</div>
      </div>

      {/* 3. Time */}
      <div style={{ flex: '0 0 70px' }}>
        <div style={{ fontWeight: '600', fontSize: '11px', color: '#5f6368', marginBottom: '2px' }}>
          Time
        </div>
        <div style={{ fontSize: '12px' }}>{job.initialJobTime || 'TBD'}</div>
      </div>

      {/* 4. Meet/Set */}
      <div style={{ flex: '0 0 80px' }}>
        <div style={{ fontWeight: '600', fontSize: '11px', color: '#5f6368', marginBottom: '2px' }}>
          Meet/Set
        </div>
        <div style={{ fontSize: '12px' }}>{job.meetSet || '-'}</div>
      </div>

      {/* 5. Billing */}
      <div style={{ flex: '0 0 100px' }}>
        <div style={{ fontWeight: '600', fontSize: '11px', color: '#5f6368', marginBottom: '2px' }}>
          Billing
        </div>
        <div style={{ fontSize: '12px' }}>{job.billing || '-'}</div>
      </div>

      {/* 6. Caller */}
      <div style={{ flex: '0 0 100px' }}>
        <div style={{ fontWeight: '600', fontSize: '11px', color: '#5f6368', marginBottom: '2px' }}>
          Caller
        </div>
        <div style={{ fontSize: '12px' }}>{job.caller || '-'}</div>
      </div>

      {/* 7. Location */}
      <div style={{ flex: '1 1 150px', minWidth: '120px' }}>
        <div style={{ fontWeight: '600', fontSize: '11px', color: '#5f6368', marginBottom: '2px' }}>
          Location
        </div>
        <div style={{ fontSize: '12px' }}>{job.location || '-'}</div>
      </div>

      {/* 8. Sign Carriers */}
      <div style={{ flex: '0 0 140px', minWidth: '120px' }}>
        <div style={{ fontWeight: '600', fontSize: '11px', color: '#5f6368', marginBottom: '2px' }}>
          Sign Carrier(s)
        </div>
        <div style={{ fontSize: '11px', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
          {formatSignCarriers()}
        </div>
      </div>

      {/* 9. Admin Buttons - LAST - Two rows */}
      {canUpdate && (
        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
          {/* First row: Assign, Dispatch, Edit */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAssign(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ padding: '4px 12px', fontSize: '12px' }}
            >
              Assign
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDispatch(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ padding: '4px 12px', fontSize: '12px' }}
            >
              Dispatch
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ padding: '4px 12px', fontSize: '12px' }}
            >
              Edit
            </button>
          </div>
          
          {/* Second row: Continue, Return, Finish */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onContinue(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ background: '#4caf50', color: 'white', padding: '4px 12px', fontSize: '12px' }}
            >
              Continue
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onReturn(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ background: '#ff9800', color: 'white', padding: '4px 12px', fontSize: '12px' }}
            >
              Return
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFinish(job);
              }}
              className="btn btn-secondary btn-small"
              style={{ background: '#d32f2f', color: 'white', padding: '4px 12px', fontSize: '12px' }}
            >
              Finish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobsList;
