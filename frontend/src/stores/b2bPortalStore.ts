'use client';

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

// Types
export interface B2BUser {
  id: string;
  fullName: string;
  email: string;
  role: 'super_admin' | 'company_admin' | 'department_manager' | 'accountant' | 'booking_agent' | 'employee';
  department?: string;
  avatar?: string;
  twoFactorEnabled: boolean;
}

export interface B2BPermissions {
  canManageEmployees: boolean;
  canBookTickets: boolean;
  canAccessBalance: boolean;
  canExportReports: boolean;
  canManageDeposit: boolean;
  canViewAuditLog: boolean;
  canManageRoles: boolean;
  canDeleteTickets: boolean;
}

export interface B2BCompany {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  subscriptionType: 'basic' | 'professional' | 'enterprise';
}

export interface QuickStats {
  activeEmployees: number;
  totalTickets: number;
  pendingDeliveries: number;
  accountBalance: number;
  monthlyExpenses: number;
  riskAlerts: number;
  lastUpdated: number;
}

export interface SessionSecurity {
  twoFactorEnabled: boolean;
  lastLogin: string;
  trustedDevices: number;
  activeSessions: number;
  riskScore: number;
  sessionTimeout: number; // in seconds
}

interface B2BPortalState {
  // User and Company
  user: B2BUser | null;
  company: B2BCompany | null;
  permissions: B2BPermissions;

  // Financial data with caching
  accountBalance: number;
  lastBalanceUpdate: number;
  quickStats: QuickStats | null;

  // Security
  sessionSecurity: SessionSecurity | null;
  isAuthenticated: boolean;

  // UI State
  sidebarCollapsed: boolean;
  activeSection: string;
  notifications: Notification[];

  // Caching
  employeesCache: Map<string, any[]>;
  auditLogCache: Map<string, any[]>;
  ticketsCache: Map<string, any[]>;

  // Actions
  setUser: (user: B2BUser | null) => void;
  setCompany: (company: B2BCompany | null) => void;
  setPermissions: (permissions: B2BPermissions) => void;
  updateAccountBalance: (balance: number) => void;
  setQuickStats: (stats: QuickStats | null) => void;
  setSessionSecurity: (security: SessionSecurity | null) => void;
  setAuthenticated: (authenticated: boolean) => void;

  // UI Actions
  toggleSidebar: () => void;
  setActiveSection: (section: string) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Cache Management
  setCache: (key: string, data: any[], cacheType: 'employees' | 'auditLog' | 'tickets') => void;
  getCache: (key: string, cacheType: 'employees' | 'auditLog' | 'tickets') => any[] | null;
  invalidateCache: (cacheType?: 'employees' | 'auditLog' | 'tickets') => void;

  // Reset
  reset: () => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  persistent?: boolean;
}

const getRolePermissions = (role: B2BUser['role']): B2BPermissions => {
  const permissions: Record<B2BUser['role'], B2BPermissions> = {
    super_admin: {
      canManageEmployees: true,
      canBookTickets: true,
      canAccessBalance: true,
      canExportReports: true,
      canManageDeposit: true,
      canViewAuditLog: true,
      canManageRoles: true,
      canDeleteTickets: true,
    },
    company_admin: {
      canManageEmployees: true,
      canBookTickets: true,
      canAccessBalance: true,
      canExportReports: true,
      canManageDeposit: true,
      canViewAuditLog: true,
      canManageRoles: false,
      canDeleteTickets: true,
    },
    department_manager: {
      canManageEmployees: false,
      canBookTickets: true,
      canAccessBalance: false,
      canExportReports: false,
      canManageDeposit: false,
      canViewAuditLog: false,
      canManageRoles: false,
      canDeleteTickets: false,
    },
    accountant: {
      canManageEmployees: false,
      canBookTickets: false,
      canAccessBalance: true,
      canExportReports: true,
      canManageDeposit: false,
      canViewAuditLog: false,
      canManageRoles: false,
      canDeleteTickets: false,
    },
    booking_agent: {
      canManageEmployees: false,
      canBookTickets: true,
      canAccessBalance: false,
      canExportReports: false,
      canManageDeposit: false,
      canViewAuditLog: false,
      canManageRoles: false,
      canDeleteTickets: false,
    },
    employee: {
      canManageEmployees: false,
      canBookTickets: false,
      canAccessBalance: false,
      canExportReports: false,
      canManageDeposit: false,
      canViewAuditLog: false,
      canManageRoles: false,
      canDeleteTickets: false,
    },
  };

  return permissions[role];
};

