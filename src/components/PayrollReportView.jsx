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

function PayrollReportView({ permissions }) {
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payrollData, setPayrollData] = useState(null);

  useEffect(() => {
    console.log('🔴 Setting up REAL-TIME listener for payroll...');
    
    const jobsRef = collection(db, 'jobs');
    const employeesRef = collection(db, 'employees');
    const ratesRef = collection(db, 'rates');
    
    const jobsUnsubscribe = onSnapshot(jobsRef, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
    });
    
    const employeesUnsubscribe = onSnapshot(employeesRef, (snapshot) => {
      const employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.id,
        ...doc.data()
      }));
      setEmployees(employeesData);
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
      console.log('🔴 Cleaning up payroll listeners');
      jobsUnsubscribe();
      employeesUnsubscribe();
      ratesUnsubscribe();
    };
  }, []);

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

    console.log('Relevant jobs for payroll:', relevantJobs.length);

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
      const isEPUD = isEPUDJob(job);

      Object.entries(job.actualHours || {}).forEach(([employeeName, timeData]) => {
        if (!employeePayroll[employeeName]) {
          const emp = employees.find(e => e.name === employeeName);
          employeePayroll[employeeName] = {
            employeeName,
            employeePayRate: emp?.payRate || 0,
            jobs: [],
            totalRegularHours: 0,
            totalRegularPay: 0,
            totalOTHours: 0,
            totalOTPay: 0,
            totalHolidayHours: 0,
            totalHolidayPay: 0,
            totalPWRegularHours: 0,
            totalPWRegularPay: 0,
            totalPWOTHours: 0,
            totalPWOTPay: 0,
            totalFringeHours: 0,
            totalFringePay: 0,
            totalTravelHours: 0,
            totalTravelPay: 0,
            totalSignStipends: 0,
            totalStipendPay: 0,
            totalMileage: 0,
            totalMileagePay: 0,
            grossPay: 0
          };
        }

        let totalHours = parseFloat(timeData.totalHours || timeData.hoursWorked || 0);
        
        // If lunch was taken and only hoursWorked exists, deduct lunch
        if (timeData.hasLunch && !timeData.totalHours) {
          totalHours -= 0.5;
        }

        const travelHours = parseFloat(timeData.travelHours || 0);
        const travelMiles = parseFloat(timeData.travelMiles || 0);
        const signStipends = parseInt(timeData.signStipends || 0);

        // Get employee info
        const emp = employees.find(e => e.name === employeeName);
        const employeePayRate = parseFloat(emp?.payRate) || 0;

        let regularRate = 0;
        let otRate = 0;
        let holidayRate = 0;
        let fringeRate = 0;
        let travelRate = 0;
        let mileageRate = 0;
        let stipendAmount = 25;

        if (isPrevailingWage) {
          // Prevailing Wage: Use flaggerPay from rate card
          regularRate = parseFloat(jobRate.flaggerPay) || 0;
          otRate = regularRate * 1.5;
          holidayRate = regularRate * (parseFloat(jobRate.holiday) || 2);
          fringeRate = parseFloat(jobRate.fringeBenefit) || 0;
          // Prevailing wage: NO travel/mileage pay
          travelRate = 0;
          mileageRate = 0;
        } else {
          // Regular job: Use employee's payRate
          regularRate = employeePayRate;
          otRate = regularRate * 1.5;
          holidayRate = regularRate * (parseFloat(jobRate.holiday) || 2);
          travelRate = regularRate; // Use employee rate for travel
          mileageRate = parseFloat(jobRate.mileage) || 0;
        }

        let regularHours = 0;
        let otHours = 0;
        let holidayHours = 0;

        const otStart = parseInt(jobRate.otStarts) || 8;

        if (isHolidayJob) {
          holidayHours = totalHours;
        } else if (isWeekendJob || isNightJob) {
          otHours = totalHours;
        } else {
          regularHours = Math.min(totalHours, otStart);
          otHours = Math.max(0, totalHours - otStart);
        }

        const minimumHours = parseFloat(jobRate.hourMinimum) || 4;
        const totalActualHours = regularHours + otHours + holidayHours;
        
        if (totalActualHours < minimumHours) {
          const shortfall = minimumHours - totalActualHours;
          regularHours += shortfall;
        }

        const regularPay = regularHours * regularRate;
        const otPay = otHours * otRate;
        const holidayPay = holidayHours * holidayRate;

        // Calculate travel/mileage per flagger
        let travelPay = 0;
        let mileagePay = 0;
        
        // EPUD and Prevailing Wage: NO travel/mileage pay to employees
        if (!isPrevailingWage && !isEPUD) {
          // Regular jobs only: Apply thresholds
          // Travel: Must be >= 1 hour
          if (travelHours >= 1) {
            travelPay = travelHours * travelRate;
          }
          
          // Mileage: Must be > 30 miles
          if (travelMiles > 30) {
            mileagePay = travelMiles * mileageRate;
          }
        }

        const fringePay = totalHours * fringeRate;
        const stipendPay = signStipends * stipendAmount;

        const jobTotal = regularPay + otPay + holidayPay + travelPay + mileagePay + fringePay + stipendPay;

        employeePayroll[employeeName].jobs.push({
          jobID: job.jobID,
          date: job.initialJobDate,
          jobData: job,
          rateCard: jobRate,
          employeePayRate: employeePayroll[employeeName].employeePayRate,
          isPrevailingWage,
          isHoliday: isHolidayJob,
          isWeekend: isWeekendJob,
          isNight: isNightJob,
          isEPUD,
          regularHours,
          otHours,
          holidayHours,
          travelHours,
          travelMiles,
          signStipends,
          regularPay,
          otPay,
          holidayPay,
          travelPay,
          mileagePay,
          fringePay,
          stipendPay,
          total: jobTotal,
          hasLunch: timeData.hasLunch
        });

        // Aggregate totals
        if (isPrevailingWage) {
          employeePayroll[employeeName].totalPWRegularHours += regularHours;
          employeePayroll[employeeName].totalPWRegularPay += regularPay;
          employeePayroll[employeeName].totalPWOTHours += otHours;
          employeePayroll[employeeName].totalPWOTPay += otPay;
          employeePayroll[employeeName].totalFringeHours += totalHours;
          employeePayroll[employeeName].totalFringePay += fringePay;
        } else {
          employeePayroll[employeeName].totalRegularHours += regularHours;
          employeePayroll[employeeName].totalRegularPay += regularPay;
          employeePayroll[employeeName].totalOTHours += otHours;
          employeePayroll[employeeName].totalOTPay += otPay;
          employeePayroll[employeeName].totalTravelHours += travelHours;
          employeePayroll[employeeName].totalTravelPay += travelPay;
          employeePayroll[employeeName].totalMileage += travelMiles;
          employeePayroll[employeeName].totalMileagePay += mileagePay;
        }

        employeePayroll[employeeName].totalHolidayHours += holidayHours;
        employeePayroll[employeeName].totalHolidayPay += holidayPay;
        employeePayroll[employeeName].totalSignStipends += signStipends;
        employeePayroll[employeeName].totalStipendPay += stipendPay;
        employeePayroll[employeeName].grossPay += jobTotal;
      });
    });

    // Sort alphabetically
    const sortedPayroll = Object.values(employeePayroll).sort((a, b) => 
      a.employeeName.localeCompare(b.employeeName)
    );

    console.log('Generated payroll:', sortedPayroll);
    setPayrollData(sortedPayroll);
  };

  const exportToCSV = () => {
    if (!payrollData) return;

    const rows = [];
    rows.push(['Employee', 'Reg Hrs', 'Reg Pay', 'OT Hrs', 'OT Pay', 'PW Reg Hrs', 'PW Reg Pay', 'PW OT Hrs', 'PW OT Pay', 'Fringe Hrs', 'Fringe Pay', 'Stipends', 'Stipend Pay', 'Mileage', 'Gross Pay']);

    payrollData.forEach(emp => {
      rows.push([
        emp.employeeName,
        emp.totalRegularHours.toFixed(2),
        emp.totalRegularPay.toFixed(2),
        emp.totalOTHours.toFixed(2),
        emp.totalOTPay.toFixed(2),
        emp.totalPWRegularHours.toFixed(2),
        emp.totalPWRegularPay.toFixed(2),
        emp.totalPWOTHours.toFixed(2),
        emp.totalPWOTPay.toFixed(2),
        emp.totalFringeHours.toFixed(2),
        emp.totalFringePay.toFixed(2),
        emp.totalSignStipends,
        emp.totalStipendPay.toFixed(2),
        emp.totalMileage.toFixed(0),
        emp.grossPay.toFixed(2)
      ]);
    });

    const csv = rows.map(row => row.join(',')).join('\n');

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
    <div style={{ padding: '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Payroll Report</h2>
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
          Select Pay Period
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
            onClick={generatePayroll}
            className="btn btn-primary"
            style={{ padding: '6px 16px', fontSize: '12px' }}
          >
            Generate Payroll
          </button>
          {payrollData && (
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

      {payrollData && (
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
            <h3 style={{ margin: 0, fontSize: '16px', color: '#1a73e8' }}>Total Payroll</h3>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2e7d32' }}>
              ${payrollData.reduce((sum, emp) => sum + emp.grossPay, 0).toFixed(2)}
            </div>
          </div>

          {payrollData.map(emp => (
            <EmployeePayrollCard key={emp.employeeName} employee={emp} />
          ))}
        </div>
      )}

      {!payrollData && !loading && (
        <div style={{
          background: 'white',
          padding: '40px 20px',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#5f6368',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#202124' }}>No Payroll Generated</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>Select a date range and click "Generate Payroll" to view employee pay</p>
        </div>
      )}
    </div>
  );
}

function EmployeePayrollCard({ employee }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

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
          <div style={{ fontWeight: '600', fontSize: '14px', color: '#202124', marginBottom: '2px' }}>
            {employee.employeeName}
          </div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>
            Reg: {employee.totalRegularHours.toFixed(1)}h/${employee.totalRegularPay.toFixed(0)} • 
            OT: {employee.totalOTHours.toFixed(1)}h/${employee.totalOTPay.toFixed(0)}
            {employee.totalPWRegularHours > 0 && ` • PW: ${employee.totalPWRegularHours.toFixed(1)}h/${employee.totalPWRegularPay.toFixed(0)}`}
            {employee.totalSignStipends > 0 && ` • Stipends: ${employee.totalSignStipends}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#2e7d32' }}>
            ${employee.grossPay.toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: '#5f6368' }}>
            {expanded ? '▲' : '▼'} {employee.jobs.length} jobs
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '10px', background: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '6px', textAlign: 'left' }}>Job ID</th>
                <th style={{ padding: '6px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Reg</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>OT</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Travel</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Mileage</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Fringe</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Stipends</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {employee.jobs.map((job, idx) => (
                <tr 
                  key={idx} 
                  style={{ 
                    borderBottom: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    background: selectedJob?.jobID === job.jobID ? '#e8f0fe' : 'transparent'
                  }}
                  onClick={() => setSelectedJob(selectedJob?.jobID === job.jobID ? null : job)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => {
                    if (selectedJob?.jobID !== job.jobID) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <td style={{ padding: '6px' }}>
                    {job.jobID}
                    {job.isPrevailingWage && <span style={{ color: '#1a73e8', marginLeft: '4px', fontSize: '10px' }}>(PW)</span>}
                  </td>
                  <td style={{ padding: '6px' }}>{job.date}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {job.regularHours.toFixed(1)}h/${job.regularPay.toFixed(0)}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {job.otHours > 0 ? `${job.otHours.toFixed(1)}h/$${job.otPay.toFixed(0)}` : '-'}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {job.travelPay > 0 ? `$${job.travelPay.toFixed(0)}` : '-'}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {job.mileagePay > 0 ? `$${job.mileagePay.toFixed(0)}` : '-'}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {job.fringePay > 0 ? `$${job.fringePay.toFixed(0)}` : '-'}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {job.signStipends > 0 ? job.signStipends : '-'}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: '600' }}>
                    ${job.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Detailed Job Breakdown */}
          {selectedJob && (
            <JobPayrollBreakdown job={selectedJob} />
          )}
        </div>
      )}
    </div>
  );
}

function JobPayrollBreakdown({ job }) {
  // Calculate employee pay rates
  const employeePayRate = job.employeePayRate || 0;
  const employeeOTRate = employeePayRate * 1.5;
  
  // For PW jobs, get the rates from rate card
  const pwRate = job.isPrevailingWage ? (parseFloat(job.rateCard.flaggerPay) || 0) : 0;
  const pwOTRate = pwRate * 1.5;
  const fringeRate = job.isPrevailingWage ? (parseFloat(job.rateCard.fringeBenefit) || 0) : 0;
  
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
        Pay Breakdown: {job.jobID}
        {job.hasLunch && (
          <span style={{ color: '#e65100', marginLeft: '8px', fontSize: '11px', fontWeight: '500' }}>
            (LUNCH)
          </span>
        )}
      </div>

      {/* Rate Card Info */}
      <div style={{
        background: '#f0f4ff',
        padding: '8px',
        borderRadius: '4px',
        marginBottom: '10px',
        fontSize: '10px'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1a73e8' }}>
          Rate: {job.jobData.rateName || job.rateCard.name || job.rateCard.id || 'Unknown'}
          {job.isPrevailingWage && <span style={{ color: '#d32f2f', marginLeft: '6px' }}>(Prevailing Wage)</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '4px', color: '#5f6368' }}>
          {job.isPrevailingWage ? (
            <>
              <div>Regular: ${pwRate.toFixed(2)}/hr</div>
              <div>OT: ${pwOTRate.toFixed(2)}/hr</div>
              <div>Fringe: ${fringeRate.toFixed(2)}/hr</div>
            </>
          ) : (
            <>
              <div>Regular: ${employeePayRate.toFixed(2)}/hr</div>
              <div>OT: ${employeeOTRate.toFixed(2)}/hr</div>
            </>
          )}
        </div>
      </div>

      {/* Pay Components */}
      <div style={{
        background: '#fafafa',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '10px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {job.regularHours > 0 && (
            <div>
              <span style={{ color: '#5f6368' }}>Regular:</span>{' '}
              {job.regularHours.toFixed(2)} hrs × ${(job.regularPay / job.regularHours).toFixed(2)} = ${job.regularPay.toFixed(2)}
            </div>
          )}
          
          {job.otHours > 0 && (
            <div>
              <span style={{ color: '#5f6368' }}>OT:</span>{' '}
              {job.otHours.toFixed(2)} hrs × ${(job.otPay / job.otHours).toFixed(2)} = ${job.otPay.toFixed(2)}
            </div>
          )}
          
          {job.holidayHours > 0 && (
            <div style={{ color: '#d32f2f', fontWeight: '600' }}>
              <span>Holiday:</span>{' '}
              {job.holidayHours.toFixed(2)} hrs × ${(job.holidayPay / job.holidayHours).toFixed(2)} = ${job.holidayPay.toFixed(2)}
            </div>
          )}
          
          {job.travelPay > 0 && (
            <div>
              <span style={{ color: '#5f6368' }}>Travel:</span>{' '}
              {job.travelHours.toFixed(2)} hrs × ${employeePayRate.toFixed(2)} = ${job.travelPay.toFixed(2)}
            </div>
          )}
          
          {job.travelHours > 0 && job.travelPay === 0 && !job.isPrevailingWage && (
            <div style={{ color: '#d32f2f', fontSize: '9px' }}>
              Travel: {job.travelHours.toFixed(2)} hrs (below 1hr threshold - not paid)
            </div>
          )}
          
          {job.isEPUD && job.travelHours > 0 && (
            <div style={{ color: '#1a73e8', fontSize: '9px' }}>
              Travel: {job.travelHours.toFixed(2)} hrs (EPUD - billed to client, not paid to employee)
            </div>
          )}
          
          {job.mileagePay > 0 && (
            <div>
              <span style={{ color: '#5f6368' }}>Mileage:</span>{' '}
              {job.travelMiles.toFixed(0)} mi × ${(job.mileagePay / job.travelMiles).toFixed(2)} = ${job.mileagePay.toFixed(2)}
            </div>
          )}
          
          {job.travelMiles > 0 && job.mileagePay === 0 && !job.isPrevailingWage && (
            <div style={{ color: '#d32f2f', fontSize: '9px' }}>
              Mileage: {job.travelMiles.toFixed(0)} mi (≤30mi threshold - not paid)
            </div>
          )}
          
          {job.isEPUD && job.travelMiles > 0 && (
            <div style={{ color: '#1a73e8', fontSize: '9px' }}>
              Mileage: {job.travelMiles.toFixed(0)} mi (EPUD - billed to client, not paid to employee)
            </div>
          )}
          
          {job.fringePay > 0 && (
            <div>
              <span style={{ color: '#5f6368' }}>Fringe:</span>{' '}
              ${job.fringePay.toFixed(2)}
            </div>
          )}
          
          {job.stipendPay > 0 && (
            <div>
              <span style={{ color: '#5f6368' }}>Sign Stipends:</span>{' '}
              {job.signStipends} × $25 = ${job.stipendPay.toFixed(2)}
            </div>
          )}
          
          <div style={{ 
            gridColumn: '1 / -1',
            paddingTop: '4px',
            borderTop: '1px solid #e0e0e0',
            fontWeight: '600',
            color: '#2e7d32'
          }}>
            Total Pay: ${job.total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayrollReportView;
