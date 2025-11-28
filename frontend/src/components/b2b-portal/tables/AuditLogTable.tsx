'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Row,
} from '@tanstack/react-table';
import {
  useVirtualizer,
  VirtualItem,
  scrollElementToVirtualItem,
} from '@tanstack/react-virtual';
import { Search, Filter, Download, Eye, Shield, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Types
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: 'LOGIN' | 'LOGOUT' | 'TICKET_BOOK' | 'TICKET_CANCEL' | 'ROLE_CHANGE' | 'BALANCE_UPDATE' | 'SECURITY_ALERT';
  target?: string;
  targetId?: string;
  ipAddress: string;
  userAgent?: string;
  riskScore: number;
  status: 'success' | 'warning' | 'error' | 'critical';
  details?: string;
  transactionId?: string;
  sessionId?: string;
}

interface AuditLogTableProps {
  data?: AuditLogEntry[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
  initialFilters?: {
    dateFrom?: Date;
    dateTo?: Date;
    userId?: string;
    action?: string;
    riskScoreMin?: number;
    riskScoreMax?: number;
  };
  height?: string | number;
  pageSize?: number;
  realtime?: boolean;
}

const actionLabels: Record<string, string> = {
  LOGIN: 'Вход в систему',
  LOGOUT: 'Выход из системы',
  TICKET_BOOK: 'Бронирование билета',
  TICKET_CANCEL: 'Отмена билета',
  ROLE_CHANGE: 'Изменение роли',
  BALANCE_UPDATE: 'Обновление баланса',
  SECURITY_ALERT: 'Угроза безопасности',
};

const statusConfig = {
  success: {
    label: 'Успешно',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  warning: {
    label: 'Предупреждение',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  error: {
    label: 'Ошибка',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  critical: {
    label: 'Критично',
    icon: AlertTriangle,
    color: 'text-red-700',
    bgColor: 'bg-red-200',
  },
};

const getRiskScoreColor = (score: number) => {
  if (score < 30) return 'text-green-600';
  if (score < 60) return 'text-yellow-600';
  if (score < 80) return 'text-orange-600';
  return 'text-red-600';
};

const getRiskScoreBg = (score: number) => {
  if (score < 30) return 'bg-green-100';
  if (score < 60) return 'bg-yellow-100';
  if (score < 80) return 'bg-orange-100';
  return 'bg-red-100';
};

// Column definitions
const columns: ColumnDef<AuditLogEntry>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Дата и время',
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">
          {new Date(row.getValue('timestamp')).toLocaleDateString('ru-RU')}
        </div>
        <div className="text-gray-500">
          {new Date(row.getValue('timestamp')).toLocaleTimeString('ru-RU')}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'userName',
    header: 'Пользователь',
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.getValue('userName')}</div>
        <div className="text-gray-500">{row.original.userEmail}</div>
        <Badge variant="outline" className="text-xs mt-1">
          {row.original.userRole}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Действие',
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">
          {actionLabels[row.getValue('action')] || row.getValue('action')}
        </div>
        {row.original.target && (
          <div className="text-gray-500 text-xs">
            Цель: {row.original.target}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'ipAddress',
    header: 'IP Адрес',
    cell: ({ row }) => (
      <div className="text-sm font-mono">{row.getValue('ipAddress')}</div>
    ),
  },
  {
    accessorKey: 'riskScore',
    header: 'Риск',
    cell: ({ row }) => {
      const score = row.getValue('riskScore') as number;
      return (
        <div className="flex items-center space-x-2">
          <Badge
            className={cn(
              'text-xs',
              getRiskScoreBg(score)
            )}
          >
            <span className={getRiskScoreColor(score)}>
              {score}/100
            </span>
          </Badge>
          {score > 70 && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const status = row.getValue('status') as keyof typeof statusConfig;
      const config = statusConfig[status];
      const Icon = config.icon;

      return (
        <div className="flex items-center space-x-2">
          <Icon className={cn('h-4 w-4', config.color)} />
          <Badge
            variant="secondary"
            className={cn('text-xs', config.bgColor, config.color)}
          >
            {config.label}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'details',
    header: 'Детали',
    cell: ({ row }) => {
      const details = row.getValue('details') as string;
      if (!details) return <span className="text-gray-400">—</span>;

      return (
        <div className="text-sm text-gray-600 max-w-xs truncate" title={details}>
          {details}
        </div>
      );
    },
  },
];

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  data = [],
  loading = false,
  error = null,
  onRefresh,
  onExport,
  initialFilters = {},
  height = '600px',
  pageSize = 50,
  realtime = false,
}) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });

  // Filters state
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Virtual scrolling refs
  const parentRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!realtime) return;

    const ws = new WebSocket('/api/b2b/admin/audit/websocket');

    ws.onmessage = (event) => {
      try {
        const newEntry = JSON.parse(event.data);
        // Add new entry to the top of the list
        // This would be handled by the parent component or store
      } catch (err) {
        console.error('Failed to parse audit log update:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [realtime]);

  // Table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    manualPagination: false,
    pageCount: Math.ceil(data.length / pagination.pageSize),
  });

  // Virtualization
  const virtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Approximate row height
    overscan: 10,
  });

