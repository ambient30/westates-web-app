import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from '../utils/firestoreTracker';
import { db, auth } from '../firebase';

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
            employeeId: emp?.id || employeeName,
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
          // Travel: Pay if >= 1 hour
          if (travelHours >= 1.0) {
            travelPay = travelHours * travelRate;
          }
          
          // Mileage: Pay if > 30 miles  
          if (travelMiles > 30) {
            mileagePay = travelMiles * mileageRate;
          }
        }

        const fringePay = isPrevailingWage ? ((regularHours + otHours) * fringeRate) : 0;
        const stipendPay = signStipends * stipendAmount;

        const jobTotal = regularPay + otPay + holidayPay + travelPay + mileagePay + fringePay + stipendPay;

        employeePayroll[employeeName].jobs.push({
          jobID: job.jobID,
          jobFirebaseId: job.id,
          date: job.initialJobDate,
          regularHours,
          regularPay,
          otHours,
          otPay,
          holidayHours,
          holidayPay,
          travelHours,
          travelPay,
          mileagePay,
          fringePay,
          signStipends,
          stipendPay,
          hasLunch: timeData.hasLunch || false,
          total: jobTotal,
          employeePayRate,
          isPrevailingWage,
          rateCard: jobRate,
          customParameterBilling: job.customParameterBilling || null
        });

        employeePayroll[employeeName].totalRegularHours += regularHours;
        employeePayroll[employeeName].totalRegularPay += regularPay;
        employeePayroll[employeeName].totalOTHours += otHours;
        employeePayroll[employeeName].totalOTPay += otPay;
        employeePayroll[employeeName].totalHolidayHours += holidayHours;
        employeePayroll[employeeName].totalHolidayPay += holidayPay;
        
        if (isPrevailingWage) {
          employeePayroll[employeeName].totalPWRegularHours += regularHours;
          employeePayroll[employeeName].totalPWRegularPay += regularPay;
          employeePayroll[employeeName].totalPWOTHours += otHours;
          employeePayroll[employeeName].totalPWOTPay += otPay;
          employeePayroll[employeeName].totalFringeHours += (regularHours + otHours);
          employeePayroll[employeeName].totalFringePay += fringePay;
        }
        
        employeePayroll[employeeName].totalTravelHours += travelHours;
        employeePayroll[employeeName].totalTravelPay += travelPay;
        employeePayroll[employeeName].totalMileagePay += mileagePay;
        employeePayroll[employeeName].totalSignStipends += signStipends;
        employeePayroll[employeeName].totalStipendPay += stipendPay;
        employeePayroll[employeeName].grossPay += jobTotal;
      });
    });

    // Convert to array and sort alphabetically
    const payrollArray = Object.values(employeePayroll).sort((a, b) => 
      a.employeeName.localeCompare(b.employeeName)
    );

    setPayrollData(payrollArray);
  };

  const exportToCSV = () => {
    if (!payrollData) return;

    const csvRows = [];
    csvRows.push(['Employee', 'Type', 'Hours', 'Rate', 'Amount'].join(','));

    payrollData.forEach(emp => {
      // Regular Hours
      if (emp.totalRegularHours > 0) {
        csvRows.push([
          emp.employeeName,
          'Regular Hours',
          emp.totalRegularHours.toFixed(2),
          emp.employeePayRate.toFixed(2),
          emp.totalRegularPay.toFixed(2)
        ].join(','));
      }

      // OT Hours
      if (emp.totalOTHours > 0) {
        const otRate = emp.employeePayRate * 1.5;
        csvRows.push([
          emp.employeeName,
          'OT Hours',
          emp.totalOTHours.toFixed(2),
          otRate.toFixed(2),
          emp.totalOTPay.toFixed(2)
        ].join(','));
      }

      // Holiday Hours
      if (emp.totalHolidayHours > 0) {
        csvRows.push([
          emp.employeeName,
          'Holiday Hours',
          emp.totalHolidayHours.toFixed(2),
          '-',
          emp.totalHolidayPay.toFixed(2)
        ].join(','));
      }

      // PW Hours
      if (emp.totalPWRegularHours > 0) {
        csvRows.push([
          emp.employeeName,
          'PW Regular',
          emp.totalPWRegularHours.toFixed(2),
          '-',
          emp.totalPWRegularPay.toFixed(2)
        ].join(','));
      }

      if (emp.totalPWOTHours > 0) {
        csvRows.push([
          emp.employeeName,
          'PW OT',
          emp.totalPWOTHours.toFixed(2),
          '-',
          emp.totalPWOTPay.toFixed(2)
        ].join(','));
      }

      // Fringe
      if (emp.totalFringePay > 0) {
        csvRows.push([
          emp.employeeName,
          'Fringe',
          emp.totalFringeHours.toFixed(2),
          '-',
          emp.totalFringePay.toFixed(2)
        ].join(','));
      }

      // Travel
      if (emp.totalTravelPay > 0) {
        csvRows.push([
          emp.employeeName,
          'Travel',
          emp.totalTravelHours.toFixed(2),
          emp.employeePayRate.toFixed(2),
          emp.totalTravelPay.toFixed(2)
        ].join(','));
      }

      // Mileage
      if (emp.totalMileagePay > 0) {
        csvRows.push([
          emp.employeeName,
          'Mileage',
          '-',
          '-',
          emp.totalMileagePay.toFixed(2)
        ].join(','));
      }

      // Stipends
      if (emp.totalStipendPay > 0) {
        csvRows.push([
          emp.employeeName,
          'Sign Stipends',
          emp.totalSignStipends,
          '25.00',
          emp.totalStipendPay.toFixed(2)
        ].join(','));
      }

      // Custom Parameters
      emp.jobs.forEach(job => {
        if (job.customParameterBilling && job.customParameterBilling[emp.employeeId]) {
          Object.entries(job.customParameterBilling[emp.employeeId]).forEach(([paramName, data]) => {
            if (data.payrollPay === true) {
              const rate = data.payrollRate !== undefined ? data.payrollRate : data.timeEntryRate || 0;
              const hours = data.payrollHours !== undefined ? data.payrollHours : data.timeEntryHours || 0;
              const total = rate * hours;
              
              csvRows.push([
                emp.employeeName,
                `Custom: ${paramName}`,
                hours.toFixed(2),
                rate.toFixed(2),
                total.toFixed(2)
              ].join(','));
            }
          });
        }
      });

      // Total
      csvRows.push([
        emp.employeeName,
        'TOTAL',
        '-',
        '-',
        emp.grossPay.toFixed(2)
      ].join(','));

      csvRows.push(['', '', '', '', '']); // Blank row
    });

    // Grand Total
    const grandTotal = payrollData.reduce((sum, emp) => sum + emp.grossPay, 0);
    csvRows.push(['', '', '', 'GRAND TOTAL', grandTotal.toFixed(2)]);

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

      {/* Date Range Filter */}
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
            <EmployeePayrollCard key={emp.employeeName} employee={emp} employees={employees} />
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

function EmployeePayrollCard({ employee, employees }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Calculate custom parameter pay total for summary
  const customParamPay = employee.jobs.reduce((total, job) => {
    if (job.customParameterBilling && job.customParameterBilling[employee.employeeId]) {
      Object.values(job.customParameterBilling[employee.employeeId]).forEach(data => {
        if (data.payrollPay === true) {
          const rate = data.payrollRate !== undefined ? data.payrollRate : data.timeEntryRate || 0;
          const hours = data.payrollHours !== undefined ? data.payrollHours : data.timeEntryHours || 0;
          total += (rate * hours);
        }
      });
    }
    return total;
  }, 0);

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
            {customParamPay > 0 && ` • Custom: $${customParamPay.toFixed(0)}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#2e7d32' }}>
            ${(employee.grossPay + customParamPay).toFixed(2)}
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

          {/* Custom Parameter Pay Section */}
          <CustomParameterPaySection 
            employee={employee} 
            employees={employees}
          />

          {/* Detailed Job Breakdown */}
          {selectedJob && (
            <JobPayrollBreakdown job={selectedJob} />
          )}
        </div>
      )}
    </div>
  );
}

function CustomParameterPaySection({ employee, employees }) {
  const [newParamName, setNewParamName] = useState('');
  const [newParamHours, setNewParamHours] = useState('');
  const [newParamRate, setNewParamRate] = useState('');
  const [newParamNotes, setNewParamNotes] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');

  // Collect all custom parameters for this employee across all jobs
  const customParams = {};
  
  employee.jobs.forEach(job => {
    if (job.customParameterBilling && job.customParameterBilling[employee.employeeId]) {
      Object.entries(job.customParameterBilling[employee.employeeId]).forEach(([paramName, data]) => {
        if (!customParams[paramName]) {
          customParams[paramName] = [];
        }
        customParams[paramName].push({
          jobId: job.jobFirebaseId,
          jobID: job.jobID,
          data: data
        });
      });
    }
  });

  const handlePayrollToggle = async (jobId, paramName, isPaying) => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        [`customParameterBilling.${employee.employeeId}.${paramName}.payrollPay`]: isPaying,
        [`customParameterBilling.${employee.employeeId}.${paramName}.payrollApprovedBy`]: auth.currentUser?.uid || 'unknown',
        [`customParameterBilling.${employee.employeeId}.${paramName}.payrollApprovedAt`]: new Date(),
        updatedAt: new Date()
      });
    } catch (err) {
      alert('Error updating payroll: ' + err.message);
    }
  };

  const handlePayrollChange = async (jobId, paramName, field, value) => {
    try {
      const updates = {
        [`customParameterBilling.${employee.employeeId}.${paramName}.${field}`]: 
          field.includes('Rate') || field.includes('Hours') ? parseFloat(value) || 0 : value,
        updatedAt: new Date()
      };
      
      await updateDoc(doc(db, 'jobs', jobId), updates);
    } catch (err) {
      alert('Error updating payroll: ' + err.message);
    }
  };

  const handleAddCustomParam = async () => {
    if (!newParamName || !selectedJobId || !newParamRate || !newParamHours) {
      alert('Please fill in all fields: parameter name, job, rate, and hours');
      return;
    }

    try {
      await updateDoc(doc(db, 'jobs', selectedJobId), {
        [`customParameterBilling.${employee.employeeId}.${newParamName}.payrollPay`]: true,
        [`customParameterBilling.${employee.employeeId}.${newParamName}.payrollRate`]: parseFloat(newParamRate),
        [`customParameterBilling.${employee.employeeId}.${newParamName}.payrollHours`]: parseFloat(newParamHours),
        [`customParameterBilling.${employee.employeeId}.${newParamName}.payrollNotes`]: newParamNotes,
        [`customParameterBilling.${employee.employeeId}.${newParamName}.payrollApprovedBy`]: auth.currentUser?.uid || 'unknown',
        [`customParameterBilling.${employee.employeeId}.${newParamName}.payrollApprovedAt`]: new Date(),
        updatedAt: new Date()
      });

      // Clear form
      setNewParamName('');
      setNewParamHours('');
      setNewParamRate('');
      setNewParamNotes('');
      setSelectedJobId('');

      alert('Custom parameter added successfully!');
    } catch (err) {
      alert('Error adding custom parameter: ' + err.message);
    }
  };

  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      background: '#fff9e6',
      border: '1px solid #ffc107',
      borderRadius: '4px'
    }}>
      <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#f57c00', marginTop: 0 }}>
        ⭐ Custom Parameter Pay
      </h4>

      {/* Add New Custom Parameter Section */}
      <div style={{
        padding: '10px',
        background: '#e3f2fd',
        border: '1px solid #1a73e8',
        borderRadius: '4px',
        marginBottom: '12px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#1a73e8' }}>
          Add Custom Parameter
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Parameter Name *
            </label>
            <input
              type="text"
              value={newParamName}
              onChange={(e) => setNewParamName(e.target.value)}
              placeholder="e.g., pilotCarDriver, specialEquipment"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Job *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            >
              <option value="">Select job...</option>
              {employee.jobs.map(job => (
                <option key={job.jobFirebaseId} value={job.jobFirebaseId}>
                  {job.jobID} - {job.date}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Pay Rate ($/hr) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newParamRate}
              onChange={(e) => setNewParamRate(e.target.value)}
              placeholder="40.00"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Hours *
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={newParamHours}
              onChange={(e) => setNewParamHours(e.target.value)}
              placeholder="8.0"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
              Notes
            </label>
            <textarea
              value={newParamNotes}
              onChange={(e) => setNewParamNotes(e.target.value)}
              placeholder="Notes about this payment..."
              rows="2"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        <button
          onClick={handleAddCustomParam}
          className="btn btn-primary"
          style={{ fontSize: '11px', padding: '4px 10px', marginTop: '8px' }}
        >
          + Add Custom Parameter
        </button>
      </div>

      {/* Existing Custom Parameters */}
      {Object.keys(customParams).length > 0 && (
        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#202124' }}>
          Existing Custom Parameters
        </div>
      )}

      {Object.entries(customParams).map(([paramName, entries]) => (
        <div key={paramName} style={{ marginBottom: '12px' }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            marginBottom: '8px',
            color: '#202124'
          }}>
            {paramName}
          </div>

          {entries.map((entry, idx) => {
            const data = entry.data;
            const payRate = data.payrollRate !== undefined ? data.payrollRate : data.timeEntryRate || 0;
            const payHours = data.payrollHours !== undefined ? data.payrollHours : data.timeEntryHours || 0;
            const isPaying = data.payrollPay === true;
            const payTotal = payRate * payHours;

            return (
              <div key={idx} style={{
                padding: '10px',
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                marginBottom: '8px'
              }}>
                {/* Header */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: isPaying ? '10px' : 0
                }}>
                  <div>
                    <strong style={{ fontSize: '11px' }}>{entry.jobID}</strong>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                      Time Entry: {data.timeEntryHours}hrs @ ${data.timeEntryRate}/hr
                      {data.timeEntryNotes && ` - ${data.timeEntryNotes}`}
                    </div>
                  </div>
                  
                  {/* Pay Toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isPaying}
                      onChange={(e) => handlePayrollToggle(entry.jobId, paramName, e.target.checked)}
                      style={{ marginRight: '6px', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: '600' }}>
                      Pay Employee
                    </span>
                  </label>
                </div>

                {/* Editable fields (only if paying) */}
                {isPaying && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
                          Pay Rate ($/hr)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={payRate}
                          onChange={(e) => handlePayrollChange(entry.jobId, paramName, 'payrollRate', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            border: '1px solid #dadce0',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
                          Hours to Pay
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={payHours}
                          onChange={(e) => handlePayrollChange(entry.jobId, paramName, 'payrollHours', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            border: '1px solid #dadce0',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '10px', color: '#5f6368', marginBottom: '2px' }}>
                        Payroll Notes
                      </label>
                      <textarea
                        value={data.payrollNotes || ''}
                        onChange={(e) => handlePayrollChange(entry.jobId, paramName, 'payrollNotes', e.target.value)}
                        placeholder="Notes about this payment..."
                        rows="2"
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          border: '1px solid #dadce0',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    {/* Calculated Pay */}
                    <div style={{ 
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#2e7d32'
                    }}>
                      Pay: ${payTotal.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Keep the rest of JobPayrollBreakdown component unchanged...
function JobPayrollBreakdown({ job }) {
  const employeePayRate = job.employeePayRate || 0;
  const employeeOTRate = employeePayRate * 1.5;
  
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
        fontSize: '11px'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1a73e8' }}>
          Rate Card: {job.rateCard.rateName || 'Unknown'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
          {job.isPrevailingWage ? (
            <>
              <div>PW Rate: ${pwRate.toFixed(2)}/hr</div>
              <div>PW OT: ${pwOTRate.toFixed(2)}/hr</div>
              <div>Fringe: ${fringeRate.toFixed(2)}/hr</div>
            </>
          ) : (
            <>
              <div>Employee Rate: ${employeePayRate.toFixed(2)}/hr</div>
              <div>OT Rate: ${employeeOTRate.toFixed(2)}/hr</div>
            </>
          )}
        </div>
      </div>

      {/* Pay Calculation */}
      <table style={{ width: '100%', fontSize: '11px' }}>
        <tbody>
          {job.regularHours > 0 && (
            <tr>
              <td style={{ padding: '4px 0' }}>Regular Hours</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>
                {job.regularHours.toFixed(2)} hrs × ${job.isPrevailingWage ? pwRate.toFixed(2) : employeePayRate.toFixed(2)}
              </td>
              <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: '600' }}>
                ${job.regularPay.toFixed(2)}
              </td>
            </tr>
          )}
          {job.otHours > 0 && (
            <tr>
              <td style={{ padding: '4px 0' }}>OT Hours</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>
                {job.otHours.toFixed(2)} hrs × ${job.isPrevailingWage ? pwOTRate.toFixed(2) : employeeOTRate.toFixed(2)}
              </td>
              <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: '600' }}>
                ${job.otPay.toFixed(2)}
              </td>
            </tr>
          )}
          {job.fringePay > 0 && (
            <tr>
              <td style={{ padding: '4px 0' }}>Fringe Benefits</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>
                {(job.regularHours + job.otHours).toFixed(2)} hrs × ${fringeRate.toFixed(2)}
              </td>
              <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: '600' }}>
                ${job.fringePay.toFixed(2)}
              </td>
            </tr>
          )}
          {job.travelPay > 0 && (
            <tr>
              <td style={{ padding: '4px 0' }}>Travel Pay</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>
                {job.travelHours.toFixed(2)} hrs × ${employeePayRate.toFixed(2)}
              </td>
              <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: '600' }}>
                ${job.travelPay.toFixed(2)}
              </td>
            </tr>
          )}
          {job.mileagePay > 0 && (
            <tr>
              <td style={{ padding: '4px 0' }}>Mileage</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>Reimbursement</td>
              <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: '600' }}>
                ${job.mileagePay.toFixed(2)}
              </td>
            </tr>
          )}
          {job.stipendPay > 0 && (
            <tr>
              <td style={{ padding: '4px 0' }}>Sign Stipends</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>
                {job.signStipends} × $25.00
              </td>
              <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: '600' }}>
                ${job.stipendPay.toFixed(2)}
              </td>
            </tr>
          )}
          <tr style={{ borderTop: '2px solid #e0e0e0', fontWeight: '600' }}>
            <td style={{ padding: '8px 0 4px 0' }}>Total</td>
            <td></td>
            <td style={{ textAlign: 'right', padding: '8px 0 4px 0', color: '#2e7d32', fontSize: '13px' }}>
              ${job.total.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default PayrollReportView;
