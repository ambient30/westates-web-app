import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAwhDiitEWjL6XJtlv501uYID7LqyBa4ts",
  authDomain: "westates-job-system.firebaseapp.com",
  projectId: "westates-job-system",
  storageBucket: "westates-job-system.firebasestorage.app",
  messagingSenderId: "1016944791181",
  appId: "1:1016944791181:web:945173d30394d13264dcc4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);