  // Memoized filtered data for virtualization
  const filteredData = useMemo(() => {
    return table.getRowModel().rows;
  }, [table.getRowModel()]);

  // Apply filters
  useEffect(() => {
    const newFilters: ColumnFiltersState = [];

    if (filters.userId) {
      newFilters.push({ id: 'userId', value: filters.userId });
    }
    if (filters.action) {
      newFilters.push({ id: 'action', value: filters.action });
    }

    setColumnFilters(newFilters);
  }, [filters]);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    onExport?.(format);
  };

  const Row: React.FC<{ row: Row<AuditLogEntry>; virtualItem: VirtualItem }> = ({ row, virtualItem }) => (
    <div
      className={cn(
        'flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors',
        row.index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
      )}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: virtualItem.size,
        transform: `translateY(${virtualItem.start}px)`,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <div
          key={cell.id}
          className={cn(
            'px-4 py-3 text-sm',
            cell.column.id === 'timestamp' && 'w-40',
            cell.column.id === 'userName' && 'w-48',
            cell.column.id === 'action' && 'w-56',
            cell.column.id === 'ipAddress' && 'w-32',
            cell.column.id === 'riskScore' && 'w-24',
            cell.column.id === 'status' && 'w-32',
            cell.column.id === 'details' && 'flex-1'
          )}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      ))}
    </div>
  );

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ошибка загрузки журнала аудита</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={onRefresh} variant="outline">
              Повторить попытку
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Журнал Аудита
            {realtime && (
              <Badge variant="secondary" className="ml-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                Real-time
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Фильтры
            </Button>

            <Select onValueChange={handleExport}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Экспорт" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пользователь
                </label>
                <Input
                  placeholder="ID или email"
                  value={filters.userId || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Действие
                </label>
                <Select
                  value={filters.action || ''}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все действия" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все действия</SelectItem>
                    {Object.entries(actionLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Мин. риск
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={filters.riskScoreMin || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    riskScoreMin: parseInt(e.target.value) || undefined
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Макс. риск
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={filters.riskScoreMax || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    riskScoreMax: parseInt(e.target.value) || undefined
                  }))}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({})}
              >
                Сбросить
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Поиск в журнале аудита..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table with Virtual Scrolling */}
        <div
          ref={parentRef}
          className="overflow-auto border border-gray-200"
          style={{ height }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center">
              {table.getHeaderGroups().map((headerGroup) => (
                headerGroup.headers.map((header) => (
                  <div
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      header.id === 'timestamp' && 'w-40',
                      header.id === 'userName' && 'w-48',
                      header.id === 'action' && 'w-56',
                      header.id === 'ipAddress' && 'w-32',
                      header.id === 'riskScore' && 'w-24',
                      header.id === 'status' && 'w-32',
                      header.id === 'details' && 'flex-1'
                    )}
                  >
                    <div
                      className={cn(
                        header.column.getCanSort() && 'cursor-pointer select-none hover:text-gray-700',
                        header.column.getIsSorted() && 'text-blue-600'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </div>
                  </div>
                ))
              ))}
            </div>
          </div>

          {/* Virtual Rows */}
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: '100%',
              position: 'relative',
            }}
          >
            {loading ? (
              // Loading skeleton
              Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center border-b border-gray-100 p-4"
                  style={{ height: 60 }}
                >
                  {columns.map((_, colIndex) => (
                    <Skeleton
                      key={colIndex}
                      className={cn(
                        'h-4',
                        colIndex === 0 && 'w-32',
                        colIndex === 1 && 'w-48',
                        colIndex === 2 && 'w-56',
                        colIndex === columns.length - 1 && 'flex-1'
                      )}
                    />
                  ))}
                </div>
              ))
            ) : filteredData.length === 0 ? (
              // Empty state
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Нет записей в журнале аудита</p>
                  <p className="text-sm">Попробуйте изменить фильтры или обновить данные</p>
                </div>
              </div>
            ) : (
              // Virtual rows
              virtualizer.getVirtualItems().map((virtualItem) => {
                const row = filteredData[virtualItem.index];
                return <Row key={virtualItem.index} row={row} virtualItem={virtualItem} />;
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        {!loading && data.length > 0 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Показано {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                data.length
              )}{' '}
              из {data.length} записей
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Назад
              </Button>
              <span className="text-sm text-gray-600">
                Страница {table.getState().pagination.pageIndex + 1} из {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Вперед
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditLogTable;