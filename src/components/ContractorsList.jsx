import { useState, useEffect } from 'react';
import { collection, onSnapshot } from '../utils/firestoreTracker';
import { db } from '../firebase';
import ContractorDetailsModal from './ContractorDetailsModal';
import EditContractorModal from './EditContractorModal';
import CreateContractorModal from './CreateContractorModal';

function ContractorsList({ permissions }) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    console.log('🔴 Setting up contractors listener (all contractors)');
    
    // Real-time listener for ALL contractors
    const contractorsRef = collection(db, 'contractors');

    const unsubscribe = onSnapshot(contractorsRef, (snapshot) => {
      const contractorsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`🔄 Contractors updated: ${contractorsList.length} total contractors`);
      if (contractorsList.length > 0) {
        console.log('First contractor fields:', Object.keys(contractorsList[0]));
        console.log('First contractor:', contractorsList[0]);
      }
      setContractors(contractorsList);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading contractors:', error);
      setLoading(false);
    });

    return () => {
      console.log('🔴 Cleaning up contractors listener');
      unsubscribe();
    };
  }, []);

  const handleContractorClick = (contractor) => {
    setSelectedContractor(contractor);
    setShowDetailsModal(true);
  };

  const handleEdit = (contractor) => {
    setSelectedContractor(contractor);
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowDetailsModal(false);
    setShowEditModal(false);
    setShowCreateModal(false);
    setSelectedContractor(null);
  };

  const handleSave = () => {
    handleCloseModals();
    // Real-time listener will auto-update the list
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Group contractors by the 'contractor' parameter
  const groupedContractors = contractors.reduce((groups, contractor) => {
    const groupKey = contractor.contractor || 'Ungrouped';
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(contractor);
    return groups;
  }, {});

  // Sort group keys alphabetically
  const sortedGroupKeys = Object.keys(groupedContractors).sort();

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading contractors...</div>;
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ fontSize: '20px', margin: 0 }}>
          Contractors ({contractors.length})
        </h2>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          + Add Contractor
        </button>
      </div>

      {contractors.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#999',
          background: '#f5f5f5',
          borderRadius: '4px'
        }}>
          No contractors found. Click "+ Add Contractor" to create one.
        </div>
      ) : (
        sortedGroupKeys.map(groupKey => {
          const isExpanded = expandedGroups[groupKey];
          const contractorsInGroup = groupedContractors[groupKey];

          return (
            <div key={groupKey} style={{ marginBottom: '12px' }}>
              {/* Collapsible Group Header */}
              <div
                onClick={() => toggleGroup(groupKey)}
                style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#1a73e8',
                  padding: '12px',
                  background: '#f0f7ff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #1a73e8',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e3f2fd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f0f7ff';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Expand/Collapse Arrow */}
                  <span style={{ 
                    fontSize: '14px',
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    display: 'inline-block'
                  }}>
                    ▶
                  </span>
                  <span>{groupKey}</span>
                </div>
                <span style={{ 
                  fontSize: '14px',
                  background: '#1a73e8',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px'
                }}>
                  {contractorsInGroup.length}
                </span>
              </div>

              {/* Contractors in this group (only shown when expanded) */}
              {isExpanded && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '12px',
                  marginTop: '12px',
                  paddingLeft: '24px'
                }}>
                  {contractorsInGroup.map(contractor => {
                    // Use 'caller' field for display name
                    const displayName = contractor.caller || contractor.companyName || contractor.name || contractor.company || 'Unnamed Contractor';
                    const isActive = contractor.isActive !== false;
                    
                    return (
                      <div
                        key={contractor.id}
                        onClick={() => handleContractorClick(contractor)}
                        style={{
                          padding: '12px',
                          background: isActive ? 'white' : '#f5f5f5',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          opacity: isActive ? 1 : 0.6
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          e.currentTarget.style.borderColor = '#1a73e8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = '#e0e0e0';
                        }}
                      >
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600',
                          marginBottom: '8px',
                          color: '#202124'
                        }}>
                          {displayName}
                          {!isActive && <span style={{ fontSize: '10px', color: '#999', marginLeft: '8px' }}>(Inactive)</span>}
                        </div>

                        <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '4px' }}>
                          {contractor.contactName && (
                            <div>👤 {contractor.contactName}</div>
                          )}
                          {contractor.phone && (
                            <div>📞 {contractor.phone}</div>
                          )}
                          {contractor.email && (
                            <div>✉️ {contractor.email}</div>
                          )}
                        </div>

                        <div style={{ 
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #f0f0f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '10px', color: '#999' }}>
                            Click to view details
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(contractor);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '10px', padding: '4px 8px' }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedContractor && (
        <ContractorDetailsModal
          contractor={selectedContractor}
          onClose={handleCloseModals}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedContractor && (
        <EditContractorModal
          contractor={selectedContractor}
          permissions={permissions}
          onClose={handleCloseModals}
          onSave={handleSave}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateContractorModal
          onClose={handleCloseModals}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default ContractorsList;
