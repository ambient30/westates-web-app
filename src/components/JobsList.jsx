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
          <button onClick={() => setEditingJob({})} className="btn btn-primary">
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
    <div style={{ marginBottom: '32px' }}>
      {/* UPDATED: Full-width color bar */}
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