import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { env } from '../lib/env';
import {
  GlobalBookmaker,
  GlobalMarket,
  UserNotificationsSettings,
  UserPreferences,
  UserProfileSettings
} from '../types/domain';
import { CLIENT_MOCK_COMPETITIONS } from './mock/fixtures';

// ─── Casas de Apuestas de Colombia (Licencia Coljuegos) ──────────────────────
export const COLOMBIA_BOOKMAKERS: GlobalBookmaker[] = [
  {
    id: 'betplay',
    name: 'BetPlay',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/BetPlay_Logo.svg/200px-BetPlay_Logo.svg.png',
    provider: 'BetPlay',
    providerKey: 'betplay',
    country: 'Colombia',
    active: true,
    category: 'COLOMBIA',
    license: 'COLJUEGOS',
    currency: 'COP',
    website: 'https://betplay.com.co'
  },
  {
    id: 'wplay',
    name: 'Wplay.co',
    logo: 'https://images.unsplash.com/photo-1551958219-acbc595b38a8?w=64&h=64&fit=crop',
    provider: 'Wplay',
    providerKey: 'wplay',
    country: 'Colombia',
    active: true,
    category: 'COLOMBIA',
    license: 'COLJUEGOS',
    currency: 'COP',
    website: 'https://wplay.co'
  },
  {
    id: 'rushbet',
    name: 'Rushbet.co',
    logo: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=64&h=64&fit=crop',
    provider: 'Rushbet',
    providerKey: 'rushbet',
    country: 'Colombia',
    active: true,
    category: 'COLOMBIA',
    license: 'COLJUEGOS',
    currency: 'COP',
    website: 'https://rushbet.co'
  },
  {
    id: 'codere_co',
    name: 'Codere Colombia',
    logo: 'https://images.unsplash.com/photo-1558008258-3256797b43f3?w=64&h=64&fit=crop',
    provider: 'Codere',
    providerKey: 'codere_co',
    country: 'Colombia',
    active: true,
    category: 'COLOMBIA',
    license: 'COLJUEGOS',
    currency: 'COP',
    website: 'https://www.codere.com.co'
  },
  {
    id: 'yajuego',
    name: 'YaJuego',
    logo: 'https://images.unsplash.com/photo-1561414927-6d86591d0c4f?w=64&h=64&fit=crop',
    provider: 'YaJuego',
    providerKey: 'yajuego',
    country: 'Colombia',
    active: true,
    category: 'COLOMBIA',
    license: 'COLJUEGOS',
    currency: 'COP',
    website: 'https://yajuego.co'
  },
  {
    id: 'rivalo',
    name: 'Rivalo Colombia',
    logo: 'https://images.unsplash.com/photo-1554595666-19ceabf46a84?w=64&h=64&fit=crop',
    provider: 'Rivalo',
    providerKey: 'rivalo',
    country: 'Colombia',
    active: true,
    category: 'COLOMBIA',
    license: 'COLJUEGOS',
    currency: 'COP',
    website: 'https://rivalo.co'
  },
  {
    id: 'sportium_co',
    name: 'Sportium Colombia',
    logo: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=64&h=64&fit=crop',
    provider: 'Sportium',
    providerKey: 'sportium_co',
    country: 'Colombia',
    active: true,
    category: 'COLOMBIA',
    license: 'COLJUEGOS',
    currency: 'COP',
    website: 'https://sportium.com.co'
  }
];

