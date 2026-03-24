import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

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

      // Load jobs
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const jobsData = jobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Load rates
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

    // Filter jobs in date range with actual hours
    const relevantJobs = jobs.filter(job => {
      if (!job.initialJobDate || !job.actualHours) return false;
      const jobDate = new Date(job.initialJobDate);
      return jobDate >= start && jobDate <= end;
    });

    // Group by billing client
    const clientInvoices = {};

    relevantJobs.forEach(job => {
      const client = job.billing || 'Unknown Client';
      const jobRate = rates.find(r => r.id === job.rateId);
      
      if (!jobRate) return;

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

      // Calculate billing for this job
      let jobTotal = 0;
      const flaggers = Object.keys(job.actualHours || {});

      flaggers.forEach(flagger => {
        const timeData = job.actualHours[flagger];
        const hoursWorked = parseFloat(timeData.hoursWorked || 0);
        const travelHours = parseFloat(timeData.travelHours || 0);

        // Apply hourly minimum (4 hrs regular, 2 hrs PW)
        const minimumHours = jobRate.hourMinimum || 4;
        const billableHours = Math.max(hoursWorked, minimumHours);

        // Calculate OT (simplified: after 8 hours)
        const regularHours = Math.min(billableHours, 8);
        const otHours = Math.max(0, billableHours - 8);

        // Billing amounts
        const regularBill = regularHours * jobRate.flaggerHours;
        const otBill = otHours * jobRate.flaggerHoursOT;
        
        // Travel billing (roundtrip - 1hr, only if >=1hr)
        const travelBill = travelHours >= 1 ? travelHours * jobRate.travelTime : 0;

        // Mileage
        const mileage = parseFloat(job.travelMiles || 0);
        const mileageBill = mileage * jobRate.mileage;

        jobTotal += regularBill + otBill + travelBill + mileageBill;
      });

      clientInvoices[client].jobSeries[series].jobs.push({
        jobID: job.jobID,
        date: job.initialJobDate,
        location: job.location,
        flaggers: flaggers.length,
        amount: jobTotal
      });

      clientInvoices[client].jobSeries[series].totalAmount += jobTotal;
      clientInvoices[client].totalAmount += jobTotal;
    });

    setInvoiceData(Object.values(clientInvoices));
  };

  const exportToCSV = () => {
    if (!invoiceData) return;

    const rows = [];
    rows.push(['Client', 'Job Series', 'Job ID', 'Date', 'Location', 'Flaggers', 'Amount']);

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

      {/* Date Range */}
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

      {/* Invoice Summary */}
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
      {/* Client Header */}
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

      {/* Job Series Breakdown */}
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
      {/* Series Header */}
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

      {/* Daily Jobs */}
      {expanded && (
        <div style={{ padding: '12px', background: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Job ID</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Flaggers</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {series.jobs.map((job, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '8px' }}>{job.jobID}</td>
                  <td style={{ padding: '8px' }}>{job.date}</td>
                  <td style={{ padding: '8px' }}>{job.location}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.flaggers}</td>
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