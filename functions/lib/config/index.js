"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    APP_USE_MOCK_DATA: zod_1.z.string().optional().default('true'),
    GEMINI_API_KEY: zod_1.z.string().optional().default(''),
    /** Modelo de Gemini configurable. Default conservador para no quedarse obsoleto. */
    GEMINI_MODEL: zod_1.z.string().optional().default('gemini-1.5-flash-latest'),
    API_FOOTBALL_KEY: zod_1.z.string().optional().default(''),
    THE_ODDS_API_KEY: zod_1.z.string().optional().default(''),
    NEWS_API_KEY: zod_1.z.string().optional().default('')
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.warn('⚠️ Variables de entorno con advertencias de validación:', parsedEnv.error.format());
}
const rawConfig = parsedEnv.success ? parsedEnv.data : {
    APP_USE_MOCK_DATA: 'true',
    GEMINI_API_KEY: '',
    GEMINI_MODEL: 'gemini-1.5-flash-latest',
    API_FOOTBALL_KEY: '',
    THE_ODDS_API_KEY: '',
    NEWS_API_KEY: ''
};
exports.config = {
    isMockMode: rawConfig.APP_USE_MOCK_DATA.toLowerCase() === 'true',
    apiKeys: {
        gemini: rawConfig.GEMINI_API_KEY,
        apiFootball: rawConfig.API_FOOTBALL_KEY,
        theOddsApi: rawConfig.THE_ODDS_API_KEY,
        newsApi: rawConfig.NEWS_API_KEY
    },
    /** Nombre del modelo Gemini leído en tiempo de ejecución. Configurable vía GEMINI_MODEL. */
    geminiModel: rawConfig.GEMINI_MODEL,
    cache: {
        matchesTtlSeconds: 120, // 2 minutos para partidos
        oddsTtlSeconds: 60, // 1 minuto para cuotas
        analysisTtlSeconds: 1800 // 30 minutos para análisis de IA
    },
    rateLimit: {
        maxRequestsPerMinute: 60
    },
    circuitBreaker: {
        failureThreshold: 4,
        recoveryTimeMs: 30000 // 30 segundos en modo abierto
    }
};
//# sourceMappingURL=index.js.map