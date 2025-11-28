import { B2BDelivery, B2BDeliveryCategory, B2BDeliveryStatus, B2BDeliveryPriority } from '../../domain/entities/B2BDelivery';

export interface IB2BDeliveryService {
  createDelivery(deliveryData: CreateDeliveryDto): Promise<B2BDelivery>;
  getDeliveriesByCompany(companyId: string, filters?: DeliveryFilters): Promise<B2BDelivery[]>;
  getDeliveryById(id: string): Promise<B2BDelivery | null>;
  updateDelivery(id: string, updateData: UpdateDeliveryDto): Promise<B2BDelivery>;
  cancelDelivery(id: string, reason?: string): Promise<B2BDelivery>;
  confirmDelivery(id: string): Promise<B2BDelivery>;
  assignCaptain(deliveryId: string, captainId: string): Promise<B2BDelivery>;
  updateDeliveryStatus(id: string, status: B2BDeliveryStatus): Promise<B2BDelivery>;
  getAvailableCaptains(deliveryId: string): Promise<AvailableCaptain[]>;
  calculateDeliveryPrice(deliveryData: PriceCalculationDto): Promise<PriceEstimate>;
  getDeliveryAnalytics(companyId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<DeliveryAnalytics>;
}

export interface CreateDeliveryDto {
  companyId: string;
  routeFrom: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    contactPerson?: string;
    contactPhone?: string;
  };
  routeTo: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    contactPerson?: string;
    contactPhone?: string;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit?: 'cm' | 'mm' | 'in';
  };
  weight: number;
  category: B2BDeliveryCategory;
  priority?: B2BDeliveryPriority;
  insuranceAmount?: number;
  declaredValue?: number;
  notes?: string;
}

export interface UpdateDeliveryDto {
  routeFrom?: Partial<CreateDeliveryDto['routeFrom']>;
  routeTo?: Partial<CreateDeliveryDto['routeTo']>;
  dimensions?: Partial<CreateDeliveryDto['dimensions']>;
  weight?: number;
  category?: B2BDeliveryCategory;
  priority?: B2BDeliveryPriority;
  insuranceAmount?: number;
  declaredValue?: number;
  notes?: string;
}

export interface DeliveryFilters {
  status?: B2BDeliveryStatus[];
  category?: B2BDeliveryCategory[];
  priority?: B2BDeliveryPriority[];
  captainId?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  priceMin?: number;
  priceMax?: number;
}

export interface AvailableCaptain {
  id: string;
  name: string;
  rating: number;
  currentDeliveries: number;
  maxDeliveries: number;
  vehicleType: string;
  estimatedArrival: Date;
  price: number;
}

export interface PriceCalculationDto {
  routeFrom: CreateDeliveryDto['routeFrom'];
  routeTo: CreateDeliveryDto['routeTo'];
  dimensions: CreateDeliveryDto['dimensions'];
  weight: number;
  category: B2BDeliveryCategory;
  priority?: B2BDeliveryPriority;
  insuranceAmount?: number;
}

export interface PriceEstimate {
  basePrice: number;
  distanceFee: number;
  weightFee: number;
  sizeFee: number;
  priorityFee: number;
  insuranceFee: number;
  serviceFee: number;
  totalPrice: number;
  estimatedDeliveryTime: string;
  availableCaptains: number;
}

export interface DeliveryAnalytics {
  totalDeliveries: number;
  deliveredDeliveries: number;
  failedDeliveries: number;
  totalExpenses: number;
  averageDeliveryCost: number;
  averageDeliveryTime: number;
  categoryBreakdown: Record<B2BDeliveryCategory, number>;
  captainPerformance: Array<{
    captainId: string;
    deliveries: number;
    rating: number;
    averageTime: number;
  }>;
  monthlyTrend: Array<{ month: string; count: number; cost: number; successRate: number }>;
}

