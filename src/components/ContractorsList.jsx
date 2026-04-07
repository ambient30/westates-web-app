import { useState, useEffect } from 'react';
import { collection, onSnapshot } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import CreateContractorModal from './CreateContractorModal';
import EditContractorModal from './EditContractorModal';

function ContractorsList({ permissions }) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingContractor, setEditingContractor] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const canUpdate = hasPermission(permissions, 'contractors', 'update');
  const canCreate = hasPermission(permissions, 'contractors', 'create');

  useEffect(() => {
    console.log('🔴 Setting up REAL-TIME listener for contractors...');
    
    // Contractors are stored directly in the 'contractors' collection
    const contractorsRef = collection(db, 'contractors');
    
    const unsubscribe = onSnapshot(
      contractorsRef,
      (snapshot) => {
        console.log(`🔄 Contractors loaded! ${snapshot.docs.length} total contractors`);
        
        const contractorsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (contractorsData.length > 0) {
          console.log('Sample contractor data:', contractorsData[0]);
        }
        
        setContractors(contractorsData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in contractors listener:', error);
        setLoading(false);
      }
    );
    
    return () => {
      console.log('🔴 Cleaning up contractors listener');
      unsubscribe();
    };
  }, []);

  // Group contractors by the 'contractor' field (e.g., "DFN", "OBC", etc.)
  const groupedContractors = contractors.reduce((groups, contractor) => {
    const groupName = contractor.contractor || 'Ungrouped';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(contractor);
    return groups;
  }, {});

  const toggleGroup = (groupName) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
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
    <div style={{ padding: '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Contractors</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + New Contractor
            </button>
          )}
          <div style={{ fontSize: '11px', color: '#4caf50' }}>
            🟢 Live sync active
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.keys(groupedContractors).length === 0 ? (
          <div className="empty-state">
            <h3>No contractors found</h3>
            <p>Create your first contractor to get started</p>
          </div>
        ) : (
          Object.entries(groupedContractors)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupName, groupContractors]) => (
              <ContractorGroup
                key={groupName}
                groupName={groupName}
                contractors={groupContractors}
                isExpanded={expandedGroups.has(groupName)}
                onToggle={() => toggleGroup(groupName)}
                canUpdate={canUpdate}
                onEdit={setEditingContractor}
              />
            ))
        )}
      </div>

      {showCreateModal && (
        <CreateContractorModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
          }}
        />
      )}

      {editingContractor && (
        <EditContractorModal
          contractor={editingContractor}
          onClose={() => setEditingContractor(null)}
          onSave={() => {
            setEditingContractor(null);
          }}
        />
      )}
    </div>
  );
}

function ContractorGroup({ groupName, contractors, isExpanded, onToggle, canUpdate, onEdit }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      {/* Group Header - Clickable */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <h3 style={{ 
            margin: 0, 
            fontSize: '15px', 
            fontWeight: '600',
            color: '#202124'
          }}>
            {groupName}
          </h3>
          <span style={{ 
            fontSize: '12px', 
            color: '#5f6368',
            fontWeight: '400'
          }}>
            ({contractors.length} client{contractors.length !== 1 ? 's' : ''})
          </span>
        </div>
      </div>

      {/* Expanded Client List */}
      {isExpanded && (
        <div style={{ padding: '8px' }}>
          {contractors.map(contractor => (
            <ContractorCard
              key={contractor.id}
              contractor={contractor}
              canUpdate={canUpdate}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContractorCard({ contractor, canUpdate, onEdit }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: '#fafafa',
      borderRadius: '4px',
      marginBottom: '6px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
      gap: '12px',
      alignItems: 'center',
      fontSize: '12px'
    }}>
      {/* Caller Name */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', fontSize: '11px', marginBottom: '2px' }}>
          Caller
        </div>
        <div>{contractor.caller || '-'}</div>
      </div>

      {/* Phone */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', fontSize: '11px', marginBottom: '2px' }}>
          Phone
        </div>
        <div>{contractor.phone || '-'}</div>
      </div>

      {/* Email */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', fontSize: '11px', marginBottom: '2px' }}>
          Email
        </div>
        <div>{contractor.email || '-'}</div>
      </div>

      {/* Billing */}
      <div>
        <div style={{ fontWeight: '600', color: '#5f6368', fontSize: '11px', marginBottom: '2px' }}>
          Billing
        </div>
        <div>{contractor.billing || '-'}</div>
      </div>

      {/* Edit Button */}
      {canUpdate && (
        <button 
          onClick={() => onEdit(contractor)} 
          className="btn btn-secondary btn-small"
          style={{ fontSize: '10px', padding: '4px 8px' }}
        >
          Edit
        </button>
      )}
    </div>
  );
}

export default ContractorsList;
