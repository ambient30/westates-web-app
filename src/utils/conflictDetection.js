import { getDoc, doc } from './firestoreTracker';
import { db } from '../firebase';

/**
 * Check if a job has been modified since it was loaded
 * Returns { hasConflict: boolean, currentData: object, conflicts: array }
 */
export const checkJobConflicts = async (jobId, originalData) => {
  try {
    // Get current version from Firestore
    const currentDoc = await getDoc(doc(db, 'jobs', jobId));
    
    if (!currentDoc.exists()) {
      return {
        hasConflict: true,
        error: 'Job no longer exists',
        currentData: null,
        conflicts: ['Job was deleted']
      };
    }
    
    const currentData = currentDoc.data();
    const conflicts = [];
    
    // Check critical fields for changes
    const criticalFields = [
      'assignedFlaggers',
      'dispatchedFlaggers',
      'equipmentCarrier',
      'amountOfFlaggers',
      'initialJobDate',
      'initialJobTime',
      'location',
      'billing'
    ];
    
    criticalFields.forEach(field => {
      if (JSON.stringify(originalData[field]) !== JSON.stringify(currentData[field])) {
        conflicts.push({
          field,
          original: originalData[field],
          current: currentData[field]
        });
      }
    });
    
    return {
      hasConflict: conflicts.length > 0,
      currentData,
      conflicts
    };
    
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return {
      hasConflict: false,
      error: error.message,
      currentData: null,
      conflicts: []
    };
  }
};

/**
 * Format conflicts into a user-friendly message
 */
export const formatConflictMessage = (conflicts) => {
  if (conflicts.length === 0) return '';
  
  const messages = conflicts.map(c => {
    const fieldName = c.field.replace(/([A-Z])/g, ' $1').trim();
    return `• ${fieldName}: changed from "${c.original || 'empty'}" to "${c.current || 'empty'}"`;
  });
  
  return `⚠️ This job was modified by another user:\n\n${messages.join('\n')}\n\nPlease review the changes before saving.`;
};

/**
 * Show conflict dialog and let user decide
 * Returns true if user wants to proceed, false if they want to cancel
 */
export const showConflictDialog = (conflicts) => {
  const message = formatConflictMessage(conflicts);
  return window.confirm(
    `${message}\n\nDo you want to OVERWRITE these changes with your version?\n\nClick OK to overwrite, Cancel to review.`
  );
};
