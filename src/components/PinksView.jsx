import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from '../utils/firestoreTracker';
import { db } from '../firebase';

function PinksView({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredJobSeries, setFilteredJobSeries] = useState([]);
  const [expandedSeries, setExpandedSeries] = useState(new Set());

  useEffect(() => {
    console.log('🔴 Setting up REAL-TIME listener for pinks...');
    
    // Load all jobs (not filtered by hideFromSummary for pinks tracking)
    const jobsRef = collection(db, 'jobs');
    
    const unsubscribe = onSnapshot(
      jobsRef,
      (snapshot) => {
        console.log(`🔄 Pinks jobs updated! ${snapshot.docs.length} total jobs`);
        
        const jobsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Only include jobs that have otherNotes
        const jobsWithNotes = jobsData.filter(job => job.otherNotes && job.otherNotes.trim() !== '');
        console.log(`📝 ${jobsWithNotes.length} jobs have notes`);
        
        setJobs(jobsWithNotes);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in pinks listener:', error);
        setLoading(false);
      }
    );
    
    return () => {
      console.log('🔴 Cleaning up pinks listener');
      unsubscribe();
    };
  }, []);

  const handleFilter = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Filter jobs by date range
    const filtered = jobs.filter(job => {
      if (!job.initialJobDate) return false;
      
      const jobDate = new Date(job.initialJobDate);
      return jobDate >= start && jobDate <= end;
    });

    // Group by job series
    const seriesMap = {};
    filtered.forEach(job => {
      const seriesId = job.jobSeries || job.jobID;
      if (!seriesMap[seriesId]) {
        seriesMap[seriesId] = [];
      }
      seriesMap[seriesId].push(job);
    });

    // Convert to array and sort each series by date
    const seriesArray = Object.entries(seriesMap).map(([seriesId, jobs]) => {
      // Sort jobs within series by date (oldest first)
      const sortedJobs = jobs.sort((a, b) => {
        const dateA = new Date(a.initialJobDate);
        const dateB = new Date(b.initialJobDate);
        return dateA - dateB;
      });

      // Get the most recent date for sorting series
      const mostRecentDate = new Date(sortedJobs[sortedJobs.length - 1].initialJobDate);

      return {
        seriesId,
        jobs: sortedJobs,
        mostRecentDate
      };
    });

    // Sort series by most recent date (newest first)
    seriesArray.sort((a, b) => b.mostRecentDate - a.mostRecentDate);

    setFilteredJobSeries(seriesArray);
  };

  const toggleSeries = (seriesId) => {
    const newExpanded = new Set(expandedSeries);
    if (newExpanded.has(seriesId)) {
      newExpanded.delete(seriesId);
    } else {
      newExpanded.add(seriesId);
    }
    setExpandedSeries(newExpanded);
  };

  const handleCopyAllNotes = (series) => {
    const text = series.jobs.map(job => {
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
      alert(`Copied all ${series.jobs.length} note(s) from this series to clipboard!`);
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
        <p>Loading employee issues...</p>
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
        <h2 style={{ margin: 0, fontSize: '20px' }}>Pinks - Employee Issue Tracker</h2>
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
          Filter by Date Range
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
            Filter Jobs
          </button>
        </div>

        {filteredJobSeries.length > 0 && (
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            background: '#e8f5e9', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#2e7d32'
          }}>
            Found {filteredJobSeries.length} job series with notes between {startDate} and {endDate}
          </div>
        )}
      </div>

      {/* Results */}
      {filteredJobSeries.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '40px 20px',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#5f6368',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#202124' }}>No Results</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {!startDate || !endDate 
              ? 'Select a date range and click "Filter Jobs" to view employee issues' 
              : 'No jobs with notes found in the selected date range'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredJobSeries.map(series => (
            <JobSeriesCard
              key={series.seriesId}
              series={series}
              isExpanded={expandedSeries.has(series.seriesId)}
              onToggle={() => toggleSeries(series.seriesId)}
              onCopyAll={() => handleCopyAllNotes(series)}
              onCopySingle={handleCopySingle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JobSeriesCard({ series, isExpanded, onToggle, onCopyAll, onCopySingle }) {
  const firstJob = series.jobs[0];
  const lastJob = series.jobs[series.jobs.length - 1];
  
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      {/* Series Header - Clickable */}
      <div
        onClick={onToggle}
        style={{
          background: '#f8f9fa',
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <span style={{ fontSize: '14px', color: '#5f6368' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#202124', marginBottom: '2px' }}>
              Series: {series.seriesId}
            </div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>
              {series.jobs.length} job{series.jobs.length !== 1 ? 's' : ''} • 
              {firstJob.caller || 'N/A'} • 
              {firstJob.initialJobDate} {series.jobs.length > 1 ? `to ${lastJob.initialJobDate}` : ''}
            </div>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyAll();
          }}
          className="btn btn-secondary btn-small"
          style={{ fontSize: '10px', padding: '4px 8px' }}
        >
          Copy All Notes
        </button>
      </div>

      {/* Expanded Job List */}
      {isExpanded && (
        <div style={{ padding: '8px' }}>
          {series.jobs.map((job, index) => (
            <JobNoteCard
              key={job.id}
              job={job}
              dayNumber={index + 1}
              totalDays={series.jobs.length}
              onCopy={() => onCopySingle(job)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JobNoteCard({ job, dayNumber, totalDays, onCopy }) {
  return (
    <div style={{
      background: '#fafafa',
      borderRadius: '4px',
      padding: '10px 12px',
      marginBottom: '6px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#202124', marginBottom: '2px' }}>
            Day {dayNumber} of {totalDays} • {job.jobID || 'No Job ID'}
          </div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>
            {job.initialJobDate || 'No date'} • {job.initialJobTime || 'No time'}
          </div>
        </div>
        <button
          onClick={onCopy}
          className="btn btn-secondary btn-small"
          style={{ fontSize: '10px', padding: '3px 6px' }}
        >
          Copy
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '8px',
        marginBottom: '8px'
      }}>
        <div>
          <div style={{ fontSize: '10px', color: '#5f6368', marginBottom: '1px' }}>Caller</div>
          <div style={{ fontSize: '11px', color: '#202124', fontWeight: '500' }}>
            {job.caller || 'N/A'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#5f6368', marginBottom: '1px' }}>Billing</div>
          <div style={{ fontSize: '11px', color: '#202124', fontWeight: '500' }}>
            {job.billing || 'N/A'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#5f6368', marginBottom: '1px' }}>Location</div>
          <div style={{ fontSize: '11px', color: '#202124', fontWeight: '500' }}>
            {job.location || 'N/A'}
          </div>
        </div>
      </div>

      {/* Employee Issues */}
      <div style={{
        background: '#fff3e0',
        padding: '8px 10px',
        borderRadius: '4px',
        border: '1px solid #ffb74d'
      }}>
        <div style={{ fontSize: '10px', color: '#e65100', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
          Employee Issues / Notes
        </div>
        <div style={{ fontSize: '11px', color: '#202124', whiteSpace: 'pre-wrap' }}>
          {job.otherNotes}
        </div>
      </div>
    </div>
  );
}

export default PinksView;
