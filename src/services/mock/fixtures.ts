import { Competition, EventOdds, MatchAnalysisResult, SportMatchDetails } from '../../types/domain';
import { createColombiaMatchTimestamp, getDynamicMatchStatus } from '../../utils/colombiaDate';

// ─── Competiciones Colombianas (Fútbol Profesional Masculino) ──────────────────
export const COLOMBIA_COMPETITIONS: Competition[] = [
  {
    id: 'CO_LFP',
    name: 'Liga BetPlay Dimayor (Fútbol Masculino)',
    country: 'Colombia',
    code: 'CO_LFP',
    emblem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Dimayor.svg/120px-Dimayor.svg.png',
    season: '2025-I',
    region: 'COLOMBIA',
    tier: 'PRIMERA',
    flag: '🇨🇴'
  },
  {
    id: 'CO_2',
    name: 'Torneo BetPlay Dimayor (Fútbol Masculino)',
    country: 'Colombia',
    code: 'CO_2',
    emblem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Dimayor.svg/120px-Dimayor.svg.png',
    season: '2025-I',
    region: 'COLOMBIA',
    tier: 'SEGUNDA',
    flag: '🇨🇴'
  },
  {
    id: 'CO_CUP',
    name: 'Copa BetPlay Dimayor (Fútbol Masculino)',
    country: 'Colombia',
    code: 'CO_CUP',
    emblem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Dimayor.svg/120px-Dimayor.svg.png',
    season: '2025',
    region: 'COLOMBIA',
    tier: 'COPA',
    flag: '🇨🇴'
  }
];

// ─── Competiciones Europeas (Fútbol Profesional Masculino) ────────────────────
export const EUROPA_COMPETITIONS: Competition[] = [
  {
    id: 'PL',
    name: 'Premier League (Fútbol Masculino)',
    country: 'Inglaterra',
    code: 'PL',
    emblem: 'https://crests.football-data.org/PL.png',
    season: '2024/2025',
    region: 'EUROPA',
    tier: 'PRIMERA',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  },
  {
    id: 'PD',
    name: 'La Liga (Fútbol Masculino)',
    country: 'España',
    code: 'PD',
    emblem: 'https://crests.football-data.org/PD.png',
    season: '2024/2025',
    region: 'EUROPA',
    tier: 'PRIMERA',
    flag: '🇪🇸'
  },
  {
    id: 'CL',
    name: 'UEFA Champions League (Fútbol Masculino)',
    country: 'Europa',
    code: 'CL',
    emblem: 'https://crests.football-data.org/CL.png',
    season: '2024/2025',
    region: 'EUROPA',
    tier: 'CONTINENTAL',
    flag: '🇪🇺'
  },
  {
    id: 'SA',
    name: 'Serie A (Fútbol Masculino)',
    country: 'Italia',
    code: 'SA',
    emblem: 'https://crests.football-data.org/SA.png',
    season: '2024/2025',
    region: 'EUROPA',
    tier: 'PRIMERA',
    flag: '🇮🇹'
  },
  {
    id: 'BL1',
    name: 'Bundesliga (Fútbol Masculino)',
    country: 'Alemania',
    code: 'BL1',
    emblem: 'https://crests.football-data.org/BL1.png',
    season: '2024/2025',
    region: 'EUROPA',
    tier: 'PRIMERA',
    flag: '🇩🇪'
  },
  {
    id: 'FL1',
    name: 'Ligue 1 (Fútbol Masculino)',
    country: 'Francia',
    code: 'FL1',
    emblem: 'https://crests.football-data.org/FL1.png',
    season: '2024/2025',
    region: 'EUROPA',
    tier: 'PRIMERA',
    flag: '🇫🇷'
  }
];

// ─── Lista combinada ──────────────────────────────────────────────────────────
export const CLIENT_MOCK_COMPETITIONS: Competition[] = [
  ...COLOMBIA_COMPETITIONS,
  ...EUROPA_COMPETITIONS
];


