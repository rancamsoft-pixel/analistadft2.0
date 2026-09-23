"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockNewsProvider = exports.MOCK_NEWS_ARTICLES = void 0;
exports.MOCK_NEWS_ARTICLES = [
    {
        id: 'news-1',
        title: 'Informe de Lesiones: El delantero estrella listo para el derbi',
        description: 'Completó los entrenamientos sin molestias y estará en la alineación titular este fin de semana.',
        source: 'Sports Intelligence News',
        url: 'https://example.com/sports-news/1',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        sentiment: 'POSITIVE',
        impact: 'HIGH',
        isMock: true
    },
    {
        id: 'news-2',
        title: 'Cambio táctico confirmado para la zaga defensiva',
        description: 'El cuerpo técnico optará por una formación 4-3-3 más compacta para frenar las transiciones rápidas.',
        source: 'Tactical Review',
        url: 'https://example.com/sports-news/2',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        sentiment: 'NEUTRAL',
        impact: 'MEDIUM',
        isMock: true
    }
];
class MockNewsProvider {
    providerName = 'MockNewsProvider';
    async getTeamNews(_teamName) {
        return Promise.resolve(exports.MOCK_NEWS_ARTICLES);
    }
    async getMatchNews(_homeTeam, _awayTeam) {
        return Promise.resolve(exports.MOCK_NEWS_ARTICLES);
    }
}
exports.MockNewsProvider = MockNewsProvider;
//# sourceMappingURL=mockNews.provider.js.map