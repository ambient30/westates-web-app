# WESTATES FLAGMAN WEB APP - MASTER TRACKING DOCUMENT

**Last Updated:** March 31, 2026  
**Project Status:** Active Development  
**Current Phase:** Feature Polish & SMS Integration

---

## 🎯 PROJECT GOALS

### **Primary Goals**
- [ ] Complete SMS dispatch integration with ClickSend
- [ ] Finalize CSV export formatting (Paychex/QuickBooks)
- [ ] Production-ready system for daily operations
- [ ] Stay within Firebase free tier limits

### **Secondary Goals**
- [ ] Data validation and warnings
- [ ] Job cost analysis (profit margins)
- [ ] Improved prevailing wage display
- [ ] Mobile-responsive design improvements

---

## ✅ COMPLETED FEATURES

### **Core System (v1.0)**
- ✅ Job management (create, edit, dispatch, complete)
- ✅ Employee management with full fields
- ✅ Contractor management
- ✅ Rate card system
- ✅ Time entry system
- ✅ Authentication and permissions

### **Payroll System**
- ✅ Regular/OT/holiday hour calculations
- ✅ Travel time pay calculations
- ✅ Daily minimum enforcement
- ✅ **Multi-job daily minimum conflict detection**
- ✅ **Conflict resolution modal (all conflicts in one window)**
- ✅ Prevailing wage support with fringe
- ✅ Sign stipend tracking
- ✅ CSV export

### **Invoicing System**
- ✅ Client billing calculations
- ✅ **Per-flagger travel/mileage billing (NOT summed)**
- ✅ **EPUD rate detection from rate card (not billing field)**
- ✅ Prevailing wage exception (no travel/mileage)
- ✅ Job series grouping
- ✅ CSV export

### **Bug Fixes**
- ✅ Fixed: Invoicing travel calculation (was summing, now per-flagger)
- ✅ Fixed: Duplicate isEPUD declaration
- ✅ Fixed: EPUD detection using rate card instead of billing field
- ✅ Fixed: Multi-job conflict modal only showing one date
- ✅ Fixed: Conflict detection now checks individual jobs, not daily totals
- ✅ Fixed: Time entry display persistence
- ✅ Fixed: Dispatch conflict warning

---

## 🚧 IN PROGRESS

### **Priority 1: SMS Dispatch Integration**
**Status:** Design complete, implementation pending  
**Dependencies:** ClickSend account setup  

**Components to Create/Modify:**
- [ ] Cloud Functions (3 functions)
  - [ ] sendDispatchSMS - sends initial dispatch
  - [ ] scheduledClockPrompts - sends clock in/out reminder
  - [ ] handleInboundSMS - webhook for CONFIRM/IN/OUT replies
- [ ] DispatchFlaggersModal.jsx - add "Send Dispatch SMS" button
- [ ] TimeEntryView.jsx - show SMS clock data, pre-fill hours
- [ ] JobCard.jsx - display SMS status indicators

**New Firestore Fields Required:**
```javascript
jobs collection:
  dispatchSMSSent: false,
  dispatchSentAt: null,
  workerConfirmed: false,
  confirmedAt: null,
  clockPromptSent: false,
  clockPromptSentAt: null,
  smsClockData: {
    "Employee Name": {
      clockInAt: null,
      clockOutAt: null,
      hoursWorked: 0
    }
  },
  smsStatus: 'pending'
```

**SMS Flow:**
1. Dispatch → Send SMS with job details
2. Worker replies "CONFIRM" → Record confirmation
3. 1 hour before → Send "Reply IN to clock in and OUT when done"
4. Worker replies "IN" → Record clock-in time
5. Worker replies "OUT" → Record clock-out, calculate hours
6. System pre-fills time entry with SMS data

**Cost Estimate:** ~$0.09 per worker per job (~$18/month for 100 jobs)

---

## 📋 BACKLOG

### **Priority 2: Export Formatting**
**Status:** Pending user requirements  

- [ ] **F4: Payroll CSV for Paychex**
  - Need format specification
  - Options: Basic / Detailed / With dates
  - Current export works for manual entry
  
- [ ] **F5: Invoicing CSV for QuickBooks**
  - Need format specification  
  - Options: Invoice import / Sales receipt / Current format
  - Current export works for manual entry

**Questions:**
- What specific column headers does Paychex need?
- What specific column headers does QuickBooks need?
- Should we add separate export buttons or update existing?

---

### **Priority 3: Data Validation**
**Status:** Not started  

- [ ] **F7a: Hour validation**
  - Warn if hours > 16 in a single day
  - Warn if hours < 1
  - Warn if travel time seems unreasonable
  
- [ ] **F7b: Field validation**
  - Warn if missing required fields
  - Highlight incomplete jobs
  - Check for duplicate job IDs
  