// ─── Casas Internacionales ────────────────────────────────────────────────────
export const INTERNATIONAL_BOOKMAKERS: GlobalBookmaker[] = [
  {
    id: 'pinnacle',
    name: 'Pinnacle',
    logo: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=64&h=64&fit=crop',
    provider: 'TheOddsApi',
    providerKey: 'pinnacle',
    country: 'Curazao / Internacional',
    active: true,
    category: 'INTERNATIONAL',
    license: 'INTERNACIONAL',
    currency: 'USD',
    website: 'https://pinnacle.com'
  },
  {
    id: 'bet365',
    name: 'Bet365',
    logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=64&h=64&fit=crop',
    provider: 'TheOddsApi',
    providerKey: 'bet365',
    country: 'Reino Unido / Global',
    active: true,
    category: 'INTERNATIONAL',
    license: 'INTERNACIONAL',
    currency: 'EUR',
    website: 'https://bet365.com'
  },
  {
    id: '1xbet',
    name: '1xBet',
    logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=64&h=64&fit=crop',
    provider: 'TheOddsApi',
    providerKey: '1xbet',
    country: 'Chipre / Global',
    active: true,
    category: 'INTERNATIONAL',
    license: 'INTERNACIONAL',
    currency: 'EUR',
    website: 'https://1xbet.com'
  },
  {
    id: 'betfair',
    name: 'Betfair',
    logo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=64&h=64&fit=crop',
    provider: 'TheOddsApi',
    providerKey: 'betfair',
    country: 'Reino Unido',
    active: true,
    category: 'INTERNATIONAL',
    license: 'INTERNACIONAL',
    currency: 'GBP',
    website: 'https://betfair.com'
  },
  {
    id: 'bwin',
    name: 'Bwin',
    logo: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=64&h=64&fit=crop',
    provider: 'TheOddsApi',
    providerKey: 'bwin',
    country: 'Austria / Global',
    active: true,
    category: 'INTERNATIONAL',
    license: 'INTERNACIONAL',
    currency: 'EUR',
    website: 'https://bwin.com'
  }
];

// ─── Lista completa ───────────────────────────────────────────────────────────
export const GLOBAL_BOOKMAKERS: GlobalBookmaker[] = [
  ...COLOMBIA_BOOKMAKERS,
  ...INTERNATIONAL_BOOKMAKERS
];

export const GLOBAL_MARKETS: GlobalMarket[] = [

  {
    id: 'mkt-1',
    key: '1X2',
    name: 'Resultado Final (1X2)',
    description: 'Ganador Local, Empate o Ganador Visitante',
    active: true
  },
  {
    id: 'mkt-2',
    key: 'double_chance',
    name: 'Doble Oportunidad',
    description: '1X (Local o Empate), 12 (Local o Visita), X2 (Empate o Visita)',
    active: true
  },
  {
    id: 'mkt-3',
    key: 'draw_no_bet',
    name: 'Empate Apuesta No Válida (DNB)',
    description: 'Reembolso total del importe en caso de empate',
    active: true
  },
  {
    id: 'mkt-4',
    key: 'over_under',
    name: 'Totales (Más / Menos de 2.5)',
    description: 'Línea de goles totales del partido',
    active: true
  },
  {
    id: 'mkt-5',
    key: 'both_teams_to_score',
    name: 'Ambos Equipos Anotan (BTTS)',
    description: 'Sí o No anotan ambos contendientes',
    active: true
  },
  {
    id: 'mkt-6',
    key: 'asian_handicap',
    name: 'Hándicap Asiático',
    description: 'Líneas asiáticas con eliminación o reducción del empate',
    active: true
  }
];

export const MAX_ACTIVE_COMPETITIONS = 4; // Permite combinar ligas colombianas y europeas
export const MAX_ACTIVE_BOOKMAKERS = 6;   // Permite múltiples casas colombianas e internacionales

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  activeCompetitionIds: ['CO_LFP', 'PL'], // Liga BetPlay + Premier League por defecto
  activeBookmakerIds: ['betplay', 'wplay', 'pinnacle'], // BetPlay, Wplay + Pinnacle por defecto
  activeMarketKeys: ['1X2', 'over_under'],
  oddsFormat: 'decimal',
  analysisTime: '08:30',
  updatedAt: new Date().toISOString()
};

