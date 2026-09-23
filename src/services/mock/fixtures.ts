import { Competition, EventOdds, MatchAnalysisResult, SportMatchDetails } from '../../types/domain';

// ─── Competiciones Colombianas ────────────────────────────────────────────────
export const COLOMBIA_COMPETITIONS: Competition[] = [
  {
    id: 'CO_LFP',
    name: 'Liga BetPlay Dimayor',
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
    name: 'Torneo BetPlay Dimayor',
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
    name: 'Copa BetPlay Dimayor',
    country: 'Colombia',
    code: 'CO_CUP',
    emblem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Dimayor.svg/120px-Dimayor.svg.png',
    season: '2025',
    region: 'COLOMBIA',
    tier: 'COPA',
    flag: '🇨🇴'
  }
];

// ─── Competiciones Europeas ───────────────────────────────────────────────────
export const EUROPA_COMPETITIONS: Competition[] = [
  {
    id: 'PL',
    name: 'Premier League',
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
    name: 'La Liga',
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
    name: 'UEFA Champions League',
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
    name: 'Serie A',
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
    name: 'Bundesliga',
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
    name: 'Ligue 1',
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


export const CLIENT_MOCK_MATCHES: SportMatchDetails[] = [
  {
    id: 'match-101',
    competition: CLIENT_MOCK_COMPETITIONS[0]!,
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
      { title: 'Arsenal busca consolidar el liderato con su once de gala', source: 'Sky Sports', publishedAt: 'Hoy 09:30' },
      { title: 'Maresca confirma ajustes tácticos en el mediocampo de Chelsea', source: 'The Athletic', publishedAt: 'Ayer 18:00' }
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
    competition: CLIENT_MOCK_COMPETITIONS[1]!,
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
    },
    headToHead: {
      totalMatches: 12,
      homeWins: 7,
      awayWins: 4,
      draws: 1,
      recentMatches: [
        { date: '2024-04-21', homeTeam: 'Real Madrid CF', awayTeam: 'FC Barcelona', score: '3 - 2' },
        { date: '2023-10-28', homeTeam: 'FC Barcelona', awayTeam: 'Real Madrid CF', score: '1 - 2' }
      ]
    }
  },
  {
    id: 'match-103',
    competition: CLIENT_MOCK_COMPETITIONS[0]!,
    utcDate: new Date().toISOString(),
    status: 'LIVE',
    minute: 71,
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
    isMock: true,
    statistics: {
      possession: { home: 47, away: 53 },
      shotsOnTarget: { home: 5, away: 4 },
      totalShots: { home: 12, away: 11 },
      corners: { home: 4, away: 6 },
      fouls: { home: 10, away: 8 }
    }
  },

  // ─── Partidos Colombianos ─────────────────────────────────────────────────
  {
    id: 'match-col-1',
    competition: COLOMBIA_COMPETITIONS[0]!,
    utcDate: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    status: 'SCHEDULED',
    homeTeam: {
      id: 'millonarios',
      name: 'Millonarios FC',
      shortName: 'Millonarios',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Millonarios_F.C._escudo.svg/100px-Millonarios_F.C._escudo.svg.png',
      form: ['W', 'W', 'D', 'W', 'W']
    },
    awayTeam: {
      id: 'santa-fe',
      name: 'Independiente Santa Fe',
      shortName: 'Santa Fe',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Independiente_Santa_Fe_logo.svg/100px-Independiente_Santa_Fe_logo.svg.png',
      form: ['D', 'W', 'L', 'W', 'D']
    },
    score: { home: null, away: null },
    venue: 'Estadio El Campín (Bogotá)',
    isMock: true,
    statistics: {
      possession: { home: 55, away: 45 },
      shotsOnTarget: { home: 5, away: 3 },
      totalShots: { home: 13, away: 9 },
      corners: { home: 6, away: 4 },
      fouls: { home: 11, away: 14 },
      xg: { home: 1.72, away: 0.95 }
    },
    headToHead: {
      totalMatches: 14,
      homeWins: 7,
      awayWins: 4,
      draws: 3,
      recentMatches: [
        { date: '2025-03-12', homeTeam: 'Millonarios FC', awayTeam: 'Independiente Santa Fe', score: '2 - 1' },
        { date: '2024-09-22', homeTeam: 'Independiente Santa Fe', awayTeam: 'Millonarios FC', score: '0 - 0' },
        { date: '2024-04-14', homeTeam: 'Millonarios FC', awayTeam: 'Independiente Santa Fe', score: '1 - 0' }
      ]
    },
    injuries: {
      home: [
        { player: 'Larry Vásquez', position: 'Defensa', status: 'Baja confirmada', reason: 'Lesión muscular' }
      ],
      away: [
        { player: 'Jersson González', position: 'Mediocampo', status: 'Duda', reason: 'Molestias en rodilla' }
      ]
    },
    news: [
      { title: 'Clásico capitalino: Millonarios busca seguir líder del grupo A', source: 'El Colombiano', publishedAt: 'Hoy 08:00' },
      { title: 'Santa Fe recupera a dos titulares para el clásico', source: 'El Espectador', publishedAt: 'Hoy 10:30' }
    ],
    oddsMovement: {
      openingOdds: { home: 2.10, draw: 3.40, away: 3.20 },
      currentOdds: { home: 1.88, draw: 3.50, away: 3.55 },
      trend: 'DOWN',
      movementPercentage: -10.5
    }
  },
  {
    id: 'match-col-2',
    competition: COLOMBIA_COMPETITIONS[0]!,
    utcDate: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    status: 'SCHEDULED',
    homeTeam: {
      id: 'nacional',
      name: 'Atlético Nacional',
      shortName: 'Nacional',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Atletico_Nacional_logo.svg/100px-Atletico_Nacional_logo.svg.png',
      form: ['W', 'W', 'W', 'D', 'W']
    },
    awayTeam: {
      id: 'junior',
      name: 'Junior FC',
      shortName: 'Junior',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Atletico_Junior_crest.svg/100px-Atletico_Junior_crest.svg.png',
      form: ['W', 'L', 'W', 'W', 'D']
    },
    score: { home: null, away: null },
    venue: 'Estadio Atanasio Girardot (Medellín)',
    isMock: true,
    statistics: {
      possession: { home: 58, away: 42 },
      shotsOnTarget: { home: 6, away: 3 },
      totalShots: { home: 16, away: 8 },
      corners: { home: 7, away: 3 },
      fouls: { home: 9, away: 15 },
      xg: { home: 1.95, away: 0.78 }
    },
    headToHead: {
      totalMatches: 16,
      homeWins: 10,
      awayWins: 3,
      draws: 3,
      recentMatches: [
        { date: '2025-02-20', homeTeam: 'Atlético Nacional', awayTeam: 'Junior FC', score: '3 - 1' },
        { date: '2024-08-18', homeTeam: 'Junior FC', awayTeam: 'Atlético Nacional', score: '1 - 2' },
        { date: '2024-03-10', homeTeam: 'Atlético Nacional', awayTeam: 'Junior FC', score: '2 - 0' }
      ]
    },
    injuries: {
      home: [
        { player: 'Dorlan Pabón', position: 'Delantera', status: 'Disponible', reason: '' }
      ],
      away: [
        { player: 'Fredy Hinestroza', position: 'Delantera', status: 'Duda', reason: 'Cuadro gripal' }
      ]
    },
    news: [
      { title: 'Nacional llega invicto al duelo ante Junior buscando el primer lugar', source: 'Win Sports', publishedAt: 'Hoy 09:15' },
      { title: 'Junior viaja a Medellín con plantilla completa tras entrenamiento intenso', source: 'El Heraldo', publishedAt: 'Hoy 11:00' }
    ],
    oddsMovement: {
      openingOdds: { home: 1.80, draw: 3.60, away: 4.00 },
      currentOdds: { home: 1.72, draw: 3.70, away: 4.40 },
      trend: 'DOWN',
      movementPercentage: -4.4
    }
  },
  {
    id: 'match-col-3',
    competition: COLOMBIA_COMPETITIONS[0]!,
    utcDate: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
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
      { title: 'Clásico Vallecaucano: América busca mantener el invicto de local en el Pascual', source: 'El País de Cali', publishedAt: 'Hoy 07:45' },
      { title: 'Deportivo Cali llega en crisis a uno de los partidos más importantes del año', source: 'Win Sports', publishedAt: 'Hoy 10:00' }
    ],
    oddsMovement: {
      openingOdds: { home: 2.00, draw: 3.30, away: 3.60 },
      currentOdds: { home: 1.95, draw: 3.40, away: 3.75 },
      trend: 'DOWN',
      movementPercentage: -2.5
    }
  },
  {
    id: 'match-104',
    competition: EUROPA_COMPETITIONS[0]!,
    utcDate: new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString(), // Mañana (+28h)
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
      recentMatches: [
        { date: '2024-05-14', homeTeam: 'Tottenham Hotspur', awayTeam: 'Manchester City', score: '0 - 2' }
      ]
    },
    injuries: { home: [], away: [] },
    news: [
      { title: 'Haaland en óptimas condiciones para liderar el ataque del City', source: 'BBC Sport', publishedAt: 'Ayer' }
    ]
  },
  {
    id: 'match-105',
    competition: EUROPA_COMPETITIONS[1]!,
    utcDate: new Date(Date.now() + 1000 * 60 * 60 * 52).toISOString(), // Fin de semana (+52h)
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
      recentMatches: [
        { date: '2024-01-25', homeTeam: 'Atlético de Madrid', awayTeam: 'Sevilla FC', score: '1 - 0' }
      ]
    },
    injuries: { home: [], away: [] },
    news: [
      { title: 'Simeone destaca la solidez defensiva del Atlético en el Metropolitano', source: 'Marca', publishedAt: 'Hoy' }
    ]
  },
  {
    id: 'match-col-4',
    competition: COLOMBIA_COMPETITIONS[0]!,
    utcDate: new Date(Date.now() + 1000 * 60 * 60 * 27).toISOString(), // Mañana (+27h)
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
    utcDate: new Date(Date.now() + 1000 * 60 * 60 * 51).toISOString(), // Fin de semana (+51h)
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
  }
];

export const CLIENT_MOCK_ODDS: Record<string, EventOdds> = {
  'match-101': {
    id: 'match-101',
    sportKey: 'soccer_epl',
    sportTitle: 'Premier League',
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
  }
};

export const CLIENT_MOCK_ANALYSIS: Record<string, MatchAnalysisResult> = {
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
    disclaimer: 'Datos mockeados en modo desarrollo. El análisis no constituye asesoría financiera.',
    provider: 'MockAIProvider',
    isMock: true,
    generatedAt: new Date().toISOString()
  }
};
