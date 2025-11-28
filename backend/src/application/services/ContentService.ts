import { RedisConfig } from '../../infrastructure/config/redis.config';

/**
 * Content Block Types
 */
export type ContentBlockType =
  | 'advertisement'
  | 'recommendation'
  | 'promotion'
  | 'weather'
  | 'news'
  | 'destination'
  | 'service'
  | 'event';

/**
 * Content Block Interface
 */
export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  priority: number;
  targetAudience: 'all' | 'mobile' | 'desktop';
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    region?: string;
    routeId?: string;
    season?: string;
    expiresAt?: Date;
  };
}

/**
 * Content Service
 *
 * Manages dynamic content for route sidebar and other areas.
 * Uses Redis for caching and provides fallback content.
 */
export class ContentService {
  private readonly cacheKey = 'content_blocks';
  private readonly cacheTTL = 300; // 5 minutes
  private readonly defaultBlocks: ContentBlock[];

  constructor() {
    // Initialize default content blocks as fallback
    this.defaultBlocks = this.getDefaultContentBlocks();
  }

  /**
   * Get content blocks for route sidebar
   */
  async getRouteSidebarContent(options: {
    routeId?: string;
    device?: 'mobile' | 'desktop';
    region?: string;
    limit?: number;
  } = {}): Promise<ContentBlock[]> {
    const { routeId, device = 'desktop', region, limit = 10 } = options;

    const cacheKey = `${this.cacheKey}:sidebar:${device}:${region || 'all'}:${routeId || 'none'}`;

    try {
      // Try to get from cache first
      const redis = RedisConfig.getClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        const content = JSON.parse(cached) as ContentBlock[];
        return this.filterAndSortContent(content, { device, limit, routeId, region });
      }
    } catch (error) {
      console.warn('Failed to get content from cache:', error);
    }

    // Generate dynamic content
    const content = await this.generateDynamicContent(options);

