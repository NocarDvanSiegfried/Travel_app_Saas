import { B2BAnalytics, B2BAnalyticsPeriod, B2BAIInsightType } from '../../domain/entities/B2BAnalytics';

export interface IB2BAnalyticsService {
  generateCompanyAnalytics(companyId: string, period: B2BAnalyticsPeriod): Promise<B2BAnalytics>;
  getAICostOptimizationInsights(companyId: string): Promise<B2BAIInsight[]>;
  predictExpenses(companyId: string, forecastMonths: number): Promise<ExpenseForecast>;
  detectAnomalies(companyId: string, period: B2BAnalyticsPeriod): Promise<AnomalyDetectionResult>;
  generateBudgetRecommendations(companyId: string, targetBudget: number): Promise<BudgetRecommendation[]>;
  getDepartmentEfficiency(companyId: string): Promise<DepartmentEfficiency[]>;
  getUsagePatterns(companyId: string): Promise<UsagePattern[]>;
  getROIMetrics(companyId: string): Promise<ROIMetrics>;
}

export interface ExpenseForecast {
  predictedMonthlyExpenses: number;
  predictedQuarterlyExpenses: number;
  predictedAnnualExpenses: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

export interface AnomalyDetectionResult {
  anomalies: DetectedAnomaly[];
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  recommendedActions: string[];
}

export interface DetectedAnomaly {
  id: string;
  type: 'unusual_spending' | 'sudden_increase' | 'fraud_suspicion' | 'inefficiency';
  description: string;
  severity: 'low' | 'medium' | 'high';
  impact: number;
  date: Date;
  affectedDepartment?: string;
  recommendedAction: string;
}

export interface BudgetRecommendation {
  category: 'tickets' | 'deliveries' | 'insurance' | 'operations';
  currentSpending: number;
  recommendedBudget: number;
  potentialSavings: number;
  reasoning: string;
  implementationSteps: string[];
  timeframe: string;
}

export interface DepartmentEfficiency {
  department: string;
  efficiency: number;
  costPerEmployee: number;
  utilizationRate: number;
  benchmarkComparison: number;
  improvementOpportunities: string[];
}

export interface UsagePattern {
  type: 'seasonal' | 'trend' | 'correlation';
  description: string;
  pattern: Array<{ period: string; value: number; expected: number }>;
  insights: string[];
  businessImpact: string;
}

export interface ROIMetrics {
  overallROI: number;
  ticketROI: number;
  deliveryROI: number;
  costSavings: number;
  timeSavings: number;
  productivityGain: number;
  subscriptionValue: number;
}

export class B2BAnalyticsService implements IB2BAnalyticsService {
  async generateCompanyAnalytics(companyId: string, period: B2BAnalyticsPeriod): Promise<B2BAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const totalExpenses = await this.calculateTotalExpenses(companyId, startDate, endDate);
    const ticketStats = await this.calculateTicketStats(companyId, startDate, endDate);
    const deliveryStats = await this.calculateDeliveryStats(companyId, startDate, endDate);
    const departmentBreakdown = await this.getDepartmentBreakdown(companyId, startDate, endDate);
    const aiInsights = await this.generateAIInsights(companyId, period);
    const costOptimization = await this.generateCostOptimization(companyId);

    return B2BAnalytics.create({
      companyId,
      period,
      periodStart: startDate,
      periodEnd: endDate,
      totalExpenses,
      ticketStats,
      deliveryStats,
      departmentBreakdown,
      aiInsights,
      costOptimization
    });
  }

  async getAICostOptimizationInsights(companyId: string): Promise<B2BAIInsight[]> {
    return [
      {
        type: 'cost_optimization',
        title: 'Оптимизация доставок',
        description: 'Объединение небольших доставок может сэкономить до 15% расходов',
        impact: 'medium',
        potentialSavings: 5000,
        recommendations: [
          'Объединяйте посылки в один заказ',
          'Используйте стандартную доставку вместо экспресс',
          'Планируйте доставки заранее'
        ],
        confidence: 0.85
      },
      {
        type: 'usage_pattern',
        title: 'Сезонные паттерны',
        description: 'Рост расходов на билеты в конце квартала на 30%',
        impact: 'high',
        potentialSavings: 8000,
        recommendations: [
          'Покупайте билеты заранее для получения скидок',
          'Рассмотрите корпоративные договора',
          'Используйте гибкие тарифы'
        ],
        confidence: 0.92
      }
    ];
  }

  async predictExpenses(companyId: string, forecastMonths: number): Promise<ExpenseForecast> {
    return {
      predictedMonthlyExpenses: 150000,
      predictedQuarterlyExpenses: 450000,
      predictedAnnualExpenses: 1800000,
      confidence: 0.87,
      factors: [
        'Сезонный рост доставок',
        'Планируемые корпоративные мероприятия',
        'Инфляция транспортных услуг'
      ],
      recommendations: [
        'Создать резервный фонд 10% от бюджета',
        'Рассмотреть годовые контракты с перевозчиками',
        'Внедрить систему approvals для крупных расходов'
      ]
    };
  }

  async detectAnomalies(companyId: string, period: B2BAnalyticsPeriod): Promise<AnomalyDetectionResult> {
    const anomalies: DetectedAnomaly[] = [
      {
        id: '1',
        type: 'unusual_spending',
        description: 'Резкое увеличение расходов на доставки в маркетинговом отделе',
        severity: 'medium',
        impact: 25000,
        date: new Date(),
        affectedDepartment: 'Маркетинг',
        recommendedAction: 'Проанализировать причины и утвердить дополнительный бюджет'
      }
    ];

    return {
      anomalies,
      riskLevel: 'medium',
      summary: 'Обнаружено 1 аномалия в расходах, требующая внимания',
      recommendedActions: [
        'Проверить легитимность необычных трат',
        'Усилить контроль расходов в проблемных отделах',
        'Обновить бюджетные лимиты'
      ]
    };
  }

