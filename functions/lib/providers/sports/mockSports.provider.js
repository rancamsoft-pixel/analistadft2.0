"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSportsProvider = exports.MOCK_MATCHES = exports.MOCK_COMPETITIONS = void 0;
exports.MOCK_COMPETITIONS = [
    {
        id: 'PL',
        name: 'Premier League',
        country: 'Inglaterra',
        code: 'PL',
        emblem: 'https://crests.football-data.org/PL.png',
        season: '2024/2025'
    },
    {
        id: 'PD',
        name: 'La Liga',
        country: 'España',
        code: 'PD',
        emblem: 'https://crests.football-data.org/PD.png',
        season: '2024/2025'
    },
    {
        id: 'CL',
        name: 'UEFA Champions League',
        country: 'Europa',
        code: 'CL',
        emblem: 'https://crests.football-data.org/CL.png',
        season: '2024/2025'
    },
    {
        id: 'SA',
        name: 'Serie A',
        country: 'Italia',
        code: 'SA',
        emblem: 'https://crests.football-data.org/SA.png',
        season: '2024/2025'
    }
];
exports.MOCK_MATCHES = [
    {
        id: 'match-101',
        competition: exports.MOCK_COMPETITIONS[0],
        utcDate: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
        status: 'SCHEDULED',
        homeTeam: {
            id: 'arsenal',
            name: 'Arsenal FC',
            shortName: 'Arsenal',
            logo: 'https://crests.football-data.org/57.png',
            form: ['W', 'W', 'D', 'W', 'W']
        },
        awayTeam: {
            id: 'chelsea',
            name: 'Chelsea FC',
            shortName: 'Chelsea',
            logo: 'https://crests.football-data.org/61.png',
            form: ['W', 'L', 'W', 'D', 'L']
        },
        score: { home: null, away: null },
        venue: 'Emirates Stadium (Londres)',
        isMock: true,
        statistics: {
            possession: { home: 58, away: 42 },
            shotsOnTarget: { home: 6, away: 3 },
            totalShots: { home: 15, away: 8 },
            corners: { home: 7, away: 3 },
            fouls: { home: 9, away: 12 }
        },
        headToHead: {
            totalMatches: 10,
            homeWins: 6,
            awayWins: 2,
            draws: 2,
            recentMatches: [
                { date: '2024-04-23', homeTeam: 'Arsenal FC', awayTeam: 'Chelsea FC', score: '5 - 0' },
                { date: '2023-10-21', homeTeam: 'Chelsea FC', awayTeam: 'Arsenal FC', score: '2 - 2' }
            ]
        }
    },
    {
        id: 'match-102',
        competition: exports.MOCK_COMPETITIONS[1],
        utcDate: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
        status: 'SCHEDULED',
        homeTeam: {
            id: 'real-madrid',
            name: 'Real Madrid CF',
            shortName: 'Real Madrid',
            logo: 'https://crests.football-data.org/86.png',
            form: ['W', 'W', 'W', 'D', 'W']
        },
        awayTeam: {
            id: 'barcelona',
            name: 'FC Barcelona',
            shortName: 'Barcelona',
            logo: 'https://crests.football-data.org/81.png',
            form: ['W', 'W', 'W', 'W', 'L']
        },
        score: { home: null, away: null },
        venue: 'Santiago Bernabéu (Madrid)',
        isMock: true,
        statistics: {
            possession: { home: 51, away: 49 },
            shotsOnTarget: { home: 7, away: 6 },
            totalShots: { home: 16, away: 14 },
            corners: { home: 6, away: 5 },
            fouls: { home: 11, away: 13 }
        }
    },
    {
        id: 'match-103',
        competition: exports.MOCK_COMPETITIONS[0],
        utcDate: new Date().toISOString(),
        status: 'LIVE',
        minute: 68,
        homeTeam: {
            id: 'liverpool',
            name: 'Liverpool FC',
            shortName: 'Liverpool',
            logo: 'https://crests.football-data.org/64.png',
            form: ['W', 'W', 'W', 'W', 'D']
        },
        awayTeam: {
            id: 'mancity',
            name: 'Manchester City FC',
            shortName: 'Man City',
            logo: 'https://crests.football-data.org/65.png',
            form: ['W', 'D', 'W', 'L', 'W']
        },
        score: {
            home: 2,
            away: 1,
            halfTime: { home: 1, away: 1 }
        },
        venue: 'Anfield (Liverpool)',
        isMock: true
    }
];
class MockSportsProvider {
    providerName = 'MockSportsProvider';
    async getCompetitions() {
        return Promise.resolve(exports.MOCK_COMPETITIONS);
    }
    async getSeasons(_competitionId) {
        return Promise.resolve([
            { year: 2024, start: '2024-08-15', end: '2025-05-25', current: true },
            { year: 2023, start: '2023-08-12', end: '2024-05-19', current: false }
        ]);
    }
    async getLiveMatches(competitionId) {
        const live = exports.MOCK_MATCHES.filter(m => m.status === 'LIVE');
        if (competitionId) {
            return Promise.resolve(live.filter(m => m.competition.id === competitionId));
        }
        return Promise.resolve(live);
    }
    async getUpcomingMatches(competitionId, date) {
        let matches = exports.MOCK_MATCHES.filter(m => m.status === 'SCHEDULED');
        if (competitionId) {
            matches = matches.filter(m => m.competition.id === competitionId);
        }
        if (date) {
            matches = matches.filter(m => m.utcDate.startsWith(date));
        }
        return Promise.resolve(matches);
    }
    async getResults(competitionId, lastN = 10) {
        let results = [
            {
                id: 'res-1',
                competition: exports.MOCK_COMPETITIONS[0],
                utcDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
                status: 'FINISHED',
                homeTeam: { id: 'arsenal', name: 'Arsenal FC', shortName: 'Arsenal', logo: 'https://crests.football-data.org/57.png' },
                awayTeam: { id: 'wolves', name: 'Wolverhampton', shortName: 'Wolves', logo: 'https://crests.football-data.org/76.png' },
                score: { home: 2, away: 0 },
                isMock: true
            }
        ];
        if (competitionId) {
            results = results.filter(r => r.competition.id === competitionId);
        }
        return Promise.resolve(results.slice(0, lastN));
    }
    async getStandings(competitionId, season) {
        return Promise.resolve({
            competitionId,
            season: season || '2024',
            standings: [
                {
                    rank: 1,
                    team: { id: 'arsenal', name: 'Arsenal FC', shortName: 'Arsenal', logo: 'https://crests.football-data.org/57.png' },
                    points: 74,
                    goalsDiff: 45,
                    played: 33,
                    win: 23,
                    draw: 5,
                    lose: 5,
                    form: 'WWWDW'
                },
                {
                    rank: 2,
                    team: { id: 'mancity', name: 'Manchester City FC', shortName: 'Man City', logo: 'https://crests.football-data.org/65.png' },
                    points: 73,
                    goalsDiff: 43,
                    played: 32,
                    win: 22,
                    draw: 7,
                    lose: 3,
                    form: 'WWWDW'
                }
            ],
            updatedAt: new Date().toISOString()
        });
    }
    async getStatistics(matchId) {
        const match = exports.MOCK_MATCHES.find(m => m.id === matchId);
        return Promise.resolve(match?.statistics || {
            possession: { home: 55, away: 45 },
            shotsOnTarget: { home: 5, away: 4 },
            totalShots: { home: 14, away: 10 },
            corners: { home: 6, away: 4 },
            fouls: { home: 10, away: 11 }
        });
    }
    async getH2H(_teamAId, _teamBId) {
        return Promise.resolve({
            totalMatches: 8,
            homeWins: 4,
            awayWins: 2,
            draws: 2,
            recentMatches: [
                { date: '2024-04-23', homeTeam: 'Arsenal FC', awayTeam: 'Chelsea FC', score: '5 - 0' },
                { date: '2023-10-21', homeTeam: 'Chelsea FC', awayTeam: 'Arsenal FC', score: '2 - 2' }
            ]
        });
    }
    async getInjuries(matchId) {
        return Promise.resolve([
            {
                player: { id: 'p1', name: 'Thomas Partey', type: 'Lesión muscular', reason: 'Duda hasta último momento' },
                team: { id: 'arsenal', name: 'Arsenal FC' },
                fixtureId: matchId
            }
        ]);
    }
    async getSquad(_teamId) {
        return Promise.resolve([
            { id: 'sq1', name: 'Bukayo Saka', age: 22, number: 7, position: 'Attacker', photo: '' },
            { id: 'sq2', name: 'Martin Ødegaard', age: 25, number: 8, position: 'Midfielder', photo: '' }
        ]);
    }
    async getLineups(_matchId) {
        return Promise.resolve({
            home: {
                team: { id: 'arsenal', name: 'Arsenal FC', shortName: 'Arsenal', logo: '' },
                formation: '4-3-3',
                startXI: [{ id: '1', name: 'David Raya', number: 22, pos: 'G' }],
                substitutes: [{ id: '2', name: 'Aaron Ramsdale', number: 1, pos: 'G' }],
                coach: { id: 'c1', name: 'Mikel Arteta' }
            },
            away: {
                team: { id: 'chelsea', name: 'Chelsea FC', shortName: 'Chelsea', logo: '' },
                formation: '4-2-3-1',
                startXI: [{ id: '10', name: 'Robert Sánchez', number: 1, pos: 'G' }],
                substitutes: [{ id: '11', name: 'Djordje Petrovic', number: 28, pos: 'G' }],
                coach: { id: 'c2', name: 'Mauricio Pochettino' }
            }
        });
    }
    async getPredictions(matchId) {
        return Promise.resolve({
            matchId,
            winner: { id: 'arsenal', name: 'Arsenal FC', comment: 'Ventaja local proyectada' },
            winProbabilities: { home: 58, draw: 25, away: 17 },
            goalsAdvise: 'Más de 2.5 goles',
            percentAdvice: 'Victoria local con xG superior a 1.8'
        });
    }
    async getMatchDetails(matchId) {
        const match = exports.MOCK_MATCHES.find(m => m.id === matchId);
        if (!match) {
            throw new Error(`[MockSportsProvider] Partido con ID '${matchId}' no encontrado.`);
        }
        return Promise.resolve(match);
    }
}
exports.MockSportsProvider = MockSportsProvider;
//# sourceMappingURL=mockSports.provider.js.map