export class B2BDeliveryService implements IB2BDeliveryService {
  async createDelivery(deliveryData: CreateDeliveryDto): Promise<B2BDelivery> {
    const delivery = B2BDelivery.create({
      companyId: deliveryData.companyId,
      routeFrom: {
        street: deliveryData.routeFrom.street,
        city: deliveryData.routeFrom.city,
        postalCode: deliveryData.routeFrom.postalCode,
        country: deliveryData.routeFrom.country,
        contactPerson: deliveryData.routeFrom.contactPerson,
        contactPhone: deliveryData.routeFrom.contactPhone
      },
      routeTo: {
        street: deliveryData.routeTo.street,
        city: deliveryData.routeTo.city,
        postalCode: deliveryData.routeTo.postalCode,
        country: deliveryData.routeTo.country,
        contactPerson: deliveryData.routeTo.contactPerson,
        contactPhone: deliveryData.routeTo.contactPhone
      },
      dimensions: {
        length: deliveryData.dimensions.length,
        width: deliveryData.dimensions.width,
        height: deliveryData.dimensions.height,
        unit: deliveryData.dimensions.unit || 'cm'
      },
      weight: deliveryData.weight,
      category: deliveryData.category,
      priority: deliveryData.priority || 'standard',
      insuranceAmount: deliveryData.insuranceAmount,
      declaredValue: deliveryData.declaredValue,
      status: 'pending',
      notes: deliveryData.notes
    });

    return delivery;
  }

  async getDeliveriesByCompany(companyId: string, filters?: DeliveryFilters): Promise<B2BDelivery[]> {
    return [];
  }

  async getDeliveryById(id: string): Promise<B2BDelivery | null> {
    return null;
  }

  async updateDelivery(id: string, updateData: UpdateDeliveryDto): Promise<B2BDelivery> {
    const existing = await this.getDeliveryById(id);
    if (!existing) {
      throw new Error('Delivery not found');
    }

    return B2BDelivery.create({
      ...existing,
      ...updateData,
      routeFrom: updateData.routeFrom
        ? { ...existing.routeFrom, ...updateData.routeFrom }
        : existing.routeFrom,
      routeTo: updateData.routeTo
        ? { ...existing.routeTo, ...updateData.routeTo }
        : existing.routeTo,
      dimensions: updateData.dimensions
        ? { ...existing.dimensions, ...updateData.dimensions }
        : existing.dimensions
    });
  }

  async cancelDelivery(id: string, reason?: string): Promise<B2BDelivery> {
    const delivery = await this.getDeliveryById(id);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    if (!delivery.canBeCancelled()) {
      throw new Error('Delivery cannot be cancelled');
    }

    return B2BDelivery.create({
      ...delivery,
      status: 'cancelled',
      notes: reason ? `${delivery.notes || ''}\nОтмена: ${reason}`.trim() : delivery.notes
    });
  }

  async confirmDelivery(id: string): Promise<B2BDelivery> {
    const delivery = await this.getDeliveryById(id);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const priceEstimate = await this.calculateDeliveryPrice({
      routeFrom: {
        street: delivery.routeFrom.street,
        city: delivery.routeFrom.city,
        postalCode: delivery.routeFrom.postalCode,
        country: delivery.routeFrom.country
      },
      routeTo: {
        street: delivery.routeTo.street,
        city: delivery.routeTo.city,
        postalCode: delivery.routeTo.postalCode,
        country: delivery.routeTo.country
      },
      dimensions: {
        length: delivery.dimensions.length,
        width: delivery.dimensions.width,
        height: delivery.dimensions.height,
        unit: delivery.dimensions.unit
      },
      weight: delivery.weight,
      category: delivery.category,
      priority: delivery.priority,
      insuranceAmount: delivery.insuranceAmount
    });

    const estimatedDelivery = new Date();
    estimatedDelivery.setHours(estimatedDelivery.getHours() + this.getEstimatedDeliveryTime(delivery.category, delivery.priority));

    return B2BDelivery.create({
      ...delivery,
      status: 'confirmed',
      deliveryCost: priceEstimate.totalPrice,
      serviceFee: priceEstimate.serviceFee,
      estimatedDelivery,
      trackingNumber: this.generateTrackingNumber()
    });
  }

