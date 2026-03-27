import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import DailyMinimumModal from './DailyMinimumModal';

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
  const [conflicts, setConflicts] = useState(null);
  const [accumulatedResolutions, setAccumulatedResolutions] = useState({});

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
      setJobs(jobsData);

      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employeesData = employeesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: doc.id,
          ...data
        };
      });
      
      setEmployees(employeesData);

      const ratesSnapshot = await getDocs(collection(db, 'rates'));
      const ratesData = ratesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRates(ratesData);

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

    // Reset accumulated resolutions when starting fresh
    setAccumulatedResolutions({});

    const start = new Date(startDate);
    const end = new Date(endDate);

    const relevantJobs = jobs.filter(job => {
      if (!job.initialJobDate || !job.actualHours) return false;
      const [month, day, year] = job.initialJobDate.split('/');
      const jobDate = new Date(year, month - 1, day);
      return jobDate >= start && jobDate <= end;
    });

    // First pass: detect conflicts
    const employeeDayJobs = {};

    relevantJobs.forEach(job => {
      Object.keys(job.actualHours || {}).forEach(employeeName => {
        const key = `${employeeName}-${job.initialJobDate}`;
        if (!employeeDayJobs[key]) {
          employeeDayJobs[key] = {
            employeeName,
            date: job.initialJobDate,
            jobs: []
          };
        }
        employeeDayJobs[key].jobs.push(job);
      });
    });

    // Find conflicts (multiple jobs same day)
    const detectedConflicts = [];
    Object.values(employeeDayJobs).forEach(dayInfo => {
      if (dayInfo.jobs.length > 1) {
        let totalHours = 0;
        const jobDetails = [];
        
        dayInfo.jobs.forEach(job => {
          const timeData = job.actualHours[dayInfo.employeeName];
          const hours = parseFloat(timeData?.hoursWorked || 0);
          totalHours += hours;
          jobDetails.push({
            jobID: job.jobID,
            hours: hours
          });
        });

        const firstJob = dayInfo.jobs[0];
        const jobRate = rates.find(r => r.id === firstJob.rateId);
        const minimum = parseFloat(jobRate?.hourMinimum) || 4;
        const emp = employees.find(e => e.name === dayInfo.employeeName);
        const payRate = parseFloat(emp?.payRate) || 0;

        if (totalHours < minimum) {
          detectedConflicts.push({
            employeeName: dayInfo.employeeName,
            date: dayInfo.date,
            jobs: jobDetails,
            totalHours,
            minimum,
            payRate
          });
        }
      }
    });

    // If conflicts exist, show modal
    if (detectedConflicts.length > 0) {
      setConflicts(detectedConflicts);
      return;
    }

    // No conflicts, proceed normally
    processPayroll(relevantJobs, {});
  };

  const handleConflictResolution = (newResolutions) => {
    // Merge new resolutions with accumulated ones
    const allResolutions = { ...accumulatedResolutions, ...newResolutions };
    setAccumulatedResolutions(allResolutions);

    console.log('=== CONFLICT RESOLUTION DEBUG ===');
    console.log('New resolutions:', newResolutions);
    console.log('All accumulated resolutions:', allResolutions);

    const start = new Date(startDate);
    const end = new Date(endDate);

    const relevantJobs = jobs.filter(job => {
      if (!job.initialJobDate || !job.actualHours) return false;
      const [month, day, year] = job.initialJobDate.split('/');
      const jobDate = new Date(year, month - 1, day);
      return jobDate >= start && jobDate <= end;
    });

    console.log('Checking for more conflicts in', relevantJobs.length, 'jobs');

    // Check if there are MORE unresolved conflicts
    const employeeDayJobs = {};

    relevantJobs.forEach(job => {
      Object.keys(job.actualHours || {}).forEach(employeeName => {
        const key = `${employeeName}-${job.initialJobDate}`;
        if (!employeeDayJobs[key]) {
          employeeDayJobs[key] = {
            employeeName,
            date: job.initialJobDate,
            jobs: []
          };
        }
        employeeDayJobs[key].jobs.push(job);
      });
    });

    console.log('Employee-day combinations:', Object.keys(employeeDayJobs));

    // Find remaining unresolved conflicts
    const remainingConflicts = [];
    Object.values(employeeDayJobs).forEach(dayInfo => {
      if (dayInfo.jobs.length > 1) {
        const resolutionKey = `${dayInfo.employeeName}-${dayInfo.date}`;
        
        console.log(`Checking ${resolutionKey}: ${dayInfo.jobs.length} jobs`);
        console.log(`Already resolved? ${!!allResolutions[resolutionKey]}`);
        
        // Skip if already resolved
        if (allResolutions[resolutionKey]) {
          console.log(`Skipping ${resolutionKey} - already resolved`);
          return;
        }

        let totalHours = 0;
        const jobDetails = [];
        
        dayInfo.jobs.forEach(job => {
          const timeData = job.actualHours[dayInfo.employeeName];
          const hours = parseFloat(timeData?.hoursWorked || 0);
          totalHours += hours;
          jobDetails.push({
            jobID: job.jobID,
            hours: hours
          });
        });

        const firstJob = dayInfo.jobs[0];
        const jobRate = rates.find(r => r.id === firstJob.rateId);
        const minimum = parseFloat(jobRate?.hourMinimum) || 4;
        const emp = employees.find(e => e.name === dayInfo.employeeName);
        const payRate = parseFloat(emp?.payRate) || 0;

        console.log(`${resolutionKey}: totalHours=${totalHours}, minimum=${minimum}`);

        if (totalHours < minimum) {
          console.log(`Adding ${resolutionKey} to remaining conflicts`);
          remainingConflicts.push({
            employeeName: dayInfo.employeeName,
            date: dayInfo.date,
            jobs: jobDetails,
            totalHours,
            minimum,
            payRate
          });
        }
      }
    });

    console.log('Remaining conflicts found:', remainingConflicts.length);
    console.log('Remaining conflicts:', remainingConflicts);

    // If there are more conflicts, show modal again
    if (remainingConflicts.length > 0) {
      console.log('Showing modal for remaining conflicts');
      setConflicts(remainingConflicts);
      return;
    }

    // No more conflicts, process payroll with all accumulated resolutions
    console.log('No more conflicts, processing payroll with resolutions:', allResolutions);
    processPayroll(relevantJobs, allResolutions);
    setConflicts(null);
    setAccumulatedResolutions({});
  };

  const processPayroll = (relevantJobs, resolutions) => {
    const employeePayroll = {};

    relevantJobs.forEach(job => {
      const jobRate = rates.find(r => r.id === job.rateId);
      if (!jobRate) {
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
          const actualTravelMinutes = parseFloat(timeData.actualTravelTime || 0);
          
          if (actualTravelMinutes > 0) {
            const roundtripHours = actualTravelMinutes / 60;
            const billable = roundtripHours - 1;
            
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

    // Apply resolutions and daily minimums
    Object.values(employeePayroll).forEach(employee => {
      Object.entries(employee.jobsByDate).forEach(([date, dailyJobs]) => {
        const dailyRegularHours = dailyJobs.reduce((sum, j) => sum + j.regularHours, 0);
        const dailyOTHours = dailyJobs.reduce((sum, j) => sum + j.otHours, 0);
        const dailyHolidayHours = dailyJobs.reduce((sum, j) => sum + j.holidayHours, 0);
        const dailyTotalHours = dailyRegularHours + dailyOTHours + dailyHolidayHours;

        const dailyMinimum = Math.max(...dailyJobs.map(j => j.hourlyMinimum));
        const regularRate = dailyJobs[0].regularRate;

        const resolutionKey = `${employee.employeeName}-${date}`;
        const resolution = resolutions[resolutionKey];

        let adjustedJobHours = [];

        if (resolution === 'combine') {
          let adjustedRegularHours = dailyRegularHours;
          if (dailyTotalHours < dailyMinimum) {
            adjustedRegularHours += (dailyMinimum - dailyTotalHours);
          }
          
          dailyJobs.forEach((job, index) => {
            adjustedJobHours.push({
              ...job,
              adjustedRegularHours: index === 0 ? adjustedRegularHours : job.regularHours,
              isFirstJobOfDay: index === 0
            });
          });

        } else if (resolution === 'each') {
          dailyJobs.forEach((job) => {
            const jobTotalHours = job.regularHours + job.otHours + job.holidayHours;
            let adjustedRegularHours = job.regularHours;
            
            if (jobTotalHours < dailyMinimum) {
              adjustedRegularHours += (dailyMinimum - jobTotalHours);
            }

            adjustedJobHours.push({
              ...job,
              adjustedRegularHours,
              isFirstJobOfDay: true
            });
          });

        } else if (resolution?.startsWith('select-')) {
          const selectedJobsString = resolution.substring(7); // Remove 'select-'
          const selectedJobs = selectedJobsString.split('-').filter(s => s !== '');
          
          dailyJobs.forEach((job, index) => {
            const isSelected = selectedJobs.includes(`job${index}`);
            const jobTotalHours = job.regularHours + job.otHours + job.holidayHours;
            let adjustedRegularHours = job.regularHours;
            
            if (isSelected && jobTotalHours < dailyMinimum) {
              adjustedRegularHours += (dailyMinimum - jobTotalHours);
            }

            adjustedJobHours.push({
              ...job,
              adjustedRegularHours,
              isFirstJobOfDay: true
            });
          });

        } else {
          let adjustedRegularHours = dailyRegularHours;
          if (dailyTotalHours < dailyMinimum) {
            adjustedRegularHours += (dailyMinimum - dailyTotalHours);
          }

          dailyJobs.forEach((job, index) => {
            adjustedJobHours.push({
              ...job,
              adjustedRegularHours: index === 0 ? adjustedRegularHours : job.regularHours,
              isFirstJobOfDay: index === 0
            });
          });
        }

        adjustedJobHours.forEach((job) => {
          const adjustedRegularPay = job.adjustedRegularHours * regularRate;
          const jobTotal = adjustedRegularPay + job.otPay + job.holidayPay + job.travelPay + job.fringePay + job.stipendPay;

          employee.jobs.push({
            ...job,
            total: job.isFirstJobOfDay ? jobTotal : 0,
            dailyMinimumApplied: dailyTotalHours < dailyMinimum,
            dailyTotalHours
          });

          if (job.isFirstJobOfDay) {
            employee.totalRegularHours += job.adjustedRegularHours;
            employee.totalOTHours += job.otHours;
            employee.totalHolidayHours += job.holidayHours;
            employee.totalTravelHours += job.travelHours;
            employee.totalFringe += job.fringePay;
            employee.totalStipends += job.signStipends;
            employee.grossPay += jobTotal;
          }
        });
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

      {conflicts && (
        <DailyMinimumModal
          conflicts={conflicts}
          onResolve={handleConflictResolution}
          onCancel={() => setConflicts(null)}
        />
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
