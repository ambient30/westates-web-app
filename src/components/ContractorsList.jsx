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

  const filteredContractors = contractors.filter(con => {
    const search = searchTerm.toLowerCase();
    return (
      con.caller?.toLowerCase().includes(search) ||
      con.contractor?.toLowerCase().includes(search) ||
      con.billing?.toLowerCase().includes(search) ||
      con.phone?.toLowerCase().includes(search) ||
      con.email?.toLowerCase().includes(search)
    );
  });

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

      {filteredContractors.length === 0 ? (
        <div className="empty-state">
          <h3>No contractors found</h3>
          <p>
            {searchTerm 
              ? 'Try a different search term' 
              : 'No contractors in the system yet'}
          </p>
        </div>
      ) : (
        <div className="compact-grid">
          {filteredContractors.map(contractor => (
            <ContractorCard 
              key={contractor.id} 
              contractor={contractor}
              onClick={() => setSelectedContractor(contractor)}
            />
          ))}
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

  return (
    <div className="modal-overlay" onClick={onClose}>
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

export default ContractorsList;