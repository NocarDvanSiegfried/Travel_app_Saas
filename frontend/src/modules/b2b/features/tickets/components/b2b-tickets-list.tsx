'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Ticket, Calendar, User, DollarSign, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface B2BTicketsListProps {
  companyId: string;
  filters: any;
}

interface Ticket {
  id: string;
  eventName: string;
  eventDate: string;
  employeeName: string;
  employeeDepartment: string;
  price: number;
  currency: string;
  category: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'used' | 'expired';
  purchaseDate?: string;
  qrCode?: string;
  notes?: string;
}

export function B2BTicketsList({ companyId, filters }: B2BTicketsListProps) {
  // Mock tickets data - will be fetched from API
  const [tickets] = useState<Ticket[]>([
    {
      id: '1',
      eventName: 'Tech Conference 2024',
      eventDate: '2024-02-15',
      employeeName: 'Иван Петров',
      employeeDepartment: 'Разработка',
      price: 5000,
      currency: 'RUB',
      category: 'conference',
      status: 'confirmed',
      purchaseDate: '2024-01-20',
      qrCode: 'QR123456'
    },
    {
      id: '2',
      eventName: 'Корпоративный тренинг',
      eventDate: '2024-02-20',
      employeeName: 'Мария Сидорова',
      employeeDepartment: 'HR',
      price: 3500,
      currency: 'RUB',
      category: 'training',
      status: 'pending'
    },
    {
      id: '3',
      eventName: 'Выставка технологий',
      eventDate: '2024-01-10',
      employeeName: 'Алексей Иванов',
      employeeDepartment: 'Маркетинг',
      price: 2500,
      currency: 'RUB',
      category: 'corporate_event',
      status: 'used'
    },
    {
      id: '4',
      eventName: 'Team Building',
      eventDate: '2024-03-01',
      employeeName: 'Елена Козлова',
      employeeDepartment: 'Продажи',
      price: 4500,
      currency: 'RUB',
      category: 'team_building',
      status: 'cancelled',
      notes: 'Отменено по просьбе сотрудника'
    }
  ]);

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'used':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: Ticket['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Подтвержден';
      case 'pending':
        return 'Ожидает';
      case 'cancelled':
        return 'Отменен';
      case 'used':
        return 'Использован';
      case 'expired':
        return 'Просрочен';
      default:
        return 'Неизвестен';
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'conference':
        return 'Конференция';
      case 'training':
        return 'Тренинг';
      case 'corporate_event':
        return 'Корп. мероприятие';
      case 'team_building':
        return 'Tim building';
      case 'business':
        return 'Командировка';
      default:
        return category;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isExpired = (eventDate: string) => {
    return new Date(eventDate) < new Date();
  };

  return (
    <div className="space-y-4">
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Билеты не найдены
              </h3>
              <p className="text-gray-600 mb-4">
                Попробуйте изменить фильтры или создайте новый билет
              </p>
              <Button>
                <Ticket className="h-4 w-4 mr-2" />
                Создать билет
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        tickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                {/* Left side - Ticket info */}
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <Ticket className="h-5 w-5 text-purple-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ticket.eventName}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`ml-3 ${getStatusColor(ticket.status)}`}
                    >
                      {getStatusText(ticket.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(ticket.eventDate)}
                      {isExpired(ticket.eventDate) && (
                        <Badge variant="outline" className="ml-2 text-red-600">
                          Просрочено
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      {ticket.employeeName}
                      <span className="ml-1 text-gray-400">
                        ({ticket.employeeDepartment})
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      {ticket.price.toLocaleString()} {ticket.currency}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm">
                    <Badge variant="secondary">
                      {getCategoryText(ticket.category)}
                    </Badge>

                    {ticket.purchaseDate && (
                      <span className="text-gray-500">
                        Куплен: {formatDate(ticket.purchaseDate)}
                      </span>
                    )}

                    {ticket.qrCode && (
                      <span className="text-gray-500">
                        QR: {ticket.qrCode}
                      </span>
                    )}
                  </div>

                  {ticket.notes && (
                    <p className="mt-3 text-sm text-gray-600 italic">
                      {ticket.notes}
                    </p>
                  )}
                </div>

                {/* Right side - Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Просмотр
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Изменить
                      </DropdownMenuItem>

                      {ticket.status === 'pending' && (
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Подтвердить
                        </DropdownMenuItem>
                      )}

                      {ticket.status === 'confirmed' && (
                        <DropdownMenuItem>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Отменить
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}