import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import CreateJobModal from './CreateJobModal';
import EditJobModal from './EditJobModal';
import AssignEmployeesModal from './AssignEmployeesModal';
import JobDetailsModal from './JobDetailsModal';


function JobsList({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [assigningJob, setAssigningJob] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);

  const canCreate = hasPermission(permissions, 'jobs', 'create');
  const canUpdate = hasPermission(permissions, 'jobs', 'update');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const jobsRef = collection(db, 'jobs');
      const snapshot = await getDocs(jobsRef);
      
      const jobsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(job => job.hideFromSummary !== true);
      
      setJobs(jobsData);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      job.jobID?.toLowerCase().includes(search) ||
      job.caller?.toLowerCase().includes(search) ||
      job.billing?.toLowerCase().includes(search) ||
      job.location?.toLowerCase().includes(search) ||
      job.assignedFlaggers?.toLowerCase().includes(search)
    );
  });

  const categorizedJobs = categorizeJobs(filteredJobs);

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
        <h2>Jobs Summary</h2>
        <div className="jobs-actions">
          <input
            type="text"
            placeholder="Search jobs..."
            className="search-box"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {canCreate && (
            <button onClick={() => setShowCreateJob(true)} className="btn btn-primary">
              + New Job
            </button>
          )}
          
          <button onClick={loadJobs} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Object.keys(categorizedJobs).every(key => categorizedJobs[key].length === 0) ? (
          <div className="empty-state">
            <h3>No jobs found</h3>
            <p>
              {searchTerm 
                ? 'Try a different search term' 
                : 'Click "+ New Job" to create your first job'}
            </p>
          </div>
        ) : (
          <>
            {categorizedJobs.errors.length > 0 && (
              <WeekSection
                title="Job Errors"
                jobs={categorizedJobs.errors}
                color="#d32f2f"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
				onViewDetails={setViewingJob}
              />
            )}

            {categorizedJobs.thisWeek.length > 0 && (
              <WeekSection
                title="This Week"
                jobs={categorizedJobs.thisWeek}
                color="#43a047"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
				onViewDetails={setViewingJob}
              />
            )}

            {categorizedJobs.nextWeek.length > 0 && (
              <WeekSection
                title="Next Week"
                jobs={categorizedJobs.nextWeek}
                color="#1e88e5"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
				onViewDetails={setViewingJob}
              />
            )}

            {categorizedJobs.future.length > 0 && (
              <WeekSection
                title="Future Jobs"
                jobs={categorizedJobs.future}
                color="#5e35b1"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
				onViewDetails={setViewingJob}
              />
            )}

            {categorizedJobs.potentialReturns.length > 0 && (
              <WeekSection
                title="Potential Returns"
                jobs={categorizedJobs.potentialReturns}
                color="#ff6f00"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
				onViewDetails={setViewingJob}
              />
            )}
          </>
        )}
      </div>

      {showCreateJob && (
        <CreateJobModal
          onClose={() => setShowCreateJob(false)}
          onSave={() => {
            setShowCreateJob(false);
            loadJobs();
          }}
        />
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
    </div>
  );
}

function categorizeJobs(jobs) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const thisWeekEnd = new Date(today);
  const daysUntilSaturday = 6 - today.getDay();
  thisWeekEnd.setDate(today.getDate() + daysUntilSaturday);
  thisWeekEnd.setHours(23, 59, 59, 999);

  const nextWeekStart = new Date(thisWeekEnd);
  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  nextWeekStart.setHours(0, 0, 0, 0);

  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
  nextWeekEnd.setHours(23, 59, 59, 999);

  const categorized = {
    errors: [],
    thisWeek: [],
    nextWeek: [],
    future: [],
    potentialReturns: []
  };

  jobs.forEach(job => {
    if (!job.initialJobDate) {
      categorized.potentialReturns.push(job);
      return;
    }

    // Parse MM/DD/YYYY or M/D/YYYY format
    const parts = job.initialJobDate.split('/');
    if (parts.length !== 3) {
      categorized.potentialReturns.push(job);
      return;
    }

    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    // Create date object
    const jobDate = new Date(year, month - 1, day);
    jobDate.setHours(0, 0, 0, 0);

    // Debug logging
    console.log(`Job ${job.jobID}: Date string="${job.initialJobDate}", Parsed=${jobDate.toLocaleDateString()}, Today=${today.toLocaleDateString()}, ThisWeekEnd=${thisWeekEnd.toLocaleDateString()}`);

    // Categorize
    if (jobDate <= yesterday) {
      categorized.errors.push(job);
    } else if (jobDate >= today && jobDate <= thisWeekEnd) {
      categorized.thisWeek.push(job);
    } else if (jobDate >= nextWeekStart && jobDate <= nextWeekEnd) {
      categorized.nextWeek.push(job);
    } else {
      categorized.future.push(job);
    }
  });

  // Sort each category by date (earliest first)
  Object.keys(categorized).forEach(key => {
    categorized[key].sort((a, b) => {
      if (!a.initialJobDate) return 1;
      if (!b.initialJobDate) return -1;
      
      const [monthA, dayA, yearA] = a.initialJobDate.split('/').map(Number);
      const [monthB, dayB, yearB] = b.initialJobDate.split('/').map(Number);
      
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      
      return dateA - dateB;
    });
  });

  return categorized;
}