- [ ] **F7c: Bulk operation safety**
  - Confirm before operations touching > 100 records
  - Show preview of changes
  - Add undo capability

---

### **Priority 4: Display Improvements**
**Status:** Not started  

- [ ] **F6: Prevailing Wage Display**
  - Show fringe on separate line in payroll display
  - Current: calculates correctly but displays combined
  - Target: match typical payroll stub format
  
- [ ] **F8: Job Cost Analysis**
  - Show profit margin per job
  - Formula: (invoice amount - payroll cost)
  - Display in job cards or new report view
  - Color coding: green (profit), red (loss), yellow (break-even)

---

### **Nice-to-Have Features**
**Status:** Future consideration  

- [ ] Mobile app for flaggers (clock in/out)
- [ ] Calendar view for job scheduling
- [ ] Advanced reporting (weekly summaries, trends)
- [ ] Automated reminders (certifications expiring, etc.)
- [ ] GPS tracking integration
- [ ] Photo upload for job documentation
- [ ] Equipment tracking system
- [ ] Client portal for invoice viewing

---

## 🐛 KNOWN ISSUES

### **Critical (Must Fix)**
*None currently*

### **High Priority**
*None currently*

### **Medium Priority**
*None currently*

### **Low Priority / Cosmetic**
- [ ] Loading states could be more polished
- [ ] Some modals could use better mobile responsive design
- [ ] Success/error messages could be more descriptive

---

## 💡 FEATURE REQUESTS

### **From Users**
*Track user-requested features here*

- [ ] Request 1: [Description] - Requested by [Name] on [Date]
- [ ] Request 2: [Description] - Requested by [Name] on [Date]

### **From System Testing**
*Track features discovered during testing*

- [ ] Feature 1: [Description] - Discovered [Date]
- [ ] Feature 2: [Description] - Discovered [Date]

---

## 🔧 TECHNICAL DEBT

### **Code Quality**
- [ ] Add PropTypes or TypeScript
- [ ] Improve error handling consistency
- [ ] Add unit tests for calculation functions
- [ ] Document complex functions with JSDoc
- [ ] Refactor large components (PayrollReportView, InvoicingReportView)

### **Performance**
- [ ] Optimize Firestore queries (currently batching reads well)
- [ ] Add caching for rate cards (frequently accessed)
- [ ] Lazy load modal components
- [ ] Optimize re-renders in lists

### **Security**
- [ ] Review Firestore security rules
- [ ] Add rate limiting for sensitive operations
- [ ] Audit user permissions thoroughly
- [ ] Add session timeout

---

## 📝 BUSINESS RULES REFERENCE

### **Travel & Mileage**
```
Regular Jobs:
  Travel Time: (roundtrip minutes / 60) - 1 hour
              Only bill/pay if ≥ 1 hour after subtraction
  Mileage: roundtrip miles
           Only bill if ≥ 60 miles
           
EPUD Exception:
  Bill travel/mileage regardless of thresholds
  Employee pay still uses thresholds
  
Prevailing Wage Exception:
  NO travel time or mileage billed
  NO travel time paid to employees
```

### **Overtime Triggers**
```
Priority order (only one applies):
1. Holiday → 2× regular rate (not 1.5×)
2. Weekend or Night → All hours at OT rate (1.5×)
3. Regular day → Hours after otStarts (default 8) at OT rate

Holidays (2026):
- New Year's Day: 01/01/2026
- Memorial Day: 05/25/2026
- Independence Day: 07/04/2026
- Labor Day: 09/07/2026
- Thanksgiving: 11/26/2026
- Christmas: 12/25/2026
```

### **Daily Minimum**
```
Conflict Detection:
  Check if employee has multiple jobs on same day
  Conflict = ANY individual job < minimum hours
  Show ALL conflicts across ALL dates in ONE modal
  
Resolution Options:
  1. Combine - Pay minimum once for total hours
  2. Each - Pay minimum for each job separately  
  3. Select - Choose which jobs get minimum
```

### **Invoicing Calculations**
```
CRITICAL: Travel and mileage calculated PER FLAGGER

Example:
  Employee A: 120 min travel = 2 hrs - 1 = 1 hr × $40 = $40
  Employee B: 120 min travel = 2 hrs - 1 = 1 hr × $40 = $40
  Total: $80 (NOT $120 from summing 240 min)
```

---

## 🔍 TESTING SCENARIOS

### **Regression Test Suite**
Run these tests before any deployment:

**Payroll Tests:**
- [ ] P1: Regular day (8 hrs, no OT)
- [ ] P2: Hour-based OT (10 hrs = 8 reg + 2 OT)
- [ ] P3: Weekend OT (all hours at OT rate)
- [ ] P4: Daily minimum (3 hrs → pay 4 hrs)
- [ ] P10: Night OT (all hours at OT rate)
- [ ] P11: Holiday (all hours at 2× rate)
- [ ] P12: Prevailing wage with fringe
- [ ] P13: Multi-date conflicts (2 dates with conflicts)
- [ ] P14: Multi-job no conflict (all jobs > minimum)
- [ ] P15: Multi-job mixed (one above, one below minimum)

