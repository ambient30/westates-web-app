import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import CreateJobModal from './CreateJobModal';
import EditJobModal from './EditJobModal';
import AssignEmployeesModal from './AssignEmployeesModal';

function JobsList({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [assigningJob, setAssigningJob] = useState(null);

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

  // Filter by search
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

  // Categorize jobs
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
      {/* Header */}
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

      {/* Jobs Sections */}
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
            {/* Job Errors */}
            {categorizedJobs.errors.length > 0 && (
              <WeekSection
                title="Job Errors"
                jobs={categorizedJobs.errors}
                color="#d32f2f"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
              />
            )}

            {/* This Week */}
            {categorizedJobs.thisWeek.length > 0 && (
              <WeekSection
                title="This Week"
                jobs={categorizedJobs.thisWeek}
                color="#43a047"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
              />
            )}

            {/* Next Week */}
            {categorizedJobs.nextWeek.length > 0 && (
              <WeekSection
                title="Next Week"
                jobs={categorizedJobs.nextWeek}
                color="#1e88e5"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
              />
            )}

            {/* Future Jobs */}
            {categorizedJobs.future.length > 0 && (
              <WeekSection
                title="Future Jobs"
                jobs={categorizedJobs.future}
                color="#5e35b1"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
              />
            )}

            {/* Potential Returns */}
            {categorizedJobs.potentialReturns.length > 0 && (
              <WeekSection
                title="Potential Returns"
                jobs={categorizedJobs.potentialReturns}
                color="#ff6f00"
                canUpdate={canUpdate}
                onEdit={setEditingJob}
                onAssign={setAssigningJob}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
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
    </div>
  );
}

// Helper function to categorize jobs
function categorizeJobs(jobs) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Get this week's Saturday (end of week)
  const thisWeekEnd = new Date(today);
  const daysUntilSaturday = 6 - today.getDay(); // 0=Sunday, 6=Saturday
  thisWeekEnd.setDate(today.getDate() + daysUntilSaturday);
  thisWeekEnd.setHours(23, 59, 59, 999);

  // Get next week's Sunday and Saturday
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
    // No date = Potential Returns
    if (!job.initialJobDate) {
      categorized.potentialReturns.push(job);
      return;
    }

    const jobDate = new Date(job.initialJobDate);
    jobDate.setHours(0, 0, 0, 0);

    // Yesterday or earlier = Job Error
    if (jobDate <= yesterday) {
      categorized.errors.push(job);
    }
    // Today through this Saturday = This Week
    else if (jobDate <= thisWeekEnd) {
      categorized.thisWeek.push(job);
    }
    // Next Sunday through next Saturday = Next Week
    else if (jobDate >= nextWeekStart && jobDate <= nextWeekEnd) {
      categorized.nextWeek.push(job);
    }
    // After next week = Future
    else {
      categorized.future.push(job);
    }
  });

  // Sort each category by date (earliest first)
  Object.keys(categorized).forEach(key => {
    categorized[key].sort((a, b) => {
      if (!a.initialJobDate) return 1;
      if (!b.initialJobDate) return -1;
      return new Date(a.initialJobDate) - new Date(b.initialJobDate);
    });
  });

  return categorized;
}

