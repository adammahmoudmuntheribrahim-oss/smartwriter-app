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
  metaDescription?: string;
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

  initialize(apiKey: string): void {
    try {
      this.client = new GoogleGenerativeAI(apiKey);
      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Gemini service initialized',
        context: 'GeminiEnhancedService',
      });
    } catch (error) {
      console.error('Gemini init error:', error);
    }
  }

  async generateContent(
    topic: string,
    template: TemplateType,
    keywords?: string[]
  ): Promise<GeneratedContent> {
    if (!this.client) throw new Error('Gemini service not initialized');

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Generate a high-quality ${template} article about "${topic}". 
      Include these keywords: ${keywords?.join(', ') || 'relevant SEO keywords'}.
      Format the output as a structured article with headings.`;

      const response = await model.generateContent(prompt);
      const content = response.response.text();

      const generatedContent = this.parseGeneratedContent(content, topic);
      generatedContent.scores = await this.calculateContentScores(content, keywords);
      
      const suggestions = await this.generateSuggestions(topic, content);
      generatedContent.suggestedTitles = suggestions.titles;
      generatedContent.suggestedTags = suggestions.tags;
      generatedContent.suggestedKeywords = suggestions.keywords;

      return generatedContent;
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  }

  private async calculateContentScores(content: string, keywords?: string[]): Promise<ContentScores> {
    const wordCount = content.split(/\s+/).length;
    return {
      seoScore: Math.min(70 + (wordCount > 500 ? 20 : 0), 100),
      humanScore: 85,
      readabilityScore: 80,
      engagementScore: 75,
    };
  }

  private async generateSuggestions(topic: string, content: string) {
    return {
      titles: [topic, `Best of ${topic}`, `Guide to ${topic}`],
      tags: [topic.split(' ')[0], 'AI', 'Writing'],
      keywords: [topic, 'SEO', 'Content'],
    };
  }

  private parseGeneratedContent(content: string, topic: string): GeneratedContent {
    const lines = content.split('\n').filter(l => l.trim());
    const title = lines[0] || topic;
    return {
      title,
      content,
      excerpt: content.substring(0, 150),
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      scores: { seoScore: 0, humanScore: 0, readabilityScore: 0, engagementScore: 0 },
      suggestedTitles: [],
      suggestedTags: [],
      suggestedKeywords: [],
    };
  }

  async humanizeContent(content: string): Promise<string> {
    if (!this.client) throw new Error('Gemini service not initialized');
    const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
    const response = await model.generateContent(`Humanize this content: ${content}`);
    return response.response.text();
  }
}

export const geminiService = GeminiEnhancedService.getInstance();
