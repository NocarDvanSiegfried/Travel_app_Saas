'use client';

import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  DollarSign,
  User,
  MoreHorizontal,
  Eye,
  Edit,
  XCircle,
  CheckCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface B2BDeliveriesListProps {
  companyId: string;
  filters: any;
}

interface Delivery {
  id: string;
  trackingNumber: string;
  routeFrom: {
    city: string;
    street: string;
    contactPerson?: string;
  };
  routeTo: {
    city: string;
    street: string;
    contactPerson?: string;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  category: string;
  status: 'pending' | 'confirmed' | 'in_pickup' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';
  priority: 'standard' | 'express' | 'urgent';
  estimatedDelivery?: string;
  actualDelivery?: string;
  deliveryCost?: number;
  captainId?: string;
  captainName?: string;
  createdAt: string;
}

export function B2BDeliveriesList({ companyId, filters }: B2BDeliveriesListProps) {
  // Mock deliveries data - will be fetched from API
  const deliveries: Delivery[] = [
    {
      id: '1',
      trackingNumber: 'TRK2024021501',
      routeFrom: {
        city: 'Москва',
        street: 'ул. Тверская, 1',
        contactPerson: 'Иван Петров'
      },
      routeTo: {
        city: 'Санкт-Петербург',
        street: 'ул. Невский, 50',
        contactPerson: 'Мария Иванова'
      },
      dimensions: {
        length: 30,
        width: 20,
        height: 10,
        weight: 2.5
      },
      category: 'document',
      status: 'in_transit',
      priority: 'express',
      estimatedDelivery: '2024-02-16T15:00:00',
      deliveryCost: 1200,
      captainId: 'captain_1',
      captainName: 'Алексей Смирнов',
      createdAt: '2024-02-15T10:30:00'
    },
    {
      id: '2',
      trackingNumber: 'TRK2024021502',
      routeFrom: {
        city: 'Москва',
        street: 'ул. Арбат, 15'
      },
      routeTo: {
        city: 'Казань',
        street: 'ул. Баумана, 5'
      },
      dimensions: {
        length: 40,
        width: 30,
        height: 25,
        weight: 8.2
      },
      category: 'parcel',
      status: 'delivered',
      priority: 'standard',
      estimatedDelivery: '2024-02-17T18:00:00',
      actualDelivery: '2024-02-17T16:45:00',
      deliveryCost: 2500,
      captainName: 'Дмитрий Волков',
      createdAt: '2024-02-15T09:15:00'
    },
    {
      id: '3',
      trackingNumber: 'TRK2024021503',
      routeFrom: {
        city: 'Новосибирск',
        street: 'ул. Красный проспект, 100'
      },
      routeTo: {
        city: 'Москва',
        street: 'ул. Лубянка, 5'
      },
      dimensions: {
        length: 60,
        width: 40,
        height: 35,
        weight: 15.7
      },
      category: 'cargo',
      status: 'pending',
      priority: 'standard',
      estimatedDelivery: '2024-02-20T12:00:00',
      createdAt: '2024-02-15T14:20:00'
    }
  ];

  const getStatusColor = (status: Delivery['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_pickup':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_transit':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'out_for_delivery':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: Delivery['status']) => {
    switch (status) {
      case 'pending':
        return 'Ожидает';
      case 'confirmed':
        return 'Подтверждена';
      case 'in_pickup':
        return 'Забор груза';
      case 'in_transit':
        return 'В пути';
      case 'out_for_delivery':
        return 'Доставляется';
      case 'delivered':
        return 'Доставлено';
      case 'cancelled':
        return 'Отменена';
      case 'failed':
        return 'Ошибка';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: Delivery['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'express':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'standard':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (priority: Delivery['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'Срочно';
      case 'express':
        return 'Экспресс';
      case 'standard':
        return 'Стандарт';
      default:
        return priority;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'document':
        return 'Документы';
      case 'parcel':
        return 'Посылка';
      case 'cargo':
        return 'Груз';
      case 'fragile':
        return 'Хрупкое';
      case 'perishable':
        return 'Скоропорт';
      case 'dangerous':
        return 'Опасное';
      default:
        return category;
    }
  };

  const getStatusProgress = (status: Delivery['status']) => {
    const progressMap: Record<Delivery['status'], number> = {
      pending: 0,
      confirmed: 10,
      in_pickup: 25,
      in_transit: 60,
      out_for_delivery: 85,
      delivered: 100,
      cancelled: 0,
      failed: 0
    };
    return progressMap[status] || 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {deliveries.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Доставки не найдены
              </h3>
              <p className="text-gray-600 mb-4">
                Попробуйте изменить фильтры или создайте новую доставку
              </p>
              <Button>
                <Package className="h-4 w-4 mr-2" />
                Создать доставку
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        deliveries.map((delivery) => (
          <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <Truck className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {delivery.trackingNumber}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`ml-3 ${getStatusColor(delivery.status)}`}
                  >
                    {getStatusText(delivery.status)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`ml-2 ${getPriorityColor(delivery.priority)}`}
                  >
                    {getPriorityText(delivery.priority)}
                  </Badge>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      Детали
                    </DropdownMenuItem>

                    {delivery.status === 'pending' && (
                      <DropdownMenuItem>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Подтвердить
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                        Изменить
                    </DropdownMenuItem>

                    {(delivery.status === 'pending' || delivery.status === 'confirmed') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <XCircle className="h-4 w-4 mr-2" />
                          Отменить
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Route */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center text-sm">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="font-medium">{delivery.routeFrom.city}</span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="font-medium">{delivery.routeTo.city}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 ml-5">
                      {delivery.routeFrom.street} → {delivery.routeTo.street}
                    </div>
                  </div>

                  {delivery.deliveryCost && (
                    <div className="text-right">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {delivery.deliveryCost.toLocaleString()} ₽
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <Progress
                  value={getStatusProgress(delivery.status)}
                  className="h-2"
                />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Package className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {getCategoryText(delivery.category)}
                    </div>
                    <div className="text-xs">
                      {delivery.dimensions.weight} кг • {delivery.dimensions.length}x{delivery.dimensions.width}x{delivery.dimensions.height} см
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {delivery.estimatedDelivery ? formatDate(delivery.estimatedDelivery) : 'Не указано'}
                    </div>
                    <div className="text-xs">
                      {delivery.actualDelivery ? `Доставлено: ${formatDate(delivery.actualDelivery)}` : 'Планируемая доставка'}
                    </div>
                  </div>
                </div>

                {delivery.captainName && (
                  <div className="flex items-center text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {delivery.captainName}
                      </div>
                      <div className="text-xs">Капитан</div>
                    </div>
                  </div>
                )}

                <div className="text-gray-600">
                  <div className="font-medium text-gray-900">
                    {formatDate(delivery.createdAt)}
                  </div>
                  <div className="text-xs">Создан</div>
                </div>
              </div>

              {/* Contact persons */}
              {(delivery.routeFrom.contactPerson || delivery.routeTo.contactPerson) && (
                <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                  {delivery.routeFrom.contactPerson && (
                    <span className="mr-4">
                      От: {delivery.routeFrom.contactPerson}
                    </span>
                  )}
                  {delivery.routeTo.contactPerson && (
                    <span>
                      Кому: {delivery.routeTo.contactPerson}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}