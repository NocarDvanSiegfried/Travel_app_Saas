import { BaseEntity } from './BaseEntity';

export class B2BSubscription implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly plan: B2BSubscriptionPlan,
    public readonly status: B2BSubscriptionStatus,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly monthlyFee: number,
    public readonly features: B2BSubscriptionFeature[],
    public readonly employeeLimit?: number,
    public readonly ticketQuota?: number,
    public readonly deliveryQuota?: number,
    public readonly isAutoRenew: boolean = false,
    public readonly cancelledAt?: Date,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  static create(data: Partial<B2BSubscription>): B2BSubscription {
    return new B2BSubscription(
      data.id || '',
      data.companyId || '',
      data.plan || 'basic',
      data.status || 'active',
      data.startDate || new Date(),
      data.endDate || new Date(),
      data.monthlyFee || 0,
      data.features || [],
      data.employeeLimit,
      data.ticketQuota,
      data.deliveryQuota,
      data.isAutoRenew ?? false,
      data.cancelledAt,
      data.createdAt,
      data.updatedAt
    );
  }

  isActive(): boolean {
    const now = new Date();
    return this.status === 'active' && now >= this.startDate && now <= this.endDate;
  }

  isExpired(): boolean {
    return new Date() > this.endDate;
  }

  hasFeature(feature: B2BSubscriptionFeature): boolean {
    return this.features.includes(feature);
  }

  getDaysUntilExpiration(): number {
    const now = new Date();
    const diffTime = this.endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      companyId: this.companyId,
      plan: this.plan,
      status: this.status,
      startDate: this.startDate,
      endDate: this.endDate,
      monthlyFee: this.monthlyFee,
      features: this.features,
      employeeLimit: this.employeeLimit,
      ticketQuota: this.ticketQuota,
      deliveryQuota: this.deliveryQuota,
      isAutoRenew: this.isAutoRenew,
      cancelledAt: this.cancelledAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export type B2BSubscriptionPlan =
  | 'basic'
  | 'professional'
  | 'enterprise';

export type B2BSubscriptionStatus =
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'suspended';

export type B2BSubscriptionFeature =
  | 'unlimited_employees'
  | 'advanced_analytics'
  | 'ai_insights'
  | 'custom_reports'
  | 'api_access'
  | 'priority_support'
  | 'bulk_operations'
  | 'delivery_optimization'
  | 'expense_management'
  | 'budget_tracking'
  | 'multi_department';