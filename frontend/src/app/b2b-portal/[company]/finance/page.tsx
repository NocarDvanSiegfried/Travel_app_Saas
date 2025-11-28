'use client';

import React from 'react';
import { FinancialIndicator } from '@/components/b2b-portal/dashboard/FinancialIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  TrendingUp,
  FileText,
  Download,
  Activity
} from 'lucide-react';
import { useCanAccessSection } from '@/stores/b2bPortalStore';
import { Shield, Alert, AlertDescription } from '@/components/ui/alert';

export default function FinancePage() {
  const canAccessBalance = useCanAccessSection('finance');

  if (!canAccessBalance) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            У вас нет прав доступа к финансовой информации. Обратитесь к администратору.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Баланс и Финансы</h1>
        <p className="text-gray-600">
          Управление корпоративным депозитом, транзакциями и финансовой отчетностью
        </p>
      </div>

      {/* Main Financial Overview */}
      <FinancialIndicator
        variant="detailed"
        showTrend={true}
        showProgress={true}
      />

      {/* Financial Tabs */}
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transactions">Транзакции</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="reports">Отчеты</TabsTrigger>
          <TabsTrigger value="deposit">Пополнение</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Последние транзакции
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>История транзакций будет доступна после интеграции с API</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Расходы за период
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <p>Графики аналитики будут доступны после интеграции</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Транзакции по типам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <p>Диаграммы будут доступны после интеграции</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Финансовые отчеты
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Download className="h-6 w-6" />
                    <span>Ежемесячный отчет</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Download className="h-6 w-6" />
                    <span>Квартальный отчет</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Download className="h-6 w-6" />
                    <span>Годовой отчет</span>
                  </Button>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <p>Автоматическая генерация отчетов будет доступна после интеграции</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Пополнение депозита
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>Форма пополнения депозита будет доступна после интеграции с платежной системой</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}