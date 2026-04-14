import { useState } from 'react';

function FileAttachments({ files = [], onFilesChange, canEdit = true }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const handleAddFile = () => {
    if (!fileUrl.trim()) {
      alert('Please enter a file URL');
      return;
    }

    // Extract file ID from Google Drive URL if it's a Drive link
    let processedUrl = fileUrl.trim();
    let extractedName = fileName.trim();

    // Try to extract Google Drive file ID and create proper link
    const driveMatch = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      processedUrl = `https://drive.google.com/file/d/${fileId}/view`;
      
      // If no name provided, use a default
      if (!extractedName) {
        extractedName = 'Google Drive File';
      }
    }

    // If no name provided, try to extract from URL
    if (!extractedName) {
      extractedName = fileUrl.split('/').pop() || 'Attached File';
    }

    const newFile = {
      id: Date.now().toString(), // Simple ID
      name: extractedName,
      url: processedUrl,
      attachedAt: new Date(),
    };

    const newFiles = [...files, newFile];
    onFilesChange(newFiles);

    // Reset form
    setFileUrl('');
    setFileName('');
    setShowAddModal(false);
  };

  const handleRemoveFile = (fileId) => {
    if (!confirm('Remove this file attachment?')) return;
    const newFiles = files.filter(f => f.id !== fileId);
    onFilesChange(newFiles);
  };

  const handleOpenFile = (url) => {
    window.open(url, '_blank');
  };

  const getFileIcon = (name, url) => {
    const lowerName = (name || '').toLowerCase();
    const lowerUrl = (url || '').toLowerCase();
    
    if (lowerName.includes('.pdf') || lowerUrl.includes('pdf')) return '📕';
    if (lowerName.match(/\.(jpg|jpeg|png|gif|webp)/)) return '🖼️';
    if (lowerName.match(/\.(mp4|mov|avi|wmv)/)) return '🎥';
    if (lowerName.match(/\.(xlsx?|csv)/)) return '📊';
    if (lowerName.match(/\.(docx?|txt)/)) return '📝';
    if (lowerName.match(/\.(pptx?)/)) return '📽️';
    if (lowerName.match(/\.(zip|rar|7z)/)) return '📦';
    if (lowerUrl.includes('drive.google.com')) return '📁';
    return '📄';
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
                  {getFileIcon(file.name, file.url)}
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
                    {file.attachedAt && `Added ${new Date(file.attachedAt).toLocaleDateString()}`}
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
        <>
          <button
            onClick={() => setShowAddModal(true)}
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
            <span>📎</span>
            Attach File Link
          </button>

          {showAddModal && (
            <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                  <h2>Attach File Link</h2>
                  <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                </div>

                <div className="modal-content">
                  <div style={{ 
                    background: '#e8f0fe', 
                    padding: '12px', 
                    borderRadius: '4px',
                    marginBottom: '16px',
                    fontSize: '12px'
                  }}>
                    💡 <strong>How to attach a file:</strong>
                    <ol style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.6' }}>
                      <li>Open the file in Google Drive</li>
                      <li>Click "Share" button</li>
                      <li>Change to "Anyone with the link"</li>
                      <li>Copy the link</li>
                      <li>Paste it below</li>
                    </ol>
                  </div>

                  <div className="form-group">
                    <label>File Name</label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="e.g., TCP Main Street Plan"
                    />
                    <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '4px' }}>
                      Optional - helps identify the file
                    </div>
                  </div>

                  <div className="form-group">
                    <label>File URL *</label>
                    <input
                      type="url"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      required
                    />
                    <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '4px' }}>
                      Google Drive link or any file URL
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleAddFile} className="btn btn-primary">
                    Attach File
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FileAttachments;
