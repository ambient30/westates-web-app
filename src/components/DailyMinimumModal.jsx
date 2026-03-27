import { useState } from 'react';

function DailyMinimumModal({ conflicts, onResolve, onCancel }) {
  const [resolutions, setResolutions] = useState({});

  const handleResolutionChange = (employeeName, date, resolution) => {
    setResolutions(prev => ({
      ...prev,
      [`${employeeName}-${date}`]: resolution
    }));
  };

  const handleSubmit = () => {
    // Check if all conflicts are resolved
    const allResolved = conflicts.every(conflict => {
      const key = `${conflict.employeeName}-${conflict.date}`;
      return resolutions[key] !== undefined;
    });

    if (!allResolved) {
      alert('Please select a resolution for all conflicts');
      return;
    }

    onResolve(resolutions);
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2>⚠️ Multiple Jobs Same Day - Daily Minimum Conflicts</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="modal-content" style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
          <div style={{ 
            padding: '12px 16px', 
            background: '#fff3e0', 
            borderRadius: '4px', 
            marginBottom: '20px',
            border: '1px solid #ffb74d'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>
              <strong>Warning:</strong> The following employees worked multiple jobs on the same day. 
              Choose how to apply the daily minimum (4 hours) for each situation.
            </p>
          </div>

          {conflicts.map((conflict, idx) => {
            const key = `${conflict.employeeName}-${conflict.date}`;
            const selectedResolution = resolutions[key];

            return (
              <div key={idx} style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                background: selectedResolution ? '#f8f9fa' : 'white'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#1a73e8' }}>
                  {conflict.employeeName} • {conflict.date}
                </h3>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '8px' }}>
                    <strong>Jobs worked:</strong>
                  </div>
                  {conflict.jobs.map((job, jIdx) => (
                    <div key={jIdx} style={{ 
                      padding: '8px 12px', 
                      background: '#f8f9fa', 
                      borderRadius: '4px',
                      marginBottom: '4px',
                      fontSize: '13px'
                    }}>
                      <strong>{job.jobID}:</strong> {job.hours.toFixed(2)} hours
                    </div>
                  ))}
                  <div style={{ 
                    padding: '8px 12px', 
                    background: '#e3f2fd', 
                    borderRadius: '4px',
                    marginTop: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1565c0'
                  }}>
                    Total: {conflict.totalHours.toFixed(2)} hours (< {conflict.minimum} hour minimum)
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Choose resolution:
                  </label>

                  {/* Option 1: Combine hours */}
                  <label style={{
                    display: 'block',
                    padding: '12px',
                    border: selectedResolution === 'combine' ? '2px solid #1a73e8' : '1px solid #dadce0',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    background: selectedResolution === 'combine' ? '#e8f0fe' : 'white'
                  }}>
                    <input
                      type="radio"
                      name={key}
                      value="combine"
                      checked={selectedResolution === 'combine'}
                      onChange={() => handleResolutionChange(conflict.employeeName, conflict.date, 'combine')}
                      style={{ marginRight: '8px' }}
                    />
                    <strong>Combine all hours:</strong> Pay {conflict.minimum} hours total
                    <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', marginLeft: '24px' }}>
                      Total hours ({conflict.totalHours.toFixed(2)}) raised to minimum ({conflict.minimum}) = Pay {conflict.minimum} hrs × ${conflict.payRate}/hr = ${(conflict.minimum * conflict.payRate).toFixed(2)}
                    </div>
                  </label>

                  {/* Option 2: Each job gets minimum */}
                  <label style={{
                    display: 'block',
                    padding: '12px',
                    border: selectedResolution === 'each' ? '2px solid #1a73e8' : '1px solid #dadce0',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    background: selectedResolution === 'each' ? '#e8f0fe' : 'white'
                  }}>
                    <input
                      type="radio"
                      name={key}
                      value="each"
                      checked={selectedResolution === 'each'}
                      onChange={() => handleResolutionChange(conflict.employeeName, conflict.date, 'each')}
                      style={{ marginRight: '8px' }}
                    />
                    <strong>Each job gets minimum:</strong> Pay {conflict.jobs.length} × {conflict.minimum} hours = {conflict.jobs.length * conflict.minimum} hours total
                    <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px', marginLeft: '24px' }}>
                      {conflict.jobs.map((job, jIdx) => (
                        <div key={jIdx}>
                          • {job.jobID}: {job.hours.toFixed(2)} hrs → {conflict.minimum} hrs
                        </div>
                      ))}
                      <div style={{ marginTop: '4px', fontWeight: '600', color: '#d32f2f' }}>
                        Total: {conflict.jobs.length * conflict.minimum} hrs × ${conflict.payRate}/hr = ${(conflict.jobs.length * conflict.minimum * conflict.payRate).toFixed(2)}
                      </div>
                    </div>
                  </label>

                  {/* Option 3: Select specific jobs */}
                  <label style={{
                    display: 'block',
                    padding: '12px',
                    border: selectedResolution?.startsWith('select-') ? '2px solid #1a73e8' : '1px solid #dadce0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: selectedResolution?.startsWith('select-') ? '#e8f0fe' : 'white'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Select which job(s) get minimum:</strong>
                    </div>
                    {conflict.jobs.map((job, jIdx) => (
                      <label key={jIdx} style={{
                        display: 'block',
                        padding: '8px',
                        marginLeft: '24px',
                        marginBottom: '4px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedResolution?.includes(`job-${jIdx}`)}
                          onChange={(e) => {
                            let newSelection = selectedResolution?.startsWith('select-') 
                              ? selectedResolution.split('-').slice(1) 
                              : [];
                            
                            if (e.target.checked) {
                              newSelection.push(`job-${jIdx}`);
                            } else {
                              newSelection = newSelection.filter(s => s !== `job-${jIdx}`);
                            }

                            const resolution = newSelection.length > 0 
                              ? `select-${newSelection.join('-')}` 
                              : undefined;
                            
                            handleResolutionChange(conflict.employeeName, conflict.date, resolution);
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        {job.jobID}: {job.hours.toFixed(2)} hrs → {conflict.minimum} hrs (others remain actual)
                      </label>
                    ))}
                    {selectedResolution?.startsWith('select-') && (
                      <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '8px', marginLeft: '24px' }}>
                        <strong>Result:</strong>
                        {conflict.jobs.map((job, jIdx) => {
                          const isSelected = selectedResolution?.includes(`job-${jIdx}`);
                          const hours = isSelected ? conflict.minimum : job.hours;
                          return (
                            <div key={jIdx}>
                              • {job.jobID}: {hours.toFixed(2)} hrs {isSelected ? '(minimum)' : '(actual)'}
                            </div>
                          );
                        })}
                        <div style={{ marginTop: '4px', fontWeight: '600', color: '#1976d2' }}>
                          Total: {conflict.jobs.reduce((sum, job, jIdx) => {
                            const isSelected = selectedResolution?.includes(`job-${jIdx}`);
                            return sum + (isSelected ? conflict.minimum : job.hours);
                          }, 0).toFixed(2)} hrs × ${conflict.payRate}/hr = ${(conflict.jobs.reduce((sum, job, jIdx) => {
                            const isSelected = selectedResolution?.includes(`job-${jIdx}`);
                            return sum + (isSelected ? conflict.minimum : job.hours);
                          }, 0) * conflict.payRate).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="btn btn-primary">
            Apply Selections & Generate Payroll
          </button>
        </div>
      </div>
    </div>
  );
}

export default DailyMinimumModal;