function WeekSection({ title, jobs, color, canUpdate, onEdit, onAssign }) {
  // Group jobs by date within this section
  const normalizeDate = (dateStr) => {
  if (!dateStr) return 'No Date';
  
  try {
    let d;
    
    if (dateStr instanceof Date) {
      d = dateStr;
    } else if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      d = new Date(year, month - 1, day);
    } else if (typeof dateStr === 'string' && dateStr.includes('-')) {
      d = new Date(dateStr);
    } else {
      d = new Date(dateStr);
    }
    
    if (isNaN(d.getTime())) return 'No Date';
    
    // Return normalized format: MM/DD/YYYY (with leading zeros)
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return 'No Date';
  }
};

  return (
    <div style={{ 
      border: `2px solid ${color}`,
      borderRadius: '8px',
      overflow: 'hidden',
      background: 'white'
    }}>
      {/* Week Header */}
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

      {/* Jobs grouped by date */}
      <div>
        {sortedDates.map(date => (
          <DateGroup
            key={date}
            date={date}
            jobs={jobsByDate[date]}
            canUpdate={canUpdate}
            onEdit={onEdit}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  );
}

function DateGroup({ date, jobs, canUpdate, onEdit, onAssign }) {
  const formatDate = (dateStr) => {
    if (dateStr === 'No Date') return 'No Date';
    
    try {
      // Try to parse the date - handle multiple formats
      let d;
      
      // Check if it's already a Date object
      if (dateStr instanceof Date) {
        d = dateStr;
      }
      // Try parsing MM/DD/YYYY or M/D/YYYY format
      else if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const parts = dateStr.split('/');
        const month = parseInt(parts[0]) - 1; // Month is 0-indexed
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        d = new Date(year, month, day);
      }
      // Try parsing ISO format (YYYY-MM-DD)
      else if (typeof dateStr === 'string' && dateStr.includes('-')) {
        d = new Date(dateStr);
      }
      // Try standard Date parsing as fallback
      else {
        d = new Date(dateStr);
      }
      
      // Check if date is valid
      if (isNaN(d.getTime())) {
        console.error('Invalid date:', dateStr);
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
      console.error('Error formatting date:', dateStr, error);
      return `Invalid Date - ${dateStr}`;
    }
  };

  return (
    <div>
      {/* Date subheader */}
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

      {/* Jobs for this date */}
      <div style={{ padding: '8px' }}>
        {jobs.map(job => (
          <JobRow 
            key={job.id} 
            job={job} 
            canUpdate={canUpdate}
            onEdit={onEdit}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  );
}

function JobRow({ job, canUpdate, onEdit, onAssign }) {
  const assignedFlaggers = job.assignedFlaggers 
    ? job.assignedFlaggers.split(',').map(name => name.trim()).filter(Boolean)
    : [];
  
  const dispatchedFlaggers = job.dispatchedFlaggers 
    ? job.dispatchedFlaggers.split(',').map(name => name.trim()).filter(Boolean)
    : [];

  const amountOfFlaggers = parseInt(job.amountOfFlaggers) || 0;
  const placeholdersNeeded = Math.max(0, amountOfFlaggers - assignedFlaggers.length);

  const formatEquipmentCarrier = () => {
    if (!job.equipmentCarrier) return null;
    
    const parts = [];
    if (job.equipmentCarrierSigns) parts.push(job.equipmentCarrierSigns);
    if (job.equipmentCarrierExtraSigns) parts.push(job.equipmentCarrierExtraSigns);
    if (job.equipmentCarrierCones) parts.push(`${job.equipmentCarrierCones} cones`);
    
    if (parts.length === 0) return null;
    
    return `${formatNameFirstLastInitial(job.equipmentCarrier)} - ${parts.join(', ')}`;
  };

  const formatNameFirstLastInitial = (fullName) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0);
    return `${firstName} ${lastInitial}`;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '10px 8px',
      borderBottom: '1px solid #e0e0e0',
      fontSize: '14px'
    }}>
      {/* Flaggers */}
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

      {/* Job Length */}
      <div style={{ flex: '0 0 80px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Length
        </div>
        <div>{job.jobLength || '-'}</div>
      </div>

      {/* Time */}
      <div style={{ flex: '0 0 80px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Time
        </div>
        <div>{job.initialJobTime || 'TBD'}</div>
      </div>

      {/* Billing */}
      <div style={{ flex: '0 0 120px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Billing
        </div>
        <div>{job.billing || '-'}</div>
      </div>

      {/* Location */}
      <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Location
        </div>
        <div>{job.location || '-'}</div>
      </div>

      {/* Equipment Carrier */}
      <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
          Equipment
        </div>
        <div style={{ fontSize: '13px' }}>
          {formatEquipmentCarrier() || '-'}
        </div>
      </div>

      {/* Actions */}
      {canUpdate && (
        <div style={{ flex: '0 0 140px', display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
          <button 
            onClick={() => onAssign(job)}
            className="btn btn-secondary btn-small"
          >
            Assign
          </button>
          <button 
            onClick={() => onEdit(job)}
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