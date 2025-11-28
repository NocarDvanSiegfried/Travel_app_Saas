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
  Download,
  Ticket,
  Calendar,
  User,
  Search,
  Filter,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  CreditCard,
  FileText,
  Users,
  ArrowUpDown,
  MoreHorizontal
} from 'lucide-react';

export const B2BTicketsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Корпоративные билеты
            </h1>
            <p className="text-slate-600 text-lg">
              Управление билетами для сотрудников компании
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-2 border-slate-200 hover:border-slate-300">
              <Download className="h-4 w-4 mr-2" />
              Экспорт
            </Button>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Создать билет
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">567</p>
                  <p className="text-sm text-slate-600 mt-1">Всего билетов</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Ticket className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">89</p>
                  <p className="text-sm text-slate-600 mt-1">Активны</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">234</p>
                  <p className="text-sm text-slate-600 mt-1">Сотрудников</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full opacity-10 -mr-10 -mt-10"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">₽1.2M</p>
                  <p className="text-sm text-slate-600 mt-1">Общая стоимость</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Recent Tickets with Tabs */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-800">Управление билетами</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Поиск билетов..."
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
                <TabsTrigger value="active" className="data-[state=active]:bg-white">Активные (89)</TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-white">Завершенные (478)</TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-white">Все билеты (567)</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                        ИИ
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Билет #1234</p>
                        <p className="text-sm text-slate-600">Иванов Иван • IT отдел • Москва → Санкт-Петербург</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-green-100 text-green-700">Активен</Badge>
                      <span className="text-sm text-slate-500">25.12.2024</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        СА
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Билет #1232</p>
                        <p className="text-sm text-slate-600">Сидорова Анна • Маркетинг • Екатеринбург • Концерт</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-green-100 text-green-700">Активен</Badge>
                      <span className="text-sm text-slate-500">28.12.2024</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                        ПП
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Билет #1233</p>
                        <p className="text-sm text-slate-600">Петров Петр • Продажи • Казань → Москва</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-slate-100 text-slate-700">Завершен</Badge>
                      <span className="text-sm text-slate-500">20.12.2024</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="all" className="mt-6">
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600">Показаны все билеты (567)</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Enhanced Info Message */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50 overflow-hidden">
          <CardContent className="pt-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Ticket className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Система управления корпоративными билетами</h3>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Создавайте, управляйте и отслеживайте билеты для сотрудников компании с полной интеграцией с AI-аналитикой
                </p>
              </div>
              <Separator className="max-w-xs mx-auto" />
              <div className="flex justify-center space-x-6 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">QR</div>
                  <div className="text-xs text-slate-600">Цифровые билеты</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">API</div>
                  <div className="text-xs text-slate-600">Интеграция</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">24/7</div>
                  <div className="text-xs text-slate-600">Поддержка</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};