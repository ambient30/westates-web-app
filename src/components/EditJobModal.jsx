import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/auditLog';

function EditJobModal({ job, onClose, onSave }) {
  // Convert MM/DD/YYYY to YYYY-MM-DD for date input
  const convertToDateInputFormat = (dateStr) => {
    if (!dateStr || dateStr.includes('-')) return dateStr; // Already in correct format or empty
    
    try {
      const [month, day, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // Convert 12-hour time to 24-hour for time input
  const convertToTimeInputFormat = (timeStr) => {
    if (!timeStr || !timeStr.includes('M')) return timeStr; // Already 24-hour or empty
    
    try {
      const [time, ampm] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      
      return `${hour.toString().padStart(2, '0')}:${minutes}`;
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    caller: job.caller || '',
    billing: job.billing || '',
    location: job.location || '',
    initialJobDate: convertToDateInputFormat(job.initialJobDate) || '',  // ← CONVERT
    initialJobTime: convertToTimeInputFormat(job.initialJobTime) || '',  // ← CONVERT
    meetSet: job.meetSet || 'Set',
    jobLength: job.jobLength || '',
    amountOfFlaggers: job.amountOfFlaggers || 0,
    jobSeries: job.jobSeries || '',
    poWoJobNum: job.poWoJobNum || '',
    travelTime: job.travelTime || 0,
    travelMiles: job.travelMiles || 0,
    otherNotes: job.otherNotes || '',
    signSets: job.signSets || 0,
    indvSigns: job.indvSigns || 0,
    cones: job.cones || 0,
    type2: job.type2 || 0,
    type3: job.type3 || 0,
    truck: job.truck || 0,
    balloonLights: job.balloonLights || 0,
    portableLights: job.portableLights || 0
  });

  const [callers, setCallers] = useState([]);
  const [billingCompanies, setBillingCompanies] = useState([]);
  const [jobSeries, setJobSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const [contractorsSnap, jobsSnap] = await Promise.all([
        getDocs(collection(db, 'contractors')),
        getDocs(collection(db, 'jobs'))
      ]);

      const contractors = contractorsSnap.docs.map(doc => doc.data());
      const jobs = jobsSnap.docs.map(doc => doc.data());

      const uniqueCallers = [...new Set(contractors.map(c => c.caller).filter(Boolean))];
      const uniqueBilling = [...new Set(contractors.map(c => c.billing).filter(Boolean))];
      const uniqueSeries = [...new Set(jobs.map(j => j.jobSeries).filter(Boolean))];

      setCallers(uniqueCallers.sort());
      setBillingCompanies(uniqueBilling.sort());
      setJobSeries(uniqueSeries.sort());
    } catch (err) {
      console.error('Error loading dropdown data:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    // Convert date from YYYY-MM-DD to MM/DD/YYYY
    let formattedDate = formData.initialJobDate;
    if (formData.initialJobDate && formData.initialJobDate.includes('-')) {
      const dateObj = new Date(formData.initialJobDate);
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();
      formattedDate = `${month}/${day}/${year}`;
    }

    // Convert time from 24-hour (14:30) to 12-hour (2:30 PM)
    let formattedTime = formData.initialJobTime;
    if (formData.initialJobTime && formData.initialJobTime.includes(':') && !formData.initialJobTime.includes('M')) {
      const [hours, minutes] = formData.initialJobTime.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      formattedTime = `${hour12}:${minutes} ${ampm}`;
    }

    // Build equipment description
    const equipmentParts = [];
    if (formData.signSets > 0) equipmentParts.push(`${formData.signSets} sign sets`);
    if (formData.indvSigns > 0) equipmentParts.push(`${formData.indvSigns} individual signs`);
    if (formData.cones > 0) equipmentParts.push(`${formData.cones} cones`);
    if (formData.type2 > 0) equipmentParts.push(`${formData.type2} type 2`);
    if (formData.type3 > 0) equipmentParts.push(`${formData.type3} type 3`);
    if (formData.truck > 0) equipmentParts.push(`${formData.truck} truck`);
    if (formData.balloonLights > 0) equipmentParts.push(`${formData.balloonLights} balloon lights`);
    if (formData.portableLights > 0) equipmentParts.push(`${formData.portableLights} portable lights`);

    const signsConesOtherEquipmentNeeded = equipmentParts.join(', ');

    const updates = {
      caller: formData.caller,
      billing: formData.billing,
      location: formData.location,
      initialJobDate: formattedDate,  // ← FORMATTED
      initialJobTime: formattedTime,  // ← FORMATTED
      meetSet: formData.meetSet,
      jobLength: formData.jobLength,
      amountOfFlaggers: parseInt(formData.amountOfFlaggers) || 0,
      jobSeries: formData.jobSeries,
      poWoJobNum: formData.poWoJobNum,
      travelTime: parseFloat(formData.travelTime) || 0,
      travelMiles: parseFloat(formData.travelMiles) || 0,
      signSets: parseFloat(formData.signSets) || 0,
      indvSigns: parseFloat(formData.indvSigns) || 0,
      cones: parseFloat(formData.cones) || 0,
      type2: parseFloat(formData.type2) || 0,
      type3: parseFloat(formData.type3) || 0,
      truck: parseFloat(formData.truck) || 0,
      balloonLights: parseFloat(formData.balloonLights) || 0,
      portableLights: parseFloat(formData.portableLights) || 0,
      signsConesOtherEquipmentNeeded,
      otherNotes: formData.otherNotes,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'unknown'
    };

    await updateDoc(doc(db, 'jobs', job.id), updates);
    await logAudit('UPDATE_JOB', 'jobs', job.jobID, updates);

    onSave();
    onClose();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>Edit Job: {job.jobID}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="error-message">{error}</div>}

            {/* Client Information */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Client Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Caller *</label>
                <input
                  list="callers"
                  name="caller"
                  value={formData.caller}
                  onChange={handleChange}
                  required
                />
                <datalist id="callers">
                  {callers.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="form-group">
                <label>Billing *</label>
                <input
                  list="billing"
                  name="billing"
                  value={formData.billing}
                  onChange={handleChange}
                  required
                />
                <datalist id="billing">
                  {billingCompanies.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
            </div>

            {/* Job Details */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Job Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Job Series</label>
                <input
                  list="series"
                  name="jobSeries"
                  value={formData.jobSeries}
                  onChange={handleChange}
                />
                <datalist id="series">
                  {jobSeries.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="initialJobDate"
                  value={formData.initialJobDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  name="initialJobTime"
                  value={formData.initialJobTime}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Meet/Set</label>
                <select name="meetSet" value={formData.meetSet} onChange={handleChange}>
                  <option value="Meet">Meet</option>
                  <option value="Set">Set</option>
                </select>
              </div>

              <div className="form-group">
                <label>Job Length</label>
                <input
                  name="jobLength"
                  value={formData.jobLength}
                  onChange={handleChange}
                  placeholder="e.g., 4 hours"
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
                />
              </div>
            </div>

            {/* Equipment */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Equipment</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12px' }}>Sign Sets</label>
                <input
                  type="number"
                  name="signSets"
                  value={formData.signSets}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px' }}>Indv Signs</label>
                <input
                  type="number"
                  name="indvSigns"
                  value={formData.indvSigns}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px' }}>Cones</label>
                <input
                  type="number"
                  name="cones"
                  value={formData.cones}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px' }}>Type 2</label>
                <input
                  type="number"
                  name="type2"
                  value={formData.type2}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px' }}>Type 3</label>
                <input
                  type="number"
                  name="type3"
                  value={formData.type3}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px' }}>Truck</label>
                <input
                  type="number"
                  name="truck"
                  value={formData.truck}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px' }}>Balloon Lights</label>
                <input
                  type="number"
                  name="balloonLights"
                  value={formData.balloonLights}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px' }}>Portable Lights</label>
                <input
                  type="number"
                  name="portableLights"
                  value={formData.portableLights}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>

            {/* Billing & Travel */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Billing & Travel</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>PO/WO/Job #</label>
                <input
                  name="poWoJobNum"
                  value={formData.poWoJobNum}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Travel Time (hrs)</label>
                <input
                  type="number"
                  name="travelTime"
                  value={formData.travelTime}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="form-group">
                <label>Travel Miles</label>
                <input
                  type="number"
                  name="travelMiles"
                  value={formData.travelMiles}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>

            {/* Notes */}
            <h3 style={{ marginBottom: '12px', color: '#1a73e8' }}>Notes</h3>
            <div className="form-group">
              <textarea
                name="otherNotes"
                value={formData.otherNotes}
                onChange={handleChange}
                rows="3"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditJobModal;