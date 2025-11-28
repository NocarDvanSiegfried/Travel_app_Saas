import { BaseEntity } from './BaseEntity';

export class B2BCompany implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly legalDetails: B2BLegalDetails,
    public readonly industry: string,
    public readonly size: 'small' | 'medium' | 'large' | 'enterprise',
    public readonly subscriptionType: 'basic' | 'professional' | 'enterprise',
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      legalDetails: this.legalDetails,
      industry: this.industry,
      size: this.size,
      subscriptionType: this.subscriptionType,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static create(data: Partial<B2BCompany>): B2BCompany {
    return new B2BCompany(
      data.id || '',
      data.name || '',
      data.legalDetails || new B2BLegalDetails('', '', '', ''),
      data.industry || '',
      data.size || 'small',
      data.subscriptionType || 'basic',
      data.isActive ?? true,
      data.createdAt,
      data.updatedAt
    );
  }
}

export class B2BLegalDetails {
  constructor(
    public readonly inn: string,
    public readonly kpp: string,
    public readonly ogrn: string,
    public readonly legalAddress: string,
    public readonly bankAccount?: B2BBankAccount
  ) {}
}

export class B2BBankAccount {
  constructor(
    public readonly bik: string,
    public readonly accountNumber: string,
    public readonly bankName: string
  ) {}
}