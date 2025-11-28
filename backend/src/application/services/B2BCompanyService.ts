import { B2BCompany, B2BLegalDetails, B2BBankAccount } from '../../domain/entities/B2BCompany';
import { B2BUser, B2BUserRole } from '../../domain/entities/B2BUser';
import { B2BSubscription, B2BSubscriptionPlan } from '../../domain/entities/B2BSubscription';

export interface IB2BCompanyService {
  createCompany(companyData: CreateCompanyDto): Promise<B2BCompany>;
  getCompanyById(id: string): Promise<B2BCompany | null>;
  updateCompany(id: string, updateData: UpdateCompanyDto): Promise<B2BCompany>;
  deactivateCompany(id: string): Promise<void>;
  getCompanyEmployees(companyId: string): Promise<B2BUser[]>;
  addEmployeeToCompany(companyId: string, employeeData: AddEmployeeDto): Promise<B2BUser>;
  removeEmployeeFromCompany(companyId: string, employeeId: string): Promise<void>;
  updateEmployeeRole(employeeId: string, role: B2BUserRole): Promise<B2BUser>;
  getCompanySubscription(companyId: string): Promise<B2BSubscription | null>;
  upgradeSubscriptionPlan(companyId: string, plan: B2BSubscriptionPlan): Promise<B2BSubscription>;
}

export interface CreateCompanyDto {
  name: string;
  legalDetails: {
    inn: string;
    kpp: string;
    ogrn: string;
    legalAddress: string;
    bankAccount?: {
      bik: string;
      accountNumber: string;
      bankName: string;
    };
  };
  industry: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  subscriptionPlan: B2BSubscriptionPlan;
  adminUser: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  };
}

export interface UpdateCompanyDto {
  name?: string;
  legalDetails?: Partial<B2BLegalDetails>;
  industry?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  isActive?: boolean;
}

export interface AddEmployeeDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: B2BUserRole;
  department?: string;
  position?: string;
  managerId?: string;
}

export class B2BCompanyService implements IB2BCompanyService {
  async createCompany(companyData: CreateCompanyDto): Promise<B2BCompany> {
    const company = B2BCompany.create({
      name: companyData.name,
      legalDetails: new B2BLegalDetails(
        companyData.legalDetails.inn,
        companyData.legalDetails.kpp,
        companyData.legalDetails.ogrn,
        companyData.legalDetails.legalAddress,
        companyData.legalDetails.bankAccount
          ? new B2BBankAccount(
              companyData.legalDetails.bankAccount.bik,
              companyData.legalDetails.bankAccount.accountNumber,
              companyData.legalDetails.bankAccount.bankName
            )
          : undefined
      ),
      industry: companyData.industry,
      size: companyData.size,
      subscriptionType: companyData.subscriptionPlan
    });

    return company;
  }

  async getCompanyById(id: string): Promise<B2BCompany | null> {
    return null;
  }

  async updateCompany(id: string, updateData: UpdateCompanyDto): Promise<B2BCompany> {
    const existing = await this.getCompanyById(id);
    if (!existing) {
      throw new Error('Company not found');
    }

    return B2BCompany.create({
      ...existing,
      ...updateData,
      legalDetails: updateData.legalDetails
        ? { ...existing.legalDetails, ...updateData.legalDetails }
        : existing.legalDetails
    });
  }

  async deactivateCompany(id: string): Promise<void> {
    const company = await this.getCompanyById(id);
    if (!company) {
      throw new Error('Company not found');
    }
  }

  async getCompanyEmployees(companyId: string): Promise<B2BUser[]> {
    return [];
  }

  async addEmployeeToCompany(companyId: string, employeeData: AddEmployeeDto): Promise<B2BUser> {
    return B2BUser.create({
      companyId,
      email: employeeData.email,
      passwordHash: '', // Will be set by auth service
      fullName: employeeData.fullName,
      phone: employeeData.phone,
      role: employeeData.role,
      department: employeeData.department,
      position: employeeData.position,
      managerId: employeeData.managerId
    });
  }

  async removeEmployeeFromCompany(companyId: string, employeeId: string): Promise<void> {

  }

  async updateEmployeeRole(employeeId: string, role: B2BUserRole): Promise<B2BUser> {
    return B2BUser.create({
      id: employeeId,
      email: '',
      passwordHash: '',
      fullName: '',
      companyId: '',
      role
    });
  }

  async getCompanySubscription(companyId: string): Promise<B2BSubscription | null> {
    return null;
  }

  async upgradeSubscriptionPlan(companyId: string, plan: B2BSubscriptionPlan): Promise<B2BSubscription> {
    return B2BSubscription.create({
      companyId,
      plan,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      monthlyFee: this.getPlanPrice(plan),
      features: this.getPlanFeatures(plan)
    });
  }

  private getPlanPrice(plan: B2BSubscriptionPlan): number {
    switch (plan) {
      case 'basic': return 5000;
      case 'professional': return 15000;
      case 'enterprise': return 50000;
      default: return 0;
    }
  }

  private getPlanFeatures(plan: B2BSubscriptionPlan) {
    switch (plan) {
      case 'basic':
        return ['bulk_operations', 'expense_management'];
      case 'professional':
        return ['unlimited_employees', 'advanced_analytics', 'ai_insights', 'bulk_operations', 'expense_management', 'budget_tracking'];
      case 'enterprise':
        return ['unlimited_employees', 'advanced_analytics', 'ai_insights', 'custom_reports', 'api_access', 'priority_support', 'bulk_operations', 'delivery_optimization', 'expense_management', 'budget_tracking', 'multi_department'];
      default:
        return [];
    }
  }
}