export class UserSettingsService {
  /**
   * Obtiene las preferencias activas del usuario (máx 4 ligas, máx 6 casas)
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    if (env.useMockData || !db) {
      const local = localStorage.getItem(`bet_prefs_${userId}`);
      if (local) {
        try {
          return JSON.parse(local) as UserPreferences;
        } catch {
          // fallback
        }
      }
      return DEFAULT_USER_PREFERENCES;
    }

    try {
      const docRef = doc(db, 'users', userId, 'settings', 'preferences');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserPreferences;
      }
      // Inicializar si no existe
      await this.saveUserPreferences(userId, DEFAULT_USER_PREFERENCES);
      return DEFAULT_USER_PREFERENCES;
    } catch (error) {
      console.warn('Error leyendo preferencias de Firestore, usando fallback local:', error);
      return DEFAULT_USER_PREFERENCES;
    }
  }

  /**
   * Guarda y valida las preferencias del usuario aplicando los límites de negocio
   */
  static async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    // 1. Validación estricta en Frontend
    if (preferences.activeCompetitionIds.length > MAX_ACTIVE_COMPETITIONS) {
      throw new Error(`Límite excedido: Solo puedes tener un máximo de ${MAX_ACTIVE_COMPETITIONS} campeonatos activos simultáneamente.`);
    }

    if (preferences.activeBookmakerIds.length > MAX_ACTIVE_BOOKMAKERS) {
      throw new Error(`Límite excedido: Solo puedes tener un máximo de ${MAX_ACTIVE_BOOKMAKERS} casas de apuestas activas simultáneamente.`);
    }

    const payload: UserPreferences = {
      ...preferences,
      updatedAt: new Date().toISOString()
    };

    // Guardado local de respaldo
    localStorage.setItem(`bet_prefs_${userId}`, JSON.stringify(payload));

    if (!env.useMockData && db) {
      try {
        const docRef = doc(db, 'users', userId, 'settings', 'preferences');
        await setDoc(docRef, payload, { merge: true });
      } catch (error) {
        console.error('Error guardando preferencias en Firestore:', error);
        throw error;
      }
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfileSettings> {
    const defaultProfile: UserProfileSettings = {
      displayName: 'Analista Cuantitativo',
      timezone: 'America/Bogota',
      preferredCurrency: 'USD'
    };

    if (env.useMockData || !db) {
      const local = localStorage.getItem(`bet_profile_${userId}`);
      if (local) {
        try { return JSON.parse(local) as UserProfileSettings; } catch { /* ignore */ }
      }
      return defaultProfile;
    }

    try {
      const docRef = doc(db, 'users', userId, 'settings', 'profile');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserProfileSettings;
      }
      return defaultProfile;
    } catch {
      return defaultProfile;
    }
  }

  static async saveUserProfile(userId: string, profile: UserProfileSettings): Promise<void> {
    localStorage.setItem(`bet_profile_${userId}`, JSON.stringify(profile));
    if (!env.useMockData && db) {
      const docRef = doc(db, 'users', userId, 'settings', 'profile');
      await setDoc(docRef, profile, { merge: true });
    }
  }

  static async getUserNotifications(userId: string): Promise<UserNotificationsSettings> {
    const defaults: UserNotificationsSettings = {
      dailyFocus: true,
      parlayReady: true,
      importantOddsMovement: false,
      matchStartingSoon: false,
      emailAlerts: true,
      oddsDropAlerts: true,
      minEvThreshold: 3.5
    };
    const local = localStorage.getItem(`bet_notif_settings_${userId}`);
    if (local) {
      try { return JSON.parse(local) as UserNotificationsSettings; } catch { /* ignore */ }
    }
    return defaults;
  }

  static async saveUserNotifications(userId: string, settings: UserNotificationsSettings): Promise<void> {
    localStorage.setItem(`bet_notif_settings_${userId}`, JSON.stringify(settings));
    if (!env.useMockData && db) {
      const docRef = doc(db, 'users', userId, 'settings', 'notifications');
      await setDoc(docRef, settings, { merge: true });
    }
  }

  static getAvailableCompetitions() {
    return CLIENT_MOCK_COMPETITIONS;
  }

  static getAvailableBookmakers() {
    return GLOBAL_BOOKMAKERS;
  }

  static getAvailableMarkets() {
    return GLOBAL_MARKETS;
  }
}
