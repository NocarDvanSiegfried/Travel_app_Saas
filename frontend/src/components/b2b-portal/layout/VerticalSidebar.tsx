'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Ticket,
  MapPin,
  DollarSign,
  FileText,
  Settings,
  Users,
  Shield,
  Eye,
  LogOut,
  ChevronDown,
  ChevronRight,
  X,
  Menu,
  Bell,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useB2BPortalStore, useB2BUser, useB2BCompany, useAccountBalance, useCanAccessSection } from '@/stores/b2bPortalStore';

interface SidebarItemProps {
  item: SidebarItemType;
  isActive: boolean;
  collapsed: boolean;
  level?: number;
}

interface SidebarItemType {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  href?: string;
  submenu?: SidebarItemType[];
  requiredPermission?: string;
  alert?: boolean;
  onClick?: () => void;
}

const sidebarItems: SidebarItemType[] = [
  {
    id: 'dashboard',
    label: 'Главная',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'booking',
    label: 'Бронирование',
    icon: Ticket,
    href: '/booking',
    requiredPermission: 'canBookTickets',
  },
  {
    id: 'trips',
    label: 'Мои Поездки',
    icon: MapPin,
    href: '/trips',
    requiredPermission: 'canBookTickets',
  },
  {
    id: 'finance',
    label: 'Баланс и Финансы',
    icon: DollarSign,
    href: '/finance',
    requiredPermission: 'canAccessBalance',
    badge: 'deposit', // Special badge type for balance
  },
  {
    id: 'reports',
    label: 'Отчетность и Документы',
    icon: FileText,
    href: '/reports',
    requiredPermission: 'canExportReports',
  },
  {
    id: 'admin',
    label: 'Управление Компанией',
    icon: Settings,
    requiredPermission: 'canManageEmployees',
    submenu: [
      {
        id: 'employees',
        label: 'Сотрудники',
        icon: Users,
        href: '/admin/employees',
      },
      {
        id: 'roles',
        label: 'Пользователи и Роли',
        icon: Shield,
        href: '/admin/roles',
      },
      {
        id: 'audit',
        label: 'Журнал Аудита',
        icon: Eye,
        href: '/admin/audit',
        requiredPermission: 'canViewAuditLog',
      },
    ],
  },
  {
    id: 'support',
    label: 'Служба Поддержки 24/7',
    icon: Bell,
    href: '/support',
    alert: true,
  },
];

const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  isActive,
  collapsed,
  level = 0
}) => {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const pathname = usePathname();
  const canAccess = !item.requiredPermission || useCanAccessSection(item.id);
  const { balance } = useAccountBalance();

  if (!canAccess) {
    return null;
  }

  const hasSubmenu = item.submenu && item.submenu.length > 0;
  const itemIsActive = item.href ? pathname.includes(item.href) : false;
  const hasActiveSubmenu = hasSubmenu && item.submenu.some(sub => pathname.includes(sub.href || ''));

  const handleToggle = () => {
    if (hasSubmenu) {
      setSubmenuOpen(!submenuOpen);
    }
    if (item.onClick) {
      item.onClick();
    }
  };

  // Special handling for finance badge
  const getFinanceBadge = () => {
    if (item.badge === 'deposit') {
      return (
        <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
          ₽{balance.toLocaleString()}
        </span>
      );
    }
    return item.badge;
  };

  const content = (
    <div
      className={cn(
        'group relative flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
        level > 0 && 'pl-8',
        (itemIsActive || hasActiveSubmenu) && 'bg-blue-50 text-blue-700 border-l-4 border-blue-600',
        !(itemIsActive || hasActiveSubmenu) && 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
        !canAccess && 'opacity-50 cursor-not-allowed'
      )}
    >
      <item.icon
        className={cn(
          'flex-shrink-0 h-5 w-5',
          (itemIsActive || hasActiveSubmenu) && 'text-blue-600',
          !(itemIsActive || hasActiveSubmenu) && 'text-gray-400 group-hover:text-gray-600'
        )}
      />

      {!collapsed && (
        <>
          <span className="ml-3 flex-1 text-left truncate">
            {item.label}
          </span>

          {/* Badges */}
          {getFinanceBadge() && (
            <div className="ml-2">
              {getFinanceBadge()}
            </div>
          )}

          {item.alert && !getFinanceBadge() && (
            <div className="ml-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
          )}

          {/* Submenu toggle */}
          {hasSubmenu && (
            <ChevronRight
              className={cn(
                'ml-2 h-4 w-4 transition-transform duration-200',
                submenuOpen && 'rotate-90',
                (itemIsActive || hasActiveSubmenu) && 'text-blue-600'
              )}
            />
          )}
        </>
      )}
    </div>
  );

  if (item.href && canAccess) {
    return (
      <Link href={item.href} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className="block w-full text-left"
      disabled={!canAccess}
    >
      {content}
    </button>
  );
};

interface VerticalSidebarProps {
  className?: string;
  onCollapse?: (collapsed: boolean) => void;
}

export const VerticalSidebar: React.FC<VerticalSidebarProps> = ({
  className,
  onCollapse
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, user, company } = useB2BPortalStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/b2b-portal/auth/logout', { method: 'POST' });
      const companySlug = pathname.split('/')[2];
      router.push(`/b2b-portal/${companySlug}/login`);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCollapse = () => {
    toggleSidebar();
    onCollapse?.(sidebarCollapsed);
  };

  const getInitials = (name?: string): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-50',
          sidebarCollapsed ? 'w-16' : 'w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Company Logo */}
            {!sidebarCollapsed && company?.logo ? (
              <img
                src={company.logo}
                alt={`${company.name} logo`}
                className="h-8 w-auto"
              />
            ) : !sidebarCollapsed && company?.name ? (
              <div className="truncate">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {company.name}
                </h1>
                <p className="text-xs text-gray-500">B2B Portal</p>
              </div>
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                {company?.name ? company.name.charAt(0) : 'B2B'}
              </div>
            )}

            {/* Collapse button (desktop only) */}
            <button
              onClick={handleCollapse}
              className="hidden lg:flex p-1 rounded-md hover:bg-gray-100"
            >
              {sidebarCollapsed ? (
                <Menu className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <div key={item.id}>
              <SidebarItem
                item={item}
                isActive={pathname.includes(item.id)}
                collapsed={sidebarCollapsed}
              />

              {/* Submenu */}
              {item.submenu && !sidebarCollapsed && (
                <div className="ml-2 mt-1 space-y-1">
                  {item.submenu.map((subItem) => (
                    <SidebarItem
                      key={subItem.id}
                      item={subItem}
                      isActive={pathname.includes(subItem.id)}
                      collapsed={sidebarCollapsed}
                      level={1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          {!sidebarCollapsed && user ? (
            <div className="space-y-3">
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-medium text-blue-600">
                      {getInitials(user.fullName)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.role.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>

              <Separator />

              {/* 2FA Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">2FA Статус</span>
                <Badge
                  variant={user.twoFactorEnabled ? 'secondary' : 'outline'}
                  className={cn(
                    'text-xs',
                    user.twoFactorEnabled
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                  )}
                >
                  {user.twoFactorEnabled ? 'Включен' : 'Выключен'}
                </Badge>
              </div>

              {/* Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-2" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="p-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};