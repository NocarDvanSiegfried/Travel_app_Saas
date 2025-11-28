import { User } from './User';

export class B2BUser extends User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly fullName: string,
    public readonly companyId: string,
    public readonly role: B2BUserRole,
    public readonly phone?: string,
    public readonly avatarUrl?: string,
    public readonly department?: string,
    public readonly position?: string,
    public readonly managerId?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly lastLoginAt?: Date
  ) {
    super(id, email, passwordHash, fullName, phone, avatarUrl, createdAt, updatedAt, lastLoginAt);
  }

  static create(data: Partial<B2BUser>): B2BUser {
    return new B2BUser(
      data.id || '',
      data.email || '',
      data.passwordHash || '',
      data.fullName || '',
      data.companyId || '',
      data.role || B2BUserRole.EMPLOYEE,
      data.phone,
      data.avatarUrl,
      data.department,
      data.position,
      data.managerId,
      data.createdAt,
      data.updatedAt,
      data.lastLoginAt
    );
  }

  canManageCompany(): boolean {
    return this.role === 'super_admin' || this.role === 'company_admin';
  }

  canManageEmployees(): boolean {
    return this.role === 'super_admin' || this.role === 'company_admin' || this.role === 'department_manager';
  }

  canApproveExpenses(): boolean {
    return this.role === 'super_admin' || this.role === 'company_admin' || this.role === 'department_manager';
  }

  // Enhanced permission checking methods
  canAccessBalance(): boolean {
    const permissions = ROLE_PERMISSIONS[this.role];
    return permissions.some(p =>
      p.resource === 'balance' &&
      (p.action === '*' || p.action === 'view')
    );
  }

  canBookTickets(): boolean {
    const permissions = ROLE_PERMISSIONS[this.role];
    return permissions.some(p =>
      p.resource === 'tickets' &&
      (p.action === '*' || (Array.isArray(p.action) && p.action.includes('create')))
    );
  }

  canManageDeposit(): boolean {
    const permissions = ROLE_PERMISSIONS[this.role];
    return permissions.some(p =>
      p.resource === 'deposit' &&
      (p.action === '*' || p.action === 'replenish')
    );
  }

  canExportReports(): boolean {
    const permissions = ROLE_PERMISSIONS[this.role];
    return permissions.some(p =>
      (p.resource === 'reports' || p.resource === 'transactions') &&
      (p.action === '*' || (Array.isArray(p.action) && p.action.includes('export')))
    );
  }

  canViewAuditLog(): boolean {
    const permissions = ROLE_PERMISSIONS[this.role];
    return permissions.some(p =>
      p.resource === 'audit' &&
      (p.action === '*' || p.action === 'view')
    );
  }

  hasPermission(resource: string, action: string): boolean {
    const permissions = ROLE_PERMISSIONS[this.role];

    return permissions.some(p => {
      // Check resource match
      const resourceMatch = p.resource === '*' || p.resource === resource;
      if (!resourceMatch) return false;

      // Check action match
      if (p.action === '*') return true;
      if (Array.isArray(p.action)) return p.action.includes(action);
      return p.action === action;
    });
  }

  getPermissionLevel(): number {
    return ROLE_HIERARCHY[this.role] || 0;
  }

  canAccessFeature(feature: string): boolean {
    // Feature-based access control for subscription tiers
    const featuresByRole: Record<B2BUserRole, string[]> = {
      [B2BUserRole.SUPER_ADMIN]: ['*'],
      [B2BUserRole.COMPANY_ADMIN]: ['analytics', 'advanced_reports', 'bulk_operations', 'api_access'],
      [B2BUserRole.DEPARTMENT_MANAGER]: ['department_analytics', 'expense_management'],
      [B2BUserRole.ACCOUNTANT]: ['financial_reports', 'transaction_export'],
      [B2BUserRole.BOOKING_AGENT]: ['advanced_search', 'ticket_management'],
      [B2BUserRole.CAPTAIN]: ['delivery_tracking', 'route_optimization'],
      [B2BUserRole.EMPLOYEE]: ['basic_search', 'profile_management']
    };

    const allowedFeatures = featuresByRole[this.role] || [];
    return allowedFeatures.includes('*') || allowedFeatures.includes(feature);
  }
}

export enum B2BUserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin',
  DEPARTMENT_MANAGER = 'department_manager',
  ACCOUNTANT = 'accountant',
  BOOKING_AGENT = 'booking_agent',
  EMPLOYEE = 'employee',
  CAPTAIN = 'captain'
}

export type B2BUserRoleType =
  | 'super_admin'
  | 'company_admin'
  | 'department_manager'
  | 'accountant'
  | 'booking_agent'
  | 'employee'
  | 'captain';

// Enhanced role hierarchy for access control
export const ROLE_HIERARCHY: Record<B2BUserRole, number> = {
  [B2BUserRole.SUPER_ADMIN]: 100,
  [B2BUserRole.COMPANY_ADMIN]: 90,
  [B2BUserRole.DEPARTMENT_MANAGER]: 70,
  [B2BUserRole.ACCOUNTANT]: 60,
  [B2BUserRole.BOOKING_AGENT]: 50,
  [B2BUserRole.CAPTAIN]: 40,
  [B2BUserRole.EMPLOYEE]: 20
};

// Permission system
export interface Permission {
  resource: string;
  action: string | string[];
  conditions?: string[];
}

export const ROLE_PERMISSIONS: Record<B2BUserRole, Permission[]> = {
  [B2BUserRole.SUPER_ADMIN]: [
    { resource: '*', action: '*' }, // Full access
  ],
  [B2BUserRole.COMPANY_ADMIN]: [
    { resource: 'employees', action: '*' },
    { resource: 'deposit', action: 'replenish' },
    { resource: 'billing', action: '*' },
    { resource: 'audit', action: 'view' },
    { resource: 'company', action: 'manage' },
    { resource: 'subscriptions', action: 'manage' },
    { resource: 'tickets', action: '*' },
    { resource: 'deliveries', action: '*' },
    { resource: 'analytics', action: '*' }
  ],
  [B2BUserRole.DEPARTMENT_MANAGER]: [
    { resource: 'employees', action: ['view', 'create', 'update'] },
    { resource: 'tickets', action: '*' },
    { resource: 'deliveries', action: 'manage' },
    { resource: 'reports', action: 'view' },
    { resource: 'expenses', action: 'approve' }
  ],
  [B2BUserRole.ACCOUNTANT]: [
    { resource: 'balance', action: 'view' },
    { resource: 'transactions', action: ['view', 'export'] },
    { resource: 'reports', action: 'export' },
    { resource: 'billing', action: 'view' },
    { resource: 'audit', action: 'view' }
  ],
  [B2BUserRole.BOOKING_AGENT]: [
    { resource: 'tickets', action: ['create', 'view', 'update'] },
    { resource: 'routes', action: 'search' },
    { resource: 'search', action: '*' },
    { resource: 'reports', action: 'view' }
  ],
  [B2BUserRole.CAPTAIN]: [
    { resource: 'deliveries', action: 'manage' },
    { resource: 'tickets', action: 'view' },
    { resource: 'routes', action: 'view' }
  ],
  [B2BUserRole.EMPLOYEE]: [
    { resource: 'tickets', action: 'view' },
    { resource: 'profile', action: 'manage' },
    { resource: 'reports', action: 'view' }
  ]
};