import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../../types/domain';
import { auth, db } from '../../lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  updateProfile,
  AuthError
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { env } from '../../lib/env';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authError: string | null;
  clearError: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemo: (email?: string, role?: UserRole) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as AuthError).code;
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Correo electrónico o contraseña incorrectos.';
      case 'auth/email-already-in-use':
        return 'Este correo ya se encuentra registrado. Por favor inicia sesión.';
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil. Usa al menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.';
      case 'auth/user-disabled':
        return 'Esta cuenta de usuario ha sido suspendida.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Por favor, espera unos momentos antes de reintentar.';
      default:
        return (error as AuthError).message || 'Error durante la autenticación.';
    }
  }
  return 'Ocurrió un error inesperado al autenticar.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearError = () => setAuthError(null);

  useEffect(() => {
    // 1. Revisar sesión local persistida si estamos en modo mock o emulador
    const savedUser = localStorage.getItem('bet_analyzer_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as AppUser;
        setUser(parsed);
      } catch {
        localStorage.removeItem('bet_analyzer_user');
      }
    }

    // 2. Listener de Firebase Auth en tiempo real
    if (auth) {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            let userRole: UserRole = 'user';
            let active = true;

            // Consultar rol en Firestore si está disponible
            if (db && !env.useMockData) {
              try {
                const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  userRole = (data['role'] as UserRole) || 'user';
                  active = data['active'] !== false;
                }
              } catch (e) {
                console.warn('No se pudo verificar rol en Firestore:', e);
              }
            }

            const appUser: AppUser = {
              id: fbUser.uid,
              email: fbUser.email || 'usuario@betanalyzer.pro',
              displayName: fbUser.displayName || 'Usuario Cuantitativo',
              photoURL: fbUser.photoURL,
              role: userRole,
              active,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            setUser(appUser);
            localStorage.setItem('bet_analyzer_user', JSON.stringify(appUser));
          } else {
            if (!env.useMockData) {
              setUser(null);
              localStorage.removeItem('bet_analyzer_user');
            }
          }
          setLoading(false);
        });
        return () => unsubscribe();
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string): Promise<void> => {
    setLoading(true);
    setAuthError(null);

    if (env.useMockData || !auth) {
      // Login simulado en modo Mock
      await new Promise(r => setTimeout(r, 400));
      const role: UserRole = email.includes('admin') ? 'admin' : 'user';
      const mockUser: AppUser = {
        id: `usr-${Math.random().toString(36).substring(2, 9)}`,
        email,
        displayName: email.split('@')[0] || 'Usuario Pro',
        role,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setUser(mockUser);
      localStorage.setItem('bet_analyzer_user', JSON.stringify(mockUser));
      setLoading(false);
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      let role: UserRole = 'user';
      if (db) {
        try {
          const snap = await getDoc(doc(db, 'users', cred.user.uid));
          if (snap.exists()) {
            role = (snap.data()['role'] as UserRole) || 'user';
          }
        } catch { /* ignore */ }
      }

      const loggedUser: AppUser = {
        id: cred.user.uid,
        email: cred.user.email || email,
        displayName: cred.user.displayName || email.split('@')[0] || 'Usuario Pro',
        photoURL: cred.user.photoURL,
        role,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setUser(loggedUser);
      localStorage.setItem('bet_analyzer_user', JSON.stringify(loggedUser));
    } catch (err) {
      const msg = mapFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, displayName: string): Promise<void> => {
    setLoading(true);
    setAuthError(null);

    if (env.useMockData || !auth) {
      await new Promise(r => setTimeout(r, 500));
      const role: UserRole = email.includes('admin') ? 'admin' : 'user';
      const newUser: AppUser = {
        id: `usr-${Math.random().toString(36).substring(2, 9)}`,
        email,
        displayName,
        role,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setUser(newUser);
      localStorage.setItem('bet_analyzer_user', JSON.stringify(newUser));
      setLoading(false);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName });

      const role: UserRole = 'user';
      const newUserDoc = {
        email,
        displayName,
        photoURL: null,
        role,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (db) {
        try {
          await setDoc(doc(db, 'users', cred.user.uid), newUserDoc);
        } catch (e) {
          console.warn('No se pudo escribir documento en Firestore:', e);
        }
      }

      const registeredUser: AppUser = {
        id: cred.user.uid,
        email,
        displayName,
        role,
        active: true,
        createdAt: newUserDoc.createdAt,
        updatedAt: newUserDoc.updatedAt
      };
      setUser(registeredUser);
      localStorage.setItem('bet_analyzer_user', JSON.stringify(registeredUser));
    } catch (err) {
      const msg = mapFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    setLoading(true);
    setAuthError(null);

    if (env.useMockData || !auth) {
      await new Promise(r => setTimeout(r, 400));
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const msg = mapFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    if (auth) {
      try { await fbSignOut(auth); } catch { /* ignore */ }
    }
    setUser(null);
    localStorage.removeItem('bet_analyzer_user');
  };

  const loginDemo = (email: string = 'analista@betanalyzer.pro', role: UserRole = 'user') => {
    const demoUser: AppUser = {
      id: `demo-${role}-1`,
      email,
      displayName: role === 'admin' ? 'Administrador Sistema' : 'Analista Cuantitativo (Pro)',
      role,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setUser(demoUser);
    localStorage.setItem('bet_analyzer_user', JSON.stringify(demoUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        clearError,
        login,
        register,
        forgotPassword,
        logout,
        loginDemo,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
