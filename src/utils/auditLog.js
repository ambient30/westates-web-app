import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Log an action to the audit trail
 * @param {string} action - Action performed (CREATE_JOB, UPDATE_EMPLOYEE, etc.)
 * @param {string} collection - Collection affected
 * @param {string} documentId - Document ID affected
 * @param {object} changes - What changed (optional)
 */
export async function logAudit(action, collectionName, documentId, changes = null) {
  try {
    const logEntry = {
      action,
      collection: collectionName,
      documentId,
      userId: auth.currentUser?.uid || 'unknown',
      userEmail: auth.currentUser?.email || 'unknown',
      timestamp: new Date(),
      changes: changes || null
    };

    await addDoc(collection(db, 'auditLog'), logEntry);
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw - audit logging failures shouldn't break the app
  }
}