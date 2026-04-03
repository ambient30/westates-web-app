/**
 * Firebase Cloud Function - Daily Usage Reset
 * 
 * Runs every day at midnight Pacific time
 * Resets the Firebase usage counters to 0
 * 
 * Uses Firebase Functions v2 (required for scheduled functions)
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// Reset usage counters at midnight Pacific time
exports.resetDailyUsage = onSchedule({
  schedule: '0 0 * * *', // Every day at midnight
  timeZone: 'America/Los_Angeles',
  region: 'us-central1'
}, async (event) => {
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');

  try {
    // Reset counters to 0 for the new day
    await db.collection('settings').doc('firebaseUsage').set({
      reads: 0,
      writes: 0,
      deletes: 0,
      lastUpdated: today,
      lastReset: FieldValue.serverTimestamp(),
      alertThresholds: {
        caution: 50,
        warning: 75,
        critical: 90
      }
    }, { merge: true });

    console.log(`✅ Usage counters reset for ${today}`);
    return null;
  } catch (error) {
    console.error('❌ Error resetting usage counters:', error);
    throw error;
  }
});

// Manual reset function (for testing)
// This function is publicly accessible for manual resets
exports.manualResetUsage = onRequest({
  region: 'us-central1',
  cors: true,
  invoker: 'public'  // Allow unauthenticated access
}, async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');

  try {
    await db.collection('settings').doc('firebaseUsage').set({
      reads: 0,
      writes: 0,
      deletes: 0,
      lastUpdated: today,
      lastReset: FieldValue.serverTimestamp(),
      alertThresholds: {
        caution: 50,
        warning: 75,
        critical: 90
      }
    }, { merge: true });

    res.send(`✅ Usage counters manually reset for ${today}`);
  } catch (error) {
    console.error('❌ Error resetting usage counters:', error);
    res.status(500).send('Error resetting counters: ' + error.message);
  }
});