**Invoicing Tests:**
- [ ] I1: Regular billing
- [ ] I2: OT billing
- [ ] I3: Multi-flagger travel (verify per-flagger calc)
- [ ] I4: EPUD billing (verify no thresholds)

**Dispatch Tests:**
- [ ] D1: Assign single employee to job
- [ ] D2: Assign multiple employees to job
- [ ] D3: Conflict detection (same employee, same day)
- [ ] D4: Dispatch multiple jobs to same employee

---

## 📊 FIREBASE USAGE TRACKING

### **Current Estimates**
Based on typical daily usage:

**Reads:**
- Job list loads: ~50 jobs × 10 views/day = 500 reads
- Employee list loads: ~30 employees × 5 views/day = 150 reads
- Rate card loads: ~10 rates × 20 views/day = 200 reads
- Report generation: ~100 jobs × 2 reports/day = 200 reads
**Daily Total: ~1,050 reads (2% of limit)**

**Writes:**
- New jobs: ~5 jobs/day = 5 writes
- Job updates: ~20 updates/day = 20 writes
- Time entries: ~10 jobs/day = 10 writes
- Employee updates: ~2 updates/day = 2 writes
**Daily Total: ~37 writes (<1% of limit)**

**Safety Margin: Excellent** ✅  
Well within free tier limits with room for 10× growth

---

## 🗓️ CHANGELOG

### **March 31, 2026**
- ✅ Fixed invoicing travel calculation (per-flagger instead of summed)
- ✅ Fixed multi-job conflict detection (now checks individual jobs)
- ✅ Fixed conflict modal to show all dates in one window
- ✅ Updated EPUD detection to use rate card name
- ✅ Removed duplicate isEPUD declarations
- ✅ Created system overview documentation
- ✅ Created master tracking document

### **March 30, 2026**
- ✅ Added employee management fields (full set)
- ✅ Added time entry system (actualTravelTime/Miles)
- ✅ Fixed time entry display persistence
- ✅ Added dispatch conflict warning
- ✅ Created DailyMinimumModal component

### **Earlier**
- ✅ Initial system development
- ✅ Core job management
- ✅ Payroll calculations
- ✅ Invoicing system
- ✅ Rate card management

---

## 📞 CONTACTS & RESOURCES

### **Development Team**
- Project Owner: [Name]
- Developer: [Name]
- Contact: [Email/Phone]

### **External Services**
- **Firebase Console:** https://console.firebase.google.com
- **GitHub Repository:** https://github.com/ambient30/westates-web-app
- **ClickSend Dashboard:** https://dashboard.clicksend.com (pending setup)

### **Documentation**
- Project Context: `/mnt/project/westates_project_context.docx`
- System Overview: `WESTATES_SYSTEM_OVERVIEW.md`
- This Document: `WESTATES_MASTER_TRACKING.md`

---

## 🎬 NEXT STEPS

### **Immediate (This Week)**
1. [ ] Decide on SMS dispatch implementation timeline
2. [ ] Get ClickSend account credentials
3. [ ] Determine CSV export format requirements

### **Short Term (Next 2 Weeks)**
1. [ ] Implement SMS dispatch system
2. [ ] Update CSV exports for Paychex/QuickBooks
3. [ ] Add basic data validation

### **Medium Term (Next Month)**
1. [ ] Job cost analysis feature
2. [ ] Prevailing wage display improvements
3. [ ] Comprehensive testing with real data

### **Long Term (Next Quarter)**
1. [ ] Mobile optimization
2. [ ] Advanced reporting
3. [ ] Performance optimizations

---

## 📌 IMPORTANT NOTES

### **Critical Reminders**
- ⚠️ NEVER enable Firebase billing - stay on Spark (free) plan
- ⚠️ Always batch reads - load once, process in memory
- ⚠️ Always combine writes - one updateJob() call, not multiple
- ⚠️ Use custom: {} for flexible fields - don't add schema fields
- ⚠️ Travel/mileage calculated PER FLAGGER in invoicing

### **Deployment Checklist**
Before deploying any changes:
- [ ] Run full regression test suite
- [ ] Check Firebase usage (should be <10% of limits)
- [ ] Update this tracking document
- [ ] Commit to GitHub with descriptive message
- [ ] Test in production with real user
- [ ] Monitor for errors in first 24 hours

### **Support Information**
- Firebase limits: 50K reads, 20K writes/day
- Timezone: America/Los_Angeles (all dates/times)
- Current users: ~5-10 active users
- Peak usage: Monday mornings (job creation/dispatch)

---

**END OF TRACKING DOCUMENT**  
*Keep this document updated with every change, bug, or feature request*
