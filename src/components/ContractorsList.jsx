import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from '../utils/firestoreTracker';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import CreateContractorModal from './CreateContractorModal';
import EditContractorModal from './EditContractorModal';

function ContractorsList({ permissions }) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingContractor, setEditingContractor] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canUpdate = hasPermission(permissions, 'contractors', 'update');
  const canCreate = hasPermission(permissions, 'contractors', 'create');

  useEffect(() => {
    console.log('🔴 Setting up REAL-TIME listener for contractors...');
    
    // REAL-TIME listener for ACTIVE contractors only
    const contractorsQuery = query(
      collection(db, 'contractors'),
      where('isActive', '==', true)
    );
    
    const unsubscribe = onSnapshot(
      contractorsQuery,
      (snapshot) => {
        console.log(`🔄 Contractors updated! ${snapshot.docs.length} active contractors`);
        
        const contractorsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by company name or full name
        contractorsData.sort((a, b) => {
          const nameA = a.companyName || a.fullName || '';
          const nameB = b.companyName || b.fullName || '';
          return nameA.localeCompare(nameB);
        });
        
        setContractors(contractorsData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in contractors listener:', error);
        setLoading(false);
      }
    );
    
    // Cleanup on unmount
    return () => {
      console.log('🔴 Cleaning up contractors listener');
      unsubscribe();
    };
  }, []);

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
      <div className="contractors-header">
        <h2>Contractors</h2>
        <div className="contractors-actions">
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + New Contractor
            </button>
          )}
          <div style={{ fontSize: '12px', color: '#4caf50', marginLeft: '12px' }}>
            🟢 Live sync active
          </div>
        </div>
      </div>

      <div className="contractors-list">
        {contractors.length === 0 ? (
          <div className="empty-state">
            <h3>No active contractors found</h3>
            <p>Create your first contractor to get started</p>
          </div>
        ) : (
          <div className="contractors-grid">
            {contractors.map(contractor => (
              <ContractorCard
                key={contractor.id}
                contractor={contractor}
                canUpdate={canUpdate}
                onEdit={setEditingContractor}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateContractorModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            // No manual reload needed - onSnapshot handles it!
          }}
        />
      )}

      {editingContractor && (
        <EditContractorModal
          contractor={editingContractor}
          onClose={() => setEditingContractor(null)}
          onSave={() => {
            setEditingContractor(null);
            // No manual reload needed - onSnapshot handles it!
          }}
        />
      )}
    </div>
  );
}

function ContractorCard({ contractor, canUpdate, onEdit }) {
  return (
    <div className="contractor-card">
      <div className="contractor-info">
        <h3>{contractor.companyName || contractor.fullName || 'Unnamed Contractor'}</h3>
        
        <div className="contractor-details">
          {contractor.contactName && (
            <div className="detail-row">
              <span className="label">Contact:</span>
              <span>{contractor.contactName}</span>
            </div>
          )}
          
          {contractor.phone && (
            <div className="detail-row">
              <span className="label">Phone:</span>
              <span>{contractor.phone}</span>
            </div>
          )}
          
          {contractor.email && (
            <div className="detail-row">
              <span className="label">Email:</span>
              <span>{contractor.email}</span>
            </div>
          )}
          
          {contractor.rate && (
            <div className="detail-row">
              <span className="label">Rate:</span>
              <span>${contractor.rate}</span>
            </div>
          )}
        </div>
      </div>
      
      {canUpdate && (
        <div className="contractor-actions">
          <button 
            onClick={() => onEdit(contractor)} 
            className="btn btn-secondary btn-small"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

export default ContractorsList;
