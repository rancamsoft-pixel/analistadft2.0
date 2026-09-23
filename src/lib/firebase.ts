import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { env } from './env';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(env.firebase);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn('ℹ️ Firebase inicializado en modo simulado/offline:', error);
}

export { app, auth, db };
