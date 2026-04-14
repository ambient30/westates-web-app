import { useState, useEffect } from 'react';
import { loadGoogleAPIs, openDrivePicker, getGoogleOAuthToken, formatFileSize, getFileIcon } from '../utils/googleDriveUtils';

function FileAttachments({ files = [], onFilesChange, canEdit = true }) {
  const [loading, setLoading] = useState(false);
  const [apisLoaded, setApisLoaded] = useState(false);

  useEffect(() => {
    // Load Google APIs on component mount
    loadGoogleAPIs().then(() => {
      setApisLoaded(true);
    }).catch((error) => {
      console.error('Failed to load Google APIs:', error);
    });
  }, []);

  const handleAttachFile = async () => {
    if (!apisLoaded) {
      alert('Google Drive is still loading. Please wait a moment and try again.');
      return;
    }

    setLoading(true);

    try {
      // Get OAuth token
      const token = await getGoogleOAuthToken();

      // Open picker
      openDrivePicker(token, (file) => {
        // Add file to list
        const newFiles = [...files, {
          id: file.id,
          name: file.name,
          url: file.url,
          mimeType: file.mimeType,
          iconUrl: file.iconUrl,
          sizeBytes: file.sizeBytes,
          attachedAt: new Date(),
        }];
        onFilesChange(newFiles);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error opening Drive picker:', error);
      alert('Failed to open Google Drive. Please make sure you\'re signed in to Google and try again.');
      setLoading(false);
    }
  };

  const handleRemoveFile = (fileId) => {
    if (!confirm('Remove this file attachment?')) return;
    const newFiles = files.filter(f => f.id !== fileId);
    onFilesChange(newFiles);
  };

  const handleOpenFile = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1a73e8' }}>
        📎 Attached Files
      </h3>

      {files.length === 0 ? (
        <div style={{
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#5f6368',
          fontSize: '12px',
          border: '1px dashed #dadce0'
        }}>
          No files attached
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                transition: 'background 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e8f0fe'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
              onClick={() => handleOpenFile(file.url)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span style={{ fontSize: '20px' }}>
                  {getFileIcon(file.mimeType)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#202124',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '2px' }}>
                    {formatFileSize(file.sizeBytes)}
                    {file.attachedAt && ` • Added ${new Date(file.attachedAt).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(file.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#5f6368',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: '18px',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.color = '#d32f2f';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#5f6368';
                  }}
                  title="Remove file"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <button
          onClick={handleAttachFile}
          disabled={loading || !apisLoaded}
          className="btn btn-secondary"
          style={{
            marginTop: '12px',
            fontSize: '12px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {loading ? (
            <>
              <span style={{ 
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid #fff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }}></span>
              Loading...
            </>
          ) : !apisLoaded ? (
            '⏳ Loading Google Drive...'
          ) : (
            <>
              <span>📎</span>
              Attach File from Google Drive
            </>
          )}
        </button>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default FileAttachments;
