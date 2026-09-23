export interface ClientEnv {
  useMockData: boolean;
  apiBaseUrl: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export const env: ClientEnv = {
  useMockData: import.meta.env.VITE_APP_USE_MOCK_DATA !== 'false',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef'
  }
};

// Verificación de seguridad en desarrollo: asegurarse de que no haya claves privadas en el bundle cliente
if (typeof window !== 'undefined') {
  const forbiddenKeys = ['GEMINI_API_KEY', 'API_FOOTBALL_KEY', 'THE_ODDS_API_KEY', 'NEWS_API_KEY'];
  for (const key of forbiddenKeys) {
    if (key in import.meta.env) {
      console.error(`[SEGURIDAD CRÍTICA] La variable secreta ${key} no debe incluirse con prefijo VITE_ ni exponerse en el cliente.`);
    }
  }
}
