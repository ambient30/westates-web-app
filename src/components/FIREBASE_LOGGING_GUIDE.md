# FIREBASE USAGE LOGGING - IMPLEMENTATION GUIDE

## How to Add Logging to Existing Components

### Step 1: Import the logger
```javascript
import { logFirestoreOperation, logFirestoreOperations } from '../utils/firebaseUsageLogger';
```

### Step 2: Log operations after Firestore calls

#### Example 1: Single Read Operation
```javascript
// BEFORE
const loadJobs = async () => {
  try {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, 'jobs'));
    const jobsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setJobs(jobsData);
  } catch (err) {
    console.error('Error loading jobs:', err);
  } finally {
    setLoading(false);
  }
};

// AFTER
const loadJobs = async () => {
  try {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, 'jobs'));
    await logFirestoreOperation('reads', querySnapshot.docs.length); // LOG READS
    
    const jobsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setJobs(jobsData);
  } catch (err) {
    console.error('Error loading jobs:', err);
  } finally {
    setLoading(false);
  }
};
```

#### Example 2: Single Write Operation
```javascript
// BEFORE
const createJob = async (jobData) => {
  await setDoc(doc(db, 'jobs', jobData.jobID), jobData);
};

// AFTER
const createJob = async (jobData) => {
  await setDoc(doc(db, 'jobs', jobData.jobID), jobData);
  await logFirestoreOperation('writes', 1); // LOG WRITE
};
```

#### Example 3: Update Operation
```javascript
// BEFORE
const updateJob = async (jobId, updates) => {
  await updateDoc(doc(db, 'jobs', jobId), updates);
};

// AFTER
const updateJob = async (jobId, updates) => {
  await updateDoc(doc(db, 'jobs', jobId), updates);
  await logFirestoreOperation('writes', 1); // LOG WRITE
};
```

#### Example 4: Delete Operation
```javascript
// BEFORE
const deleteJob = async (jobId) => {
  await deleteDoc(doc(db, 'jobs', jobId));
};

// AFTER
const deleteJob = async (jobId) => {
  await deleteDoc(doc(db, 'jobs', jobId));
  await logFirestoreOperation('deletes', 1); // LOG DELETE
};
```

#### Example 5: Multiple Operations
```javascript
// BEFORE
const loadAllData = async () => {
  const jobsSnap = await getDocs(collection(db, 'jobs'));
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const ratesSnap = await getDocs(collection(db, 'rates'));
};

// AFTER
const loadAllData = async () => {
  const jobsSnap = await getDocs(collection(db, 'jobs'));
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const ratesSnap = await getDocs(collection(db, 'rates'));
  
  // Log all reads at once
  await logFirestoreOperations({
    reads: jobsSnap.docs.length + employeesSnap.docs.length + ratesSnap.docs.length,
    writes: 0,
    deletes: 0
  });
};
```

#### Example 6: Batch Operations
```javascript
// BEFORE
const batchUpdateJobs = async (jobIds, updates) => {
  for (const jobId of jobIds) {
    await updateDoc(doc(db, 'jobs', jobId), updates);
  }
};

// AFTER
const batchUpdateJobs = async (jobIds, updates) => {
  for (const jobId of jobIds) {
    await updateDoc(doc(db, 'jobs', jobId), updates);
  }
  // Log all writes after loop completes
  await logFirestoreOperation('writes', jobIds.length);
};
```

## Priority Files to Update

### High Priority (Heavy Usage):
1. **JobsList.jsx** - loads all jobs (50+ reads)
2. **EmployeesList.jsx** - loads all employees (30+ reads)
3. **PayrollReportView.jsx** - loads jobs + employees (80+ reads)
4. **InvoicingReportView.jsx** - loads jobs + rates (60+ reads)
5. **TimeEntryView.jsx** - loads jobs (50+ reads)

### Medium Priority (Moderate Usage):
6. **CreateJobModal.jsx** - writes (1 write per job)
7. **EditJobModal.jsx** - writes (1 write per update)
8. **DispatchFlaggersModal.jsx** - writes (1 write per dispatch)
9. **RatesManager.jsx** - reads + writes
10. **ContractorsList.jsx** - reads

### Lower Priority (Light Usage):
- All other modals and utility functions

## Example: Updated JobsList.jsx (partial)

```javascript
import { logFirestoreOperation } from '../utils/firebaseUsageLogger';

// ... existing imports ...

function JobsList({ permissions }) {
  // ... existing state ...

  const loadJobs = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'jobs'));
      
      // LOG THE READS
      await logFirestoreOperation('reads', querySnapshot.docs.length);
      
      const jobsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component ...
}
```

## Firestore Structure

The usage data is stored in a new collection:

```
firebaseUsage/
  {date}/  // e.g., "3/31/2026"
    reads: 1234
    writes: 56
    deletes: 0
    lastReset: "3/31/2026"
```

Each day gets its own document. The tracker automatically resets daily.

## Important Notes

1. **Don't log the logging operations** - The logger already accounts for its own reads/writes
2. **Count carefully** - For getDocs(), count the docs returned, not just "1"
3. **Batch logs when possible** - Use logFirestoreOperations() for multiple types
4. **Error handling** - The logger fails silently to not break your app
5. **Performance** - Logging adds ~100ms to operations (writes to Firestore)

## Automatic Warnings

The tracker shows color-coded warnings:
- **Green (< 50%)**: Safe
- **Yellow (50-75%)**: Caution
- **Orange (75-90%)**: Warning
- **Red (90%+)**: Critical

Refreshes automatically every 30 seconds.
