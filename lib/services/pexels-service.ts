import axios from 'axios';
import { useSettingsStore } from '@/lib/stores/settings.store';
import { useLogsStore } from '@/lib/stores/logs.store';

export interface PexelsPhoto {
  id: number;
  url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

class PexelsService {
  private static instance: PexelsService;
  private readonly BASE_URL = 'https://api.pexels.com/v1';

  private constructor() {}

  static getInstance(): PexelsService {
    if (!PexelsService.instance) {
      PexelsService.instance = new PexelsService();
    }
    return PexelsService.instance;
  }

  async searchPhotos(query: string, perPage: number = 1): Promise<PexelsPhoto[]> {
    const settings = useSettingsStore.getState().getAppSettings();
    const apiKey = (settings as any).pexelsApiKey;

    if (!apiKey) {
      useLogsStore.getState().addLog({
        level: 'warning',
        message: 'Pexels API key not set',
        context: 'PexelsService',
      });
      return [];
    }

    try {
      const response = await axios.get(`${this.BASE_URL}/search`, {
        params: { query, per_page: perPage },
        headers: { Authorization: apiKey },
      });

      return response.data.photos || [];
    } catch (error) {
      console.error('Pexels search error:', error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to fetch images from Pexels',
        context: 'PexelsService',
      });
      return [];
    }
  }
}

export const pexelsService = PexelsService.getInstance();
