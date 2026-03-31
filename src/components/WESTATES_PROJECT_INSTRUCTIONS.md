# WESTATES FLAGMAN WEB APP - CLAUDE PROJECT INSTRUCTIONS

**Company:** Westates Flagman  
**GitHub:** https://github.com/ambient30/westates-web-app  
**Database:** Cloud Firestore (Spark/Free Tier)  
**Timezone:** America/Los_Angeles  
**Stack:** React · Firebase · Vite

---

## 📚 DOCUMENTATION STRUCTURE

### **Primary Documentation Files**

Before starting any work, **ALWAYS** review these documentation files:

1. **System Overview** (Technical Reference)
   - **URL:** https://raw.githubusercontent.com/ambient30/westates-web-app/refs/heads/main/src/components/WESTATES_SYSTEM_OVERVIEW.md
   - **Contains:** Complete system breakdown, data structures, business logic, workflows
   - **Use for:** Understanding how the system works, calculation rules, component architecture

2. **Master Tracking Document** (Project Management)
   - **URL:** https://raw.githubusercontent.com/ambient30/westates-web-app/refs/heads/main/src/components/WESTATES_MASTER_TRACKING.md
   - **Contains:** Goals, completed features, in-progress work, backlog, bugs, changelog
   - **Use for:** Tracking project status, prioritization, bug tracking, feature requests

### **Documentation Update Requirements**

**CRITICAL:** Both documentation files MUST be kept current. After completing any task:

1. **Update WESTATES_MASTER_TRACKING.md:**
   - ✅ Move completed items from "In Progress" to "Completed Features"
   - ✅ Remove fixed bugs from "Known Issues" 
   - ✅ Add entry to "Changelog" with date and description
   - ✅ Update relevant sections (Backlog, Technical Debt, etc.)

2. **Update WESTATES_SYSTEM_OVERVIEW.md if:**
   - New features added (update "Current Features" section)
   - Data structure changed (update Firestore field examples)
   - Business logic changed (update calculation rules)
   - New components created (update "Component Architecture")
   - Testing scenarios added (update "Testing Checklist")

3. **Provide Updated Files:**
   - Always provide the complete updated documentation files
   - Include a summary of what changed in each file
   - Format: "Updated WESTATES_MASTER_TRACKING.md: Moved SMS dispatch from 'In Progress' to 'Completed', added changelog entry"

---

## 🗂️ FIRESTORE STRUCTURE & LIMITS

### **Daily Limits (Spark/Free Tier)**

| Operation | Limit | Rule of Thumb |
|-----------|-------|---------------|
| Reads | 50,000/day | Batch reads · cache results |
| Writes | 20,000/day | Combine updates · 1 write per change |
| Deletes | 20,000/day | Confirm before bulk deletes |
| Storage | 1 GB total | Check before large imports |
| Bandwidth | 10 GB/month | Minimize full-collection reads |

### **Collection Structure**

```
jobs/
  {jobID}/
    Standard: caller, location, date, assignedFlaggers, status, …
    custom: { pilotCarDriver, weatherConditions, clientPriority, … } ← unlimited
    metadata: { createdAt, updatedAt, createdBy, updatedBy }

employees/
  {employeeName}/
    Standard: phone, email, certifications, wage, …
    custom: { specialCerts, notes, … }
    metadata: { createdAt, updatedAt }

contractors/
  {contractorName}/
    Standard: phone, email, rates, …
    custom: { billFullRoundtrip, preferredContact, … }
    metadata: { createdAt, updatedAt }

rates/
  {rateId}/
    Billing rates, pay rates, rules
    metadata: { createdAt, updatedAt }
```

**Core Principle:** Use `custom: {}` for flexible fields — never add schema fields for one-off needs.

---

## 🔥 FIRESTORE OPTIMIZATION RULES

### **Rule 1: Batch Reads (CRITICAL)**

✅ **GOOD — Read once, process many**
```javascript
const jobs = getAllJobs(); // 1 read
jobs.forEach(job => {
  processJob(job);
  calculateHours(job);
});
```

❌ **BAD — Read N times**
```javascript
jobs.forEach(job => {
  const d = getJobByID(job.jobID); // 50 reads!
  processJob(d);
});
```

### **Rule 2: Single Update (combine all changes)**

✅ **GOOD — 1 write**
```javascript
updateJobByID('JOB1', {
  location: 'New Loc',
  assignedFlaggers: 'Dylan',
  custom: { driver: 'Brian' }
}); // 1 write
```

❌ **BAD — 3 writes**
```javascript
updateJobByID('JOB1', {location}); // write 1
updateJobByID('JOB1', {flaggers}); // write 2
updateJobByID('JOB1', {custom});   // write 3
```

