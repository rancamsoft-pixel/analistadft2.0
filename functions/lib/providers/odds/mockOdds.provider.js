"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockOddsProvider = exports.MOCK_EVENT_ODDS = void 0;
const odds_normalizer_js_1 = require("./odds.normalizer.js");
exports.MOCK_EVENT_ODDS = [
    {
        id: 'match-101',
        sportKey: 'soccer_epl',
        sportTitle: 'EPL - Premier League',
        commenceTime: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
        homeTeam: 'Arsenal FC',
        awayTeam: 'Chelsea FC',
        isMock: true,
        bestOdds: {
            home: { price: 1.78, bookmaker: 'Pinnacle' },
            draw: { price: 3.95, bookmaker: 'Bet365' },
            away: { price: 4.80, bookmaker: '1xBet' },
            payoutMargin: 96.4
        },
        bookmakers: [
            {
                key: 'pinnacle',
                title: 'Pinnacle',
                lastUpdate: new Date().toISOString(),
                markets: [
                    {
                        key: 'h2h',
                        lastUpdate: new Date().toISOString(),
                        outcomes: [
                            { name: 'Arsenal FC', price: 1.78 },
                            { name: 'Empate', price: 3.85 },
                            { name: 'Chelsea FC', price: 4.65 }
                        ]
                    },
                    {
                        key: 'totals',
                        lastUpdate: new Date().toISOString(),
                        outcomes: [
                            { name: 'Over', price: 1.82, point: 2.5 },
                            { name: 'Under', price: 2.05, point: 2.5 }
                        ]
                    }
                ]
            },
            {
                key: 'bet365',
                title: 'Bet365',
                lastUpdate: new Date().toISOString(),
                markets: [
                    {
                        key: 'h2h',
                        lastUpdate: new Date().toISOString(),
                        outcomes: [
                            { name: 'Arsenal FC', price: 1.72 },
                            { name: 'Empate', price: 3.95 },
                            { name: 'Chelsea FC', price: 4.50 }
                        ]
                    },
                    {
                        key: 'totals',
                        lastUpdate: new Date().toISOString(),
                        outcomes: [
                            { name: 'Over', price: 1.80, point: 2.5 },
                            { name: 'Under', price: 2.00, point: 2.5 }
                        ]
                    }
                ]
            },
            {
                key: '1xbet',
                title: '1xBet',
                lastUpdate: new Date().toISOString(),
                markets: [
                    {
                        key: 'h2h',
                        lastUpdate: new Date().toISOString(),
                        outcomes: [
                            { name: 'Arsenal FC', price: 1.75 },
                            { name: 'Empate', price: 3.90 },
                            { name: 'Chelsea FC', price: 4.80 }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'match-102',
        sportKey: 'soccer_spain_la_liga',
        sportTitle: 'La Liga EA Sports',
        commenceTime: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
        homeTeam: 'Real Madrid CF',
        awayTeam: 'FC Barcelona',
        isMock: true,
        bestOdds: {
            home: { price: 2.10, bookmaker: 'Pinnacle' },
            draw: { price: 3.75, bookmaker: 'Bet365' },
            away: { price: 3.45, bookmaker: 'Betfair' },
            payoutMargin: 95.8
        },
        bookmakers: [
            {
                key: 'pinnacle',
                title: 'Pinnacle',
                lastUpdate: new Date().toISOString(),
                markets: [
                    {
                        key: 'h2h',
                        lastUpdate: new Date().toISOString(),
                        outcomes: [
                            { name: 'Real Madrid CF', price: 2.10 },
                            { name: 'Empate', price: 3.70 },
                            { name: 'FC Barcelona', price: 3.35 }
                        ]
                    },
                    {
                        key: 'totals',
                        lastUpdate: new Date().toISOString(),
                        outcomes: [
                            { name: 'Over', price: 1.68, point: 2.5 },
                            { name: 'Under', price: 2.22, point: 2.5 }
                        ]
                    }
                ]
            },
            {
                key: 'bet365',
                title: 'Bet365',
                lastUpdate: new Date().toISOString(),
                markets: [
                    {
                        key: 'h2h',
                        lastUpdate: new Date().toISOString(),
                        outcomes: [
                            { name: 'Real Madrid CF', price: 2.05 },
                            { name: 'Empate', price: 3.75 },
                            { name: 'FC Barcelona', price: 3.40 }
                        ]
                    }
                ]
            }
        ]
    }
];
class MockOddsProvider {
    providerName = 'MockOddsProvider';
    async getSupportedSports() {
        return Promise.resolve([
            { key: 'soccer_epl', title: 'Premier League' },
            { key: 'soccer_spain_la_liga', title: 'La Liga' },
            { key: 'soccer_uefa_champs_league', title: 'UEFA Champions League' },
            { key: 'basketball_nba', title: 'NBA' }
        ]);
    }
    async getUpcomingOdds(sportKey) {
        if (!sportKey || sportKey === 'all') {
            return Promise.resolve(exports.MOCK_EVENT_ODDS);
        }
        return Promise.resolve(exports.MOCK_EVENT_ODDS.filter(e => e.sportKey === sportKey));
    }
    async getMatchOdds(sportKey, eventId) {
        const odds = exports.MOCK_EVENT_ODDS.find(e => e.id === eventId);
        if (!odds) {
            // Generar cuotas predeterminadas seguras para cualquier ID desconocido en mock
            const defaultOdds = {
                id: eventId,
                sportKey,
                sportTitle: 'Fútbol Internacional',
                commenceTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
                homeTeam: 'Equipo Local',
                awayTeam: 'Equipo Visitante',
                isMock: true,
                bestOdds: {
                    home: { price: 2.05, bookmaker: 'Pinnacle' },
                    draw: { price: 3.40, bookmaker: 'Bet365' },
                    away: { price: 3.60, bookmaker: 'Betfair' },
                    payoutMargin: 95.0
                },
                bookmakers: [
                    {
                        key: 'pinnacle',
                        title: 'Pinnacle',
                        lastUpdate: new Date().toISOString(),
                        markets: [
                            {
                                key: 'h2h',
                                lastUpdate: new Date().toISOString(),
                                outcomes: [
                                    { name: 'Equipo Local', price: 2.05 },
                                    { name: 'Empate', price: 3.35 },
                                    { name: 'Equipo Visitante', price: 3.55 }
                                ]
                            }
                        ]
                    }
                ]
            };
            return Promise.resolve(defaultOdds);
        }
        return Promise.resolve(odds);
    }
    async getMatchOddsComparison(sportKey, eventId, requestedBookmakers) {
        const event = await this.getMatchOdds(sportKey, eventId);
        return Promise.resolve(odds_normalizer_js_1.OddsNormalizer.buildOddsComparison(event, requestedBookmakers));
    }
}
exports.MockOddsProvider = MockOddsProvider;
//# sourceMappingURL=mockOdds.provider.js.map