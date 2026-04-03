import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, serverTimestamp } from '../utils/firestoreTracker';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function generateTimeOptions() {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const minuteStr = minute.toString().padStart(2, '0');
      times.push(`${h12}:${minuteStr} ${ampm}`);
    }
  }
  return times;
}

function CreateJobModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    caller: '',
    billing: '',
    receiver: '',
    poWoJobNum: '',
    initialJobDate: '',
    initialJobTime: '',
    meetSet: '',
    jobLength: '',
    location: '',
    amountOfFlaggers: '',
    signSets: '',
    indvSigns: '',
    cones: '',
    type2: '',
    type3: '',
    truck: '',
    balloonLights: '',
    portableLights: '',
    travelTime: '',
    travelMiles: '',
    otherNotes: '',
    rateId: ''
  });

  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRates, setLoadingRates] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('useEffect running, about to load rates');
    loadRates();
  }, []);

  const loadRates = async () => {
    console.log('loadRates function called');
    try {
      setLoadingRates(true);
      console.log('Fetching rates from Firestore...');
      const snapshot = await getDocs(collection(db, 'rates'));
      console.log('Snapshot received:', snapshot);
      console.log('Number of rate docs:', snapshot.docs.length);
      
      const ratesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Rates data mapped:', ratesData);
      ratesData.sort((a, b) => (a.rateName || '').localeCompare(b.rateName || ''));
      console.log('Rates sorted:', ratesData);
      setRates(ratesData);
      console.log('Rates state updated');
    } catch (err) {
      console.error('Error loading rates:', err);
      setError('Failed to load rates: ' + err.message);
    } finally {
      setLoadingRates(false);
      console.log('loadingRates set to false');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateJobID = async () => {
    try {
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const existingJobs = jobsSnapshot.docs.map(doc => doc.data().jobID).filter(Boolean);
      
      let maxNumber = 0;
      existingJobs.forEach(jobID => {
        const match = jobID.match(/Job-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      return `Job-${maxNumber + 1}`;
    } catch (err) {
      console.error('Error generating job ID:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    if (!formData.rateId) {
      throw new Error('Please select a rate card');
    }

    if (!formData.initialJobDate) {
      throw new Error('Please select a date');
    }

    const jobID = await generateJobID();
    
    // Get selected rate info
    const selectedRate = rates.find(r => r.id === formData.rateId);
    const rateName = selectedRate?.rateName || '';

    // Convert date from YYYY-MM-DD (date picker format) to MM/DD/YYYY
    const [year, month, day] = formData.initialJobDate.split('-');
    const formattedDate = `${month}/${day}/${year}`;

    const jobData = {
      jobID,
      caller: formData.caller.trim(),
      billing: formData.billing.trim(),
      receiver: formData.receiver.trim(),
      poWoJobNum: formData.poWoJobNum.trim(),
      initialJobDate: formattedDate,
      initialJobTime: formData.initialJobTime.trim(),
      meetSet: formData.meetSet.trim(),
      jobLength: formData.jobLength.trim(),
      location: formData.location.trim(),
      amountOfFlaggers: formData.amountOfFlaggers.trim(),
      assignedFlaggers: '',
      dispatchedFlaggers: '',
      equipmentCarrier: '',
      signSets: formData.signSets.trim(),
      indvSigns: formData.indvSigns.trim(),
      cones: formData.cones.trim(),
      type2: formData.type2.trim(),
      type3: formData.type3.trim(),
      truck: formData.truck.trim(),
      balloonLights: formData.balloonLights.trim(),
      portableLights: formData.portableLights.trim(),
      travelTime: formData.travelTime.trim(),
      travelMiles: formData.travelMiles.trim(),
      otherNotes: formData.otherNotes.trim(),
      jobSeries: jobID,
      rateId: formData.rateId,
      rateName: rateName,
      hideFromSummary: false,
      custom: {},
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || 'unknown',
      updatedBy: auth.currentUser?.email || 'unknown'
    };

    await setDoc(doc(db, 'jobs', jobID), jobData);
    await logAudit('CREATE_JOB', 'jobs', jobID);

    onSave();
    onClose();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  console.log('Rendering modal. Rates:', rates, 'LoadingRates:', loadingRates, 'Error:', error);

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Create New Job</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="error-message">{error}</div>}

            {/* RATE CARD SELECTION */}
            <div style={{
              background: '#e8f0fe',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '2px solid #1a73e8'
            }}>
              <h3 style={{ marginBottom: '12px', color: '#1a73e8', marginTop: 0 }}>Rate Card *</h3>
              {loadingRates ? (
                <p>Loading rates...</p>
              ) : rates.length === 0 ? (
                <p style={{ color: '#d32f2f' }}>No rates available. Please create a rate card first in the Rates tab.</p>
              ) : (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select
                    name="rateId"
                    value={formData.rateId}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '2px solid #1a73e8',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">Select rate card...</option>
                    {rates.map(rate => (
                      <option key={rate.id} value={rate.id}>
                        {rate.rateName} - Bill: ${rate.flaggerHours}/hr
                        {rate.flaggerPay > 0 ? ` | Pay: $${rate.flaggerPay}/hr (PW)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Basic Information</h3>
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
  <div className="form-group">
    <label>Caller</label>
    <input
      name="caller"
      value={formData.caller}
      onChange={handleChange}
      placeholder="e.g., ODOT"
    />
  </div>

  <div className="form-group">
    <label>Billing</label>
    <input
      name="billing"
      value={formData.billing}
      onChange={handleChange}
      placeholder="e.g., ODOT"
    />
  </div>

  <div className="form-group">
    <label>Receiver</label>
    <input
      name="receiver"
      value={formData.receiver}
      onChange={handleChange}
      placeholder="e.g., John Smith"
    />
  </div>

  <div className="form-group">
    <label>PO/WO/Job #</label>
    <input
      name="poWoJobNum"
      value={formData.poWoJobNum}
      onChange={handleChange}
      placeholder="e.g., PO-12345"
    />
  </div>
</div>

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Job Details</h3>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
    <div className="form-group">
      <label>Date *</label>
      <input
        type="date"
        name="initialJobDate"
        value={formData.initialJobDate}
        onChange={handleChange}
        required
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #dadce0',
          borderRadius: '4px',
          fontSize: '14px'
        }}
      />
    </div>

    <div className="form-group">
      <label>Time</label>
      <select
        name="initialJobTime"
        value={formData.initialJobTime}
        onChange={handleChange}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #dadce0',
          borderRadius: '4px',
          fontSize: '14px'
        }}
      >
        <option value="">Select time...</option>
        {generateTimeOptions().map(time => (
          <option key={time} value={time}>{time}</option>
        ))}
      </select>
    </div>

    <div className="form-group">
      <label>Meet/Set</label>
      <input
        name="meetSet"
        value={formData.meetSet}
        onChange={handleChange}
        placeholder="e.g., Meet at shop"
      />
    </div>

    <div className="form-group">
      <label>Job Length</label>
      <input
        name="jobLength"
        value={formData.jobLength}
        onChange={handleChange}
        placeholder="e.g., 8 hours"
      />
    </div>

    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label>Location</label>
      <input
        name="location"
        value={formData.location}
        onChange={handleChange}
        placeholder="e.g., I-5 @ Exit 100"
      />
    </div>

    <div className="form-group">
      <label>Amount of Flaggers</label>
      <input
        type="number"
        name="amountOfFlaggers"
        value={formData.amountOfFlaggers}
        onChange={handleChange}
        min="0"
        placeholder="e.g., 2"
      />
    </div>
  </div>

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Equipment</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Sign Sets</label>
                <input
                  name="signSets"
                  value={formData.signSets}
                  onChange={handleChange}
                  placeholder="e.g., 2"
                />
              </div>

              <div className="form-group">
                <label>Individual Signs</label>
                <input
                  name="indvSigns"
                  value={formData.indvSigns}
                  onChange={handleChange}
                  placeholder="e.g., 5"
                />
              </div>

              <div className="form-group">
                <label>Cones</label>
                <input
                  type="number"
                  name="cones"
                  value={formData.cones}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 50"
                />
              </div>

              <div className="form-group">
                <label>Type 2</label>
                <input
                  name="type2"
                  value={formData.type2}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Type 3</label>
                <input
                  name="type3"
                  value={formData.type3}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Truck</label>
                <input
                  name="truck"
                  value={formData.truck}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Balloon Lights</label>
                <input
                  name="balloonLights"
                  value={formData.balloonLights}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Portable Lights</label>
                <input
                  name="portableLights"
                  value={formData.portableLights}
                  onChange={handleChange}
                />
              </div>
            </div>

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Travel & Billing</h3>
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
  <div className="form-group">
    <label>Travel Time (hours)</label>
    <input
      type="number"
      step="0.01"
      name="travelTime"
      value={formData.travelTime}
      onChange={handleChange}
      placeholder="e.g., 1.25"
    />
  </div>

  <div className="form-group">
    <label>Travel Miles</label>
    <input
      type="number"
      step="0.01"
      name="travelMiles"
      value={formData.travelMiles}
      onChange={handleChange}
      min="0"
      placeholder="e.g., 50.25"
    />
  </div>
</div>

            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Notes</h3>
            <div className="form-group">
              <textarea
                name="otherNotes"
                value={formData.otherNotes}
                onChange={handleChange}
                rows="4"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || loadingRates}>
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateJobModal;