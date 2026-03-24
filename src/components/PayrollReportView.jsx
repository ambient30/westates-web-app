import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

function PayrollReportView({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payrollData, setPayrollData] = useState(null);

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

      // Load employees
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employeesData = employeesSnapshot.docs.map(doc => ({
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
      setEmployees(employeesData);
      setRates(ratesData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePayroll = () => {
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

    // Calculate payroll per employee
    const employeePayroll = {};

    relevantJobs.forEach(job => {
      const jobRate = rates.find(r => r.id === job.rateId);
      if (!jobRate) return;

      const isPrevailingWage = jobRate.flaggerPay > 0;

      Object.entries(job.actualHours || {}).forEach(([employeeName, timeData]) => {
        if (!employeePayroll[employeeName]) {
          const emp = employees.find(e => e.name === employeeName);
          employeePayroll[employeeName] = {
            employeeName,
            payRate: emp?.payRate || 0,
            jobs: [],
            totalRegularHours: 0,
            totalOTHours: 0,
            totalTravelHours: 0,
            totalStipends: 0,
            totalRetainments: 0,
            grossPay: 0
          };
        }

        const hoursWorked = parseFloat(timeData.hoursWorked || 0);
        const travelHours = parseFloat(timeData.travelHours || 0);
        const signStipends = parseInt(timeData.signStipends || 0);
        const retainment = parseFloat(timeData.retainment || 0);

        // Determine pay rate
        let regularRate = 0;
        let otRate = 0;

        if (isPrevailingWage) {
          regularRate = jobRate.flaggerPay;
          otRate = jobRate.flaggerPay * 1.5; // Simplified, could use jobRate's OT rules
        } else {
          const emp = employees.find(e => e.name === employeeName);
          regularRate = emp?.payRate || 0;
          otRate = regularRate * 1.5;
        }

        // Calculate OT (simplified: after 8 hours)
        const regularHours = Math.min(hoursWorked, 8);
        const otHours = Math.max(0, hoursWorked - 8);

        // Apply hourly minimum (combined across all jobs for the employee)
        const minimumHours = jobRate.hourMinimum || 4;
        
        // Calculate pay
        const regularPay = regularHours * regularRate;
        const otPay = otHours * otRate;
        const travelPay = travelHours * regularRate;
        const stipendPay = signStipends * 25; // $25 per stipend

        const jobTotal = regularPay + otPay + travelPay + stipendPay - retainment;

        employeePayroll[employeeName].jobs.push({
          jobID: job.jobID,
          date: job.initialJobDate,
          regularHours,
          otHours,
          travelHours,
          signStipends,
          retainment,
          regularPay,
          otPay,
          travelPay,
          stipendPay,
          total: jobTotal
        });

        employeePayroll[employeeName].totalRegularHours += regularHours;
        employeePayroll[employeeName].totalOTHours += otHours;
        employeePayroll[employeeName].totalTravelHours += travelHours;
        employeePayroll[employeeName].totalStipends += signStipends;
        employeePayroll[employeeName].totalRetainments += retainment;
        employeePayroll[employeeName].grossPay += jobTotal;
      });
    });

    setPayrollData(Object.values(employeePayroll));
  };

  const exportToCSV = () => {
    if (!payrollData) return;

    const headers = [
      'Employee',
      'Regular Hours',
      'OT Hours',
      'Travel Hours',
      'Stipends',
      'Retainments',
      'Gross Pay'
    ];

    const rows = payrollData.map(emp => [
      emp.employeeName,
      emp.totalRegularHours.toFixed(2),
      emp.totalOTHours.toFixed(2),
      emp.totalTravelHours.toFixed(2),
      emp.totalStipends,
      emp.totalRetainments.toFixed(2),
      emp.grossPay.toFixed(2)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${startDate}_to_${endDate}.csv`;
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
        <h2>Payroll Report</h2>
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
        <h3 style={{ marginBottom: '16px', color: '#1a73e8' }}>Select Pay Period</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Start Date (Sunday)
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
              End Date (Saturday)
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
            onClick={generatePayroll}
            className="btn btn-primary"
            style={{ padding: '10px 24px' }}
          >
            Generate Payroll
          </button>
          {payrollData && (
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

      {/* Payroll Summary */}
      {payrollData && (
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px',
            background: '#1a73e8',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0 }}>Payroll Summary</h3>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>
              ${payrollData.reduce((sum, emp) => sum + emp.grossPay, 0).toFixed(2)}
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            {payrollData.map(emp => (
              <EmployeePayrollCard key={emp.employeeName} employee={emp} />
            ))}
          </div>
        </div>
      )}

      {!payrollData && !loading && (
        <div style={{
          background: 'white',
          padding: '60px 24px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#5f6368',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '8px', color: '#202124' }}>No Payroll Generated</h3>
          <p>Select a date range and click "Generate Payroll" to view employee pay</p>
        </div>
      )}
    </div>
  );
}

function EmployeePayrollCard({ employee }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      marginBottom: '16px',
      overflow: 'hidden'
    }}>
      {/* Employee Summary */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '16px',
          background: expanded ? '#f8f9fa' : 'white',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ fontWeight: '600', fontSize: '16px', color: '#202124', marginBottom: '4px' }}>
            {employee.employeeName}
          </div>
          <div style={{ fontSize: '13px', color: '#5f6368' }}>
            {employee.totalRegularHours.toFixed(2)} reg hrs • {employee.totalOTHours.toFixed(2)} OT hrs
            {employee.totalTravelHours > 0 && ` • ${employee.totalTravelHours.toFixed(2)} travel hrs`}
            {employee.totalStipends > 0 && ` • ${employee.totalStipends} stipends`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#2e7d32' }}>
            ${employee.grossPay.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#5f6368' }}>
            {expanded ? '▲' : '▼'} {employee.jobs.length} jobs
          </div>
        </div>
      </div>

      {/* Job Details */}
      {expanded && (
        <div style={{ padding: '16px', background: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Job ID</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Reg Hrs</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>OT Hrs</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Travel Hrs</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Stipends</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Retainment</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {employee.jobs.map((job, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '8px' }}>{job.jobID}</td>
                  <td style={{ padding: '8px' }}>{job.date}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.regularHours.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.otHours.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.travelHours.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.signStipends}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#d32f2f' }}>
                    ${job.retainment.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                    ${job.total.toFixed(2)}
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

export default PayrollReportView;