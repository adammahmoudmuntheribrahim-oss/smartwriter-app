import { GoogleGenerativeAI } from '@google/generative-ai';
import { useLogsStore } from '@/lib/stores/logs.store';

export interface ContentScores {
  seoScore: number;
  humanScore: number;
  readabilityScore: number;
  engagementScore: number;
}

export interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  scores: ContentScores;
  suggestedTitles: string[];
  suggestedTags: string[];
  suggestedKeywords: string[];
}

export type TemplateType = 'seo' | 'affiliate' | 'review' | 'tutorial' | 'news' | 'rewrite' | 'humanized';

export class GeminiEnhancedService {
  private static instance: GeminiEnhancedService;
  private client: GoogleGenerativeAI | null = null;

  private constructor() {}

  static getInstance(): GeminiEnhancedService {
    if (!GeminiEnhancedService.instance) {
      GeminiEnhancedService.instance = new GeminiEnhancedService();
    }
    return GeminiEnhancedService.instance;
  }

  /**
   * Initialize the service with API key
   */
  initialize(apiKey: string): void {
    try {
      this.client = new GoogleGenerativeAI(apiKey);
      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Gemini service initialized',
        context: 'GeminiEnhancedService',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to initialize Gemini service',
        context: 'GeminiEnhancedService',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Generate content based on template and topic
   */
  async generateContent(
    topic: string,
    template: TemplateType,
    keywords?: string[]
  ): Promise<GeneratedContent> {
    if (!this.client) {
      throw new Error('Gemini service not initialized');
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });

      const templatePrompts: Record<TemplateType, string> = {
        seo: `Generate an SEO-optimized article about "${topic}". Include keywords: ${keywords?.join(', ') || 'relevant keywords'}. The article should be 800-1000 words, well-structured with headings, and optimized for search engines.`,
        affiliate: `Generate an affiliate marketing article about "${topic}". Include product recommendations, benefits, and affiliate links suggestions. Make it persuasive and conversion-focused.`,
        review: `Generate a detailed product/service review for "${topic}". Include pros, cons, pricing, and recommendations. Make it comprehensive and helpful.`,
        tutorial: `Generate a step-by-step tutorial about "${topic}". Include clear instructions, tips, and examples. Make it easy to follow.`,
        news: `Generate a news article about "${topic}". Include current information, quotes, and context. Make it timely and informative.`,
        rewrite: `Rewrite and improve the following content about "${topic}": Make it more engaging, clear, and professional.`,
        humanized: `Generate human-like, conversational content about "${topic}". Avoid robotic language and make it feel natural and engaging.`,
      };

      const prompt = templatePrompts[template];

      const response = await model.generateContent(prompt);
      const content = response.response.text();

      // Parse and structure the response
      const generatedContent = this.parseGeneratedContent(content, topic);

      // Calculate scores
      const scores = await this.calculateContentScores(generatedContent.content, keywords);
      generatedContent.scores = scores;

      // Generate suggestions
      const suggestions = await this.generateSuggestions(topic, generatedContent.content);
      generatedContent.suggestedTitles = suggestions.titles;
      generatedContent.suggestedTags = suggestions.tags;
      generatedContent.suggestedKeywords = suggestions.keywords;

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Content generated successfully',
        context: 'GeminiEnhancedService',
        data: { template, topic },
      });