    // Cache the result
    try {
      const redis = RedisConfig.getClient();
      await redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(content));
    } catch (error) {
      console.warn('Failed to cache content:', error);
    }

    return this.filterAndSortContent(content, { device, limit, routeId, region });
  }

  /**
   * Generate dynamic content based on context
   */
  private async generateDynamicContent(options: {
    routeId?: string;
    device?: 'mobile' | 'desktop';
    region?: string;
  }): Promise<ContentBlock[]> {
    const content: ContentBlock[] = [];
    const now = new Date();

    // Always include some default content
    content.push(...this.defaultBlocks);

    // Add dynamic content based on season
    const season = this.getCurrentSeason();
    content.push(...this.getSeasonalContent(season));

    // Add regional content if specified
    if (options.region) {
      content.push(...this.getRegionalContent(options.region));
    }

    // Add promotional content
    content.push(...this.getPromotionalContent());

    // Add weather information
    try {
      const weatherBlock = await this.getWeatherContent(options.region);
      if (weatherBlock) {
        content.push(weatherBlock);
      }
    } catch (error) {
      console.warn('Failed to get weather content:', error);
    }

    // Add news content (mock for now)
    content.push(...this.getNewsContent());

    return content;
  }

  /**
   * Filter and sort content based on criteria
   */
  private filterAndSortContent(
    content: ContentBlock[],
    options: {
      device: 'mobile' | 'desktop';
      limit: number;
      routeId?: string;
      region?: string;
    }
  ): ContentBlock[] {
    const { device, limit, routeId, region } = options;

    return content
      .filter(block => {
        // Check if block is active
        if (!block.isActive) return false;

        // Check device targeting
        if (block.targetAudience !== 'all' && block.targetAudience !== device) {
          return false;
        }

        // Check expiration
        if (block.metadata?.expiresAt && new Date(block.metadata.expiresAt) < new Date()) {
          return false;
        }

        // Check region targeting
        if (block.metadata?.region && region && block.metadata.region !== region) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }

  /**
   * Get default content blocks
   */
  private getDefaultContentBlocks(): ContentBlock[] {
    return [
      {
        id: 'default-insurance',
        type: 'recommendation',
        title: 'Защитите свое путешествие',
        content: 'Страхование от задержек и отмены рейсов. Полная защита вашего путешествия по выгодной цене.',
        imageUrl: '/images/insurance-banner.jpg',
        linkUrl: '/insurance',
        linkText: 'Узнать больше',
        priority: 90,
        targetAudience: 'all',
        isActive: true,
        tags: ['insurance', 'protection'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'default-mobile-app',
        type: 'promotion',
        title: 'Мобильное приложение',
        content: 'Скачайте наше приложение для быстрого доступа к бронированию и специальным предложениям.',
        imageUrl: '/images/mobile-app.jpg',
        linkUrl: '#',
        linkText: 'Скачать',
        priority: 80,
        targetAudience: 'mobile',
        isActive: true,
        tags: ['mobile', 'app'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];
  }

  /**
   * Get seasonal content
   */
  private getSeasonalContent(season: string): ContentBlock[] {
    const seasonalContent: Record<string, ContentBlock[]> = {
      winter: [
        {
          id: 'winter-wear',
          type: 'recommendation',
          title: 'Зимние путешествия',
          content: 'Теплая одежда и горячие напитки в каждом рейсе. Путешествуйте с комфортом даже в сильный мороз.',
          imageUrl: '/images/winter-travel.jpg',
          linkUrl: '#',
          linkText: 'Подготовиться',
          priority: 85,
          targetAudience: 'all',
          isActive: true,
          tags: ['winter', 'comfort'],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { season: 'winter' }
        }
      ],
      summer: [
        {
          id: 'summer-festival',
          type: 'event',
          title: 'Летние фестивали Якутии',
          content: 'Не пропустите яркие культурные мероприятия и фестивали этого лета. Билеты уже в продаже.',
          imageUrl: '/images/summer-festival.jpg',
          linkUrl: '#',
          linkText: 'Смотреть программу',
          priority: 85,
          targetAudience: 'all',
          isActive: true,
          tags: ['summer', 'festival', 'culture'],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { season: 'summer' }
        }
      ]
    };

    return seasonalContent[season] || [];
  }

  /**
   * Get regional content
   */
  private getRegionalContent(region: string): ContentBlock[] {
    const regionalContent: Record<string, ContentBlock[]> = {
      'yakutsk': [
        {
          id: 'yakutsk-restaurants',
          type: 'recommendation',
          title: 'Лучшие рестораны Якутска',
          content: 'Откройте для себя якутскую кухню в лучших ресторанах столицы. Традиционные и современные блюда.',
          imageUrl: '/images/yakutsk-food.jpg',
          linkUrl: '#',
          linkText: 'Посмотреть список',
          priority: 75,
          targetAudience: 'all',
          isActive: true,
          tags: ['yakutsk', 'food', 'restaurant'],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { region: 'yakutsk' }
        }
      ],
      'moscow': [
        {
          id: 'moscow-hotels',
          type: 'recommendation',
          title: 'Отели Москвы со скидкой',
          content: 'Бронируйте отели в Москве через наше приложение и получите скидку до 15% на первое проживание.',
          imageUrl: '/images/moscow-hotels.jpg',
          linkUrl: '#',
          linkText: 'Забронировать',
          priority: 75,
          targetAudience: 'all',
          isActive: true,
          tags: ['moscow', 'hotels', 'discount'],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { region: 'moscow' }
        }
      ]
    };

    return regionalContent[region] || [];
  }

  /**
   * Get promotional content
   */
  private getPromotionalContent(): ContentBlock[] {
    return [
      {
        id: 'promo-discount',
        type: 'promotion',
        title: 'Скидка 20% на первые 100 билетов',
        content: 'Успейте забронировать билеты по специальной цене. Предложение ограничено!',
        imageUrl: '/images/discount-banner.jpg',
        linkUrl: '#',
        linkText: 'Получить скидку',
        priority: 95,
        targetAudience: 'all',
        isActive: true,
        tags: ['discount', 'promotion', 'limited'],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      }
    ];
  }

  /**
   * Get weather content
   */
  private async getWeatherContent(region?: string): Promise<ContentBlock | null> {
    // Mock weather data - in real implementation, this would call a weather API
    const mockWeather = {
      'yakutsk': {
        temp: -15,
        condition: 'Облачно с прояснениями',
        icon: '/icons/cloudy-snow.png'
      },
      'moscow': {
        temp: 5,
        condition: 'Переменная облачность',
        icon: '/icons/cloudy.png'
      }
    };

    const weather = region ? mockWeather[region as keyof typeof mockWeather] : mockWeather['yakutsk'];

    if (!weather) return null;

    return {
      id: 'weather-current',
      type: 'weather',
      title: `Погода в ${region || 'Якутске'}`,
      content: `Сейчас: ${weather.temp}°C, ${weather.condition}.`,
      imageUrl: weather.icon,
      linkUrl: '#',
      linkText: 'Прогноз на неделю',
      priority: 60,
      targetAudience: 'all',
      isActive: true,
      tags: ['weather', 'forecast'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get news content
   */
  private getNewsContent(): ContentBlock[] {
    return [
      {
        id: 'news-route-update',
        type: 'news',
        title: 'Новые маршруты из Якутска',
        content: 'Открыты прямые рейсы в Иркутск и Красноярск. Удобные соединения с дальнейшими направлениями.',
        imageUrl: '/images/news-routes.jpg',
        linkUrl: '#',
        linkText: 'Расписание',
        priority: 70,
        targetAudience: 'all',
        isActive: true,
        tags: ['news', 'routes', 'new'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];
  }

  /**
   * Get current season based on date
   */
  private getCurrentSeason(): string {
    const month = new Date().getMonth();

    if (month >= 11 || month <= 1) return 'winter';
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    return 'autumn';
  }

  /**
   * Clear cache for content blocks
   */
  async clearCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const redis = RedisConfig.getClient();
        const keys = await redis.keys(`${this.cacheKey}:${pattern}*`);
        if (keys.length > 0) {
          await redis.del(keys);
        }
      } else {
        const redis = RedisConfig.getClient();
        const keys = await redis.keys(`${this.cacheKey}:*`);
        if (keys.length > 0) {
          await redis.del(keys);
        }
      }
    } catch (error) {
      console.warn('Failed to clear content cache:', error);
    }
  }
}