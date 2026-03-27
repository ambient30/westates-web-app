import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
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

function calculateBillableTravel(travelTimeMinutes) {
  if (!travelTimeMinutes) return 0;
  
  const roundtripHours = (travelTimeMinutes * 2) / 60;
  const billableTravel = roundtripHours - 1;
  
  return billableTravel >= 1 ? billableTravel : 0;
}

function calculateBillableMileage(travelMiles) {
  const miles = parseFloat(travelMiles) || 0;
  
  if (miles < 30) return 0;
  
  return miles * 2;
}

function isEPUDJob(job, jobRate) {
  if (!jobRate) return false;
  return jobRate.name?.toUpperCase().includes('EPUD') || jobRate.id?.toUpperCase().includes('EPUD');
}

// ============================================
// MAIN COMPONENT
// ============================================

function InvoicingReportView({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoiceData, setInvoiceData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const jobsData = jobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const ratesSnapshot = await getDocs(collection(db, 'rates'));
      const ratesData = ratesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setJobs(jobsData);
      setRates(ratesData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

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
      const isEPUD = isEPUDJob(job, jobRate);

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
          totalAmount: 0
        };
      }

      let jobTotalBilling = 0;
      let jobTotalFlaggers = 0;
      const flaggers = Object.keys(job.actualHours || {});
      jobTotalFlaggers = flaggers.length;

      flaggers.forEach(flagger => {
        const timeData = job.actualHours[flagger];
        const hoursWorked = parseFloat(timeData.hoursWorked || 0);

        const regularRate = parseFloat(jobRate.flaggerHours) || 0;
        const otRate = parseFloat(jobRate.flaggerHoursOT) || 0;
        const holidayRate = regularRate * (parseFloat(jobRate.holiday) || 2);

        let regularHours = 0;
        let otHours = 0;
        let holidayHours = 0;

        if (isHolidayJob) {
          holidayHours = hoursWorked;
        } else if (isWeekendJob || isNightJob) {
          otHours = hoursWorked;
        } else {
          const otStart = parseInt(jobRate.otStarts) || 8;
          regularHours = Math.min(hoursWorked, otStart);
          otHours = Math.max(0, hoursWorked - otStart);
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

      // Add travel billing - use ACTUAL data from time entry
let travelBilling = 0;
let mileageBilling = 0;

// Get actual travel data (sum from all flaggers for this job)
let totalActualTravelMinutes = 0;
let totalActualTravelMiles = 0;

Object.values(job.actualHours || {}).forEach(flaggerData => {
  totalActualTravelMinutes += parseFloat(flaggerData.actualTravelTime || 0);
  totalActualTravelMiles += parseFloat(flaggerData.actualTravelMiles || 0);
});

if (isPrevailingWage) {
  // Prevailing wage: NO travel time or mileage billed
  travelBilling = 0;
  mileageBilling = 0;
} else if (isEPUD) {
  // EPUD: Bill travel and mileage REGARDLESS of thresholds
  const roundtripHours = totalActualTravelMinutes / 60;
  
  travelBilling = roundtripHours * (parseFloat(jobRate.travelTime) || 0);
  mileageBilling = totalActualTravelMiles * (parseFloat(jobRate.mileage) || 0);
} else {
  // Regular job: Apply thresholds
  // Roundtrip time minus 1 hour, must be >= 1hr
  const roundtripHours = totalActualTravelMinutes / 60;
  const billableTravelHours = roundtripHours - 1;
  
  if (billableTravelHours >= 1) {
    travelBilling = billableTravelHours * (parseFloat(jobRate.travelTime) || 0);
  }
  
  // Roundtrip miles must be >= 60
  if (totalActualTravelMiles >= 60) {
    mileageBilling = totalActualTravelMiles * (parseFloat(jobRate.mileage) || 0);
  }
}

      const totalJobAmount = jobTotalBilling + travelBilling + mileageBilling;

      clientInvoices[client].jobSeries[series].jobs.push({
        jobID: job.jobID,
        date: job.initialJobDate,
        location: job.location,
        flaggers: jobTotalFlaggers,
        laborBilling: jobTotalBilling,
        travelBilling,
        mileageBilling,
        amount: totalJobAmount
      });

      clientInvoices[client].jobSeries[series].totalAmount += totalJobAmount;
      clientInvoices[client].totalAmount += totalJobAmount;
    });

    console.log('Generated invoices:', clientInvoices);
    setInvoiceData(Object.values(clientInvoices));
  };

  const exportToCSV = () => {
    if (!invoiceData) return;

    const rows = [];
    rows.push(['Client', 'Job Series', 'Job ID', 'Date', 'Location', 'Flaggers', 'Labor', 'Travel', 'Mileage', 'Total']);

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
    <div>
      <div className="jobs-header">
        <h2>Invoicing Report</h2>
        <div className="jobs-actions">
          <button onClick={loadData} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Select Billing Period</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <button 
            onClick={generateInvoices}
            className="btn btn-primary"
            style={{ padding: '10px 24px' }}
          >
            Generate Invoices
          </button>
          {invoiceData && (
            <button 
              onClick={exportToCSV}
              className="btn btn-secondary"
              style={{ padding: '10px 24px' }}
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
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, color: '#1a73e8' }}>Total Invoices</h3>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#2e7d32' }}>
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
          padding: '60px 24px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#5f6368',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '8px', color: '#202124' }}>No Invoices Generated</h3>
          <p>Select a date range and click "Generate Invoices" to view client billing</p>
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
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '16px',
      overflow: 'hidden'
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: expanded ? '#e8f0fe' : 'white'
        }}
      >
        <div>
          <div style={{ fontWeight: '600', fontSize: '18px', color: '#202124', marginBottom: '4px' }}>
            {invoice.client}
          </div>
          <div style={{ fontSize: '14px', color: '#5f6368' }}>
            {Object.keys(invoice.jobSeries).length} job series
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#2e7d32' }}>
            ${invoice.totalAmount.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#5f6368' }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px', background: '#fafafa', borderTop: '2px solid #1a73e8' }}>
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

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
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
          background: 'white'
        }}
      >
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px', color: '#202124' }}>
            {series.series}
          </div>
          <div style={{ fontSize: '13px', color: '#5f6368' }}>
            {series.jobs.length} job{series.jobs.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#2e7d32' }}>
            ${series.totalAmount.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '12px', background: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Job ID</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Flaggers</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Labor</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Travel</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Mileage</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {series.jobs.map((job, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '8px' }}>{job.jobID}</td>
                  <td style={{ padding: '8px' }}>{job.date}</td>
                  <td style={{ padding: '8px' }}>{job.location}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.flaggers}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>${job.laborBilling.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>${job.travelBilling.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>${job.mileageBilling.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                    ${job.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InvoicingReportView;