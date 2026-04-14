// Google Drive Picker Utility
// Allows users to select files from their Google Drive

let pickerApiLoaded = false;
let gapiLoaded = false;

// Load Google APIs
export const loadGoogleAPIs = () => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.google && window.google.picker && window.gapi) {
      resolve();
      return;
    }

    // Load Google API script
    if (!document.getElementById('google-api-script')) {
      const script = document.createElement('script');
      script.id = 'google-api-script';
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:picker', () => {
          gapiLoaded = true;
          if (pickerApiLoaded) resolve();
        });
      };
      document.body.appendChild(script);
    }

    // Load Google Picker script
    if (!document.getElementById('google-picker-script')) {
      const pickerScript = document.createElement('script');
      pickerScript.id = 'google-picker-script';
      pickerScript.src = 'https://apis.google.com/js/api.js?onload=onPickerApiLoad';
      pickerScript.onload = () => {
        pickerApiLoaded = true;
        if (gapiLoaded) resolve();
      };
      document.body.appendChild(pickerScript);
    }
  });
};

// Open Google Drive Picker
export const openDrivePicker = (accessToken, callback) => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!apiKey || !clientId) {
    console.error('Missing Google API credentials. Check your .env file.');
    alert('Google Drive is not configured. Please contact your administrator.');
    return;
  }

  // Create picker
  const picker = new window.google.picker.PickerBuilder()
    .addView(window.google.picker.ViewId.DOCS)
    .addView(window.google.picker.ViewId.DOCS_IMAGES)
    .addView(window.google.picker.ViewId.DOCS_VIDEOS)
    .setOAuthToken(accessToken)
    .setDeveloperKey(apiKey)
    .setCallback((data) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const file = data.docs[0];
        callback({
          id: file.id,
          name: file.name,
          url: file.url,
          mimeType: file.mimeType,
          iconUrl: file.iconUrl,
          sizeBytes: file.sizeBytes,
        });
      }
    })
    .build();

  picker.setVisible(true);
};

// Get Google OAuth token
export const getGoogleOAuthToken = async () => {
  try {
    const auth = window.gapi.auth2.getAuthInstance();
    if (!auth) {
      // Initialize auth
      await window.gapi.auth2.init({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
      });
      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      return user.getAuthResponse().access_token;
    } else {
      const user = auth.currentUser.get();
      if (!user.isSignedIn()) {
        await auth.signIn();
      }
      return user.getAuthResponse().access_token;
    }
  } catch (error) {
    console.error('Error getting OAuth token:', error);
    throw error;
  }
};

// Helper: Format file size
export const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Helper: Get file icon based on mime type
export const getFileIcon = (mimeType) => {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('video')) return '🎥';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
  return '📄';
};
