import { BaseEntity } from './BaseEntity';

export class B2BAnalytics implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly period: B2BAnalyticsPeriod,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly totalExpenses: B2BExpensesBreakdown,
    public readonly ticketStats: B2BTicketStats,
    public readonly deliveryStats: B2BDeliveryStats,
    public readonly departmentBreakdown: B2BDepartmentBreakdown[],
    public readonly aiInsights: B2BAIInsight[],
    public readonly costOptimization: B2BCostOptimization,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  static create(data: Partial<B2BAnalytics>): B2BAnalytics {
    return new B2BAnalytics(
      data.id || '',
      data.companyId || '',
      data.period || 'monthly',
      data.periodStart || new Date(),
      data.periodEnd || new Date(),
      data.totalExpenses || new B2BExpensesBreakdown(0, 0, 0, 0),
      data.ticketStats || new B2BTicketStats(0, 0, 0),
      data.deliveryStats || new B2BDeliveryStats(0, 0, 0),
      data.departmentBreakdown || [],
      data.aiInsights || [],
      data.costOptimization || new B2BCostOptimization([]),
      data.createdAt,
      data.updatedAt
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      companyId: this.companyId,
      period: this.period,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      totalExpenses: this.totalExpenses,
      ticketStats: this.ticketStats,
      deliveryStats: this.deliveryStats,
      departmentBreakdown: this.departmentBreakdown,
      aiInsights: this.aiInsights,
      costOptimization: this.costOptimization,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class B2BExpensesBreakdown {
  constructor(
    public readonly tickets: number,
    public readonly deliveries: number,
    public readonly insurance: number,
    public readonly total: number
  ) {}
}

export class B2BTicketStats {
  constructor(
    public readonly total: number,
    public readonly used: number,
    public readonly cancelled: number,
    public readonly averagePrice: number = 0,
    public readonly mostPopularCategory?: string
  ) {}
}

export class B2BDeliveryStats {
  constructor(
    public readonly total: number,
    public readonly delivered: number,
    public readonly failed: number,
    public readonly averageCost: number = 0,
    public readonly averageDeliveryTime?: number
  ) {}
}

export class B2BDepartmentBreakdown {
  constructor(
    public readonly departmentName: string,
    public readonly expenses: number,
    public readonly ticketCount: number,
    public readonly deliveryCount: number,
    public readonly employeeCount: number
  ) {}
}

export class B2BAIInsight {
  constructor(
    public readonly type: B2BAIInsightType,
    public readonly title: string,
    public readonly description: string,
    public readonly impact: 'low' | 'medium' | 'high',
    public readonly recommendations: string[],
    public readonly confidence: number,
    public readonly potentialSavings?: number
  ) {}
}

export class B2BCostOptimization {
  constructor(
    public readonly opportunities: B2BOptimizationOpportunity[]
  ) {}
}

export class B2BOptimizationOpportunity {
  constructor(
    public readonly category: 'tickets' | 'deliveries' | 'insurance' | 'subscription',
    public readonly title: string,
    public readonly description: string,
    public readonly potentialSavings: number,
    public readonly implementationDifficulty: 'easy' | 'medium' | 'hard',
    public readonly timeToImplement: string,
    public readonly actionSteps: string[]
  ) {}
}

export type B2BAnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type B2BAIInsightType =
  | 'cost_optimization'
  | 'usage_pattern'
  | 'anomaly_detection'
  | 'budget_forecast'
  | 'efficiency_improvement';