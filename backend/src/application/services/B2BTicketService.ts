import { B2BTicket, B2BTicketCategory, B2BTicketStatus } from '../../domain/entities/B2BTicket';

export interface IB2BTicketService {
  createTicket(ticketData: CreateTicketDto): Promise<B2BTicket>;
  getTicketsByCompany(companyId: string, filters?: TicketFilters): Promise<B2BTicket[]>;
  getTicketById(id: string): Promise<B2BTicket | null>;
  updateTicket(id: string, updateData: UpdateTicketDto): Promise<B2BTicket>;
  cancelTicket(id: string, reason?: string): Promise<B2BTicket>;
  confirmTicket(id: string): Promise<B2BTicket>;
  assignTicketToEmployee(ticketId: string, employeeId: string): Promise<B2BTicket>;
  getTicketAnalytics(companyId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<TicketAnalytics>;
  bulkCreateTickets(tickets: CreateTicketDto[]): Promise<B2BTicket[]>;
}

export interface CreateTicketDto {
  companyId: string;
  eventName: string;
  eventDate: Date;
  employeeId: string;
  price: number;
  currency?: string;
  category: B2BTicketCategory;
  department?: string;
  notes?: string;
}

export interface UpdateTicketDto {
  eventName?: string;
  eventDate?: Date;
  employeeId?: string;
  price?: number;
  category?: B2BTicketCategory;
  department?: string;
  notes?: string;
}

export interface TicketFilters {
  status?: B2BTicketStatus[];
  category?: B2BTicketCategory[];
  department?: string[];
  employeeId?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  priceMin?: number;
  priceMax?: number;
}

export interface TicketAnalytics {
  totalTickets: number;
  usedTickets: number;
  cancelledTickets: number;
  totalExpenses: number;
  averageTicketPrice: number;
  categoryBreakdown: Record<B2BTicketCategory, number>;
  departmentBreakdown: Record<string, number>;
  monthlyTrend: Array<{ month: string; count: number; cost: number }>;
}

export class B2BTicketService implements IB2BTicketService {
  async createTicket(ticketData: CreateTicketDto): Promise<B2BTicket> {
    const ticket = B2BTicket.create({
      companyId: ticketData.companyId,
      eventName: ticketData.eventName,
      eventDate: ticketData.eventDate,
      employeeId: ticketData.employeeId,
      price: ticketData.price,
      currency: ticketData.currency || 'RUB',
      category: ticketData.category,
      department: ticketData.department,
      notes: ticketData.notes,
      status: 'pending'
    });

    return ticket;
  }

  async getTicketsByCompany(companyId: string, filters?: TicketFilters): Promise<B2BTicket[]> {
    return [];
  }

  async getTicketById(id: string): Promise<B2BTicket | null> {
    return null;
  }

  async updateTicket(id: string, updateData: UpdateTicketDto): Promise<B2BTicket> {
    const existing = await this.getTicketById(id);
    if (!existing) {
      throw new Error('Ticket not found');
    }

    return B2BTicket.create({
      ...existing,
      ...updateData
    });
  }

  async cancelTicket(id: string, reason?: string): Promise<B2BTicket> {
    const ticket = await this.getTicketById(id);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (!ticket.canBeCancelled()) {
      throw new Error('Ticket cannot be cancelled');
    }

    return B2BTicket.create({
      ...ticket,
      status: 'cancelled',
      notes: reason ? `${ticket.notes || ''}\nОтмена: ${reason}`.trim() : ticket.notes
    });
  }

  async confirmTicket(id: string): Promise<B2BTicket> {
    const ticket = await this.getTicketById(id);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return B2BTicket.create({
      ...ticket,
      status: 'confirmed',
      purchaseDate: new Date(),
      qrCode: this.generateQRCode(id)
    });
  }

  async assignTicketToEmployee(ticketId: string, employeeId: string): Promise<B2BTicket> {
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return B2BTicket.create({
      ...ticket,
      employeeId
    });
  }

  async getTicketAnalytics(companyId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<TicketAnalytics> {
    return {
      totalTickets: 0,
      usedTickets: 0,
      cancelledTickets: 0,
      totalExpenses: 0,
      averageTicketPrice: 0,
      categoryBreakdown: {} as Record<B2BTicketCategory, number>,
      departmentBreakdown: {},
      monthlyTrend: []
    };
  }

  async bulkCreateTickets(tickets: CreateTicketDto[]): Promise<B2BTicket[]> {
    return Promise.all(tickets.map(ticket => this.createTicket(ticket)));
  }

  private generateQRCode(ticketId: string): string {
    return `QR_${ticketId}_${Date.now()}`;
  }
}