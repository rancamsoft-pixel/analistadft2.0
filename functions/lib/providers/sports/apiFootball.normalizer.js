"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiFootballNormalizer = void 0;
class ApiFootballNormalizer {
    static mapStatus(shortStatus) {
        switch (shortStatus) {
            case '1H':
            case '2H':
            case 'HT':
            case 'ET':
            case 'BT':
            case 'P':
            case 'LIVE':
                return 'LIVE';
            case 'FT':
            case 'AET':
            case 'PEN':
                return 'FINISHED';
            case 'PST':
                return 'POSTPONED';
            case 'CANC':
            case 'ABD':
                return 'CANCELLED';
            case 'NS':
            case 'TBD':
            default:
                return 'SCHEDULED';
        }
    }
    static normalizeMatch(raw) {
        const fixture = raw.fixture || {};
        const league = raw.league || {};
        const teams = raw.teams || {};
        const goals = raw.goals || {};
        const score = raw.score || {};
        const homeTeam = {
            id: String(teams.home?.id || 'home'),
            name: teams.home?.name || 'Equipo Local',
            shortName: teams.home?.name || 'Local',
            logo: teams.home?.logo || ''
        };
        const awayTeam = {
            id: String(teams.away?.id || 'away'),
            name: teams.away?.name || 'Equipo Visitante',
            shortName: teams.away?.name || 'Visitante',
            logo: teams.away?.logo || ''
        };
        const competition = {
            id: String(league.id || 'comp'),
            name: league.name || 'Liga',
            country: league.country || 'Internacional',
            code: league.country ? league.country.substring(0, 3).toUpperCase() : 'INT',
            emblem: league.logo || '',
            season: String(league.season || new Date().getFullYear())
        };
        return {
            id: `apifootball_${fixture.id}`,
            competition,
            utcDate: fixture.date || new Date().toISOString(),
            status: this.mapStatus(fixture.status?.short),
            minute: fixture.status?.elapsed || undefined,
            homeTeam,
            awayTeam,
            score: {
                home: goals.home ?? null,
                away: goals.away ?? null,
                halfTime: {
                    home: score.halftime?.home ?? null,
                    away: score.halftime?.away ?? null
                }
            },
            venue: fixture.venue?.name ? `${fixture.venue.name} (${fixture.venue.city || ''})` : undefined,
            isMock: false
        };
    }
    static toStoredMatch(match) {
        return {
            matchId: match.id,
            provider: 'api-football',
            providerMatchId: match.id.replace('apifootball_', ''),
            competitionId: match.competition.id,
            seasonId: match.competition.season,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            kickoff: match.utcDate,
            status: match.status,
            minute: match.minute,
            score: match.score,
            venue: match.venue,
            fetchedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    static normalizeCompetitions(rawList) {
        return (rawList || []).map(item => ({
            id: String(item.league?.id || item.id),
            name: item.league?.name || item.name || '',
            country: item.country?.name || item.country || 'Internacional',
            code: item.country?.code || 'INT',
            emblem: item.league?.logo || item.emblem || '',
            season: String(item.seasons?.[0]?.year || item.season || new Date().getFullYear())
        }));
    }
    static normalizeSeasons(rawList) {
        return (rawList || []).map(item => ({
            year: item.year || item,
            start: item.start || '',
            end: item.end || '',
            current: !!item.current
        }));
    }
    static normalizeStandings(competitionId, season, rawResponse) {
        const league = rawResponse?.[0]?.league || {};
        const rawTable = league.standings?.[0] || [];
        const standings = rawTable.map((item) => ({
            rank: item.rank || 0,
            team: {
                id: String(item.team?.id),
                name: item.team?.name || '',
                shortName: item.team?.name || '',
                logo: item.team?.logo || ''
            },
            points: item.points || 0,
            goalsDiff: item.goalsDiff || 0,
            played: item.all?.played || 0,
            win: item.all?.win || 0,
            draw: item.all?.draw || 0,
            lose: item.all?.lose || 0,
            form: item.form || ''
        }));
        return {
            competitionId,
            season,
            standings,
            updatedAt: new Date().toISOString()
        };
    }
    static normalizeStatistics(rawStats) {
        const homeRaw = rawStats?.[0]?.statistics || [];
        const awayRaw = rawStats?.[1]?.statistics || [];
        const getVal = (list, type) => {
            const item = list.find((s) => s.type?.toLowerCase() === type.toLowerCase());
            if (!item || item.value === null)
                return 0;
            if (typeof item.value === 'string' && item.value.includes('%')) {
                return parseInt(item.value, 10) || 0;
            }
            return Number(item.value) || 0;
        };
        return {
            possession: {
                home: getVal(homeRaw, 'Ball Possession'),
                away: getVal(awayRaw, 'Ball Possession')
            },
            shotsOnTarget: {
                home: getVal(homeRaw, 'Shots on Goal'),
                away: getVal(awayRaw, 'Shots on Goal')
            },
            totalShots: {
                home: getVal(homeRaw, 'Total Shots'),
                away: getVal(awayRaw, 'Total Shots')
            },
            corners: {
                home: getVal(homeRaw, 'Corner Kicks'),
                away: getVal(awayRaw, 'Corner Kicks')
            },
            fouls: {
                home: getVal(homeRaw, 'Fouls'),
                away: getVal(awayRaw, 'Fouls')
            }
        };
    }
    static normalizeH2H(rawList) {
        let homeWins = 0;
        let awayWins = 0;
        let draws = 0;
        const recentMatches = (rawList || []).slice(0, 10).map(item => {
            const homeGoals = item.goals?.home ?? 0;
            const awayGoals = item.goals?.away ?? 0;
            if (homeGoals > awayGoals)
                homeWins++;
            else if (awayGoals > homeGoals)
                awayWins++;
            else
                draws++;
            return {
                date: item.fixture?.date || '',
                homeTeam: item.teams?.home?.name || 'Local',
                awayTeam: item.teams?.away?.name || 'Visita',
                score: `${homeGoals} - ${awayGoals}`
            };
        });
        return {
            totalMatches: rawList.length,
            homeWins,
            awayWins,
            draws,
            recentMatches
        };
    }
    static normalizeInjuries(rawList) {
        return (rawList || []).map(item => ({
            player: {
                id: String(item.player?.id || ''),
                name: item.player?.name || '',
                type: item.player?.type || 'Lesión',
                reason: item.player?.reason || 'Baja confirmada'
            },
            team: {
                id: String(item.team?.id || ''),
                name: item.team?.name || ''
            },
            fixtureId: String(item.fixture?.id || '')
        }));
    }
    static normalizeSquad(rawList) {
        const players = rawList?.[0]?.players || [];
        return players.map((p) => ({
            id: String(p.id),
            name: p.name || '',
            age: p.age || 0,
            number: p.number || undefined,
            position: p.position || 'Jugador',
            photo: p.photo || ''
        }));
    }
    static normalizeLineups(rawList) {
        if (!rawList || rawList.length < 2)
            return null;
        const mapOne = (raw) => ({
            team: {
                id: String(raw.team?.id),
                name: raw.team?.name || '',
                shortName: raw.team?.name || '',
                logo: raw.team?.logo || ''
            },
            formation: raw.formation || '4-3-3',
            startXI: (raw.startXI || []).map((p) => ({
                id: String(p.player?.id),
                name: p.player?.name || '',
                number: p.player?.number || 0,
                pos: p.player?.pos || ''
            })),
            substitutes: (raw.substitutes || []).map((p) => ({
                id: String(p.player?.id),
                name: p.player?.name || '',
                number: p.player?.number || 0,
                pos: p.player?.pos || ''
            })),
            coach: {
                id: String(raw.coach?.id || ''),
                name: raw.coach?.name || 'Director Técnico',
                photo: raw.coach?.photo
            }
        });
        return {
            home: mapOne(rawList[0]),
            away: mapOne(rawList[1])
        };
    }
    static normalizePredictions(rawItem) {
        if (!rawItem || !rawItem.predictions)
            return null;
        const p = rawItem.predictions;
        return {
            matchId: String(rawItem.fixture?.id || ''),
            winner: {
                id: String(p.winner?.id || ''),
                name: p.winner?.name || '',
                comment: p.winner?.comment
            },
            winProbabilities: {
                home: parseInt(p.percent?.home, 10) || 40,
                draw: parseInt(p.percent?.draw, 10) || 30,
                away: parseInt(p.percent?.away, 10) || 30
            },
            goalsAdvise: p.goals?.home ? `xG Local: ${p.goals.home}` : 'Pronóstico de goles reservado',
            percentAdvice: p.advice || 'Sin recomendación explícita'
        };
    }
}
exports.ApiFootballNormalizer = ApiFootballNormalizer;
//# sourceMappingURL=apiFootball.normalizer.js.map