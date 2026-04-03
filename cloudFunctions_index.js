/**
 * Firebase Cloud Function - Daily Usage Reset
 * 
 * Runs every day at midnight Pacific time
 * Resets the Firebase usage counters to 0
 * 
 * SETUP:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Run: firebase init functions
 * 3. Copy this file to: functions/index.js
 * 4. Run: firebase deploy --only functions
 * 
 * COST: FREE (under 2M invocations/month)
 * - Runs once per day = 30 times/month
 * - Well under free tier limit
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Reset usage counters at midnight Pacific time
exports.resetDailyUsage = functions.pubsub
  .schedule('0 0 * * *') // Every day at midnight
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    const today = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');

    try {
      // Reset counters to 0 for the new day
      await admin.firestore().collection('settings').doc('firebaseUsage').set({
        reads: 0,
        writes: 0,
        deletes: 0,
        lastUpdated: today,
        lastReset: admin.firestore.FieldValue.serverTimestamp(),
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
      return null;
    }
  });

// Optional: Manual reset function (for testing)
exports.manualResetUsage = functions.https.onRequest(async (req, res) => {
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');

  try {
    await admin.firestore().collection('settings').doc('firebaseUsage').set({
      reads: 0,
      writes: 0,
      deletes: 0,
      lastUpdated: today,
      lastReset: admin.firestore.FieldValue.serverTimestamp(),
      alertThresholds: {
        caution: 50,
        warning: 75,
        critical: 90
      }
    }, { merge: true });

    res.send(`✅ Usage counters manually reset for ${today}`);
  } catch (error) {
    console.error('❌ Error resetting usage counters:', error);
    res.status(500).send('Error resetting counters');
  }
});