  async generateBudgetRecommendations(companyId: string, targetBudget: number): Promise<BudgetRecommendation[]> {
    return [
      {
        category: 'deliveries',
        currentSpending: 120000,
        recommendedBudget: 100000,
        potentialSavings: 20000,
        reasoning: 'Оптимизация маршрутов и объединение доставок',
        implementationSteps: [
          'Внедрить систему группировки доставок',
          'Перейти на годовой контракт с перевозчиком',
          'Использовать стандартные сроки доставки'
        ],
        timeframe: '2-3 месяца'
      },
      {
        category: 'tickets',
        currentSpending: 80000,
        recommendedBudget: 75000,
        potentialSavings: 5000,
        reasoning: 'Раннее бронирование и корпоративные скидки',
        implementationSteps: [
          'Заключить партнерские соглашения с авиакомпаниями',
          'Внедрить политику раннего бронирования',
          'Использовать гибкие тарифы для изменения планов'
        ],
        timeframe: '1-2 месяца'
      }
    ];
  }

  async getDepartmentEfficiency(companyId: string): Promise<DepartmentEfficiency[]> {
    return [
      {
        department: 'Продажи',
        efficiency: 0.85,
        costPerEmployee: 45000,
        utilizationRate: 0.92,
        benchmarkComparison: 0.88,
        improvementOpportunities: [
          'Оптимизация командировочных расходов',
          'Использование видеоконференций вместо поездок'
        ]
      },
      {
        department: 'Маркетинг',
        efficiency: 0.72,
        costPerEmployee: 38000,
        utilizationRate: 0.78,
        benchmarkComparison: 0.80,
        improvementOpportunities: [
          'Централизация закупок рекламных материалов',
          'Планирование доставок материалов заранее'
        ]
      }
    ];
  }

  async getUsagePatterns(companyId: string): Promise<UsagePattern[]> {
    return [
      {
        type: 'seasonal',
        description: 'Пик доставок в конце квартала на 40%',
        pattern: [
          { period: 'Q1', value: 100, expected: 100 },
          { period: 'Q2', value: 105, expected: 100 },
          { period: 'Q3', value: 110, expected: 100 },
          { period: 'Q4', value: 140, expected: 100 }
        ],
        insights: ['Рост связан с отчетными периодами', 'Маркетинговые активности в конце года'],
        businessImpact: 'Необходимо планировать бюджет с учетом сезонности'
      },
      {
        type: 'correlation',
        description: 'Прямая зависимость между количеством сотрудников и расходами на билеты',
        pattern: [
          { period: 'Январь', value: 80, expected: 85 },
          { period: 'Февраль', value: 82, expected: 85 },
          { period: 'Март', value: 88, expected: 85 }
        ],
        insights: ['Стабильная корреляция 0.95', 'Прогнозируемый паттерн поведения'],
        businessImpact: 'Можно точно планировать бюджет на основе роста команды'
      }
    ];
  }

  async getROIMetrics(companyId: string): Promise<ROIMetrics> {
    return {
      overallROI: 2.3,
      ticketROI: 1.8,
      deliveryROI: 2.7,
      costSavings: 150000,
      timeSavings: 240, // часов в месяц
      productivityGain: 0.23,
      subscriptionValue: 45000
    };
  }

  private async calculateTotalExpenses(companyId: string, startDate: Date, endDate: Date) {
    return {
      tickets: 80000,
      deliveries: 120000,
      insurance: 15000,
      total: 215000
    };
  }

  private async calculateTicketStats(companyId: string, startDate: Date, endDate: Date) {
    return {
      total: 45,
      used: 38,
      cancelled: 3,
      averagePrice: 2105,
      mostPopularCategory: 'business'
    };
  }

  private async calculateDeliveryStats(companyId: string, startDate: Date, endDate: Date) {
    return {
      total: 120,
      delivered: 115,
      failed: 2,
      averageCost: 1200,
      averageDeliveryTime: 3.5
    };
  }

  private async getDepartmentBreakdown(companyId: string, startDate: Date, endDate: Date) {
    return [
      {
        departmentName: 'Продажи',
        expenses: 85000,
        ticketCount: 25,
        deliveryCount: 40,
        employeeCount: 12
      },
      {
        departmentName: 'Маркетинг',
        expenses: 62000,
        ticketCount: 12,
        deliveryCount: 35,
        employeeCount: 8
      }
    ];
  }

  private async generateAIInsights(companyId: string, period: B2BAnalyticsPeriod) {
    return await this.getAICostOptimizationInsights(companyId);
  }

  private async generateCostOptimization(companyId: string) {
    return {
      opportunities: [
        {
          category: 'deliveries',
          title: 'Оптимизация маршрутов',
          description: 'Использование оптимизатора маршрутов может сократить расходы на 15%',
          potentialSavings: 18000,
          implementationDifficulty: 'medium',
          timeToImplement: '1-2 месяца',
          actionSteps: [
            'Интеграция с картографической службой',
            'Обучение персонала',
            'Настройка автоматического планирования'
          ]
        }
      ]
    };
  }

  private getPeriodDates(period: B2BAnalyticsPeriod): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }
}