### **Rules 3-6 Summary**

| Rule | Pattern | When to Apply |
|------|---------|---------------|
| 3 — Cache | `const cache = getAllJobs(); op1(cache); op2(cache);` | Multiple ops in same function, data stable < 1 min |
| 4 — Query Filter | `queryJobsFromFirestore('status','==','active')` | When you need a subset, not all docs |
| 5 — No Re-read | Pass job object, don't call getJobByID() again | You already have the object in scope |
| 6 — Safety Check | `checkSafeToOperate()` before any bulk loop | Any operation touching > 100 documents |

---

## 📋 COMPONENT FILE STRUCTURE

**GitHub Base URL:**
```
https://raw.githubusercontent.com/ambient30/westates-web-app/refs/heads/main/src/components/
```

| Category | Files | Purpose |
|----------|-------|---------|
| Core | App.jsx · Dashboard.jsx · firebase.js | App root, main dashboard, Firebase init |
| Core | JobsList.jsx · JobCard.jsx | Jobs list view + individual job cards |
| Core | EmployeesList.jsx · ContractorsList.jsx | People management views |
| Jobs | CreateJobModal · EditJobModal · JobDetailsModal | CRUD for job records |
| Jobs | ContinueJobModal · FinishJobModal · ReturnJobModal | Job lifecycle state transitions |
| People | CreateEmployeeModal · EditEmployeeModal | Employee CRUD |
| People | AssignEmployeesModal · DispatchFlaggersModal | Dispatch & assignment workflows |
| People | CreateContractorModal · EditContractorModal | Contractor CRUD |
| Reports | PayrollReportView.jsx · InvoicingReportView.jsx | Payroll and billing reports |
| Reports | TimeEntryView.jsx · PinksView.jsx | Time tracking, pinks summary |
| Reports | RatesManager.jsx · AvailabilityView.jsx | Rate card management, availability calendar |
| Utils | Login · RoleManager · UserManager · PendingApproval | Auth & access control |
| Utils | auditLog.js · permissions.js · FirstTimeSetup.jsx | Audit trail, permissions, initial setup |
| Modals | DailyMinimumModal.jsx | Multi-job daily minimum conflict resolution |

---

## 🎯 FLEXIBLE CUSTOM FIELDS PATTERN

**Core principle:** Never add schema fields for one-off needs. Everything goes into `custom: {}`.

### **The Pattern**

✅ **Adding new info — zero schema changes**
```javascript
updateJobByID('JOB123', {
  location: 'Site A',           // Standard field
  custom: {
    pilotCarDriver: 'Dylan',    // New param — no code changes elsewhere
    weatherConditions: 'Rainy',
    billFullRoundtrip: true,    // Rate-card flag
    specialInstructions: '...'
  }
});
```

✅ **Reading custom fields defensively**
```javascript
const driver = job.custom?.pilotCarDriver ?? 'Unassigned';
const billFull = jobRate.custom?.billFullRoundtrip ?? false;
```

### **When to Use custom: {} vs Standard Field**

| Use standard field when… | Use custom: {} when… |
|--------------------------|---------------------|
| Every job/employee/contractor needs it | Only some records need it |
| It's referenced in multiple components | It's specific to one workflow or client |
| It participates in queries / filtering | It's display-only or a flag |
| It has a fixed set of values | Its definition may change or expand |

---

## 📝 REQUIRED DELIVERABLES — EVERY CODE CHANGE

| # | Deliverable | Detail |
|---|-------------|--------|
| 1 | Full function | Paste entire function — no diffs; copy-paste ready |
| 2 | Firestore op count | "X reads, Y writes" — with math shown |
| 3 | Caching strategy | Explain if data is cached and for how long |
| 4 | Change log | Bullet list of what changed and why |
| 5 | Test plan | Step-by-step verification in the app |
| 6 | Usage impact | Est. daily ops if called frequently (% of limit) |
| 7 | Removed references | List anything deleted/renamed so nothing breaks |
| 8 | **Documentation updates** | **Updated MASTER_TRACKING.md and/or SYSTEM_OVERVIEW.md** |

---

## 🔄 SESSION WORKFLOW

### **START OF SESSION**

**Before starting any work:**

1. ✅ Fetch **WESTATES_MASTER_TRACKING.md** to see current status
2. ✅ Fetch **WESTATES_SYSTEM_OVERVIEW.md** for system understanding
3. ✅ Review "In Progress" and "Backlog" sections
4. ✅ Fetch specific component(s) being modified from GitHub
5. ✅ Confirm Firestore collection structure hasn't changed
6. ✅ If bulk operation: ask user to check Firebase Console for current usage