function WeekSection({ title, jobs, color, canUpdate, onEdit, onAssign, onViewDetails }) {
  const normalizeDate = (dateStr) => {
    if (!dateStr) return 'No Date';
    
    try {
      const parts = dateStr.split('/');
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const d = new Date(year, month - 1, day);
      
      if (isNaN(d.getTime())) return 'No Date';
      
      const normalizedMonth = String(d.getMonth() + 1).padStart(2, '0');
      const normalizedDay = String(d.getDate()).padStart(2, '0');
      const normalizedYear = d.getFullYear();
      return `${normalizedMonth}/${normalizedDay}/${normalizedYear}`;
    } catch {
      return 'No Date';
    }
  };

  const jobsByDate = jobs.reduce((groups, job) => {
    const normalizedDate = normalizeDate(job.initialJobDate);
    if (!groups[normalizedDate]) {
      groups[normalizedDate] = [];
    }
    groups[normalizedDate].push(job);
    return groups;
  }, {});

  const sortedDates = Object.keys(jobsByDate).sort((a, b) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    
    const [monthA, dayA, yearA] = a.split('/').map(Number);
    const [monthB, dayB, yearB] = b.split('/').map(Number);
    
    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    
    return dateA - dateB;
  });

  return (
    <div style={{ 
      border: `2px solid ${color}`,
      borderRadius: '8px',
      overflow: 'hidden',
      background: 'white'
    }}>
      <div style={{
        background: color,
        color: 'white',
        padding: '12px 16px',
        fontWeight: '600',
        fontSize: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{title}</span>
        <span style={{ fontSize: '14px', fontWeight: '400' }}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div>
        {sortedDates.map(date => (
          <DateGroup
            key={date}
            date={date}
            jobs={jobsByDate[date]}
            canUpdate={canUpdate}
            onEdit={onEdit}
            onAssign={onAssign}
			onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}

function DateGroup({ date, jobs, canUpdate, onEdit, onAssign, onViewDetails }) {
  const formatDate = (dateStr) => {
    if (dateStr === 'No Date') return 'No Date';
    
    try {
      const parts = dateStr.split('/');
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      const d = new Date(year, month, day);
      
      if (isNaN(d.getTime())) {
        return `Invalid Date - ${dateStr}`;
      }
      
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = d.toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `${dayOfWeek} - ${formattedDate}`;
    } catch (error) {
      return `Invalid Date - ${dateStr}`;
    }
  };

  return (
    <div>
      <div style={{
        background: '#f8f9fa',
        padding: '8px 16px',
        borderTop: '1px solid #e0e0e0',
        fontWeight: '600',
        fontSize: '14px',
        color: '#202124'
      }}>
        {formatDate(date)}
      </div>

      <div style={{ padding: '8px' }}>
        {jobs.map(job => (
          <JobRow 
            key={job.id} 
            job={job} 
            canUpdate={canUpdate}
            onEdit={onEdit}
            onAssign={onAssign}
			onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}

function JobRow({ job, canUpdate, onEdit, onAssign, onViewDetails }) {
  const [employeeData, setEmployeeData] = useState([]);
  
  useEffect(() => {
    // Load employee data for equipment carriers
    if (job.equipmentCarrier) {
      loadEmployeeEquipment();
    }
  }, [job.equipmentCarrier]);

  const loadEmployeeEquipment = async () => {
    try {
      const carriers = job.equipmentCarrier.split(',').map(name => name.trim());
      const employeesSnap = await getDocs(collection(db, 'employees'));
      const employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Find employee data for each carrier
      const carrierData = carriers.map(carrierName => {
        return employees.find(emp => emp.fullName === carrierName);
      }).filter(Boolean); // Remove any not found
      
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
      
      // Add equipment from employee record
      if (emp.signs) parts.push(emp.signs);
      if (emp.extraSigns) parts.push(emp.extraSigns);
      if (emp.cones) parts.push(`${emp.cones} cones`);
      
      // Format name as "FirstName LastInitial"
      const nameParts = emp.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) : '';
      const formattedName = lastInitial ? `${firstName} ${lastInitial}` : firstName;
      
      // Return formatted line
      if (parts.length > 0) {
        return `${formattedName} - ${parts.join(', ')}`;
      } else {
        return `${formattedName} - No equipment`;
      }
    }).join('\n'); // Each carrier on new line
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
        <div style={{ flex: '0 0 140px', display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
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