export const useB2BPortalStore = create<B2BPortalState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      user: null,
      company: null,
      permissions: getRolePermissions('employee'),
      accountBalance: 0,
      lastBalanceUpdate: 0,
      quickStats: null,
      sessionSecurity: null,
      isAuthenticated: false,
      sidebarCollapsed: false,
      activeSection: 'dashboard',
      notifications: [],
      employeesCache: new Map(),
      auditLogCache: new Map(),
      ticketsCache: new Map(),

      // User and Company actions
      setUser: (user) => {
        set({ user });
        if (user) {
          set({ permissions: getRolePermissions(user.role) });
        }
      },

      setCompany: (company) => {
        set({ company });
        // Apply company branding
        if (company?.primaryColor) {
          document.documentElement.style.setProperty('--company-primary', company.primaryColor);
        }
        if (company?.secondaryColor) {
          document.documentElement.style.setProperty('--company-secondary', company.secondaryColor);
        }
      },

      setPermissions: (permissions) => set({ permissions }),

      updateAccountBalance: (balance) => set({
        accountBalance: balance,
        lastBalanceUpdate: Date.now()
      }),

      setQuickStats: (stats) => set({ quickStats: stats }),

      setSessionSecurity: (security) => set({ sessionSecurity }),

      setAuthenticated: (authenticated) => set({ isAuthenticated }),

      // UI Actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setActiveSection: (section) => set({ activeSection: section }),

      addNotification: (notification) => {
        const id = crypto.randomUUID();
        const newNotification = { ...notification, id };
        set((state) => ({
          notifications: [...state.notifications, newNotification]
        }));

        // Auto-remove non-persistent notifications after 5 seconds
        if (!notification.persistent) {
          setTimeout(() => {
            get().removeNotification(id);
          }, 5000);
        }
      },

      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),

      clearNotifications: () => set({ notifications: [] }),

      // Cache Management
      setCache: (key, data, cacheType) => {
        const state = get();
        const cache = state[`${cacheType}Cache`];
        cache.set(key, data);
        set({ [`${cacheType}Cache`]: new Map(cache) });
      },

      getCache: (key, cacheType) => {
        const state = get();
        const cache = state[`${cacheType}Cache`];
        return cache.get(key) || null;
      },

      invalidateCache: (cacheType) => {
        if (cacheType) {
          set({ [`${cacheType}Cache`]: new Map() });
        } else {
          set({
            employeesCache: new Map(),
            auditLogCache: new Map(),
            ticketsCache: new Map(),
          });
        }
      },

      // Reset
      reset: () => set({
        user: null,
        company: null,
        permissions: getRolePermissions('employee'),
        accountBalance: 0,
        lastBalanceUpdate: 0,
        quickStats: null,
        sessionSecurity: null,
        isAuthenticated: false,
        sidebarCollapsed: false,
        activeSection: 'dashboard',
        notifications: [],
        employeesCache: new Map(),
        auditLogCache: new Map(),
        ticketsCache: new Map(),
      }),
    })),
    {
      name: 'b2b-portal-store',
    }
  )
);

// Optimized selectors
export const useB2BUser = () => useB2BPortalStore((state) => state.user);
export const useB2BCompany = () => useB2BPortalStore((state) => state.company);
export const useB2BPermissions = () => useB2BPortalStore((state) => state.permissions);
export const useAccountBalance = () => useB2BPortalStore((state) => ({
  balance: state.accountBalance,
  lastUpdate: state.lastBalanceUpdate
}));
export const useQuickStats = () => useB2BPortalStore((state) => state.quickStats);
export const useSessionSecurity = () => useB2BPortalStore((state) => state.sessionSecurity);
export const useNotifications = () => useB2BPortalStore((state) => state.notifications);
export const useSidebarCollapsed = () => useB2BPortalStore((state) => state.sidebarCollapsed);

// Custom hooks for common operations
export const useHasPermission = (permission: keyof B2BPermissions) => {
  const permissions = useB2BPermissions();
  return permissions[permission];
};

export const useCanAccessSection = (section: string) => {
  const permissions = useB2BPermissions();

  const sectionPermissions: Record<string, keyof B2BPermissions> = {
    employees: 'canManageEmployees',
    tickets: 'canBookTickets',
    finance: 'canAccessBalance',
    reports: 'canExportReports',
    admin: 'canManageEmployees',
    audit: 'canViewAuditLog',
    deposit: 'canManageDeposit',
  };

  const requiredPermission = sectionPermissions[section];
  return requiredPermission ? permissions[requiredPermission] : true;
};

export const useNotificationsActions = () => useB2BPortalStore((state) => ({
  add: state.addNotification,
  remove: state.removeNotification,
  clear: state.clearNotifications
}));