const BASE_MOCK_MATCHES: (SportMatchDetails & { timing: { daysOffset: number; hour: number; minute: number } })[] = [
  // ─── 1. Partidos Colombianos (Liga BetPlay Dimayor - Fútbol Masculino) ──────
  {
    id: 'match-col-2',
    competition: COLOMBIA_COMPETITIONS[0]!,
    timing: { daysOffset: 0, hour: 20, minute: 15 },
    utcDate: createColombiaMatchTimestamp(0, 20, 15), // Hoy a las 08:15 p. m. (Hora Colombia)
    status: 'SCHEDULED',
    homeTeam: {
      id: 'nacional',
      name: 'Atlético Nacional',
      shortName: 'Nacional',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Atletico_Nacional_logo.svg/100px-Atletico_Nacional_logo.svg.png',
      form: ['W', 'W', 'W', 'D', 'W']
    },
    awayTeam: {
      id: 'millonarios',
      name: 'Millonarios FC',
      shortName: 'Millonarios',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Millonarios_F.C._escudo.svg/100px-Millonarios_F.C._escudo.svg.png',
      form: ['W', 'D', 'W', 'W', 'D']
    },
    score: { home: null, away: null },
    venue: 'Estadio Atanasio Girardot (Medellín)',
    isMock: true,
    statistics: {
      possession: { home: 56, away: 44 },
      shotsOnTarget: { home: 6, away: 4 },
      totalShots: { home: 15, away: 10 },
      corners: { home: 7, away: 4 },
      fouls: { home: 11, away: 13 },
      xg: { home: 1.84, away: 1.05 }
    },
    headToHead: {
      totalMatches: 24,
      homeWins: 11,
      awayWins: 7,
      draws: 6,
      recentMatches: [
        { date: '2025-03-02', homeTeam: 'Atlético Nacional', awayTeam: 'Millonarios FC', score: '2 - 1' },
        { date: '2024-11-20', homeTeam: 'Millonarios FC', awayTeam: 'Atlético Nacional', score: '1 - 1' },
        { date: '2024-07-28', homeTeam: 'Millonarios FC', awayTeam: 'Atlético Nacional', score: '2 - 1' },
        { date: '2024-02-11', homeTeam: 'Atlético Nacional', awayTeam: 'Millonarios FC', score: '0 - 1' }
      ]
    },
    injuries: {
      home: [
        { player: 'David Ospina', position: 'Portero', status: 'Disponible', reason: '' },
        { player: 'Edwin Cardona', position: 'Mediocampo', status: 'Disponible', reason: '' }
      ],
      away: [
        { player: 'Radamel Falcao García', position: 'Delantero', status: 'Disponible', reason: '' },
        { player: 'Mackalister Silva', position: 'Mediocampo', status: 'Duda', reason: 'Sobrecarga muscular' }
      ]
    },
    news: [
      { title: 'Superclásico Colombiano Masculino: Atlético Nacional recibe a Millonarios en un Atanasio abarrotado', source: 'Win Sports', publishedAt: 'Hoy 11:30' },
      { title: 'Duelo táctico entre verdes y embajadores por la cima de la Liga BetPlay Dimayor', source: 'El Colombiano', publishedAt: 'Hoy 14:00' }
    ],
    oddsMovement: {
      openingOdds: { home: 2.15, draw: 3.25, away: 3.40 },
      currentOdds: { home: 1.95, draw: 3.35, away: 3.75 },
      trend: 'DOWN',
      movementPercentage: -9.3
    }
  },
  {
    id: 'match-col-3',
    competition: COLOMBIA_COMPETITIONS[0]!,
    timing: { daysOffset: 0, hour: 18, minute: 0 },
    utcDate: createColombiaMatchTimestamp(0, 18, 0), // Hoy a las 06:00 p. m. (Hora Colombia)
    status: 'SCHEDULED',
    homeTeam: {
      id: 'america-cali',
      name: 'América de Cali',
      shortName: 'América',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/America_de_Cali.svg/100px-America_de_Cali.svg.png',
      form: ['W', 'D', 'W', 'W', 'L']
    },
    awayTeam: {
      id: 'deportivo-cali',
      name: 'Deportivo Cali',
      shortName: 'Dep. Cali',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Deportivo-cali-logo.png/100px-Deportivo-cali-logo.png',
      form: ['L', 'D', 'L', 'W', 'D']
    },
    score: { home: null, away: null },
    venue: 'Estadio Olímpico Pascual Guerrero (Cali)',
    isMock: true,
    statistics: {
      possession: { home: 52, away: 48 },
      shotsOnTarget: { home: 4, away: 3 },
      totalShots: { home: 11, away: 8 },
      corners: { home: 5, away: 4 },
      fouls: { home: 13, away: 12 },
      xg: { home: 1.45, away: 0.88 }
    },
    headToHead: {
      totalMatches: 18,
      homeWins: 8,
      awayWins: 5,
      draws: 5,
      recentMatches: [
        { date: '2025-01-26', homeTeam: 'América de Cali', awayTeam: 'Deportivo Cali', score: '1 - 0' },
        { date: '2024-07-14', homeTeam: 'Deportivo Cali', awayTeam: 'América de Cali', score: '1 - 1' },
        { date: '2024-02-04', homeTeam: 'América de Cali', awayTeam: 'Deportivo Cali', score: '2 - 0' }
      ]
    },
    injuries: {
      home: [
        { player: 'Rodrigo Ureña', position: 'Mediocampo', status: 'Disponible', reason: '' }
      ],
      away: []
    },
    news: [
      { title: 'Clásico Vallecaucano Masculino: América busca mantener el invicto en el Pascual', source: 'El País de Cali', publishedAt: 'Hoy 07:45' }
    ],
    oddsMovement: {
      openingOdds: { home: 2.00, draw: 3.30, away: 3.60 },
      currentOdds: { home: 1.95, draw: 3.40, away: 3.75 },
      trend: 'DOWN',
      movementPercentage: -2.5
    }
  },
  {
    id: 'match-col-1',
    competition: COLOMBIA_COMPETITIONS[0]!,
    timing: { daysOffset: 1, hour: 19, minute: 30 },
    utcDate: createColombiaMatchTimestamp(1, 19, 30), // Mañana a las 07:30 p. m. (Hora Colombia)
    status: 'SCHEDULED',
    homeTeam: {
      id: 'junior',
      name: 'Junior FC',
      shortName: 'Junior',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Atletico_Junior_crest.svg/100px-Atletico_Junior_crest.svg.png',
      form: ['W', 'L', 'W', 'W', 'D']
    },
    awayTeam: {
      id: 'santa-fe',
      name: 'Independiente Santa Fe',
      shortName: 'Santa Fe',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Independiente_Santa_Fe_logo.svg/100px-Independiente_Santa_Fe_logo.svg.png',
      form: ['D', 'W', 'L', 'W', 'D']
    },
    score: { home: null, away: null },
    venue: 'Estadio Metropolitano Roberto Meléndez (Barranquilla)',
    isMock: true,
    statistics: {
      possession: { home: 57, away: 43 },
      shotsOnTarget: { home: 5, away: 3 },
      totalShots: { home: 14, away: 8 },
      corners: { home: 6, away: 3 },
      fouls: { home: 10, away: 14 },
      xg: { home: 1.62, away: 0.88 }
    },
    headToHead: {
      totalMatches: 16,
      homeWins: 8,
      awayWins: 4,
      draws: 4,
      recentMatches: [
        { date: '2024-09-01', homeTeam: 'Junior FC', awayTeam: 'Independiente Santa Fe', score: '1 - 1' },
        { date: '2024-03-24', homeTeam: 'Independiente Santa Fe', awayTeam: 'Junior FC', score: '2 - 0' }
      ]
    },
    injuries: {
      home: [
        { player: 'Carlos Bacca', position: 'Delantera', status: 'Disponible', reason: '' }
      ],
      away: [
        { player: 'Hugo Rodallega', position: 'Delantera', status: 'Disponible', reason: '' }
      ]
    },
    news: [
      { title: 'Junior busca hacer respetar el calor del Metropolitano ante Santa Fe', source: 'El Heraldo', publishedAt: 'Ayer' }
    ],
    oddsMovement: {
      openingOdds: { home: 2.05, draw: 3.20, away: 3.60 },
      currentOdds: { home: 1.90, draw: 3.30, away: 3.80 },
      trend: 'DOWN',
      movementPercentage: -7.3
    }
  },
  {
    id: 'match-col-4',
    competition: COLOMBIA_COMPETITIONS[0]!,
    timing: { daysOffset: 1, hour: 20, minute: 20 },
    utcDate: createColombiaMatchTimestamp(1, 20, 20), // Mañana a las 08:20 p. m. (Hora Colombia)
    status: 'SCHEDULED',
    homeTeam: {
      id: 'medellin',
      name: 'Independiente Medellín',
      shortName: 'Medellín',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Independiente_Medellin_crest.svg/100px-Independiente_Medellin_crest.svg.png',
      form: ['W', 'D', 'W', 'W', 'D']
    },
    awayTeam: {
      id: 'once-caldas',
      name: 'Once Caldas',
      shortName: 'Once Caldas',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Once_Caldas_logo.svg/100px-Once_Caldas_logo.svg.png',
      form: ['D', 'W', 'L', 'D', 'W']
    },
    score: { home: null, away: null },
    venue: 'Estadio Atanasio Girardot (Medellín)',
    isMock: true,
    statistics: {
      possession: { home: 54, away: 46 },
      shotsOnTarget: { home: 5, away: 3 },
      totalShots: { home: 12, away: 9 },
      corners: { home: 6, away: 4 },
      fouls: { home: 12, away: 13 },
      xg: { home: 1.55, away: 0.92 }
    },
    headToHead: {
      totalMatches: 10,
      homeWins: 5,
      awayWins: 2,
      draws: 3,
      recentMatches: []
    },
    injuries: { home: [], away: [] }
  },
  {
    id: 'match-col-5',
    competition: COLOMBIA_COMPETITIONS[0]!,
    timing: { daysOffset: 2, hour: 18, minute: 10 },
    utcDate: createColombiaMatchTimestamp(2, 18, 10), // Fin de semana a las 06:10 p. m. (Hora Colombia)
    status: 'SCHEDULED',
    homeTeam: {
      id: 'tolima',
      name: 'Deportes Tolima',
      shortName: 'Tolima',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Deportes_Tolima_crest.svg/100px-Deportes_Tolima_crest.svg.png',
      form: ['W', 'W', 'W', 'D', 'W']
    },
    awayTeam: {
      id: 'bucaramanga',
      name: 'Atlético Bucaramanga',
      shortName: 'Bucaramanga',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Escudo_del_Club_Atl%C3%A9tico_Bucaramanga.svg/100px-Escudo_del_Club_Atl%C3%A9tico_Bucaramanga.svg.png',
      form: ['D', 'L', 'W', 'L', 'D']
    },
    score: { home: null, away: null },
    venue: 'Estadio Manuel Murillo Toro (Ibagué)',
    isMock: true,
    statistics: {
      possession: { home: 58, away: 42 },
      shotsOnTarget: { home: 6, away: 2 },
      totalShots: { home: 14, away: 7 },
      corners: { home: 7, away: 3 },
      fouls: { home: 10, away: 14 },
      xg: { home: 1.78, away: 0.62 }
    },
    headToHead: {
      totalMatches: 8,
      homeWins: 5,
      awayWins: 1,
      draws: 2,
      recentMatches: []
    },
    injuries: { home: [], away: [] }
  },

  // ─── 2. Partidos Europeos (Premier League & La Liga - Fútbol Masculino) ───────
  {
    id: 'match-101',
    competition: EUROPA_COMPETITIONS[0]!,
    timing: { daysOffset: 0, hour: 14, minute: 0 },
    utcDate: createColombiaMatchTimestamp(0, 14, 0), // Hoy a las 02:00 p. m. (Hora Colombia)
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
      fouls: { home: 9, away: 12 },
      xg: { home: 2.14, away: 0.92 }
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
    },
    injuries: {
      home: [
        { player: 'Jurrien Timber', position: 'Defensor', status: 'Duda', reason: 'Molestia muscular' }
      ],
      away: [
        { player: 'Reece James', position: 'Defensor', status: 'Baja', reason: 'Lesión isquiotibiales', isKeyPlayer: true },
        { player: 'Romeo Lavia', position: 'Mediocampista', status: 'Baja', reason: 'Fase de recuperación' }
      ]
    },
    news: [
      { title: 'Arsenal busca consolidar el liderato con su once de gala', source: 'Sky Sports', publishedAt: 'Hoy 09:30' }
    ],
    externalPredictions: {
      source: 'Consenso de Modelos Cuantitativos',
      consensusHome: 56.4,
      consensusDraw: 24.2,
      consensusAway: 19.4
    },
    oddsMovement: {
      openingOdds: { home: 1.88, draw: 3.60, away: 4.10 },
      currentOdds: { home: 1.78, draw: 3.75, away: 4.50 },
      trend: 'DOWN',
      movementPercentage: -5.3
    }
  },
  {
    id: 'match-102',
    competition: EUROPA_COMPETITIONS[1]!,
    timing: { daysOffset: 1, hour: 14, minute: 0 },
    utcDate: createColombiaMatchTimestamp(1, 14, 0), // Mañana a las 02:00 p. m. (Hora Colombia)
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
    },
    headToHead: {
      totalMatches: 12,
      homeWins: 7,
      awayWins: 4,
      draws: 1,
      recentMatches: [
        { date: '2024-04-21', homeTeam: 'Real Madrid CF', awayTeam: 'FC Barcelona', score: '3 - 2' }
      ]
    }
  },
  {
    id: 'match-103',
    competition: EUROPA_COMPETITIONS[0]!,
    timing: { daysOffset: 2, hour: 11, minute: 30 },
    utcDate: createColombiaMatchTimestamp(2, 11, 30), // Fin de semana a las 11:30 a. m. (Hora Colombia)
    status: 'SCHEDULED',
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
    score: { home: null, away: null },
    venue: 'Anfield (Liverpool)',
    isMock: true,
    statistics: {
      possession: { home: 47, away: 53 },
      shotsOnTarget: { home: 5, away: 4 },
      totalShots: { home: 12, away: 11 },
      corners: { home: 4, away: 6 },
      fouls: { home: 10, away: 8 }
    }
  },
  {
    id: 'match-104',
    competition: EUROPA_COMPETITIONS[0]!,
    timing: { daysOffset: 1, hour: 11, minute: 30 },
    utcDate: createColombiaMatchTimestamp(1, 11, 30), // Mañana a las 11:30 a. m. (Hora Colombia)
    status: 'SCHEDULED',
    homeTeam: {
      id: 'mancity',
      name: 'Manchester City FC',
      shortName: 'Man City',
      logo: 'https://crests.football-data.org/65.png',
      form: ['W', 'W', 'W', 'D', 'W']
    },
    awayTeam: {
      id: 'tottenham',
      name: 'Tottenham Hotspur FC',
      shortName: 'Tottenham',
      logo: 'https://crests.football-data.org/73.png',
      form: ['W', 'L', 'D', 'W', 'L']
    },
    score: { home: null, away: null },
    venue: 'Etihad Stadium (Manchester)',
    isMock: true,
    statistics: {
      possession: { home: 64, away: 36 },
      shotsOnTarget: { home: 8, away: 3 },
      totalShots: { home: 18, away: 7 },
      corners: { home: 8, away: 3 },
      fouls: { home: 8, away: 11 },
      xg: { home: 2.45, away: 0.85 }
    },
    headToHead: {
      totalMatches: 10,
      homeWins: 6,
      awayWins: 3,
      draws: 1,
      recentMatches: []
    },
    injuries: { home: [], away: [] }
  },
  {
    id: 'match-105',
    competition: EUROPA_COMPETITIONS[1]!,
    timing: { daysOffset: 2, hour: 15, minute: 0 },
    utcDate: createColombiaMatchTimestamp(2, 15, 0), // Fin de semana a las 03:00 p. m. (Hora Colombia)
    status: 'SCHEDULED',
    homeTeam: {
      id: 'atletico',
      name: 'Atlético de Madrid',
      shortName: 'Atlético',
      logo: 'https://crests.football-data.org/78.png',
      form: ['W', 'W', 'D', 'W', 'W']
    },
    awayTeam: {
      id: 'sevilla',
      name: 'Sevilla FC',
      shortName: 'Sevilla',
      logo: 'https://crests.football-data.org/559.png',
      form: ['L', 'D', 'W', 'L', 'D']
    },
    score: { home: null, away: null },
    venue: 'Cívitas Metropolitano (Madrid)',
    isMock: true,
    statistics: {
      possession: { home: 56, away: 44 },
      shotsOnTarget: { home: 6, away: 2 },
      totalShots: { home: 14, away: 6 },
      corners: { home: 6, away: 3 },
      fouls: { home: 10, away: 12 },
      xg: { home: 1.88, away: 0.65 }
    },
    headToHead: {
      totalMatches: 12,
      homeWins: 7,
      awayWins: 2,
      draws: 3,
      recentMatches: []
    },
    injuries: { home: [], away: [] }
  }
];

