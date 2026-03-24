import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import CreateContractorModal from './CreateContractorModal';
import EditContractorModal from './EditContractorModal';

function ContractorsList({ permissions }) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [expandedCompanies, setExpandedCompanies] = useState({});

  const canCreate = hasPermission(permissions, 'contractors', 'create');
  const canUpdate = hasPermission(permissions, 'contractors', 'update');
  const canDelete = hasPermission(permissions, 'contractors', 'delete');

  useEffect(() => {
    loadContractors();
  }, []);

  const loadContractors = async () => {
    try {
      setLoading(true);
      const contractorsRef = collection(db, 'contractors');
      const snapshot = await getDocs(contractorsRef);
      
      let contractorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort alphabetically by caller name
      contractorsData.sort((a, b) => {
        const nameA = a.caller || '';
        const nameB = b.caller || '';
        return nameA.localeCompare(nameB);
      });
      
      setContractors(contractorsData);
    } catch (err) {
      console.error('Error loading contractors:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group contractors by company
  const groupedContractors = contractors.reduce((groups, contractor) => {
    const companyName = contractor.contractor || 'No Company';
    if (!groups[companyName]) {
      groups[companyName] = [];
    }
    groups[companyName].push(contractor);
    return groups;
  }, {});

  // Filter grouped contractors
  const filteredGroupedContractors = Object.entries(groupedContractors).reduce((acc, [companyName, contractorList]) => {
    const search = searchTerm.toLowerCase();
    
    // Filter callers within this company
    const filteredCallers = contractorList.filter(con => 
      con.caller?.toLowerCase().includes(search) ||
      con.contractor?.toLowerCase().includes(search) ||
      con.billing?.toLowerCase().includes(search) ||
      con.phone?.toLowerCase().includes(search) ||
      con.email?.toLowerCase().includes(search)
    );

    // Include company if it has matching callers OR if company name matches
    if (filteredCallers.length > 0 || companyName.toLowerCase().includes(search)) {
      acc[companyName] = filteredCallers.length > 0 ? filteredCallers : contractorList;
    }

    return acc;
  }, {});

  // Sort companies alphabetically
  const sortedCompanies = Object.keys(filteredGroupedContractors).sort((a, b) => a.localeCompare(b));

  const toggleCompany = (companyName) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyName]: !prev[companyName]
    }));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading contractors...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="jobs-header">
        <h2>Contractors</h2>
        <div className="jobs-actions">
          <input
            type="text"
            placeholder="Search contractors..."
            className="search-box"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + New Contractor
            </button>
          )}
          <button onClick={loadContractors} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {sortedCompanies.length === 0 ? (
        <div className="empty-state">
          <h3>No contractors found</h3>
          <p>
            {searchTerm 
              ? 'Try a different search term' 
              : 'No contractors in the system yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedCompanies.map(companyName => {
            const callers = filteredGroupedContractors[companyName];
            const isExpanded = expandedCompanies[companyName];

            return (
              <div key={companyName} style={{
                background: 'white',
                borderRadius: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                overflow: 'hidden'
              }}>
                {/* Company Header - COMPACT */}
                <div
                  onClick={() => toggleCompany(companyName)}
                  style={{
                    padding: '10px 16px',
                    background: isExpanded ? '#e8f0fe' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isExpanded ? '1px solid #dadce0' : 'none',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', color: '#5f6368' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#202124' }}>
                        {companyName}
                      </span>
                      <span style={{ fontSize: '13px', color: '#5f6368', marginLeft: '8px' }}>
                        ({callers.length})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Callers List (Nested) */}
                {isExpanded && (
                  <div style={{ padding: '12px' }}>
                    <div className="compact-grid">
                      {callers.map(contractor => (
                        <ContractorCard 
                          key={contractor.id} 
                          contractor={contractor}
                          onClick={() => setSelectedContractor(contractor)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedContractor && (
        <ContractorDetailsModal
          contractor={selectedContractor}
          onClose={() => setSelectedContractor(null)}
          onEdit={() => {
            setEditingContractor(selectedContractor);
            setSelectedContractor(null);
          }}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onUpdate={loadContractors}
        />
      )}

      {showCreateModal && (
        <CreateContractorModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            loadContractors();
          }}
        />
      )}

      {editingContractor && (
        <EditContractorModal
          contractor={editingContractor}
          onClose={() => setEditingContractor(null)}
          onSave={() => {
            setEditingContractor(null);
            loadContractors();
          }}
        />
      )}
    </div>
  );
}

function ContractorCard({ contractor, onClick }) {
  return (
    <div 
      className="employee-card-compact" 
      onClick={onClick}
    >
      <div className="employee-card-header">
        <span className="employee-name">{contractor.caller || 'Unknown'}</span>
      </div>
      
      <div className="employee-card-body">
        <div className="employee-info-row">
          <span className="info-icon">📱</span>
          <span className="info-text">{contractor.phone || 'No phone'}</span>
        </div>
        <div className="employee-info-row">
          <span className="info-icon">💼</span>
          <span className="info-text">{contractor.billing || 'No billing'}</span>
        </div>
      </div>
    </div>
  );
}

function ContractorDetailsModal({ contractor, onClose, onEdit, canUpdate, canDelete, onUpdate }) {
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    if (typeof dateValue === 'string') return dateValue;
    if (dateValue.toDate) return dateValue.toDate().toLocaleDateString();
    return 'N/A';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  // Get custom parameters
  const customParams = contractor.custom || {};
  const hasCustomParams = Object.keys(customParams).length > 0;

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>{contractor.caller || 'Contractor Details'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          
          {/* Contact Information */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Contact Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
            <InfoField label="Caller Name" value={contractor.caller} />
            <InfoField label="Company Name" value={contractor.contractor} />
            <InfoField label="Billing Name" value={contractor.billing} />
            <InfoField label="Phone" value={contractor.phone} />
            <InfoField label="Email" value={contractor.email} />
          </div>

          {/* Billing Information */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Billing Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
            <InfoField label="Rate Card" value={contractor.rates} />
          </div>

          {/* Notes */}
          {contractor.notes && (
            <>
              <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Notes</h3>
              <div style={{ 
                background: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '4px',
                marginBottom: '24px',
                whiteSpace: 'pre-wrap'
              }}>
                {contractor.notes}
              </div>
            </>
          )}

          {/* Custom Parameters */}
          {hasCustomParams && (
            <>
              <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Custom Parameters</h3>
              <div style={{ 
                background: '#fff3e0', 
                padding: '16px', 
                borderRadius: '4px',
                marginBottom: '24px',
                border: '1px solid #ffb74d'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  {Object.entries(customParams).map(([key, value]) => (
                    <InfoField 
                      key={key} 
                      label={key} 
                      value={formatValue(value)}
                      isCustom={true}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>System Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <InfoField label="Created At" value={formatDate(contractor.createdAt)} />
            <InfoField label="Updated At" value={formatDate(contractor.updatedAt)} />
            <InfoField label="Created By" value={contractor.createdBy} />
            <InfoField label="Updated By" value={contractor.updatedBy} />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          {canUpdate && (
            <button onClick={onEdit} className="btn btn-primary">
              Edit
            </button>
          )}
          {canDelete && (
            <button className="btn btn-secondary" style={{ color: '#c5221f' }}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, isCustom = false }) {
  return (
    <div>
      <div style={{ 
        fontSize: '12px', 
        color: isCustom ? '#e65100' : '#5f6368', 
        marginBottom: '4px',
        fontWeight: isCustom ? '600' : '400'
      }}>
        {label} {isCustom && '⭐'}
      </div>
      <div style={{ fontSize: '14px', color: '#202124', fontWeight: '500' }}>
        {value || 'N/A'}
      </div>
    </div>
  );
}

export default ContractorsList;