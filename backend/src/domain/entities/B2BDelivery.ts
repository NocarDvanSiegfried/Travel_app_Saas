import { BaseEntity } from './BaseEntity';

export class B2BDelivery implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly routeFrom: B2BDeliveryAddress,
    public readonly routeTo: B2BDeliveryAddress,
    public readonly dimensions: B2BDeliveryDimensions,
    public readonly weight: number,
    public readonly category: B2BDeliveryCategory,
    public readonly status: B2BDeliveryStatus,
    public readonly priority: B2BDeliveryPriority,
    public readonly captainId?: string,
    public readonly insuranceAmount?: number,
    public readonly declaredValue?: number,
    public readonly estimatedDelivery?: Date,
    public readonly actualDelivery?: Date,
    public readonly deliveryCost?: number,
    public readonly serviceFee?: number,
    public readonly trackingNumber?: string,
    public readonly notes?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  static create(data: Partial<B2BDelivery>): B2BDelivery {
    return new B2BDelivery(
      data.id || '',
      data.companyId || '',
      data.routeFrom || new B2BDeliveryAddress('', '', '', ''),
      data.routeTo || new B2BDeliveryAddress('', '', '', ''),
      data.dimensions || new B2BDeliveryDimensions(0, 0, 0),
      data.weight || 0,
      data.category || 'document',
      data.status || 'pending',
      data.priority || 'standard',
      data.captainId,
      data.insuranceAmount,
      data.declaredValue,
      data.estimatedDelivery,
      data.actualDelivery,
      data.deliveryCost,
      data.serviceFee,
      data.trackingNumber,
      data.notes,
      data.createdAt,
      data.updatedAt
    );
  }

  getVolume(): number {
    return this.dimensions.length * this.dimensions.width * this.dimensions.height;
  }

  getWeightCategory(): string {
    if (this.weight <= 1) return 'light';
    if (this.weight <= 5) return 'medium';
    if (this.weight <= 20) return 'heavy';
    return 'extra_heavy';
  }

  canBeCancelled(): boolean {
    return ['pending', 'confirmed'].includes(this.status);
  }

  isInTransit(): boolean {
    return ['in_pickup', 'in_transit', 'out_for_delivery'].includes(this.status);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      companyId: this.companyId,
      routeFrom: this.routeFrom,
      routeTo: this.routeTo,
      dimensions: this.dimensions,
      weight: this.weight,
      captainId: this.captainId,
      insuranceAmount: this.insuranceAmount,
      declaredValue: this.declaredValue,
      category: this.category,
      status: this.status,
      priority: this.priority,
      estimatedDelivery: this.estimatedDelivery,
      actualDelivery: this.actualDelivery,
      deliveryCost: this.deliveryCost,
      serviceFee: this.serviceFee,
      trackingNumber: this.trackingNumber,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class B2BDeliveryAddress {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly postalCode: string,
    public readonly country: string,
    public readonly latitude?: number,
    public readonly longitude?: number,
    public readonly contactPerson?: string,
    public readonly contactPhone?: string
  ) {}

  getFullAddress(): string {
    return `${this.street}, ${this.city}, ${this.postalCode}, ${this.country}`;
  }
}

export class B2BDeliveryDimensions {
  constructor(
    public readonly length: number,
    public readonly width: number,
    public readonly height: number,
    public readonly unit: 'cm' | 'mm' | 'in' = 'cm'
  ) {}
}

export type B2BDeliveryCategory =
  | 'document'
  | 'parcel'
  | 'cargo'
  | 'fragile'
  | 'perishable'
  | 'dangerous';

export type B2BDeliveryStatus =
  | 'pending'
  | 'confirmed'
  | 'in_pickup'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export type B2BDeliveryPriority =
  | 'standard'
  | 'express'
  | 'urgent';