/**
 * Genera la lista de partidos mock con fechas exactas del calendario colombiano y
 * estados dinámicos en tiempo real (FINALIZADO con resultado, EN VIVO con minuto, o PROGRAMADO).
 */
export function getClientMockMatches(): SportMatchDetails[] {
  return BASE_MOCK_MATCHES.map(item => {
    const utcDate = createColombiaMatchTimestamp(item.timing.daysOffset, item.timing.hour, item.timing.minute);
    const dynamic = getDynamicMatchStatus(utcDate, item.homeTeam.name, item.awayTeam.name);
    return {
      ...item,
      utcDate,
      status: dynamic.status,
      minute: dynamic.minute,
      score: dynamic.score
    };
  });
}

export let CLIENT_MOCK_MATCHES: SportMatchDetails[] = getClientMockMatches();

export function refreshClientMockMatches(): SportMatchDetails[] {
  CLIENT_MOCK_MATCHES = getClientMockMatches();
  return CLIENT_MOCK_MATCHES;
}

export const CLIENT_MOCK_ODDS: Record<string, EventOdds> = {
  'match-101': {
    id: 'match-101',
    sportKey: 'soccer_epl',
    sportTitle: 'Premier League (Fútbol Masculino)',
    commenceTime: createColombiaMatchTimestamp(0, 14, 0),
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
  'match-102': {
    id: 'match-102',
    sportKey: 'soccer_spain_la_liga',
    sportTitle: 'La Liga',
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
  },
  'match-103': {
    id: 'match-103',
    sportKey: 'soccer_epl',
    sportTitle: 'Premier League',
    commenceTime: new Date().toISOString(),
    homeTeam: 'Liverpool FC',
    awayTeam: 'Manchester City FC',
    isMock: true,
    bestOdds: {
      home: { price: 1.35, bookmaker: 'Bet365' },
      draw: { price: 4.20, bookmaker: 'Pinnacle' },
      away: { price: 7.50, bookmaker: '1xBet' },
      payoutMargin: 94.2
    },
    bookmakers: [
      {
        key: 'bet365',
        title: 'Bet365',
        lastUpdate: new Date().toISOString(),
        markets: [
          {
            key: 'h2h',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'Liverpool FC', price: 1.35 },
              { name: 'Empate', price: 4.10 },
              { name: 'Manchester City FC', price: 7.00 }
            ]
          }
        ]
      }
    ]
  },
  'match-col-2': {
    id: 'match-col-2',
    sportKey: 'soccer_colombia_primera_a',
    sportTitle: 'Liga BetPlay Dimayor (Fútbol Masculino)',
    commenceTime: createColombiaMatchTimestamp(0, 20, 15),
    homeTeam: 'Atlético Nacional',
    awayTeam: 'Millonarios FC',
    isMock: true,
    bestOdds: {
      home: { price: 2.05, bookmaker: 'BetPlay' },
      draw: { price: 3.45, bookmaker: 'Wplay' },
      away: { price: 3.85, bookmaker: 'Rushbet' },
      payoutMargin: 96.2
    },
    bookmakers: [
      {
        key: 'betplay',
        title: 'BetPlay',
        lastUpdate: new Date().toISOString(),
        markets: [
          {
            key: 'h2h',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'Atlético Nacional', price: 2.05 },
              { name: 'Empate', price: 3.35 },
              { name: 'Millonarios FC', price: 3.75 }
            ]
          },
          {
            key: 'totals',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'Over', price: 1.92, point: 2.5 },
              { name: 'Under', price: 1.88, point: 2.5 }
            ]
          }
        ]
      },
      {
        key: 'wplay',
        title: 'Wplay',
        lastUpdate: new Date().toISOString(),
        markets: [
          {
            key: 'h2h',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'Atlético Nacional', price: 2.00 },
              { name: 'Empate', price: 3.45 },
              { name: 'Millonarios FC', price: 3.70 }
            ]
          },
          {
            key: 'totals',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'Over', price: 1.90, point: 2.5 },
              { name: 'Under', price: 1.90, point: 2.5 }
            ]
          }
        ]
      },
      {
        key: 'rushbet',
        title: 'Rushbet',
        lastUpdate: new Date().toISOString(),
        markets: [
          {
            key: 'h2h',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'Atlético Nacional', price: 1.98 },
              { name: 'Empate', price: 3.40 },
              { name: 'Millonarios FC', price: 3.85 }
            ]
          }
        ]
      },
      {
        key: 'codere_co',
        title: 'Codere Colombia',
        lastUpdate: new Date().toISOString(),
        markets: [
          {
            key: 'h2h',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'Atlético Nacional', price: 2.02 },
              { name: 'Empate', price: 3.30 },
              { name: 'Millonarios FC', price: 3.65 }
            ]
          }
        ]
      },
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        lastUpdate: new Date().toISOString(),
        markets: [
          {
            key: 'h2h',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'Atlético Nacional', price: 2.05 },
              { name: 'Empate', price: 3.40 },
              { name: 'Millonarios FC', price: 3.80 }
            ]
          }
        ]
      }
    ]
  },
  'match-col-3': {
    id: 'match-col-3',
    sportKey: 'soccer_colombia_primera_a',
    sportTitle: 'Liga BetPlay Dimayor (Fútbol Masculino)',
    commenceTime: createColombiaMatchTimestamp(0, 18, 0),
    homeTeam: 'América de Cali',
    awayTeam: 'Deportivo Cali',
    isMock: true,
    bestOdds: {
      home: { price: 1.98, bookmaker: 'BetPlay' },
      draw: { price: 3.45, bookmaker: 'Wplay' },
      away: { price: 3.90, bookmaker: 'Rushbet' },
      payoutMargin: 95.8
    },
    bookmakers: [
      {
        key: 'betplay',
        title: 'BetPlay',
        lastUpdate: new Date().toISOString(),
        markets: [
          {
            key: 'h2h',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'América de Cali', price: 1.98 },
              { name: 'Empate', price: 3.40 },
              { name: 'Deportivo Cali', price: 3.80 }
            ]
          }
        ]
      },
      {
        key: 'wplay',
        title: 'Wplay',
        lastUpdate: new Date().toISOString(),
        markets: [
          {
            key: 'h2h',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'América de Cali', price: 1.95 },
              { name: 'Empate', price: 3.45 },
              { name: 'Deportivo Cali', price: 3.75 }
            ]
          }
        ]
      }
    ]
  },
  'match-col-1': {
    id: 'match-col-1',
    sportKey: 'soccer_colombia_primera_a',
    sportTitle: 'Liga BetPlay Dimayor (Fútbol Masculino)',
    commenceTime: createColombiaMatchTimestamp(1, 19, 30),
    homeTeam: 'Junior FC',
    awayTeam: 'Independiente Santa Fe',
    isMock: true,
    bestOdds: {
      home: { price: 1.92, bookmaker: 'BetPlay' },
      draw: { price: 3.35, bookmaker: 'Wplay' },
      away: { price: 4.10, bookmaker: 'Rushbet' },
      payoutMargin: 95.5
    },
    bookmakers: [
      {
        key: 'betplay',
        title: 'BetPlay',
        lastUpdate: new Date().toISOString(),
        markets: [
          {
            key: 'h2h',
            lastUpdate: new Date().toISOString(),
            outcomes: [
              { name: 'Junior FC', price: 1.92 },
              { name: 'Empate', price: 3.30 },
              { name: 'Independiente Santa Fe', price: 4.00 }
            ]
          }
        ]
      }
    ]
  }
};

