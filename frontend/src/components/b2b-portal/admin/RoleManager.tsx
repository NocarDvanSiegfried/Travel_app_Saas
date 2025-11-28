'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Shield,
  Users,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  Eye,
  Settings,
  CreditCard,
  FileText,
  Lock
} from 'lucide-react';
import { useB2BPortalStore, useNotificationsActions } from '@/stores/b2bPortalStore';
import { cn } from '@/lib/utils';

// Types
interface B2BUserExtended {
  id: string;
  fullName: string;
  email: string;
  role: 'super_admin' | 'company_admin' | 'department_manager' | 'accountant' | 'booking_agent' | 'employee';
  department?: string;
  twoFactorEnabled: boolean;
  lastLogin?: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: B2BPermissions;
}

interface B2BPermissions {
  canManageEmployees: boolean;
  canBookTickets: boolean;
  canAccessBalance: boolean;
  canExportReports: boolean;
  canManageDeposit: boolean;
  canViewAuditLog: boolean;
  canManageRoles: boolean;
  canDeleteTickets: boolean;
}

interface RoleConfig {
  id: string;
  name: string;
  description: string;
  permissions: B2BPermissions;
  userCount: number;
  color: string;
}

const roleConfigurations: Record<string, Omit<RoleConfig, 'userCount'>> = {
  super_admin: {
    id: 'super_admin',
    name: 'Супер Администратор',
    description: 'Полный доступ ко всем функциям системы',
    permissions: {
      canManageEmployees: true,
      canBookTickets: true,
      canAccessBalance: true,
      canExportReports: true,
      canManageDeposit: true,
      canViewAuditLog: true,
      canManageRoles: true,
      canDeleteTickets: true,
    },
    color: 'bg-red-100 text-red-700 border-red-300',
  },
  company_admin: {
    id: 'company_admin',
    name: 'Администратор Компании',
    description: 'Управление компанией и сотрудниками',
    permissions: {
      canManageEmployees: true,
      canBookTickets: true,
      canAccessBalance: true,
      canExportReports: true,
      canManageDeposit: true,
      canViewAuditLog: true,
      canManageRoles: false,
      canDeleteTickets: true,
    },
    color: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  department_manager: {
    id: 'department_manager',
    name: 'Руководитель Отдела',
    description: 'Управление отделом и бронирование',
    permissions: {
      canManageEmployees: false,
      canBookTickets: true,
      canAccessBalance: false,
      canExportReports: false,
      canManageDeposit: false,
      canViewAuditLog: false,
      canManageRoles: false,
      canDeleteTickets: false,
    },
    color: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  accountant: {
    id: 'accountant',
    name: 'Бухгалтер',
    description: 'Доступ к финансовой отчетности',
    permissions: {
      canManageEmployees: false,
      canBookTickets: false,
      canAccessBalance: true,
      canExportReports: true,
      canManageDeposit: false,
      canViewAuditLog: false,
      canManageRoles: false,
      canDeleteTickets: false,
    },
    color: 'bg-green-100 text-green-700 border-green-300',
  },
  booking_agent: {
    id: 'booking_agent',
    name: 'Агент Бронирования',
    description: 'Бронирование билетов и управление поездками',
    permissions: {
      canManageEmployees: false,
      canBookTickets: true,
      canAccessBalance: false,
      canExportReports: false,
      canManageDeposit: false,
      canViewAuditLog: false,
      canManageRoles: false,
      canDeleteTickets: false,
    },
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  employee: {
    id: 'employee',
    name: 'Сотрудник',
    description: 'Базовый доступ для сотрудников',
    permissions: {
      canManageEmployees: false,
      canBookTickets: false,
      canAccessBalance: false,
      canExportReports: false,
      canManageDeposit: false,
      canViewAuditLog: false,
      canManageRoles: false,
      canDeleteTickets: false,
    },
    color: 'bg-gray-100 text-gray-700 border-gray-300',
  },
};

const permissionLabels: Record<keyof B2BPermissions, string> = {
  canManageEmployees: 'Управление сотрудниками',
  canBookTickets: 'Бронирование билетов',
  canAccessBalance: 'Доступ к балансу',
  canExportReports: 'Экспорт отчетов',
  canManageDeposit: 'Управление депозитом',
  canViewAuditLog: 'Просмотр аудита',
  canManageRoles: 'Управление ролями',
  canDeleteTickets: 'Удаление билетов',
};

const permissionIcons: Record<keyof B2BPermissions, React.ComponentType<{ className?: string }>> = {
  canManageEmployees: Users,
  canBookTickets: Settings,
  canAccessBalance: CreditCard,
  canExportReports: FileText,
  canManageDeposit: CreditCard,
  canViewAuditLog: Eye,
  canManageRoles: Shield,
  canDeleteTickets: Trash2,
};

interface RoleManagerProps {
  onUserUpdate?: (userId: string, newRole: string) => void;
  onUserDelete?: (userId: string) => void;
}

export const RoleManager: React.FC<RoleManagerProps> = ({
  onUserUpdate,
  onUserDelete
}) => {
  const [users, setUsers] = useState<B2BUserExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog states
  const [editUserDialog, setEditUserDialog] = useState<B2BUserExtended | null>(null);
  const [deleteUserDialog, setDeleteUserDialog] = useState<B2BUserExtended | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  // Store
  const { user: currentUser } = useB2BPortalStore();
  const { add } = useNotificationsActions();

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/b2b/admin/users', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        add({
          type: 'error',
          title: 'Ошибка загрузки',
          message: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [add]);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Get role statistics
  const roleStats = Object.entries(roleConfigurations).map(([roleId, config]) => ({
    ...config,
    userCount: users.filter(user => user.role === roleId).length,
  }));

  // Handle user role update
  const handleRoleUpdate = async (user: B2BUserExtended) => {
    try {
      const response = await fetch(`/api/b2b/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === user.id
          ? { ...u, role: newRole as any, permissions: roleConfigurations[newRole].permissions }
          : u
      ));

      // Close dialog
      setEditUserDialog(null);
      setNewRole('');

      // Show success notification
      add({
        type: 'success',
        title: 'Роль обновлена',
        message: `Роль пользователя ${user.fullName} успешно изменена на ${roleConfigurations[newRole].name}`,
      });

      // Call callback
      onUserUpdate?.(user.id, newRole);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      add({
        type: 'error',
        title: 'Ошибка обновления',
        message: errorMessage,
      });
    }
  };

  // Handle user deletion
  const handleUserDelete = async (user: B2BUserExtended) => {
    try {
      const response = await fetch(`/api/b2b/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== user.id));

      // Close dialog
      setDeleteUserDialog(null);

      // Show success notification
      add({
        type: 'success',
        title: 'Пользователь удален',
        message: `Пользователь ${user.fullName} успешно удален`,
      });

      // Call callback
      onUserDelete?.(user.id);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      add({
        type: 'error',
        title: 'Ошибка удаления',
        message: errorMessage,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Активен</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Неактивен</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Приостановлен</Badge>;
      default:
        return <Badge variant="outline">Неизвестен</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const config = roleConfigurations[role];
    return (
      <Badge variant="outline" className={config.color}>
        {config.name}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roleStats.map((role) => (
          <Card key={role.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{role.name}</p>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                </div>
                <Badge variant="secondary">{role.userCount}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Управление Пользователями и Ролями
            </CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить пользователя
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по имени или email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Фильтр по роли" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                {Object.entries(roleConfigurations).map(([roleId, config]) => (
                  <SelectItem key={roleId} value={roleId}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="inactive">Неактивные</SelectItem>
                <SelectItem value="suspended">Приостановленные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последний вход</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.department && (
                        <p className="text-xs text-gray-400">{user.department}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.twoFactorEnabled ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Да</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Нет</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString('ru-RU')
                        : 'Никогда'
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {/* Can't edit yourself */}
                      {user.id !== currentUser?.id && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditUserDialog(user);
                              setNewRole(user.role);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteUserDialog(user)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Пользователи не найдены</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Role Dialog */}
      <Dialog open={!!editUserDialog} onOpenChange={() => setEditUserDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить роль пользователя</DialogTitle>
            <DialogDescription>
              Выберите новую роль для пользователя: <strong>{editUserDialog?.fullName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Текущая роль</Label>
              <div className="mt-1">
                {editUserDialog && getRoleBadge(editUserDialog.role)}
              </div>
            </div>

            <div>
              <Label>Новая роль</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfigurations).map(([roleId, config]) => (
                    <SelectItem key={roleId} value={roleId}>
                      <div className="flex items-center space-x-2">
                        <span>{config.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {config.userCount}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newRole && (
              <div>
                <Label>Права новой роли</Label>
                <div className="mt-2 space-y-2">
                  {Object.entries(roleConfigurations[newRole].permissions)
                    .filter(([_, enabled]) => enabled)
                    .map(([permission, _]) => {
                      const Icon = permissionIcons[permission as keyof B2BPermissions];
                      return (
                        <div key={permission} className="flex items-center space-x-2">
                          <Icon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {permissionLabels[permission as keyof B2BPermissions]}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialog(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => editUserDialog && handleRoleUpdate(editUserDialog)}
              disabled={!newRole || newRole === editUserDialog?.role}
            >
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deleteUserDialog} onOpenChange={() => setDeleteUserDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить пользователя</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить пользователя <strong>{deleteUserDialog?.fullName}</strong>?
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>

          {deleteUserDialog && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Удаление пользователя приведет к потере всех его данных и истории действий.
                  Рекомендуется деактивировать пользователя вместо удаления.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="text-gray-600">{deleteUserDialog.email}</p>
                </div>
                <div>
                  <span className="font-medium">Роль:</span>
                  <p className="text-gray-600">{roleConfigurations[deleteUserDialog.role].name}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserDialog(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserDialog && handleUserDelete(deleteUserDialog)}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManager;