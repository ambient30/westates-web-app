import { useState, useEffect } from 'react';
import { collection, onSnapshot } from '../utils/firestoreTracker';
import { db } from '../firebase';

// ============================================
// HELPER FUNCTIONS
// ============================================

function isHoliday(dateString) {
  const holidays2026 = [
    "01/01/2026", "05/25/2026", "07/04/2026", 
    "09/07/2026", "11/26/2026", "12/25/2026"
  ];
  return holidays2026.includes(dateString);
}

function isNightTime(timeString, overtimeNights) {
  if (!overtimeNights || !timeString) return false;
  
  const match = overtimeNights.match(/(\d+)(am|pm)?\s*-\s*(\d+)(am|pm)?/i);
  if (!match) return false;
  
  let startHour = parseInt(match[1]);
  const startAmPm = match[2]?.toLowerCase();
  let endHour = parseInt(match[3]);
  const endAmPm = match[4]?.toLowerCase();
  
  if (startAmPm === 'pm' && startHour !== 12) startHour += 12;
  if (startAmPm === 'am' && startHour === 12) startHour = 0;
  if (endAmPm === 'pm' && endHour !== 12) endHour += 12;
  if (endAmPm === 'am' && endHour === 12) endHour = 0;
  
  const timeMatch = timeString.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (!timeMatch) return false;
  
  let jobHour = parseInt(timeMatch[1]);
  const jobAmPm = timeMatch[3].toLowerCase();
  
  if (jobAmPm === 'pm' && jobHour !== 12) jobHour += 12;
  if (jobAmPm === 'am' && jobHour === 12) jobHour = 0;
  
  if (startHour < endHour) {
    return jobHour >= startHour && jobHour < endHour;
  } else {
    return jobHour >= startHour || jobHour < endHour;
  }
}

function isWeekend(dateString, weekendDuration) {
  if (!weekendDuration || !dateString) return false;
  
  const [month, day, year] = dateString.split('/');
  const date = new Date(year, month - 1, day);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  
  return weekendDuration.toLowerCase().includes(dayName.toLowerCase());
}

function isEPUDJob(job) {
  return job.billing?.toUpperCase().includes('EPUD');
}