### **PER-TASK WORKFLOW**

| Step | Name | Action |
|------|------|--------|
| 1 | Verify | Fetch the relevant file(s) from GitHub. List every function. Quote actual code. |
| 2 | Scope | Identify all functions that touch the data or UI being changed. |
| 3 | Op Count | Calculate Firestore reads + writes before writing any code. |
| 4 | Design | Batch reads → cache → filter in memory → single update. Use custom: {} for new params. |
| 5 | Implement | Write full function(s). Include logFirestoreOperation() after each DB call. |
| 6 | Deliver | Provide all 8 deliverables (including doc updates). |
| 7 | Cross-check | Verify no broken references. List any removed/renamed functions. |
| 8 | **Update Docs** | **Update tracking document and system overview as needed** |

### **END OF SESSION**

**Session Close Checklist:**

1. ✅ List all files modified
2. ✅ Confirm no orphaned function calls remain
3. ✅ Summarize total Firestore ops added/removed this session
4. ✅ **Update WESTATES_MASTER_TRACKING.md changelog**
5. ✅ **Move completed items, remove fixed bugs**
6. ✅ **Note anything that needs follow-up next session**
7. ✅ Provide updated documentation files

---

## 📐 BUSINESS RULES QUICK REFERENCE

### **Travel & Mileage Calculations**

**Regular Jobs:**
- Travel Time: `(roundtrip minutes / 60) - 1 hour`, only bill/pay if ≥ 1 hour after subtraction
- Mileage: `roundtrip miles`, only bill if ≥ 60 miles

**EPUD Exception:**
- Bill travel/mileage regardless of thresholds
- Employee pay still uses regular thresholds
- Detected by checking rate card name/id for "EPUD"

**Prevailing Wage Exception:**
- NO travel time or mileage billed to client
- NO travel time paid to employees

### **Overtime Triggers (Priority Order)**

1. **Holiday** → All hours at 2× rate (NOT 1.5×)
2. **Weekend or Night** → All hours at OT rate (1.5×)
3. **Regular day** → Hours after `otStarts` (default 8) at OT rate

**2026 Holidays:**
- New Year's Day: 01/01/2026
- Memorial Day: 05/25/2026
- Independence Day: 07/04/2026
- Labor Day: 09/07/2026
- Thanksgiving: 11/26/2026
- Christmas: 12/25/2026

### **Daily Minimum Logic**

**Conflict Detection:**
- Check if employee has multiple jobs on same day
- Conflict = ANY individual job < minimum hours (not daily total)
- Show ALL conflicts across ALL dates in ONE modal

**Resolution Options:**
1. **Combine** — Pay minimum once for total hours
2. **Each** — Pay minimum for each job separately
3. **Select** — Choose which specific jobs get minimum

### **Invoicing: Per-Flagger Calculation**

**CRITICAL:** Travel and mileage calculated PER FLAGGER, then summed.

**Example:**
```
Employee A: 120 min travel = 2 hrs - 1 = 1 hr × $40 = $40
Employee B: 120 min travel = 2 hrs - 1 = 1 hr × $40 = $40
Total: $80 (NOT $120 from summing 240 min first)
```

---

## 🚫 CRITICAL REMINDERS

| ✅ | DO |
|----|-----|
| ✅ | Always verify against GitHub — never hallucinate function names or signatures |
| ✅ | Batch reads — getAllJobs() once, then filter/process in memory |
| ✅ | Cache when appropriate — reuse data within same execution context (< 1 min) |
| ✅ | Single writes — combine all field updates into one updateJobByID() call |
| ✅ | Track operations — logFirestoreOperation() after every DB call |
| ✅ | Safety check — checkSafeToOperate() before any loop touching > 100 docs |
| ✅ | Use custom: {} — never add schema fields for edge cases or one-off needs |
| ✅ | Defensive reads — always use optional chaining: `job.custom?.field ?? defaultValue` |
| ✅ | **Update documentation files after every change** |

| 🚫 | NEVER |
|----|-------|
| 🚫 | NEVER enable Firebase billing — stay on Spark (free) plan |
| 🚫 | NEVER call getJobByID() inside a loop when you already have the data |
| 🚫 | NEVER issue multiple updateJobByID() calls where one would do |
| 🚫 | NEVER assume a function exists — fetch the file and confirm it first |
| 🚫 | **NEVER skip updating documentation files** |

---

## 📄 PROMPT TEMPLATES

### **Template A: General Feature Request**

