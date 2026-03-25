import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// ============================================
// HELPER FUNCTIONS - PUT THEM HERE
// ============================================

// Helper function to check if a date is a holiday
function isHoliday(dateString) {
  // dateString format: "MM/DD/YYYY"
  const holidays2026 = [
    "01/01/2026", // New Year's Day
    "05/25/2026", // Memorial Day (last Monday of May)
    "07/04/2026", // Independence Day
    "09/07/2026", // Labor Day (first Monday of September)
    "11/26/2026", // Thanksgiving Day (fourth Thursday of November)
    "12/25/2026"  // Christmas Day
  ];
  
  return holidays2026.includes(dateString);
}

// Helper function to check if time falls in night OT range
function isNightTime(timeString, overtimeNights) {
  if (!overtimeNights || !timeString) return false;
  
  // Parse "6pm - 6am" or "18:00 - 6:00" format
  const match = overtimeNights.match(/(\d+)(am|pm)?\s*-\s*(\d+)(am|pm)?/i);
  if (!match) return false;
  
  let startHour = parseInt(match[1]);
  const startAmPm = match[2]?.toLowerCase();
  let endHour = parseInt(match[3]);
  const endAmPm = match[4]?.toLowerCase();
  
  // Convert to 24-hour format
  if (startAmPm === 'pm' && startHour !== 12) startHour += 12;
  if (startAmPm === 'am' && startHour === 12) startHour = 0;
  if (endAmPm === 'pm' && endHour !== 12) endHour += 12;
  if (endAmPm === 'am' && endHour === 12) endHour = 0;
  
  // Parse job time "7:00 AM" format
  const timeMatch = timeString.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (!timeMatch) return false;
  
  let jobHour = parseInt(timeMatch[1]);
  const jobMinute = parseInt(timeMatch[2]);
  const jobAmPm = timeMatch[3].toLowerCase();
  
  if (jobAmPm === 'pm' && jobHour !== 12) jobHour += 12;
  if (jobAmPm === 'am' && jobHour === 12) jobHour = 0;
  
  // Check if job time falls in range
  if (startHour < endHour) {
    // Normal range like 18-22 (6pm-10pm)
    return jobHour >= startHour && jobHour < endHour;
  } else {
    // Overnight range like 18-6 (6pm-6am)
    return jobHour >= startHour || jobHour < endHour;
  }
}

// Helper function to check if date is a weekend
function isWeekend(dateString, weekendDuration) {
  if (!weekendDuration || !dateString) return false;
  
  // Parse "MM/DD/YYYY"
  const [month, day, year] = dateString.split('/');
  const date = new Date(year, month - 1, day);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Check if day is in weekendDuration string
  return weekendDuration.toLowerCase().includes(dayName.toLowerCase());
}

// Calculate travel time: (input * 2 - 1hr), only if >= 1hr
function calculateBillableTravel(travelTimeMinutes) {
  if (!travelTimeMinutes) return 0;
  
  // Double for roundtrip, then subtract 1 hour
  const roundtripHours = (travelTimeMinutes * 2) / 60;
  const billableTravel = roundtripHours - 1;
  
  // Only billable if >= 1 hour
  return billableTravel >= 1 ? billableTravel : 0;
}

// Calculate mileage: (input * 2), only if input >= 30
function calculateBillableMileage(travelMiles) {
  const miles = parseFloat(travelMiles) || 0;
  
  // Must be at least 30 miles one-way
  if (miles < 30) return 0;
  
  // Double for roundtrip
  return miles * 2;
}

// Check if this is an EPUD job (bills travel regardless)
function isEPUDJob(job) {
  return job.billing?.toUpperCase().includes('EPUD');
}

