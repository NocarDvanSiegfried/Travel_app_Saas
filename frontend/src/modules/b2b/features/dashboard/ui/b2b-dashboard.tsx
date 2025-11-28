'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Ticket,
  Truck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  Target,
  AlertTriangle
} from 'lucide-react';

interface B2BDashboardProps {
  companyId?: string;
}

export function B2BDashboard({ companyId = 'demo' }: B2BDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="text-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              B2B Панель управления
            </h1>
            <p className="text-slate-600 text-lg">
              Корпоративная платформа управления билетами и доставкой
            </p>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Сотрудники</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-slate-900">1,234</span>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +12%
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                от прошлого месяца
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Корп. билеты</CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Ticket className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-slate-900">567</span>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +8%
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                от прошлого месяца
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Доставки</CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <Truck className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-slate-900">89</span>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +23%
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                от прошлого месяца
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Доход</CardTitle>
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-slate-900">₽2.3M</span>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +18%
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                от прошлого месяца
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-800">Быстрые действия</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                <a href="/b2b/tickets" className="flex items-center justify-center">
                  <Ticket className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Создать корпоративный билет</div>
                    <div className="text-xs opacity-90">Выписать билет для сотрудника</div>
                  </div>
                </a>
              </Button>

              <Button asChild variant="outline" className="w-full h-16 border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all duration-300">
                <a href="/b2b/deliveries" className="flex items-center justify-center">
                  <Truck className="h-5 w-5 mr-3 text-green-600" />
                  <div className="text-left">
                    <div className="font-semibold text-slate-700">Новая доставка</div>
                    <div className="text-xs text-slate-500">Организовать доставку "Капитанская почта"</div>
                  </div>
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-800">AI Аналитика</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-slate-700">Оптимизация расходов</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                    -15%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Эффективность доставки</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +23%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-slate-700">Загрузка транспорта</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">87%</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-slate-700">Требуют внимания</span>
                  </div>
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">3</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Status Message */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 overflow-hidden">
          <CardContent className="pt-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">B2B платформа готова к работе</h3>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Полная функциональность управления корпоративными билетами,
                  доставкой "Капитанская почта" и AI-аналитикой доступна
                </p>
              </div>
              <Separator className="max-w-xs mx-auto" />
              <div className="flex justify-center space-x-6 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">24/7</div>
                  <div className="text-xs text-slate-600">Поддержка</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">AI</div>
                  <div className="text-xs text-slate-600">Аналитика</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-xs text-slate-600">Надежность</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}