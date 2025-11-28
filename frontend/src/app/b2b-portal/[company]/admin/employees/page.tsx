'use client';

import React from 'react';
import { RoleManager } from '@/components/b2b-portal/admin/RoleManager';
import { useCanAccessSection } from '@/stores/b2bPortalStore';
import { Shield, Alert } from 'lucide-react';
import { AlertDescription } from '@/components/ui/alert';

export default function EmployeesManagementPage() {
  const canManageEmployees = useCanAccessSection('admin');

  if (!canManageEmployees) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            У вас нет прав доступа к управлению сотрудниками. Обратитесь к администратору.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Управление Сотрудниками</h1>
        <p className="text-gray-600">
          Управление учетными записями сотрудников, ролями и правами доступа
        </p>
      </div>

      {/* Role Manager Component */}
      <RoleManager
        onUserUpdate={(userId, newRole) => {
          console.log('User role updated:', userId, newRole);
        }}
        onUserDelete={(userId) => {
          console.log('User deleted:', userId);
        }}
      />
    </div>
  );
}