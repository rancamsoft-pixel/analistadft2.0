"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmakerRegistry = exports.BOOKMAKER_REGISTRY = void 0;
exports.BOOKMAKER_REGISTRY = {
    pinnacle: {
        id: 'pinnacle',
        name: 'Pinnacle',
        providerKey: 'pinnacle',
        country: 'Global',
        isAvailableInTheOddsApi: true
    },
    bet365: {
        id: 'bet365',
        name: 'Bet365',
        providerKey: 'bet365',
        country: 'Global',
        isAvailableInTheOddsApi: true
    },
    betfair: {
        id: 'betfair',
        name: 'Betfair',
        providerKey: 'betfair_ex_eu',
        country: 'Global',
        isAvailableInTheOddsApi: true
    },
    '1xbet': {
        id: '1xbet',
        name: '1xBet',
        providerKey: 'onexbet',
        country: 'Global',
        isAvailableInTheOddsApi: true
    },
    draftkings: {
        id: 'draftkings',
        name: 'DraftKings',
        providerKey: 'draftkings',
        country: 'USA',
        isAvailableInTheOddsApi: true
    },
    fanduel: {
        id: 'fanduel',
        name: 'FanDuel',
        providerKey: 'fanduel',
        country: 'USA',
        isAvailableInTheOddsApi: true
    },
    williamhill: {
        id: 'williamhill',
        name: 'William Hill',
        providerKey: 'williamhill',
        country: 'UK',
        isAvailableInTheOddsApi: true
    },
    betano: {
        id: 'betano',
        name: 'Betano',
        providerKey: 'betano',
        country: 'LatAm / Global',
        isAvailableInTheOddsApi: true
    },
    betsson: {
        id: 'betsson',
        name: 'Betsson',
        providerKey: 'betsson',
        country: 'LatAm / Global',
        isAvailableInTheOddsApi: true
    },
    // Casas colombianas y latinoamericanas no provistas por The Odds API
    betplay: {
        id: 'betplay',
        name: 'BetPlay',
        providerKey: null,
        country: 'Colombia',
        isAvailableInTheOddsApi: false
    },
    wplay: {
        id: 'wplay',
        name: 'Wplay',
        providerKey: null,
        country: 'Colombia',
        isAvailableInTheOddsApi: false
    },
    rushbet: {
        id: 'rushbet',
        name: 'Rushbet',
        providerKey: null,
        country: 'Colombia',
        isAvailableInTheOddsApi: false
    },
    yajuego: {
        id: 'yajuego',
        name: 'Yajuego',
        providerKey: null,
        country: 'Colombia',
        isAvailableInTheOddsApi: false
    },
    codere_co: {
        id: 'codere_co',
        name: 'Codere Colombia',
        providerKey: null,
        country: 'Colombia',
        isAvailableInTheOddsApi: false
    }
};
class BookmakerRegistry {
    /**
     * Obtiene la definición de una casa de apuestas por su ID interno
     */
    static getBookmaker(internalId) {
        const key = internalId.toLowerCase();
        return exports.BOOKMAKER_REGISTRY[key] || {
            id: internalId,
            name: internalId.toUpperCase(),
            providerKey: null,
            country: 'Desconocido',
            isAvailableInTheOddsApi: false
        };
    }
    /**
     * Obtiene la providerKey correspondiente a un ID interno
     */
    static getProviderKey(internalId) {
        const b = this.getBookmaker(internalId);
        return b.providerKey;
    }
    /**
     * Determina si una casa de apuestas está soportada por el proveedor
     */
    static isSupported(internalId) {
        const b = this.getBookmaker(internalId);
        return b.isAvailableInTheOddsApi && b.providerKey !== null;
    }
    /**
     * Traduce una providerKey de The Odds API a nuestro ID interno
     */
    static mapProviderKeyToInternalId(providerKey) {
        const cleanKey = providerKey.toLowerCase();
        for (const [internalId, def] of Object.entries(exports.BOOKMAKER_REGISTRY)) {
            if (def.providerKey && (def.providerKey.toLowerCase() === cleanKey || cleanKey.startsWith(def.providerKey.toLowerCase()))) {
                return internalId;
            }
        }
        // Fallback: usar la misma key
        return cleanKey;
    }
    /**
     * Lista todas las casas conocidas
     */
    static getAllKnown() {
        return Object.values(exports.BOOKMAKER_REGISTRY);
    }
}
exports.BookmakerRegistry = BookmakerRegistry;
//# sourceMappingURL=bookmaker.registry.js.map