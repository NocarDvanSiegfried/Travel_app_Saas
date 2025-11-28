'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Navigation,
  Phone,
  Mail,
  Calendar,
  Route,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Target,
  Users,
  Star,
  MoreHorizontal
} from 'lucide-react';

export const B2BDeliveriesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Капитанская почта
            </h1>
            <p className="text-slate-600 text-lg">
              Управление корпоративными доставками с AI-оптимизацией маршрутов
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-2 border-slate-200 hover:border-slate-300">
              <MapPin className="h-4 w-4 mr-2" />
              Карта
            </Button>
            <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Новая доставка
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">156</p>
                  <p className="text-sm text-slate-600 mt-1">Всего доставок</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">23</p>
                  <p className="text-sm text-slate-600 mt-1">В пути</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Truck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">8</p>
                  <p className="text-sm text-slate-600 mt-1">Ожидают</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">125</p>
                  <p className="text-sm text-slate-600 mt-1">Доставлено</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Deliveries Management with Tabs */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-800">Управление доставками</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Поиск доставок..."
                    className="pl-10 w-64 border-slate-200"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Фильтры
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1">
                <TabsTrigger value="active" className="data-[state=active]:bg-white">Активные (23)</TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-white">Ожидают (8)</TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-white">Завершенные (125)</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        КП
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Заказ #DEL-2024-001</p>
                        <p className="text-sm text-slate-600">Капитанов Петр ⭐ 4.8 • Москва → Санкт-Петербург</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-green-100 text-green-700">В пути</Badge>
                      <span className="text-sm text-slate-600 font-medium">ETA: 2 часа</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">
                        КА
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Заказ #DEL-2024-003</p>
                        <p className="text-sm text-slate-600">Капитанова Анна ⭐ 4.9 • Екатеринбург → Пермь</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-green-100 text-green-700">В пути</Badge>
                      <span className="text-sm text-slate-600 font-medium">ETA: 4 часа</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold text-sm">
                        КИ
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Заказ #DEL-2024-002</p>
                        <p className="text-sm text-slate-600">Капитанов Иван ⭐ 4.7 • Казань • Документы</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-amber-100 text-amber-700">Ожидает</Badge>
                      <span className="text-sm text-slate-600 font-medium">Сегодня 15:00</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
                  <p className="text-slate-600">Все доставки успешно завершены (125)</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Enhanced Info Message */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-blue-50 overflow-hidden">
          <CardContent className="pt-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Капитанская почта</h3>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Система управления корпоративными доставками с AI-оптимизацией маршрутов и отслеживанием в реальном времени
                </p>
              </div>
              <Separator className="max-w-xs mx-auto" />
              <div className="flex justify-center space-x-6 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">AI</div>
                  <div className="text-xs text-slate-600">Оптимизация</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">GPS</div>
                  <div className="text-xs text-slate-600">Отслеживание</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">⭐</div>
                  <div className="text-xs text-slate-600">Рейтинг</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};