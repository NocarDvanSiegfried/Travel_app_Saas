import { BaseEntity } from './BaseEntity';
import { B2BUser } from './B2BUser';

export class B2BTicket implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly eventName: string,
    public readonly eventDate: Date,
    public readonly employeeId: string,
    public readonly price: number,
    public readonly currency: string = 'RUB',
    public readonly category: B2BTicketCategory,
    public readonly status: B2BTicketStatus,
    public readonly department?: string,
    public readonly purchaseDate?: Date,
    public readonly qrCode?: string,
    public readonly notes?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  static create(data: Partial<B2BTicket>): B2BTicket {
    return new B2BTicket(
      data.id || '',
      data.companyId || '',
      data.eventName || '',
      data.eventDate || new Date(),
      data.employeeId || '',
      data.price || 0,
      data.currency || 'RUB',
      data.category || 'business',
      data.status || 'pending',
      data.department,
      data.purchaseDate,
      data.qrCode,
      data.notes,
      data.createdAt,
      data.updatedAt
    );
  }

  isExpired(): boolean {
    return this.eventDate < new Date();
  }

  canBeCancelled(): boolean {
    const cancellationDeadline = new Date(this.eventDate);
    cancellationDeadline.setDate(cancellationDeadline.getDate() - 1);
    return new Date() < cancellationDeadline && this.status === 'confirmed';
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      companyId: this.companyId,
      eventName: this.eventName,
      eventDate: this.eventDate,
      employeeId: this.employeeId,
      price: this.price,
      currency: this.currency,
      category: this.category,
      status: this.status,
      department: this.department,
      purchaseDate: this.purchaseDate,
      qrCode: this.qrCode,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export type B2BTicketCategory =
  | 'business'
  | 'training'
  | 'conference'
  | 'corporate_event'
  | 'team_building';

export type B2BTicketStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'used'
  | 'expired';