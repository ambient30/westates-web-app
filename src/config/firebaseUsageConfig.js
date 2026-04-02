/**
 * Firebase Usage Configuration
 * 
 * Update these numbers daily/weekly by checking Firebase Console
 * Location: Firebase Console → Project Overview → Usage tab
 * 
 * HOW TO UPDATE:
 * 1. Go to https://console.firebase.google.com
 * 2. Select your project
 * 3. Click "Usage" in left sidebar (or Usage tab)
 * 4. Copy today's numbers from the graphs
 * 5. Paste them below in the "current" object
 * 6. Update "lastUpdated" to today's date
 * 7. Save this file
 * 8. Refresh your app
 */

export const FIREBASE_USAGE_CONFIG = {
  // Current day's usage (update these manually from Firebase Console)
  current: {
    reads: 7200,        // ← Update this from Firebase Console
    writes: 35,         // ← Update this from Firebase Console
    deletes: 0,         // ← Update this from Firebase Console
    lastUpdated: '4/2/2026'  // ← Update this to today's date
  },

  // Alert thresholds (customize these percentages)
  alertThresholds: {
    caution: 50,   // Yellow alert when usage reaches 50% of limit
    warning: 75,   // Orange alert when usage reaches 75% of limit
    critical: 90   // Red alert when usage reaches 90% of limit
  },

  // Daily limits (Spark free tier - DO NOT CHANGE unless you upgrade)
  limits: {
    reads: 50000,
    writes: 20000,
    deletes: 20000
  }
};

/**
 * EXAMPLE UPDATES:
 * 
 * Day 1 (April 2, 2026):
 * current: { reads: 7200, writes: 35, deletes: 0, lastUpdated: '4/2/2026' }
 * 
 * Day 2 (April 3, 2026):
 * current: { reads: 8100, writes: 42, deletes: 0, lastUpdated: '4/3/2026' }
 * 
 * Day 3 (April 4, 2026):
 * current: { reads: 6800, writes: 38, deletes: 0, lastUpdated: '4/4/2026' }
 */