// ============================================
// END OF HELPER FUNCTIONS
// ============================================

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
    setJobs(jobsData);

    // Load employees - FIX: use document ID as name
    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    const employeesData = employeesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: doc.id, // Use document ID as the employee name
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
    const [month, day, year] = job.initialJobDate.split('/');
    const jobDate = new Date(year, month - 1, day);
    return jobDate >= start && jobDate <= end;
  });

  console.log('Relevant jobs found:', relevantJobs.length);

  // Calculate payroll per employee
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
    const isEPUD = isEPUDClient(job);

    console.log(`Job ${job.jobID} - Holiday: ${isHolidayJob}, Weekend: ${isWeekendJob}, Night: ${isNightJob}, EPUD: ${isEPUD}`);

    Object.entries(job.actualHours || {}).forEach(([employeeName, timeData]) => {
      if (!employeePayroll[employeeName]) {
        const emp = employees.find(e => e.name === employeeName);
        employeePayroll[employeeName] = {
          employeeName,
          payRate: emp?.payRate || 0,
          jobs: [],
          totalRegularHours: 0,
          totalOTHours: 0,
          totalHolidayHours: 0,
          totalTravelHours: 0,
          totalFringe: 0,
          totalStipends: 0,
          totalRetainments: 0,
          grossPay: 0
        };
      }

      const hoursWorked = parseFloat(timeData.hoursWorked || 0);
      const travelHours = parseFloat(timeData.travelHours || 0);
      const signStipends = parseInt(timeData.signStipends || 0);
      const retainment = parseFloat(timeData.retainment || 0);

      console.log(`${employeeName} - Hours: ${hoursWorked}, Travel: ${travelHours}, Stipends: ${signStipends}`);

      // Determine pay rates
let regularRate = 0;
let otRate = 0;
let holidayRate = 0;
let fringeRate = 0;

if (isPrevailingWage) {
  // Prevailing wage: use rate card rates
  regularRate = parseFloat(jobRate.flaggerPay) || 0;
  otRate = regularRate * 1.5;
  holidayRate = regularRate * (parseFloat(jobRate.holiday) || 2);
  fringeRate = parseFloat(jobRate.fringeBenefit) || 0;
} else {
  // Regular job: use employee rate
  const emp = employees.find(e => e.name === employeeName);
  
  if (!emp) {
    console.error(`Employee not found: "${employeeName}"`);
    console.log('Available employees:', employees.map(e => e.name));
  } else {
    console.log(`Found employee: ${emp.name}, Pay Rate: ${emp.payRate}`);
  }
  
  regularRate = parseFloat(emp?.payRate) || 0;
  otRate = regularRate * 1.5;
  holidayRate = regularRate * (parseFloat(jobRate.holiday) || 2);
}

      console.log(`Rates - Regular: $${regularRate}, OT: $${otRate}, Holiday: $${holidayRate}`);

      // Calculate OT hours based on triggers
      let regularHours = 0;
      let otHours = 0;
      let holidayHours = 0;

      if (isHolidayJob) {
        // ALL hours are holiday pay
        holidayHours = hoursWorked;
      } else if (isWeekendJob || isNightJob) {
        // ALL hours are OT (weekend or night)
        otHours = hoursWorked;
      } else {
        // Regular day: OT after otStarts hours
        const otStart = parseInt(jobRate.otStarts) || 8;
        regularHours = Math.min(hoursWorked, otStart);
        otHours = Math.max(0, hoursWorked - otStart);
      }

      console.log(`Hours breakdown - Reg: ${regularHours}, OT: ${otHours}, Holiday: ${holidayHours}`);

      // Travel pay calculation
let travelPay = 0;
let billableTravelHours = 0;
let billableMiles = 0;

const isEPUD = isEPUDClient(job);

if (!isPrevailingWage) {
  // Regular jobs: calculate travel
  const jobTravelMinutes = parseFloat(job.travelTime || 0);
  const jobTravelMiles = parseFloat(job.travelMiles || 0);
  
  if (isEPUD) {
    // EPUD: Pay follows regular rules (must meet threshold)
    billableTravelHours = calculateBillableTravel(jobTravelMinutes);
    billableMiles = calculateBillableMileage(jobTravelMiles);
  } else {
    // Normal client: standard travel rules
    billableTravelHours = calculateBillableTravel(jobTravelMinutes);
    billableMiles = calculateBillableMileage(jobTravelMiles);
  }
  
  // Calculate pay for this flagger's travel
  travelPay = billableTravelHours * regularRate;
  // Note: Mileage is not paid to employees, only billed to clients
}
// PW jobs: no travel pay

      // Calculate pay components
      const regularPay = regularHours * regularRate;
      const otPay = otHours * otRate;
      const holidayPay = holidayHours * holidayRate;
      const fringePay = hoursWorked * fringeRate;
      const stipendPay = signStipends * 25; // $25 per stipend

      console.log(`Pay breakdown - Reg: $${regularPay}, OT: $${otPay}, Holiday: $${holidayPay}, Travel: $${travelPay}, Stipends: $${stipendPay}`);

      const jobTotal = regularPay + otPay + holidayPay + travelPay + fringePay + stipendPay - retainment;

      console.log(`Job total: $${jobTotal}`);

      employeePayroll[employeeName].jobs.push({
        jobID: job.jobID,
        date: job.initialJobDate,
        regularHours,
        otHours,
        holidayHours,
        travelHours: billableTravelHours,
        fringeHours: hoursWorked,
        signStipends,
        retainment,
        regularPay,
        otPay,
        holidayPay,
        travelPay,
        fringePay,
        stipendPay,
        total: jobTotal,
        isPrevailingWage
      });

      employeePayroll[employeeName].totalRegularHours += regularHours;
      employeePayroll[employeeName].totalOTHours += otHours;
      employeePayroll[employeeName].totalHolidayHours += holidayHours;
      employeePayroll[employeeName].totalTravelHours += billableTravelHours;
      employeePayroll[employeeName].totalFringe += fringePay;
      employeePayroll[employeeName].totalStipends += signStipends;
      employeePayroll[employeeName].totalRetainments += retainment;
      employeePayroll[employeeName].grossPay += jobTotal;
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
      <th style={{ padding: '8px', textAlign: 'right' }}>Holiday Hrs</th>
      <th style={{ padding: '8px', textAlign: 'right' }}>Travel Hrs</th>
      {employee.jobs.some(j => j.isPrevailingWage) && (
        <th style={{ padding: '8px', textAlign: 'right' }}>Fringe</th>
      )}
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
        <td style={{ padding: '8px', textAlign: 'right' }}>{job.holidayHours.toFixed(2)}</td>
        <td style={{ padding: '8px', textAlign: 'right' }}>{job.travelHours.toFixed(2)}</td>
        {employee.jobs.some(j => j.isPrevailingWage) && (
          <td style={{ padding: '8px', textAlign: 'right' }}>
            ${job.fringePay.toFixed(2)}
          </td>
        )}
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