      return generatedContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to generate content',
        context: 'GeminiEnhancedService',
        data: { error: errorMessage, template, topic },
      });
      throw error;
    }
  }

  /**
   * Calculate content quality scores
   */
  private async calculateContentScores(
    content: string,
    keywords?: string[]
  ): Promise<ContentScores> {
    try {
      const wordCount = content.split(/\s+/).length;
      const sentenceCount = content.split(/[.!?]+/).length;
      const paragraphCount = content.split(/\n\n+/).length;

      // SEO Score (0-100)
      let seoScore = 50;
      if (wordCount >= 800) seoScore += 20;
      if (wordCount >= 1000) seoScore += 10;
      if (keywords && keywords.length > 0) {
        const keywordMatches = keywords.filter((kw) =>
          content.toLowerCase().includes(kw.toLowerCase())
        ).length;
        seoScore += Math.min(keywordMatches * 5, 20);
      }
      seoScore = Math.min(seoScore, 100);

      // Human Score (0-100) - based on variety and structure
      let humanScore = 50;
      if (paragraphCount >= 5) humanScore += 20;
      if (sentenceCount >= 20) humanScore += 15;
      if (content.includes('?')) humanScore += 10;
      if (content.includes('!')) humanScore += 5;
      humanScore = Math.min(humanScore, 100);

      // Readability Score (0-100)
      const avgWordsPerSentence = wordCount / sentenceCount;
      let readabilityScore = 50;
      if (avgWordsPerSentence < 20) readabilityScore += 30;
      if (avgWordsPerSentence < 15) readabilityScore += 10;
      if (paragraphCount >= 5) readabilityScore += 10;
      readabilityScore = Math.min(readabilityScore, 100);

      // Engagement Score (0-100)
      let engagementScore = 50;
      const hasHeadings = content.includes('#');
      const hasLists = content.includes('-') || content.includes('•');
      const hasQuotes = content.includes('"');

      if (hasHeadings) engagementScore += 20;
      if (hasLists) engagementScore += 20;
      if (hasQuotes) engagementScore += 10;
      if (wordCount >= 1000) engagementScore += 10;
      engagementScore = Math.min(engagementScore, 100);

      return {
        seoScore: Math.round(seoScore),
        humanScore: Math.round(humanScore),
        readabilityScore: Math.round(readabilityScore),
        engagementScore: Math.round(engagementScore),
      };
    } catch (error) {
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Error calculating content scores',
        context: 'GeminiEnhancedService',
      });

      return {
        seoScore: 50,
        humanScore: 50,
        readabilityScore: 50,
        engagementScore: 50,
      };
    }
  }

  /**
   * Generate content suggestions
   */
  private async generateSuggestions(
    topic: string,
    content: string
  ): Promise<{
    titles: string[];
    tags: string[];
    keywords: string[];
  }> {
    try {
      if (!this.client) {
        return { titles: [], tags: [], keywords: [] };
      }

      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });

      // Generate titles
      const titlesResponse = await model.generateContent(
        `Generate 3 alternative SEO-friendly titles for an article about "${topic}". Return only the titles, one per line.`
      );
      const titles = titlesResponse.response
        .text()
        .split('\n')
        .filter((t: string) => t.trim())
        .slice(0, 3);

      // Generate tags
      const tagsResponse = await model.generateContent(
        `Generate 5 relevant tags for an article about "${topic}". Return only the tags, comma-separated.`
      );
      const tags = tagsResponse.response
        .text()
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t)
        .slice(0, 5);

      // Generate keywords
      const keywordsResponse = await model.generateContent(
        `Generate 5 SEO keywords for an article about "${topic}". Return only the keywords, comma-separated.`
      );
      const keywords = keywordsResponse.response
        .text()
        .split(',')
        .map((k: string) => k.trim())
        .filter((k: string) => k)
        .slice(0, 5);

      return { titles, tags, keywords };
    } catch (error) {
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Error generating suggestions',
        context: 'GeminiEnhancedService',
      });

      return { titles: [], tags: [], keywords: [] };
    }
  }

  /**
   * Parse generated content into structured format
   */
  private parseGeneratedContent(content: string, topic: string): GeneratedContent {
    // Extract title (first line or generate one)
    const lines = content.split('\n').filter((l) => l.trim());
    let title = lines[0]?.trim() || `Article about ${topic}`;

    // Remove title from content if it's the first line
    if (lines[0] === title) {
      lines.shift();
    }

    const fullContent = lines.join('\n');

    // Generate excerpt (first 150 characters)
    const excerpt = fullContent.substring(0, 150).trim() + '...';

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return {
      title,
      content: fullContent,
      excerpt,
      slug,
      scores: {
        seoScore: 50,
        humanScore: 50,
        readabilityScore: 50,
        engagementScore: 50,
      },
      suggestedTitles: [],
      suggestedTags: [],
      suggestedKeywords: [],
    };
  }

  /**
   * Humanize AI-generated content
   */
  async humanizeContent(content: string): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini service not initialized');
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });

      const response = await model.generateContent(
        `Make the following content more human-like and conversational. Remove robotic language and add personality:\n\n${content}`
      );

      const humanizedContent = response.response.text();

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Content humanized successfully',
        context: 'GeminiEnhancedService',
      });

      return humanizedContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to humanize content',
        context: 'GeminiEnhancedService',
        data: { error: errorMessage },
      });
      throw error;
    }
  }

  /**
   * Rewrite content
   */
  async rewriteContent(content: string): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini service not initialized');
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });

      const response = await model.generateContent(
        `Rewrite the following content to make it more engaging, clear, and professional:\n\n${content}`
      );

      const rewrittenContent = response.response.text();

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Content rewritten successfully',
        context: 'GeminiEnhancedService',
      });

      return rewrittenContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to rewrite content',
        context: 'GeminiEnhancedService',
        data: { error: errorMessage },
      });
      throw error;
    }
  }
}

export const geminiService = GeminiEnhancedService.getInstance();
