import { useState, useEffect } from 'react';
import { collection, getDocs } from '../utils/firestoreTracker';
import { db } from '../firebase';

function PinksView({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const jobsRef = collection(db, 'jobs');
      const snapshot = await getDocs(jobsRef);
      
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Only include jobs that have otherNotes
      const jobsWithNotes = jobsData.filter(job => job.otherNotes && job.otherNotes.trim() !== '');
      
      setJobs(jobsWithNotes);
    } catch (err) {
      console.error('Error loading jobs:', err);
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

    const filtered = jobs.filter(job => {
      if (!job.initialJobDate) return false;
      
      const jobDate = new Date(job.initialJobDate);
      return jobDate >= start && jobDate <= end;
    });

    // Sort by date, most recent first
    filtered.sort((a, b) => {
      const dateA = new Date(a.initialJobDate);
      const dateB = new Date(b.initialJobDate);
      return dateB - dateA;
    });

    setFilteredJobs(filtered);
  };

  const handleCopyAll = () => {
    if (filteredJobs.length === 0) {
      alert('No jobs to copy');
      return;
    }

    const text = filteredJobs.map(job => {
      return [
        `Job ID: ${job.jobID || 'N/A'}`,
        `Date: ${job.initialJobDate || 'N/A'}`,
        `Time: ${job.initialJobTime || 'N/A'}`,
        `Caller: ${job.caller || 'N/A'}`,
        `Billing: ${job.billing || 'N/A'}`,
        `Location: ${job.location || 'N/A'}`,
        `Notes: ${job.otherNotes || 'N/A'}`,
        '---'
      ].join('\n');
    }).join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
      alert('Copied all notes to clipboard!');
    }).catch(err => {
      alert('Failed to copy: ' + err.message);
    });
  };

  const handleCopySingle = (job) => {
    const text = [
      `Job ID: ${job.jobID || 'N/A'}`,
      `Date: ${job.initialJobDate || 'N/A'}`,
      `Time: ${job.initialJobTime || 'N/A'}`,
      `Caller: ${job.caller || 'N/A'}`,
      `Billing: ${job.billing || 'N/A'}`,
      `Location: ${job.location || 'N/A'}`,
      `Notes: ${job.otherNotes || 'N/A'}`
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy: ' + err.message);
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading jobs with notes...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="jobs-header">
        <h2>Pinks - Employee Issue Tracker</h2>
        <div className="jobs-actions">
          <button onClick={loadJobs} className="btn btn-secondary">
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
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Filter by Date Range</h3>
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
            Filter Jobs
          </button>
          {filteredJobs.length > 0 && (
            <button 
              onClick={handleCopyAll}
              className="btn btn-secondary"
              style={{ padding: '10px 24px' }}
            >
              Copy All ({filteredJobs.length})
            </button>
          )}
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
            Found {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} with notes between {startDate} and {endDate}
          </div>
        )}
      </div>

      {/* Results */}
      {filteredJobs.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '60px 24px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#5f6368',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '8px', color: '#202124' }}>No Results</h3>
          <p>
            {!startDate || !endDate 
              ? 'Select a date range and click "Filter Jobs" to view employee issues' 
              : 'No jobs with notes found in the selected date range'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredJobs.map(job => (
            <div key={job.id} style={{
              background: 'white',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
            onClick={() => setSelectedJob(job)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#202124', marginBottom: '4px' }}>
                    {job.jobID || 'No Job ID'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#5f6368' }}>
                    {job.initialJobDate || 'No date'} • {job.initialJobTime || 'No time'}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopySingle(job);
                  }}
                  className="btn btn-secondary btn-small"
                >
                  Copy
                </button>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '2px' }}>Caller</div>
                  <div style={{ fontSize: '14px', color: '#202124', fontWeight: '500' }}>
                    {job.caller || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '2px' }}>Billing</div>
                  <div style={{ fontSize: '14px', color: '#202124', fontWeight: '500' }}>
                    {job.billing || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '2px' }}>Location</div>
                  <div style={{ fontSize: '14px', color: '#202124', fontWeight: '500' }}>
                    {job.location || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{
                background: '#fff3e0',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #ffb74d'
              }}>
                <div style={{ fontSize: '12px', color: '#e65100', fontWeight: '600', marginBottom: '4px' }}>
                  NOTES / ISSUES
                </div>
                <div style={{ fontSize: '14px', color: '#202124', whiteSpace: 'pre-wrap' }}>
                  {job.otherNotes}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

function JobDetailsModal({ job, onClose }) {
  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Job Details: {job.jobID}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <InfoField label="Job ID" value={job.jobID} />
            <InfoField label="Date" value={job.initialJobDate} />
            <InfoField label="Time" value={job.initialJobTime} />
            <InfoField label="Caller" value={job.caller} />
            <InfoField label="Billing" value={job.billing} />
            <InfoField label="Location" value={job.location} />
            <InfoField label="Assigned Flaggers" value={job.assignedFlaggers} />
            <InfoField label="Dispatched Flaggers" value={job.dispatchedFlaggers} />
          </div>

          <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#1a73e8' }}>Notes / Issues</h3>
          <div style={{
            background: '#fff3e0',
            padding: '16px',
            borderRadius: '4px',
            border: '1px solid #ffb74d',
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
            color: '#202124'
          }}>
            {job.otherNotes || 'No notes'}
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: '#202124', fontWeight: '500' }}>
        {value || 'N/A'}
      </div>
    </div>
  );
}

export default PinksView;