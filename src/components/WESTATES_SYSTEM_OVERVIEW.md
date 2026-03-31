# WEST STATES WEB APP - SYSTEM OVERVIEW

**Last Updated:** March 31, 2026  
**GitHub:** https://github.com/ambient30/westates-web-app  
**Tech Stack:** React + Firebase + Vite  
**Database:** Cloud Firestore (Spark/Free Tier)  
**Timezone:** America/Los_Angeles

---

## TABLE OF CONTENTS

1. [System Purpose](#system-purpose)
2. [Current Features](#current-features)
3. [Component Architecture](#component-architecture)
4. [Data Structure](#data-structure)
5. [Business Logic](#business-logic)
6. [User Workflows](#user-workflows)
7. [Key Design Patterns](#key-design-patterns)

---

## SYSTEM PURPOSE

West States is a **flagging company management system** for traffic control operations. It manages:
- Job scheduling and dispatch
- Employee and contractor management
- Time tracking
- Payroll calculations
- Client invoicing
- Rate card management

**Core Goal:** Automate complex billing and payroll calculations while staying on Firebase's free tier (50K reads, 20K writes/day).

---

## CURRENT FEATURES

### ✅ **Job Management**
- Create, edit, and track flagging jobs
- Job lifecycle: Created → Dispatched → Active → Completed → Returned
- Custom fields per job (pilot car driver, weather conditions, client priority, etc.)
- Job series grouping for recurring work

### ✅ **People Management**
- **Employees:** Full profiles with certifications, insurance, equipment, pay rates
- **Contractors:** Contact info, billing rates, custom parameters
- Availability tracking
- Assignment and dispatch workflows
- Conflict detection (same employee, multiple jobs, same day)

### ✅ **Time Entry System**
- Track actual hours worked per flagger per job
- Record actual travel time (roundtrip minutes)
- Record actual travel miles (roundtrip miles)
- Sign stipends tracking
- Pre-fill from job estimates

### ✅ **Payroll Report System**
- Calculates employee pay based on:
  - Regular hours vs overtime hours
  - Holiday pay (2× regular rate)
  - Weekend/night overtime (all hours)
  - Travel time pay (roundtrip - 1hr, only if ≥1hr)
  - Daily minimums (4 hours default, configurable per rate card)
- **Multi-Job Daily Minimum Conflict Resolution:**
  - Detects when employee has multiple jobs same day where ANY job < minimum
  - Shows ALL conflicts across ALL dates in ONE modal
  - Three resolution options:
    1. Combine all hours (pay minimum once for combined total)
    2. Each job gets minimum (pay minimum for each job)
    3. Select specific jobs (choose which get minimum)
- Prevailing wage support with fringe calculations
- Sign stipend tracking
- Export to CSV

### ✅ **Invoicing Report System**
- Calculates client billing based on:
  - Flagger hours at billing rates
  - Overtime billing
  - Holiday billing (2× rate)
  - Travel time billing (per flagger: roundtrip - 1hr, only if ≥1hr)
  - Mileage billing (per flagger: roundtrip miles, only if ≥60mi)
  - Daily minimums
- **Special Rate Card Rules:**
  - **EPUD:** Bills travel/mileage regardless of thresholds
  - **Prevailing Wage:** NO travel time or mileage billed
- Groups by client and job series
- Export to CSV

### ✅ **Rate Card Management**
- Multiple rate cards for different clients
- Configurable rates:
  - Regular hourly rate (billing)
  - Overtime rate (billing)
  - Travel time rate
  - Mileage rate
  - Daily minimum hours
  - OT trigger (default: 8 hours)
  - Holiday multiplier
  - Weekend days
  - Night shift hours
- Prevailing wage support (separate pay vs billing rates)

### ✅ **Authentication & Permissions**
- Firebase Authentication
- Role-based access (Admin, Manager, User)
- Audit logging for changes

---

## COMPONENT ARCHITECTURE

### **Core Components**
```
App.jsx
├── Dashboard.jsx (main navigation)
│   ├── JobsList.jsx (all jobs view)
│   │   └── JobCard.jsx (individual job display)
│   ├── EmployeesList.jsx (employee management)
│   ├── ContractorsList.jsx (contractor management)
│   ├── PayrollReportView.jsx (payroll calculations)
│   ├── InvoicingReportView.jsx (client billing)
│   ├── TimeEntryView.jsx (time tracking)
│   ├── RatesManager.jsx (rate card CRUD)
│   └── AvailabilityView.jsx (calendar)
```

### **Modal Components (Job Lifecycle)**
- **CreateJobModal:** New job creation with estimates
- **EditJobModal:** Modify job details
- **JobDetailsModal:** View full job info
- **DispatchFlaggersModal:** Assign flaggers to jobs, conflict detection
- **ContinueJobModal:** Resume paused job
- **FinishJobModal:** Mark job complete
- **ReturnJobModal:** Return job from completed

### **Modal Components (People)**
- **CreateEmployeeModal:** Add new employee with all fields
- **EditEmployeeModal:** Update employee info
- **AssignEmployeesModal:** Assign to jobs
- **CreateContractorModal:** Add contractor
- **EditContractorModal:** Update contractor

### **Modal Components (Payroll/Invoicing)**
- **DailyMinimumModal:** Resolve multi-job daily minimum conflicts

### **Utility Components**
- **Login.jsx:** Authentication
- **RoleManager.jsx:** Manage user roles
- **UserManager.jsx:** User administration
- **PendingApproval.jsx:** New user approvals
- **FirstTimeSetup.jsx:** Initial system configuration

---

## DATA STRUCTURE

### **Firestore Collections**

#### **jobs/** - Main job records
```javascript
{
  jobID: "JOB-123",
  caller: "ODOT",
  location: "I-5 Exit 194",
  initialJobDate: "04/15/2026",
  initialJobTime: "7:00 AM",
  jobSeries: "ODOT-I5-APRIL",
  billing: "ODOT",
  rateId: "rate_odot_standard",
  status: "dispatched", // created|dispatched|active|completed|returned
  
  // Estimates (from job creation)
  estimatedHours: 8,
  estimatedTravelTime: 45, // minutes one-way
  estimatedTravelMiles: 30, // miles one-way
  
  // Assignment
  assignedFlaggers: "Dylan W Cummings, Brian Smith",
  dispatchedFlaggers: "Dylan W Cummings, Brian Smith",
  
  // Actual time data (from TimeEntryView)
  actualHours: {
    "Dylan W Cummings": {
      hoursWorked: 8.5,
      startTime: "07:00",
      endTime: "15:30",
      actualTravelTime: 120, // roundtrip minutes
      actualTravelMiles: 60,  // roundtrip miles
      signStipends: 1
    }
  },
  
  // Flexible custom fields
  custom: {
    pilotCarDriver: "Dylan",
    weatherConditions: "Rainy",
    specialInstructions: "Call before arriving"
  },
  
  // Metadata
  metadata: {
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: "user@example.com",
    updatedBy: "user@example.com"
  }
}
```

#### **employees/** - Employee records
```javascript
{
  // Standard fields
  fullName: "Dylan W Cummings",
  employeeUID: "26",
  cellPhone: "(555) 123-4567",
  secondPhone: "(555) 987-6543",
  email: "dylan@example.com",
  address: "123 Main St, Portland, OR 97201",
  doh: "01/15/2024", // Date of hire
  payRate: 27.50,
  customRate: 30.00, // Optional override
  
  // Status
  isActive: true,
  longTerm: false,
  dmvUnacceptable: false,
  
  // Certifications
  flaggerCardNum: "FC123456",
  flaggerCardExpire: "12/31/2026",
  otherCerts: "First Aid, CPR",
  
  // Insurance
  autoInsurPolicyNum: "AUTO123",
  autoInsurExpire: "06/30/2026",
  medicalInsurance: true,
  retirement401k: false,
  
  // Equipment
  signs: 2,
  extraSigns: 0,
  cones: 12,
  stands: 2,
  otherEquipment: "Vest, Hard Hat",
  
  // Restrictions
  noFlaggers: "", // List of employees they won't work with
  noContractors: "", // List of contractors they won't work with
  
  // Notes and custom fields
  notes: "Prefers morning shifts",
  custom: {
    specialCerts: "Night Work Certified",
    preferredProjects: "Highway"
  },
  
  // Metadata
  metadata: {
    createdAt: timestamp,
    updatedAt: timestamp
  }
}
```

#### **contractors/** - Contractor records
```javascript
{
  name: "ABC Traffic Control",
  phone: "(555) 999-8888",
  email: "contact@abctraffic.com",
  rates: {
    hourly: 45.00,
    travel: 40.00,
    mileage: 0.75
  },
  custom: {
    billFullRoundtrip: true,
    preferredContact: "Call before 3pm"
  },
  metadata: {
    createdAt: timestamp,
    updatedAt: timestamp
  }
}
```

#### **rates/** - Rate card definitions
```javascript
{
  id: "rate_odot_standard",
  name: "ODOT Standard",
  
  // Billing rates (what client pays)
  flaggerHours: 40.00,      // Regular hourly
  flaggerHoursOT: 60.00,    // Overtime hourly
  travelTime: 40.00,        // Travel hourly
  mileage: 0.75,            // Per mile
  
  // Pay rates (what employee gets) - only for prevailing wage
  flaggerPay: 0,            // 0 = use employee's payRate
  flaggerPayOT: 0,
  travelPay: 0,
  fringe: 0,
  
  // Rules
  hourMinimum: 4,           // Daily minimum hours
  otStarts: 8,              // OT starts after X hours
  holiday: 2,               // Holiday multiplier (2×)
  weekendDuration: "Saturday, Sunday",
  overtimeNights: "10pm-6am",
  
  metadata: {
    createdAt: timestamp,
    updatedAt: timestamp
  }
}
```

#### **settings/** - System configuration
```javascript
{
  global: {
    companyName: "West States Flagging",
    timezone: "America/Los_Angeles",
    defaultStipend: 25,
    // Future: ClickSend credentials will go here
  }
}
```

---

## BUSINESS LOGIC

### **Payroll Calculations (PayrollReportView.jsx)**

#### **Hour Classification**
```javascript
// Priority order (only one applies):
1. Holiday? → All hours = holiday hours (2× rate)
2. Weekend or Night? → All hours = OT hours (1.5× rate)
3. Regular day:
   - Hours ≤ otStarts (default 8) → Regular hours
   - Hours > otStarts → OT hours
```

#### **Travel Time Pay**
```javascript
// Employee receives travel pay (not billed to all clients)
actualTravelTime = flagger's roundtrip minutes from time entry
travelHours = actualTravelTime / 60
billableTravelHours = travelHours - 1

if (billableTravelHours >= 1) {
  travelPay = billableTravelHours × employee.payRate
} else {
  travelPay = 0
}

// EPUD exception: Uses regular thresholds for employee pay
// PW exception: No travel pay for employees
```

#### **Daily Minimum Logic**
```javascript
// Check all jobs for an employee on same day
for each date {
  employeeJobs = jobs where employee assigned on this date
  
  if (employeeJobs.length > 1) {
    // Multiple jobs same day
    for each job {
      if (job.hours < minimum) {
        // Conflict exists! Show modal with resolution options
      }
    }
  }
}

// Resolution options:
// 1. Combine: Pay minimum once for total hours
// 2. Each: Pay minimum for each job
// 3. Select: Choose which jobs get minimum
```

### **Invoicing Calculations (InvoicingReportView.jsx)**

#### **Travel Billing (Critical: Per Flagger)**
```javascript
// Calculate separately for EACH flagger, then sum
for each flagger {
  actualTravelTime = flagger's roundtrip minutes
  travelHours = actualTravelTime / 60
  billableTravelHours = travelHours - 1
  
  if (isPrevailingWage) {
    // NO travel billed
    travelBilling = 0
  } else if (isEPUD) {
    // Bill regardless of threshold
    travelBilling += travelHours × rate.travelTime
  } else {
    // Regular: Apply threshold
    if (billableTravelHours >= 1) {
      travelBilling += billableTravelHours × rate.travelTime
    }
  }
}
```

#### **Mileage Billing (Critical: Per Flagger)**
```javascript
// Calculate separately for EACH flagger, then sum
for each flagger {
  actualTravelMiles = flagger's roundtrip miles
  
  if (isPrevailingWage) {
    // NO mileage billed
    mileageBilling = 0
  } else if (isEPUD) {
    // Bill regardless of threshold
    mileageBilling += actualTravelMiles × rate.mileage
  } else {
    // Regular: Apply threshold
    if (actualTravelMiles >= 60) {
      mileageBilling += actualTravelMiles × rate.mileage
    }
  }
}
```

#### **EPUD Detection**
```javascript
// Check rate card name/id for "EPUD"
function isEPUDJob(job, jobRate) {
  if (!jobRate) return false;
  return jobRate.name?.toUpperCase().includes('EPUD') || 
         jobRate.id?.toUpperCase().includes('EPUD');
}

// NOT the job.billing field!
```

---

## USER WORKFLOWS

### **Complete Job Flow**

```
1. CREATE JOB
   ↓ (CreateJobModal)
   - Enter job details (client, location, date, time)
   - Select rate card
   - Estimate hours, travel, miles
   - Save → Status: "created"

2. ASSIGN FLAGGERS
   ↓ (DispatchFlaggersModal)
   - Select employees for job
   - System checks for conflicts (same day assignments)
   - Assign → Status: "dispatched"

3. JOB HAPPENS (in real world)
   ↓ 
   - Flaggers go to job site
   - Work the shift
   - Travel to/from site

4. ENTER TIME DATA
   ↓ (TimeEntryView)
   - Enter actual hours worked per flagger
   - Enter actual roundtrip travel time (minutes)
   - Enter actual roundtrip travel miles
   - Add sign stipends
   - Save → Job has actualHours data

5. GENERATE PAYROLL
   ↓ (PayrollReportView)
   - Select date range
   - Click "Generate Payroll"
   - If conflicts → DailyMinimumModal appears
   - Resolve conflicts
   - View/export payroll report

6. GENERATE INVOICES
   ↓ (InvoicingReportView)
   - Select date range
   - Click "Generate Invoices"
   - View/export invoices by client

7. COMPLETE JOB
   ↓ (FinishJobModal)
   - Mark job as complete
   - Status: "completed"
```

### **Daily Minimum Conflict Resolution Flow**

```
SCENARIO: Employee has 2 jobs on 4/1
- Job A: 2 hours (< 4 hour minimum)
- Job B: 3 hours (< 4 hour minimum)
- Total: 5 hours

↓ Generate Payroll
↓ System detects conflict
↓ DailyMinimumModal shows:

┌─────────────────────────────────────┐
│ Daily Minimum Conflicts             │
├─────────────────────────────────────┤
│ Employee: TestEmployeeA             │
│ Date: 04/01/2026                    │
│ Jobs: JOB-A (2 hrs), JOB-B (3 hrs)  │
│ Total: 5 hrs | Minimum: 4 hrs       │
│                                     │
│ ○ Combine all hours                 │
│   Pay: 5 hrs @ $27.50 = $137.50    │
│                                     │
│ ○ Each job gets minimum             │
│   Pay: 8 hrs @ $27.50 = $220.00    │
│                                     │
│ ○ Select specific jobs              │
│   ☑ JOB-A gets minimum (4 hrs)      │
│   ☐ JOB-B actual hours (3 hrs)      │
│   Pay: 7 hrs @ $27.50 = $192.50    │
└─────────────────────────────────────┘

↓ User selects resolution
↓ Payroll calculates accordingly
```

---

## KEY DESIGN PATTERNS

### **1. Flexible Custom Fields**
```javascript
// DON'T add new schema fields for one-off needs
job.pilotCarDriver = "Dylan"; // ❌ Wrong

// DO use custom object
job.custom.pilotCarDriver = "Dylan"; // ✅ Correct

// Read defensively
const driver = job.custom?.pilotCarDriver ?? "Unassigned";
```

### **2. Firestore Optimization**
```javascript
// Batch reads - load once, process many
const jobs = await getAllJobs(); // 1 read
jobs.forEach(job => processJob(job)); // 0 additional reads

// Single writes - combine all changes
await updateJob(jobId, {
  status: "completed",
  completedAt: timestamp,
  custom: { notes: "Finished early" }
}); // 1 write, not 3
```

### **3. Time Data Structure**
```javascript
// Job creation: ESTIMATES (one-way)
estimatedTravelTime: 45,  // minutes ONE WAY
estimatedTravelMiles: 30, // miles ONE WAY

// Time entry: ACTUALS (roundtrip)
actualHours: {
  "Employee": {
    actualTravelTime: 120,  // minutes ROUNDTRIP
    actualTravelMiles: 60   // miles ROUNDTRIP
  }
}

// Calculations use ACTUALS, not estimates
```

### **4. Rate Card Hierarchy**
```javascript
// Check rate card for special rules
if (isPrevailingWage) {
  // Use rate.flaggerPay instead of employee.payRate
  // NO travel/mileage billed
}

if (isEPUD) {
  // Bill travel/mileage regardless of thresholds
  // Check rate card name, not job.billing
}
```

---

## TESTING CHECKLIST

### **Payroll Tests**
- ✅ P1: Regular day calculation
- ✅ P2: Hour-based OT (8+ hours)
- ✅ P3: Weekend OT (all hours)
- ✅ P4: Daily minimum (single job)
- ✅ P5-P9: Multi-job scenarios
- ✅ P10: Night OT (all hours)
- ✅ P11: Holiday rate (2×)
- ✅ P12: Prevailing wage with fringe
- ✅ P13-P15: Multi-date conflicts

### **Invoicing Tests**
- ✅ I1: Regular billing
- ✅ I2: OT billing
- ✅ I3: Multi-flagger travel (per flagger calculation)
- ✅ I4: EPUD billing (no thresholds)

---

## FIREBASE CONSTRAINTS

**Daily Limits (Spark/Free Tier):**
- Reads: 50,000 / day
- Writes: 20,000 / day
- Storage: 1 GB total
- Bandwidth: 10 GB / month

**Optimization Rules:**
1. Batch reads - load all jobs once, filter in memory
2. Single updates - combine all field changes
3. Cache when stable - reuse data < 1 min
4. Query filters - use Firestore queries for subsets
5. No re-reads - pass objects, don't reload
6. Safety checks - confirm before bulk operations

---

## VERSION HISTORY

**Current Version:** 1.0  
**Last Major Update:** March 31, 2026

**Completed Features:**
- Core job management
- Employee/contractor management
- Time entry system
- Payroll calculations with multi-job conflict resolution
- Invoicing with per-flagger travel/mileage
- Rate card management
- Authentication and permissions

**In Progress:**
- CSV export formatting for Paychex/QuickBooks
- SMS dispatch integration with ClickSend

**Planned:**
- Data validation warnings
- Job cost analysis (profit margins)
- Prevailing wage display improvements
