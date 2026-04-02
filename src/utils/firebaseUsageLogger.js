import { doc, updateDoc, setDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get today's date in a Firestore-safe format (no slashes)
 * Format: YYYY-MM-DD (e.g., "2026-04-02")
 */
const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Logs Firebase operations to track daily usage
 * Call this after any Firestore read, write, or delete operation
 */
export const logFirestoreOperation = async (type, count = 1) => {
  try {
    const today = getTodayKey();
    const usageRef = doc(db, 'firebaseUsage', today);
    
    // Check if document exists
    const usageDoc = await getDoc(usageRef);
    
    if (usageDoc.exists()) {
      // Update existing document
      await updateDoc(usageRef, {
        [type]: increment(count)
      });
    } else {
      // Create new document for today
      await setDoc(usageRef, {
        reads: type === 'reads' ? count : 0,
        writes: type === 'writes' ? count : 0,
        deletes: type === 'deletes' ? count : 0,
        lastReset: today
      });
    }
  } catch (err) {
    // Silently fail - don't break app if logging fails
    console.error('Error logging Firebase operation:', err);
  }
};

/**
 * Log multiple operations at once
 */
export const logFirestoreOperations = async (operations) => {
  try {
    const today = getTodayKey();
    const usageRef = doc(db, 'firebaseUsage', today);
    
    const usageDoc = await getDoc(usageRef);
    
    if (usageDoc.exists()) {
      const updates = {};
      for (const [type, count] of Object.entries(operations)) {
        if (count > 0) {
          updates[type] = increment(count);
        }
      }
      await updateDoc(usageRef, updates);
    } else {
      await setDoc(usageRef, {
        reads: operations.reads || 0,
        writes: operations.writes || 0,
        deletes: operations.deletes || 0,
        lastReset: today
      });
    }
  } catch (err) {
    console.error('Error logging Firebase operations:', err);
  }
};

/**
 * Check if we're approaching limits and should show warnings
 */
export const checkUsageLimits = async () => {
  try {
    const today = getTodayKey();
    const usageDoc = await getDoc(doc(db, 'firebaseUsage', today));
    
    if (!usageDoc.exists()) {
      return { safe: true };
    }
    
    const usage = usageDoc.data();
    const LIMITS = {
      reads: 50000,
      writes: 20000,
      deletes: 20000
    };
    
    const warnings = [];
    
    if (usage.reads / LIMITS.reads >= 0.9) {
      warnings.push(`CRITICAL: Reads at ${((usage.reads / LIMITS.reads) * 100).toFixed(1)}%`);
    } else if (usage.reads / LIMITS.reads >= 0.75) {
      warnings.push(`WARNING: Reads at ${((usage.reads / LIMITS.reads) * 100).toFixed(1)}%`);
    }
    
    if (usage.writes / LIMITS.writes >= 0.9) {
      warnings.push(`CRITICAL: Writes at ${((usage.writes / LIMITS.writes) * 100).toFixed(1)}%`);
    } else if (usage.writes / LIMITS.writes >= 0.75) {
      warnings.push(`WARNING: Writes at ${((usage.writes / LIMITS.writes) * 100).toFixed(1)}%`);
    }
    
    if (usage.deletes / LIMITS.deletes >= 0.9) {
      warnings.push(`CRITICAL: Deletes at ${((usage.deletes / LIMITS.deletes) * 100).toFixed(1)}%`);
    } else if (usage.deletes / LIMITS.deletes >= 0.75) {
      warnings.push(`WARNING: Deletes at ${((usage.deletes / LIMITS.deletes) * 100).toFixed(1)}%`);
    }
    
    return {
      safe: warnings.length === 0,
      warnings,
      usage
    };
  } catch (err) {
    console.error('Error checking usage limits:', err);
    return { safe: true };
  }
};