  async assignCaptain(deliveryId: string, captainId: string): Promise<B2BDelivery> {
    const delivery = await this.getDeliveryById(deliveryId);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    return B2BDelivery.create({
      ...delivery,
      captainId,
      status: 'in_pickup'
    });
  }

  async updateDeliveryStatus(id: string, status: B2BDeliveryStatus): Promise<B2BDelivery> {
    const delivery = await this.getDeliveryById(id);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const updatedDelivery = B2BDelivery.create({
      ...delivery,
      status
    });

    if (status === 'delivered') {
      updatedDelivery.actualDelivery = new Date();
    }

    return updatedDelivery;
  }

  async getAvailableCaptains(deliveryId: string): Promise<AvailableCaptain[]> {
    return [];
  }

  async calculateDeliveryPrice(deliveryData: PriceCalculationDto): Promise<PriceEstimate> {
    const distance = this.calculateDistance(deliveryData.routeFrom.city, deliveryData.routeTo.city);
    const volume = deliveryData.dimensions.length * deliveryData.dimensions.width * deliveryData.dimensions.height;

    const basePrice = 500;
    const distanceFee = Math.round(distance * 15);
    const weightFee = deliveryData.weight > 5 ? Math.round((deliveryData.weight - 5) * 20) : 0;
    const sizeFee = volume > 1000 ? Math.round((volume - 1000) * 0.5) : 0;
    const priorityFee = deliveryData.priority === 'express' ? 300 : deliveryData.priority === 'urgent' ? 800 : 0;
    const insuranceFee = deliveryData.insuranceAmount ? Math.round(deliveryData.insuranceAmount * 0.05) : 0;
    const serviceFee = 1000;

    const totalPrice = basePrice + distanceFee + weightFee + sizeFee + priorityFee + insuranceFee;

    return {
      basePrice,
      distanceFee,
      weightFee,
      sizeFee,
      priorityFee,
      insuranceFee,
      serviceFee,
      totalPrice,
      estimatedDeliveryTime: this.getEstimatedDeliveryTimeText(deliveryData.category, deliveryData.priority),
      availableCaptains: 5
    };
  }

  async getDeliveryAnalytics(companyId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<DeliveryAnalytics> {
    return {
      totalDeliveries: 0,
      deliveredDeliveries: 0,
      failedDeliveries: 0,
      totalExpenses: 0,
      averageDeliveryCost: 0,
      averageDeliveryTime: 0,
      categoryBreakdown: {} as Record<B2BDeliveryCategory, number>,
      captainPerformance: [],
      monthlyTrend: []
    };
  }

  private calculateDistance(fromCity: string, toCity: string): number {
    const cityDistances: Record<string, Record<string, number>> = {
      'Москва': {
        'Санкт-Петербург': 700,
        'Казань': 800,
        'Новосибирск': 2800
      },
      'Санкт-Петербург': {
        'Москва': 700,
        'Казань': 1400,
        'Новосибирск': 2100
      }
    };

    return cityDistances[fromCity]?.[toCity] || 1000;
  }

  private getEstimatedDeliveryTime(category: B2BDeliveryCategory, priority: B2BDeliveryPriority): number {
    const baseTimes = {
      'document': 2,
      'parcel': 4,
      'cargo': 8,
      'fragile': 6,
      'perishable': 3,
      'dangerous': 12
    };

    const priorityMultipliers = {
      'standard': 1,
      'express': 0.5,
      'urgent': 0.3
    };

    return Math.ceil((baseTimes[category] || 4) * (priorityMultipliers[priority] || 1));
  }

  private getEstimatedDeliveryTimeText(category: B2BDeliveryCategory, priority: B2BDeliveryPriority): string {
    const hours = this.getEstimatedDeliveryTime(category, priority);
    return `${hours} часа`;
  }

  private generateTrackingNumber(): string {
    return `TRK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
}