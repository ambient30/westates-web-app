import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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

function isEPUDClient(job) {
  return job.billing?.toUpperCase().includes('EPUD');
}

// ============================================
// MAIN COMPONENT
// ============================================

function PayrollReportView({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payrollData, setPayrollData] = useState(null);
  const [stipendAmount, setStipendAmount] = useState(25);

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
      setJobs(jobsData);

      // Load employees - use document ID as name
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employeesData = employeesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: doc.id,
          ...data
        };
      });
      
      console.log('Loaded employees:', employeesData);
      setEmployees(employeesData);

      // Load rates
      const ratesSnapshot = await getDocs(collection(db, 'rates'));
      const ratesData = ratesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRates(ratesData);

      // Load global settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      if (settingsDoc.exists()) {
        setStipendAmount(settingsDoc.data().signStipendAmount || 25);
      }
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

    const relevantJobs = jobs.filter(job => {
      if (!job.initialJobDate || !job.actualHours) return false;
      const [month, day, year] = job.initialJobDate.split('/');
      const jobDate = new Date(year, month - 1, day);
      return jobDate >= start && jobDate <= end;
    });

    console.log('Relevant jobs found:', relevantJobs.length);

    const employeePayroll = {};

    relevantJobs.forEach(job => {
      const jobRate = rates.find(r => r.id === job.rateId);
      if (!jobRate) {
        console.log('No rate found for job:', job.jobID);
        return;
      }

      const isPrevailingWage = jobRate.flaggerPay > 0;
      const isHolidayJob = isHoliday(job.initialJobDate);
      const isWeekendJob = isWeekend(job.initialJobDate, jobRate.weekendDuration);
      const isNightJob = isNightTime(job.initialJobTime, jobRate.overtimeNights);

      Object.entries(job.actualHours || {}).forEach(([employeeName, timeData]) => {
        if (!employeePayroll[employeeName]) {
          const emp = employees.find(e => e.name === employeeName);
          employeePayroll[employeeName] = {
            employeeName,
            payRate: emp?.payRate || 0,
            jobsByDate: {},
            jobs: [],
            totalRegularHours: 0,
            totalOTHours: 0,
            totalHolidayHours: 0,
            totalTravelHours: 0,
            totalFringe: 0,
            totalStipends: 0,
            grossPay: 0
          };
        }

        const hoursWorked = parseFloat(timeData.hoursWorked || 0);
        const signStipends = parseInt(timeData.signStipends || 0);

        let regularRate = 0;
        let otRate = 0;
        let holidayRate = 0;
        let fringeRate = 0;

        if (isPrevailingWage) {
          regularRate = parseFloat(jobRate.flaggerPay) || 0;
          otRate = regularRate * 1.5;
          holidayRate = regularRate * (parseFloat(jobRate.holiday) || 2);
          fringeRate = parseFloat(jobRate.fringeBenefit) || 0;
        } else {
          const emp = employees.find(e => e.name === employeeName);
          regularRate = parseFloat(emp?.payRate) || 0;
          otRate = regularRate * 1.5;
          holidayRate = regularRate * (parseFloat(jobRate.holiday) || 2);
        }

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

        let travelPay = 0;
let billableTravelHours = 0;

if (!isPrevailingWage) {
  // Use ACTUAL roundtrip time from time entry (not job estimate)
  const actualTravelMinutes = parseFloat(timeData.actualTravelTime || 0);
  
  if (actualTravelMinutes > 0) {
    // Roundtrip minus 1 hour
    const roundtripHours = actualTravelMinutes / 60;
    const billable = roundtripHours - 1;
    
    // Only pay if >= 1 hour after -1hr
    if (billable >= 1) {
      billableTravelHours = billable;
      travelPay = billableTravelHours * regularRate;
    }
  }
}

        const regularPay = regularHours * regularRate;
        const otPay = otHours * otRate;
        const holidayPay = holidayHours * holidayRate;
        const fringePay = hoursWorked * fringeRate;
        const stipendPay = signStipends * stipendAmount;

        const jobDate = job.initialJobDate;
        if (!employeePayroll[employeeName].jobsByDate[jobDate]) {
          employeePayroll[employeeName].jobsByDate[jobDate] = [];
        }

        employeePayroll[employeeName].jobsByDate[jobDate].push({
          jobID: job.jobID,
          date: jobDate,
          regularHours,
          otHours,
          holidayHours,
          travelHours: billableTravelHours,
          fringeHours: hoursWorked,
          signStipends,
          regularPay,
          otPay,
          holidayPay,
          travelPay,
          fringePay,
          stipendPay,
          isPrevailingWage,
          hourlyMinimum: parseFloat(jobRate.hourMinimum) || 4,
          regularRate
        });
      });
    });

    // Apply daily minimums and calculate totals
    Object.values(employeePayroll).forEach(employee => {
      Object.entries(employee.jobsByDate).forEach(([date, dailyJobs]) => {
        const dailyRegularHours = dailyJobs.reduce((sum, j) => sum + j.regularHours, 0);
        const dailyOTHours = dailyJobs.reduce((sum, j) => sum + j.otHours, 0);
        const dailyHolidayHours = dailyJobs.reduce((sum, j) => sum + j.holidayHours, 0);
        const dailyTotalHours = dailyRegularHours + dailyOTHours + dailyHolidayHours;

        const dailyMinimum = Math.max(...dailyJobs.map(j => j.hourlyMinimum));

        let adjustedRegularHours = dailyRegularHours;
        if (dailyTotalHours < dailyMinimum) {
          adjustedRegularHours += (dailyMinimum - dailyTotalHours);
        }

        const regularRate = dailyJobs[0].regularRate;
        const adjustedRegularPay = adjustedRegularHours * regularRate;

        const dailyOTPay = dailyJobs.reduce((sum, j) => sum + j.otPay, 0);
        const dailyHolidayPay = dailyJobs.reduce((sum, j) => sum + j.holidayPay, 0);
        const dailyTravelPay = dailyJobs.reduce((sum, j) => sum + j.travelPay, 0);
        const dailyFringePay = dailyJobs.reduce((sum, j) => sum + j.fringePay, 0);
        const dailyStipendPay = dailyJobs.reduce((sum, j) => sum + j.stipendPay, 0);

        const dailyTotal = adjustedRegularPay + dailyOTPay + dailyHolidayPay + dailyTravelPay + dailyFringePay + dailyStipendPay;

        dailyJobs.forEach((job, index) => {
          const jobTotal = index === 0 ? dailyTotal : 0;

          employee.jobs.push({
            ...job,
            adjustedRegularHours: index === 0 ? adjustedRegularHours : job.regularHours,
            total: jobTotal,
            isFirstJobOfDay: index === 0,
            dailyMinimumApplied: dailyTotalHours < dailyMinimum,
            dailyTotalHours
          });
        });

        employee.totalRegularHours += adjustedRegularHours;
        employee.totalOTHours += dailyOTHours;
        employee.totalHolidayHours += dailyHolidayHours;
        employee.totalTravelHours += dailyJobs.reduce((sum, j) => sum + j.travelHours, 0);
        employee.totalFringe += dailyFringePay;
        employee.totalStipends += dailyJobs.reduce((sum, j) => sum + j.signStipends, 0);
        employee.grossPay += dailyTotal;
      });
    });

    console.log('Final payroll data:', employeePayroll);
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
      'Gross Pay'
    ];

    const rows = payrollData.map(emp => [
      emp.employeeName,
      emp.totalRegularHours.toFixed(2),
      emp.totalOTHours.toFixed(2),
      emp.totalTravelHours.toFixed(2),
      emp.totalStipends,
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

      {expanded && (
        <div style={{ padding: '16px', background: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Job ID</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Reg Hrs</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>OT Hrs</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Holiday Hrs</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Travel Hrs</th>
                {employee.jobs.some(j => j.isPrevailingWage) && (
                  <th style={{ padding: '8px', textAlign: 'right' }}>Fringe</th>
                )}
                <th style={{ padding: '8px', textAlign: 'right' }}>Stipends</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {employee.jobs.map((job, idx) => (
                <tr key={idx} style={{ 
                  borderBottom: '1px solid #e0e0e0',
                  background: job.dailyMinimumApplied && job.isFirstJobOfDay ? '#fff3e0' : 'transparent'
                }}>
                  <td style={{ padding: '8px' }}>
                    {job.jobID}
                    {job.dailyMinimumApplied && job.isFirstJobOfDay && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '11px', 
                        color: '#e65100',
                        fontWeight: '600'
                      }}>
                        [Min: {job.dailyTotalHours.toFixed(2)}→{job.adjustedRegularHours.toFixed(2)}hrs]
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>{job.date}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {job.isFirstJobOfDay ? job.adjustedRegularHours.toFixed(2) : job.regularHours.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.otHours.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.holidayHours.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.travelHours.toFixed(2)}</td>
                  {employee.jobs.some(j => j.isPrevailingWage) && (
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      ${job.fringePay.toFixed(2)}
                    </td>
                  )}
                  <td style={{ padding: '8px', textAlign: 'right' }}>{job.signStipends}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                    {job.isFirstJobOfDay ? `$${job.total.toFixed(2)}` : '(see first job)'}
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