export const CLIENT_MOCK_ANALYSIS: Record<string, MatchAnalysisResult> = {
  'match-col-2': {
    matchId: 'match-col-2',
    summary: 'Superclásico Colombiano: Modelo cuantitativo proyecta una marcada ventaja posicional y de xG (1.84 vs 1.05) para Atlético Nacional en el Atanasio Girardot frente a Millonarios FC. La localía y la presión en campo rival otorgan un valor positivo en las cuotas de BetPlay y Wplay.',
    keyTacticalInsights: [
      'Atlético Nacional promedia 5.8 tiros a puerta por partido como local en la Liga BetPlay.',
      'Millonarios reduce su tasa de xG a 0.92 cuando juega en la altura de Medellín o ante los punteros.',
      'El modelo Poisson de regresión bivariada proyecta un 54.5% de probabilidad de triunfo verdolaga con un Edge de +4.8% en BetPlay a cuota 2.05.'
    ],
    projectedScore: { home: 2, away: 1 },
    winProbabilities: { home: 54.5, draw: 26.5, away: 19.0 },
    valueBets: [
      {
        selection: 'Atlético Nacional (Gana)',
        market: '1X2 Match Winner',
        currentOdds: 2.05,
        estimatedProbability: 0.545,
        impliedProbability: 0.488,
        expectedValuePercentage: 6.85,
        isValueBet: true,
        confidenceScore: 82,
        recommendation: 'STRONG_VALUE'
      },
      {
        selection: 'Ambos Equipos Anotan (Sí)',
        market: 'BTTS',
        currentOdds: 1.88,
        estimatedProbability: 0.57,
        impliedProbability: 0.53,
        expectedValuePercentage: 5.24,
        isValueBet: true,
        confidenceScore: 75,
        recommendation: 'STRONG_VALUE'
      }
    ],
    riskFactor: 'MEDIUM',
    disclaimer: 'Análisis predictivo de valor basado en xG, Poisson y cuotas reguladas de Coljuegos.',
    provider: 'MockAIProvider',
    isMock: true,
    generatedAt: new Date().toISOString()
  },
  'match-col-3': {
    matchId: 'match-col-3',
    summary: 'Clásico Vallecaucano: América de Cali llega con un diferencial de goles esperado superior y mayor volumen ofensivo en el Pascual Guerrero ante un Deportivo Cali con inconsistencias defensivas.',
    keyTacticalInsights: [
      'América invicto en los últimos 4 clásicos disputados en el Pascual Guerrero.',
      'Deportivo Cali ha recibido al menos un gol en el 85% de sus salidas recientes.'
    ],
    projectedScore: { home: 2, away: 0 },
    winProbabilities: { home: 53.0, draw: 27.0, away: 20.0 },
    valueBets: [
      {
        selection: 'América de Cali (Gana)',
        market: '1X2 Match Winner',
        currentOdds: 1.98,
        estimatedProbability: 0.53,
        impliedProbability: 0.505,
        expectedValuePercentage: 4.94,
        isValueBet: true,
        confidenceScore: 78,
        recommendation: 'STRONG_VALUE'
      }
    ],
    riskFactor: 'MEDIUM',
    disclaimer: 'Análisis cuantitativo de valor para la Liga BetPlay.',
    provider: 'MockAIProvider',
    isMock: true,
    generatedAt: new Date().toISOString()
  },
  'match-101': {
    matchId: 'match-101',
    summary: 'Modelo predictivo cuantitativo detecta un desequilibrio de valor en el mercado 1X2 para Arsenal vs Chelsea. Los datos de xG y presión alta en el Emirates señalan una superioridad posicional de 63% para los locales.',
    keyTacticalInsights: [
      'Arsenal presenta una tasa de conversión de xG de 1.84 por cada 90 minutos jugando de local.',
      'Chelsea concede en promedio 1.6 goles cuando enfrenta rivales del Big Six fuera de Stamford Bridge.',
      'El modelo de Poisson proyecta una expectativa de 2.8 goles totales con un 59% de probabilidad para Over 2.5.'
    ],
    projectedScore: { home: 2, away: 1 },
    winProbabilities: { home: 58.5, draw: 24.5, away: 17.0 },
    valueBets: [
      {
        selection: 'Arsenal FC (Gana)',
        market: '1X2 Match Winner',
        currentOdds: 1.78,
        estimatedProbability: 0.59,
        impliedProbability: 0.56,
        expectedValuePercentage: 5.02,
        isValueBet: true,
        confidenceScore: 84,
        recommendation: 'STRONG_VALUE'
      },
      {
        selection: 'Más de 2.5 Goles',
        market: 'Totals (Over/Under)',
        currentOdds: 1.82,
        estimatedProbability: 0.58,
        impliedProbability: 0.55,
        expectedValuePercentage: 5.56,
        isValueBet: true,
        confidenceScore: 78,
        recommendation: 'STRONG_VALUE'
      }
    ],
    riskFactor: 'MEDIUM',
    disclaimer: 'Datos basados en modelos Poisson y xG. El análisis no constituye asesoría financiera.',
    provider: 'MockAIProvider',
    isMock: true,
    generatedAt: new Date().toISOString()
  }
};
