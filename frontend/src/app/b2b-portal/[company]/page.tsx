'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Ticket, Truck, Shield, TrendingUp } from 'lucide-react';

export default function B2BPortalDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          B2B Portal Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Корпоративная панель управления с улучшенной безопасностью
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Сотрудники</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Ticket className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Активные билеты</p>
                <p className="text-2xl font-bold text-gray-900">156</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Truck className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Доставки</p>
                <p className="text-2xl font-bold text-gray-900">42</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Расходы месяц</p>
                <p className="text-2xl font-bold text-gray-900">₽1.2M</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Безопасность
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">2FA аутентификация включена</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Шифрование AES-256</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Аудит логинг активен</span>
            </div>
            <Button className="w-full mt-4" variant="outline">
              Управление безопасностью
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Ticket className="h-4 w-4 mr-2" />
              Создать корпоративный билет
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Добавить сотрудника
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Truck className="h-4 w-4 mr-2" />
              Новая доставка
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Финансовый отчет
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            B2B Portal готов к работе!
          </h3>
          <p className="text-gray-600">
            Полная функциональность корпоративного управления с enterprise-level безопасностью
          </p>
        </CardContent>
      </Card>
    </div>
  );
}