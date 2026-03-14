import { initializeApp, getApps } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBpJbIDm5dQ6b_kEh8mcEzim2nvcOB9VSA",
  authDomain: "fundflow-d43c2.firebaseapp.com",
  projectId: "fundflow-d43c2",
  storageBucket: "fundflow-d43c2.firebasestorage.app",
  messagingSenderId: "895026787248",
  appId: "1:895026787248:web:d39fee084e29e004b4dc75",
  databaseURL: "https://fundflow-d43c2-default-rtdb.firebaseio.com/"
};

// Validate Firebase configuration
if (!firebaseConfig.projectId || !firebaseConfig.databaseURL) {
  console.error('Firebase configuration error:', {
    projectId: firebaseConfig.projectId,
    databaseURL: firebaseConfig.databaseURL,
    apiKey: firebaseConfig.apiKey ? '***' : 'missing'
  })
  throw new Error('Firebase configuration is incomplete. Check your .env.local file.')
}

// Initialize Firebase (avoid duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize Realtime Database with explicit URL
export const db = getDatabase(app, firebaseConfig.databaseURL)