function InvoicingReportView({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoiceData, setInvoiceData] = useState(null);

  useEffect(() => {
    console.log('🔴 Setting up REAL-TIME listener for invoicing...');
    
    const jobsRef = collection(db, 'jobs');
    const ratesRef = collection(db, 'rates');
    
    const jobsUnsubscribe = onSnapshot(jobsRef, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
    });
    
    const ratesUnsubscribe = onSnapshot(ratesRef, (snapshot) => {
      const ratesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRates(ratesData);
      setLoading(false);
    });
    
    return () => {
      console.log('🔴 Cleaning up invoicing listeners');
      jobsUnsubscribe();
      ratesUnsubscribe();
    };
  }, []);

  const generateInvoices = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const relevantJobs = jobs.filter(job => {
      if (!job.initialJobDate || !job.actualHours) return false;
      const [month, day, year] = job.initialJobDate.split('/');
      const jobDate = new Date(year, month - 1, day);
      return jobDate >= start && jobDate <= end;
    });

    console.log('Relevant jobs for invoicing:', relevantJobs.length);

    const clientInvoices = {};

    relevantJobs.forEach(job => {
      const client = job.billing || 'Unknown Client';
      const jobRate = rates.find(r => r.id === job.rateId);
      
      if (!jobRate) {
        console.log('No rate found for job:', job.jobID);
        return;
      }

      const isPrevailingWage = jobRate.flaggerPay > 0;
      const isHolidayJob = isHoliday(job.initialJobDate);
      const isWeekendJob = isWeekend(job.initialJobDate, jobRate.weekendDuration);
      const isNightJob = isNightTime(job.initialJobTime, jobRate.overtimeNights);
      const isEPUD = isEPUDJob(job);

      if (!clientInvoices[client]) {
        clientInvoices[client] = {
          client,
          jobSeries: {},
          totalAmount: 0
        };
      }

      const series = job.jobSeries || job.jobID;
      
      if (!clientInvoices[client].jobSeries[series]) {
        clientInvoices[client].jobSeries[series] = {
          series,
          jobs: [],
          jobsData: [], // Store full job data for remarks
          totalAmount: 0
        };
      }

      let jobTotalBilling = 0;
      let jobTotalFlaggers = 0;
      const flaggers = Object.keys(job.actualHours || {});
      jobTotalFlaggers = flaggers.length;

      flaggers.forEach(flagger => {
        const timeData = job.actualHours[flagger];
        let totalHours = parseFloat(timeData.totalHours || timeData.hoursWorked || 0);
        
        // If lunch was taken, it should already be deducted in totalHours
        // But if we only have hoursWorked, we need to deduct lunch
        if (timeData.hasLunch && !timeData.totalHours) {
          totalHours -= 0.5; // Deduct 30 minutes
        }

        const regularRate = parseFloat(jobRate.flaggerHours) || 0;
        const otRate = parseFloat(jobRate.flaggerHoursOT) || 0;
        const holidayRate = regularRate * (parseFloat(jobRate.holiday) || 2);

        let regularHours = 0;
        let otHours = 0;
        let holidayHours = 0;

        if (isHolidayJob) {
          holidayHours = totalHours;
        } else if (isWeekendJob || isNightJob) {
          otHours = totalHours;
        } else {
          const otStart = parseInt(jobRate.otStarts) || 8;
          regularHours = Math.min(totalHours, otStart);
          otHours = Math.max(0, totalHours - otStart);
        }

        const minimumHours = parseFloat(jobRate.hourMinimum) || 4;
        const totalActualHours = regularHours + otHours + holidayHours;
        
        if (totalActualHours < minimumHours) {
          const shortfall = minimumHours - totalActualHours;
          regularHours += shortfall;
        }

        const flaggerBilling = (regularHours * regularRate) + 
                               (otHours * otRate) + 
                               (holidayHours * holidayRate);

        jobTotalBilling += flaggerBilling;
      });

      // Travel billing - PER FLAGGER
      let travelBilling = 0;
      let mileageBilling = 0;

      if (!isPrevailingWage) {
        flaggers.forEach(flagger => {
          const timeData = job.actualHours[flagger];
          const flaggerTravelHours = parseFloat(timeData.travelHours || 0);
          const flaggerTravelMiles = parseFloat(timeData.travelMiles || 0);

          if (isEPUD) {
            // EPUD: Bill travel and mileage regardless of thresholds
            travelBilling += flaggerTravelHours * (parseFloat(jobRate.travelTime) || 0);
            mileageBilling += flaggerTravelMiles * (parseFloat(jobRate.mileage) || 0);
          } else {
            // Regular: Apply thresholds PER FLAGGER
            // Travel: roundtrip - 1 hour, must be >= 1hr
            const billableTravelHours = flaggerTravelHours - 1;
            if (billableTravelHours >= 1) {
              travelBilling += billableTravelHours * (parseFloat(jobRate.travelTime) || 0);
            }
            
            // Mileage: must be >= 60 miles
            if (flaggerTravelMiles >= 60) {
              mileageBilling += flaggerTravelMiles * (parseFloat(jobRate.mileage) || 0);
            }
          }
        });
      }

      // Equipment billing
      let equipmentBilling = 0;
      const equipment = job.actualEquipment || {};
      
      // Sign Sets: signSets × 6 × rate.signs
      if (equipment.signSets && parseInt(equipment.signSets) > 0) {
        equipmentBilling += parseInt(equipment.signSets) * 6 * (parseFloat(jobRate.signs) || 0);
      }
      
      // Indv Signs: indvSigns × rate.signs
      if (equipment.indvSigns && parseInt(equipment.indvSigns) > 0) {
        equipmentBilling += parseInt(equipment.indvSigns) * (parseFloat(jobRate.signs) || 0);
      }
      
      // Type 2: type2 × rate.type2
      if (equipment.type2 && parseInt(equipment.type2) > 0) {
        equipmentBilling += parseInt(equipment.type2) * (parseFloat(jobRate.type2) || 0);
      }
      
      // Type 3: type3 × rate.type3
      if (equipment.type3 && parseInt(equipment.type3) > 0) {
        equipmentBilling += parseInt(equipment.type3) * (parseFloat(jobRate.type3) || 0);
      }
      
      // Cones: cones × rate.cones
      if (equipment.cones && parseInt(equipment.cones) > 0) {
        equipmentBilling += parseInt(equipment.cones) * (parseFloat(jobRate.cones) || 0);
      }
      
      // Balloon Lights: balloonLights × rate.balloonLights
      if (equipment.balloonLights && parseInt(equipment.balloonLights) > 0) {
        equipmentBilling += parseInt(equipment.balloonLights) * (parseFloat(jobRate.balloonLights) || 0);
      }
      
      // Portable Lights: portableLights × rate.portableLights
      if (equipment.portableLights && parseInt(equipment.portableLights) > 0) {
        equipmentBilling += parseInt(equipment.portableLights) * (parseFloat(jobRate.portableLights) || 0);
      }
      
      // Trucks: truck × rate.truck
      if (equipment.truck && parseInt(equipment.truck) > 0) {
        equipmentBilling += parseInt(equipment.truck) * (parseFloat(jobRate.truck) || 0);
      }
      
      // Truck Mileage: truckMileage × rate.truckMileage
      if (equipment.truckMileage && parseInt(equipment.truckMileage) > 0) {
        equipmentBilling += parseInt(equipment.truckMileage) * (parseFloat(jobRate.truckMileage) || 0);
      }
      
      // TCP: tcp × rate.tcp
      if (equipment.tcp && parseInt(equipment.tcp) > 0) {
        equipmentBilling += parseInt(equipment.tcp) * (parseFloat(jobRate.tcp) || 0);
      }

      const totalJobAmount = jobTotalBilling + travelBilling + mileageBilling + equipmentBilling;

      clientInvoices[client].jobSeries[series].jobs.push({
        jobID: job.jobID,
        date: job.initialJobDate,
        location: job.location,
        flaggers: jobTotalFlaggers,
        laborBilling: jobTotalBilling,
        travelBilling,
        mileageBilling,
        equipmentBilling,
        amount: totalJobAmount
      });

      // Store full job data for remarks
      clientInvoices[client].jobSeries[series].jobsData.push(job);

      clientInvoices[client].jobSeries[series].totalAmount += totalJobAmount;
      clientInvoices[client].totalAmount += totalJobAmount;
    });

    console.log('Generated invoices:', clientInvoices);
    setInvoiceData(Object.values(clientInvoices));
  };

  const exportToCSV = () => {
    if (!invoiceData) return;

    const rows = [];
    rows.push(['Client', 'Job Series', 'Job ID', 'Date', 'Location', 'Flaggers', 'Labor', 'Travel', 'Mileage', 'Equipment', 'Total']);

    invoiceData.forEach(client => {
      Object.values(client.jobSeries).forEach(series => {
        series.jobs.forEach(job => {
          rows.push([
            client.client,
            series.series,
            job.jobID,
            job.date,
            job.location,
            job.flaggers,
            job.laborBilling.toFixed(2),
            job.travelBilling.toFixed(2),
            job.mileageBilling.toFixed(2),
            job.equipmentBilling.toFixed(2),
            job.amount.toFixed(2)
          ]);
        });
      });
    });

    const csv = rows.map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_${startDate}_to_${endDate}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
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
        <h2 style={{ margin: 0, fontSize: '20px' }}>Invoicing Report</h2>
        <div style={{ fontSize: '11px', color: '#4caf50' }}>
          🟢 Live sync active
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '4px',
        marginBottom: '16px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
          Select Billing Period
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#5f6368' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#5f6368' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>
          <button 
            onClick={generateInvoices}
            className="btn btn-primary"
            style={{ padding: '6px 16px', fontSize: '12px' }}
          >
            Generate Invoices
          </button>
          {invoiceData && (
            <button 
              onClick={exportToCSV}
              className="btn btn-secondary"
              style={{ padding: '6px 16px', fontSize: '12px' }}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {invoiceData && (
        <div>
          <div style={{
            background: 'white',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '12px',
            border: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#1a73e8' }}>Total Invoices</h3>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2e7d32' }}>
              ${invoiceData.reduce((sum, client) => sum + client.totalAmount, 0).toFixed(2)}
            </div>
          </div>

          {invoiceData.map(client => (
            <ClientInvoiceCard key={client.client} invoice={client} />
          ))}
        </div>
      )}

      {!invoiceData && !loading && (
        <div style={{
          background: 'white',
          padding: '40px 20px',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#5f6368',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#202124' }}>No Invoices Generated</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>Select a date range and click "Generate Invoices" to view client billing</p>
        </div>
      )}
    </div>
  );
}

function ClientInvoiceCard({ invoice }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      marginBottom: '12px',
      overflow: 'hidden'
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: expanded ? '#f8f9fa' : 'white'
        }}
      >
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px', color: '#202124', marginBottom: '2px' }}>
            {invoice.client}
          </div>
          <div style={{ fontSize: '12px', color: '#5f6368' }}>
            {Object.keys(invoice.jobSeries).length} job series
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#2e7d32' }}>
            ${invoice.totalAmount.toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: '#5f6368' }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '12px', background: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
          {Object.values(invoice.jobSeries).map(series => (
            <JobSeriesBreakdown key={series.series} series={series} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobSeriesBreakdown({ series }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      marginBottom: '8px',
      overflow: 'hidden'
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'white'
        }}
      >
        <div>
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#202124' }}>
            {series.series}
          </div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>
            {series.jobs.length} job{series.jobs.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#2e7d32' }}>
            ${series.totalAmount.toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: '#5f6368' }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '10px', background: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '6px', textAlign: 'left' }}>Job ID</th>
                <th style={{ padding: '6px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '6px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Flaggers</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Labor</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Travel</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Mileage</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Equipment</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {series.jobs.map((job, idx) => (
                <tr 
                  key={idx} 
                  style={{ 
                    borderBottom: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    background: selectedJobDetails?.jobID === job.jobID ? '#e8f0fe' : 'transparent'
                  }}
                  onClick={() => setSelectedJobDetails(
                    selectedJobDetails?.jobID === job.jobID ? null : series.jobsData[idx]
                  )}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => {
                    if (selectedJobDetails?.jobID !== job.jobID) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <td style={{ padding: '6px' }}>
                    {job.jobID}
                    {job.poWoJobNum && (
                      <span style={{ color: '#5f6368', marginLeft: '6px', fontSize: '10px' }}>
                        PO: {job.poWoJobNum}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px' }}>{job.date}</td>
                  <td style={{ padding: '6px' }}>{job.location}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{job.flaggers}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>${job.laborBilling.toFixed(2)}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>${job.travelBilling.toFixed(2)}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>${job.mileageBilling.toFixed(2)}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>${job.equipmentBilling.toFixed(2)}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: '600' }}>
                    ${job.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Detailed Job Breakdown */}
          {selectedJobDetails && (
            <JobDetailedBreakdown job={selectedJobDetails} />
          )}

          {/* REMARKS SECTION */}
          <RemarksSection jobs={series.jobsData} />
        </div>
      )}
    </div>
  );
}

function JobDetailedBreakdown({ job }) {
  const [rates, setRates] = useState([]);
  
  useEffect(() => {
    // Load rates to get rate details
    const ratesRef = collection(db, 'rates');
    const unsubscribe = onSnapshot(ratesRef, (snapshot) => {
      const ratesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRates(ratesData);
    });
    
    return () => unsubscribe();
  }, []);
  
  const jobRate = rates.find(r => r.id === job.rateId);
  
  if (!jobRate || !job.actualHours) {
    return (
      <div style={{
        marginTop: '10px',
        padding: '10px',
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#5f6368'
      }}>
        No detailed breakdown available
      </div>
    );
  }
  
  const isPrevailingWage = jobRate.flaggerPay > 0;
  const isHolidayJob = isHoliday(job.initialJobDate);
  const isWeekendJob = isWeekend(job.initialJobDate, jobRate.weekendDuration);
  const isNightJob = isNightTime(job.initialJobTime, jobRate.overtimeNights);
  
  const regularRate = parseFloat(jobRate.flaggerHours) || 0;
  const otRate = parseFloat(jobRate.flaggerHoursOT) || 0;
  const holidayRate = regularRate * (parseFloat(jobRate.holiday) || 2);
  const travelRate = parseFloat(jobRate.travelTime) || 0;
  const mileageRate = parseFloat(jobRate.mileage) || 0;
  const otStart = parseInt(jobRate.otStarts) || 8;
  const minimumHours = parseFloat(jobRate.hourMinimum) || 4;
  
  const flaggers = Object.keys(job.actualHours || {});
  
  return (
    <div style={{
      marginTop: '10px',
      padding: '10px',
      background: 'white',
      border: '2px solid #1a73e8',
      borderRadius: '4px'
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#1a73e8',
        marginBottom: '10px',
        paddingBottom: '6px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        Detailed Breakdown: {job.jobID}
        {job.poWoJobNum && (
          <span style={{ color: '#5f6368', marginLeft: '8px', fontSize: '11px', fontWeight: '500' }}>
            PO: {job.poWoJobNum}
          </span>
        )}
      </div>
      
      {/* Job Info Section */}
      <div style={{
        background: '#fff9e6',
        padding: '8px',
        borderRadius: '4px',
        marginBottom: '10px',
        fontSize: '10px',
        border: '1px solid #ffd966'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px' }}>
          {job.billing && (
            <>
              <span style={{ fontWeight: '600', color: '#7f6000' }}>Billing:</span>
              <span>{job.billing}</span>
            </>
          )}
          {job.caller && (
            <>
              <span style={{ fontWeight: '600', color: '#7f6000' }}>Caller:</span>
              <span>{job.caller}</span>
            </>
          )}
        </div>
      </div>
      
      {/* Other Notes */}
      {job.otherNotes && (
        <div style={{
          background: '#fff3e0',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '10px',
          border: '1px solid #ffb74d'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', color: '#e65100' }}>
            Other Notes:
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {job.otherNotes}
          </div>
        </div>
      )}
      
      {/* Rate Card Info */}
      <div style={{
        background: '#f0f4ff',
        padding: '8px',
        borderRadius: '4px',
        marginBottom: '10px',
        fontSize: '10px'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1a73e8' }}>
          Rate Card: {job.rateName || jobRate.name || 'Unknown'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '4px', color: '#5f6368' }}>
          <div>Regular: ${regularRate}/hr</div>
          <div>OT: ${otRate}/hr</div>
          {isHolidayJob && <div style={{ color: '#d32f2f', fontWeight: '600' }}>Holiday: ${holidayRate}/hr</div>}
          <div>OT Starts: {otStart} hrs</div>
          <div>Minimum: {minimumHours} hrs</div>
          <div>Travel: ${travelRate}/hr</div>
          <div>Mileage: ${mileageRate}/mi</div>
        </div>
        {isPrevailingWage && (
          <div style={{ marginTop: '4px', color: '#d32f2f', fontWeight: '600' }}>
            ⚠ Prevailing Wage - NO travel/mileage billed
          </div>
        )}
      </div>
      
      {/* Per-Flagger Breakdown */}
      {flaggers.map(flagger => {
        const timeData = job.actualHours[flagger];
        let totalHours = parseFloat(timeData.totalHours || timeData.hoursWorked || 0);
        
        // If lunch was taken and only hoursWorked exists, deduct lunch
        if (timeData.hasLunch && !timeData.totalHours) {
          totalHours -= 0.5;
        }
        
        const travelHours = parseFloat(timeData.travelHours || 0);
        const travelMiles = parseFloat(timeData.travelMiles || 0);
        
        let regularHours = 0;
        let otHours = 0;
        let holidayHours = 0;
        
        if (isHolidayJob) {
          holidayHours = totalHours;
        } else if (isWeekendJob || isNightJob) {
          otHours = totalHours;
        } else {
          regularHours = Math.min(totalHours, otStart);
          otHours = Math.max(0, totalHours - otStart);
        }
        
        const totalActualHours = regularHours + otHours + holidayHours;
        let minimumApplied = false;
        
        if (totalActualHours < minimumHours) {
          const shortfall = minimumHours - totalActualHours;
          regularHours += shortfall;
          minimumApplied = true;
        }
        
        const regularPay = regularHours * regularRate;
        const otPay = otHours * otRate;
        const holidayPay = holidayHours * holidayRate;
        
        // Calculate travel/mileage per flagger
        let flaggerTravelPay = 0;
        let flaggerMileagePay = 0;
        
        if (!isPrevailingWage) {
          const isEPUD = isEPUDJob(job);
          
          if (isEPUD) {
            // EPUD: Bill all travel/mileage
            flaggerTravelPay = travelHours * travelRate;
            flaggerMileagePay = travelMiles * mileageRate;
          } else {
            // Regular: Apply thresholds
            const billableTravelHours = travelHours - 1;
            if (billableTravelHours >= 1) {
              flaggerTravelPay = billableTravelHours * travelRate;
            }
            
            if (travelMiles >= 60) {
              flaggerMileagePay = travelMiles * mileageRate;
            }
          }
        }
        
        const totalPay = regularPay + otPay + holidayPay + flaggerTravelPay + flaggerMileagePay;
        
        return (
          <div key={flagger} style={{
            background: '#fafafa',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '6px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ fontWeight: '600', fontSize: '11px', color: '#202124', marginBottom: '6px' }}>
              {flagger}
              {timeData.hasLunch && <span style={{ color: '#e65100', marginLeft: '6px', fontSize: '10px' }}>(LUNCH)</span>}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px' }}>
              <div>
                <span style={{ color: '#5f6368' }}>Hours Worked:</span>{' '}
                <span style={{ fontWeight: '600' }}>{totalHours.toFixed(2)} hrs</span>
              </div>
              
              {minimumApplied && (
                <div style={{ color: '#ff9800', fontWeight: '600' }}>
                  ⚠ Min {minimumHours} hrs applied
                </div>
              )}
              
              {regularHours > 0 && (
                <div>
                  <span style={{ color: '#5f6368' }}>Regular:</span>{' '}
                  {regularHours.toFixed(2)} hrs × ${regularRate} = ${regularPay.toFixed(2)}
                </div>
              )}
              
              {otHours > 0 && (
                <div>
                  <span style={{ color: '#5f6368' }}>OT:</span>{' '}
                  {otHours.toFixed(2)} hrs × ${otRate} = ${otPay.toFixed(2)}
                </div>
              )}
              
              {holidayHours > 0 && (
                <div style={{ color: '#d32f2f', fontWeight: '600' }}>
                  <span>Holiday:</span>{' '}
                  {holidayHours.toFixed(2)} hrs × ${holidayRate} = ${holidayPay.toFixed(2)}
                </div>
              )}
              
              {flaggerTravelPay > 0 && (
                <div>
                  <span style={{ color: '#5f6368' }}>Travel:</span>{' '}
                  {(travelHours - (isEPUDJob(job) ? 0 : 1)).toFixed(2)} hrs × ${travelRate} = ${flaggerTravelPay.toFixed(2)}
                </div>
              )}
              
              {flaggerMileagePay > 0 && (
                <div>
                  <span style={{ color: '#5f6368' }}>Mileage:</span>{' '}
                  {travelMiles.toFixed(0)} mi × ${mileageRate} = ${flaggerMileagePay.toFixed(2)}
                </div>
              )}
              
              <div style={{ 
                gridColumn: '1 / -1',
                paddingTop: '4px',
                borderTop: '1px solid #e0e0e0',
                fontWeight: '600',
                color: '#2e7d32'
              }}>
                Flagger Total: ${totalPay.toFixed(2)}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Equipment */}
      {job.actualEquipment && Object.keys(job.actualEquipment).length > 0 && (
        <div style={{
          background: '#f0f4ff',
          padding: '8px',
          borderRadius: '4px',
          marginTop: '6px',
          border: '1px solid #d0d9ff'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '11px', color: '#1a73e8' }}>
            Equipment
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '4px', fontSize: '10px' }}>
            {job.actualEquipment.signSets && parseInt(job.actualEquipment.signSets) > 0 && (
              <div>
                Sign Sets: {job.actualEquipment.signSets} × 6 × ${jobRate.signs || 0} = ${(parseInt(job.actualEquipment.signSets) * 6 * (parseFloat(jobRate.signs) || 0)).toFixed(2)}
              </div>
            )}
            {job.actualEquipment.indvSigns && parseInt(job.actualEquipment.indvSigns) > 0 && (
              <div>
                Indv Signs: {job.actualEquipment.indvSigns} × ${jobRate.signs || 0} = ${(parseInt(job.actualEquipment.indvSigns) * (parseFloat(jobRate.signs) || 0)).toFixed(2)}
              </div>
            )}
            {job.actualEquipment.type2 && parseInt(job.actualEquipment.type2) > 0 && (
              <div>
                Type 2: {job.actualEquipment.type2} × ${jobRate.type2 || 0} = ${(parseInt(job.actualEquipment.type2) * (parseFloat(jobRate.type2) || 0)).toFixed(2)}
              </div>
            )}
            {job.actualEquipment.type3 && parseInt(job.actualEquipment.type3) > 0 && (
              <div>
                Type 3: {job.actualEquipment.type3} × ${jobRate.type3 || 0} = ${(parseInt(job.actualEquipment.type3) * (parseFloat(jobRate.type3) || 0)).toFixed(2)}
              </div>
            )}
            {job.actualEquipment.cones && parseInt(job.actualEquipment.cones) > 0 && (
              <div>
                Cones: {job.actualEquipment.cones} × ${jobRate.cones || 0} = ${(parseInt(job.actualEquipment.cones) * (parseFloat(jobRate.cones) || 0)).toFixed(2)}
              </div>
            )}
            {job.actualEquipment.balloonLights && parseInt(job.actualEquipment.balloonLights) > 0 && (
              <div>
                Balloon Lights: {job.actualEquipment.balloonLights} × ${jobRate.balloonLights || 0} = ${(parseInt(job.actualEquipment.balloonLights) * (parseFloat(jobRate.balloonLights) || 0)).toFixed(2)}
              </div>
            )}
            {job.actualEquipment.portableLights && parseInt(job.actualEquipment.portableLights) > 0 && (
              <div>
                Portable Lights: {job.actualEquipment.portableLights} × ${jobRate.portableLights || 0} = ${(parseInt(job.actualEquipment.portableLights) * (parseFloat(jobRate.portableLights) || 0)).toFixed(2)}
              </div>
            )}
            {job.actualEquipment.truck && parseInt(job.actualEquipment.truck) > 0 && (
              <div>
                Trucks: {job.actualEquipment.truck} × ${jobRate.truck || 0} = ${(parseInt(job.actualEquipment.truck) * (parseFloat(jobRate.truck) || 0)).toFixed(2)}
              </div>
            )}
            {job.actualEquipment.truckMileage && parseInt(job.actualEquipment.truckMileage) > 0 && (
              <div>
                Truck Mileage: {job.actualEquipment.truckMileage} × ${jobRate.truckMileage || 0} = ${(parseInt(job.actualEquipment.truckMileage) * (parseFloat(jobRate.truckMileage) || 0)).toFixed(2)}
              </div>
            )}
            {job.actualEquipment.tcp && parseInt(job.actualEquipment.tcp) > 0 && (
              <div>
                TCP: {job.actualEquipment.tcp} × ${jobRate.tcp || 0} = ${(parseInt(job.actualEquipment.tcp) * (parseFloat(jobRate.tcp) || 0)).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Travel & Mileage removed - now shown per flagger above */}
    </div>
  );
}

function RemarksSection({ jobs }) {
  if (!jobs || jobs.length === 0) return null;

  // Format date as "MARCH 30"
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [month, day, year] = dateString.split('/');
    const date = new Date(year, month - 1, day);
    const monthName = date.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    return `${monthName} ${day}`;
  };

  // Format time as "9:00AM TO 4:00PM"
  const formatTimeRange = (actualHours) => {
    if (!actualHours) return '';
    
    // Get all flaggers' times (should be same start/end for the job)
    const times = Object.values(actualHours);
    if (times.length === 0) return '';
    
    const firstTime = times[0];
    if (!firstTime.startTime || !firstTime.endTime) return '';
    
    const formatTime = (time) => {
      const [hour, minute] = time.split(':');
      let h = parseInt(hour);
      const ampm = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${minute}${ampm}`;
    };
    
    return `${formatTime(firstTime.startTime)} TO ${formatTime(firstTime.endTime)}`;
  };

  // Get flaggers with lunch info
  const getFlaggers = (actualHours) => {
    if (!actualHours) return '';
    
    const flaggers = Object.keys(actualHours);
    const hasLunchFlaggers = flaggers.filter(f => actualHours[f].hasLunch);
    
    if (hasLunchFlaggers.length === flaggers.length) {
      // All took lunch
      return `${flaggers.join(' & ')})(LESS LUNCH`;
    } else if (hasLunchFlaggers.length > 0) {
      // Some took lunch
      const lunchList = hasLunchFlaggers.join(' & ');
      return `${flaggers.join(' & ')})${lunchList ? `(${lunchList} LESS LUNCH` : ''}`;
    } else {
      // None took lunch
      return flaggers.join(' & ');
    }
  };

  return (
    <div style={{
      marginTop: '12px',
      padding: '10px',
      background: '#fff9e6',
      border: '1px solid #ffd966',
      borderRadius: '4px'
    }}>
      <div style={{ 
        fontWeight: '600', 
        fontSize: '11px', 
        marginBottom: '6px',
        color: '#7f6000',
        textTransform: 'uppercase'
      }}>
        REMARKS: (STATIONARY FLAG TIME)
      </div>
      <div style={{ 
        fontSize: '11px', 
        fontFamily: 'monospace',
        color: '#202124',
        whiteSpace: 'pre-line',
        lineHeight: '1.5'
      }}>
        {jobs.map((job, idx) => (
          <div key={idx}>
            {formatDate(job.initialJobDate)} - {formatTimeRange(job.actualHours)} ({getFlaggers(job.actualHours)})
          </div>
        ))}
      </div>
    </div>
  );
}

export default InvoicingReportView;