```
TASK: [Short title]
COMPONENT(S): [e.g. JobCard.jsx, EditJobModal.jsx]
GITHUB URL(s): [paste raw GitHub URL(s)]

WHAT I WANT:
  [Clear description of the feature / change]

CUSTOM FIELDS NEEDED (if any):
  custom.fieldName — [description]

FIRESTORE CONSTRAINT:
  Estimated jobs in DB: [~50 / ~200 / unknown]
  Is this a bulk operation? [Yes / No]

DO NOT:
  - Add schema fields (use custom: {} instead)
  - Re-read docs you already fetched
  - Split into multiple writes what can be one

DELIVER:
  Full functions, op count, caching strategy, change log, 
  test plan, documentation updates
```

### **Template B: Bug Fix**

```
BUG: [Short title]
COMPONENT: [FileName.jsx]
GITHUB URL: [raw URL]

STEPS TO REPRODUCE:
  1. [Step 1]
  2. [Step 2]
  3. [What happens]

EXPECTED: [What should happen]
ACTUAL: [What currently happens]

SUSPECTED CAUSE (optional): [Your guess]

DELIVER:
  Full corrected function, root cause explanation, 
  test plan, documentation updates (remove from Known Issues)
```

### **Template C: Billing/Calculation Logic**

```
TASK: Fix / modify billing logic in [Component]
GITHUB URL: [raw URL]

CURRENT BEHAVIOR:
  [Describe what it does now]

DESIRED BEHAVIOR:
  [Describe exactly what it should do instead]

RATE CARD FIELDS INVOLVED:
  Standard: [list]
  Custom: [list or 'none']

EDGE CASES TO HANDLE:
  - [Edge case 1]
  - [Edge case 2]

DELIVER:
  Full updated function, expected output for test jobs,
  change log, documentation updates
```

---

## 🔍 TESTING REQUIREMENTS

Before marking any feature complete:

1. ✅ Run relevant regression tests (see SYSTEM_OVERVIEW.md)
2. ✅ Test with real data if possible
3. ✅ Verify Firestore operation counts
4. ✅ Check for edge cases
5. ✅ Update test scenarios in SYSTEM_OVERVIEW.md if new tests added

---

## 📊 FIREBASE USAGE MONITORING

**Current Usage (Typical Day):**
- Reads: ~1,050 / 50,000 (2% of limit) ✅
- Writes: ~37 / 20,000 (<1% of limit) ✅
- **Safety Margin: Excellent** — Room for 10× growth

**Track in MASTER_TRACKING.md:** Update usage estimates when adding features that significantly change read/write patterns.

---

## 🎬 WORKFLOW EXAMPLES

### **Example 1: Adding a New Feature**

```
User Request: "Add weather conditions field to jobs"

Your Workflow:
1. Fetch WESTATES_MASTER_TRACKING.md
2. Fetch WESTATES_SYSTEM_OVERVIEW.md
3. Fetch EditJobModal.jsx from GitHub
4. Design: Add custom.weatherConditions field
5. Implement: Update modal with new field
6. Test: Create/edit jobs with weather data
7. Update MASTER_TRACKING.md:
   - Add to "Completed Features"
   - Add changelog entry
8. Update SYSTEM_OVERVIEW.md:
   - Add to custom fields examples
9. Provide both updated documentation files
```

### **Example 2: Fixing a Bug**

```
User Report: "Multi-job conflicts only showing one date"

Your Workflow:
1. Fetch WESTATES_MASTER_TRACKING.md (check Known Issues)
2. Fetch PayrollReportView.jsx from GitHub
3. Identify root cause
4. Fix the bug
5. Test with multiple dates
6. Update MASTER_TRACKING.md:
   - Remove from "Known Issues"
   - Add to "Completed Features" under bug fixes
   - Add changelog entry
7. No SYSTEM_OVERVIEW.md changes needed (logic unchanged)
8. Provide updated MASTER_TRACKING.md
```

---

## 📞 IMPORTANT NOTES

### **Company Name**
- Correct: **Westates Flagman**
- Incorrect: ~~West States Flagman~~ (no space)

### **Timezone**
All dates and times use **America/Los_Angeles** timezone.

### **Documentation Priority**
Keeping documentation current is **CRITICAL**. Out-of-date docs are worse than no docs.

---

## 🚀 READY TO START

**Before beginning any task:**
1. Read the task request carefully
2. Fetch both documentation files
3. Review relevant sections
4. Fetch component files from GitHub
5. Design solution with Firestore optimization in mind
6. Implement with all 8 deliverables
7. **Update documentation files**
8. Provide complete updated docs with change summary

---

**Westates Flagman Web App** · Claude Project Instructions · **Keep Documentation Current**
