'use client';

import React, { useState, useEffect } from 'react';
import { AuditLogTable, AuditLogEntry } from '@/components/b2b-portal/tables/AuditLogTable';
import { useCanAccessSection, useNotificationsActions } from '@/stores/b2bPortalStore';
import { Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Mock data for demonstration
const mockAuditData: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    userId: 'user1',
    userName: 'Иван Петров',
    userEmail: 'ivan.petrov@company.com',
    userRole: 'company_admin',
    action: 'LOGIN',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    riskScore: 15,
    status: 'success',
    sessionId: 'session_123',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    userId: 'user2',
    userName: 'Мария Иванова',
    userEmail: 'maria.ivanova@company.com',
    userRole: 'booking_agent',
    action: 'TICKET_BOOK',
    target: 'Билет №12345',
    targetId: 'ticket_12345',
    ipAddress: '192.168.1.101',
    riskScore: 25,
    status: 'success',
    details: 'Забронирован билет Москва - Санкт-Петербург',
    transactionId: 'txn_abc123',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    userId: 'user1',
    userName: 'Иван Петров',
    userEmail: 'ivan.petrov@company.com',
    userRole: 'company_admin',
    action: 'ROLE_CHANGE',
    target: 'user3',
    targetId: 'user3',
    ipAddress: '192.168.1.100',
    riskScore: 45,
    status: 'warning',
    details: 'Изменена роль пользователя user3 на booking_agent',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    userId: 'user4',
    userName: 'Алексей Сидоров',
    userEmail: 'alexey.sidorov@company.com',
    userRole: 'employee',
    action: 'SECURITY_ALERT',
    ipAddress: '10.0.0.50',
    riskScore: 85,
    status: 'critical',
    details: 'Обнаружена попытка входа с подозрительного IP-адреса',
  },
];

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canViewAuditLog = useCanAccessSection('audit');
  const { add } = useNotificationsActions();

  // Check permissions
  if (!canViewAuditLog) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            У вас нет прав доступа к журналу аудита. Обратитесь к администратору.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Load audit data
  useEffect(() => {
    const loadAuditData = async () => {
      try {
        setLoading(true);
        setError(null);

        // In real implementation, this would fetch from API
        // const response = await fetch('/api/b2b/admin/audit-log', { credentials: 'include' });

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Use mock data for demonstration
        setData(mockAuditData);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load audit data';
        setError(errorMessage);
        add({
          type: 'error',
          title: 'Ошибка загрузки',
          message: 'Не удалось загрузить журнал аудита',
        });
      } finally {
        setLoading(false);
      }
    };

    loadAuditData();
  }, [add]);

  const handleRefresh = () => {
    // Refresh logic
    window.location.reload();
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    // Export logic
    add({
      type: 'success',
      title: 'Экспорт начат',
      message: `Журнал аудита экспортируется в формате ${format.toUpperCase()}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Журнал Аудита</h1>
        <p className="text-gray-600">
          Полный лог всех действий пользователей в системе с риск-оценкой безопасности
        </p>
      </div>

      {/* Security Alert */}
      {data.some(entry => entry.status === 'critical') && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            Обнаружены критические события безопасности. Рекомендуется немедленно проверить детали.
          </AlertDescription>
        </Alert>
      )}

      {/* Audit Log Table */}
      <AuditLogTable
        data={data}
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
        onExport={handleExport}
        height="600px"
        realtime={true}
        initialFilters={{
          dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          dateTo: new Date(),
        }}
      />
    </div>
  );
}