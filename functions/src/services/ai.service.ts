import { ProviderFactory } from '../providers/factory.js';
import { AIProvider, ExpectedValueAssessment, MatchAnalysisPrompt, MatchAnalysisResult } from '../providers/ai/ai.interface.js';
import { globalCache } from './cache.service.js';
import { config } from '../config/index.js';
import { SlidingWindowRateLimiter } from '../utils/rateLimiter.js';

export class AIService {
  private provider: AIProvider;
  private rateLimiter: SlidingWindowRateLimiter;

  constructor(provider?: AIProvider) {
    this.provider = provider || ProviderFactory.getAIProvider();
    this.rateLimiter = new SlidingWindowRateLimiter({
      windowMs: 60000,
      maxRequests: config.rateLimit.maxRequestsPerMinute
    });
  }

  async getMatchAnalysis(prompt: MatchAnalysisPrompt): Promise<MatchAnalysisResult> {
    const cacheKey = `ai:analysis:${prompt.matchId}`;
    const cached = globalCache.get<MatchAnalysisResult>(cacheKey);
    if (cached) return cached;

    const rateCheck = this.rateLimiter.isAllowed('ai-analysis');
    if (!rateCheck.allowed) {
      throw new Error(`[AIService] Límite de tasa excedido. Intente nuevamente en ${Math.ceil(rateCheck.resetMs / 1000)}s.`);
    }

    const result = await this.provider.generateMatchAnalysis(prompt);
    globalCache.set(cacheKey, result, config.cache.analysisTtlSeconds);
    return result;
  }

  async evaluateBetValue(
    selection: string,
    market: string,
    currentOdds: number,
    estimatedProbability: number
  ): Promise<ExpectedValueAssessment> {
    return this.provider.evaluateBetValue(selection, market, currentOdds, estimatedProbability);
  }
}
