'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Users, Ticket, Truck, TrendingUp, CreditCard, FileText, Settings, LogOut, Bell, Search, Menu, X, Home, BarChart3, Shield, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function B2BPortal() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Simulate loading company data based on user token/auth
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        setIsLoading(true);
        // In real implementation, determine company from user token
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load company data:', err);
        setIsLoading(false);
      }
    };

    loadCompanyData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка портала...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Панель управления', icon: Home },
    { id: 'booking', label: 'Бронирование', icon: Ticket },
    { id: 'finance', label: 'Финансы и документы', icon: CreditCard },
    { id: 'admin', label: 'Администрирование', icon: Users },
    { id: 'audit', label: 'Журнал аудита', icon: Shield },
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { id: 'archive', label: 'Архив', icon: Archive },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  const statsData = [
    { label: 'Сотрудники', value: '24', change: '+2', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Активные билеты', value: '156', change: '+12', icon: Ticket, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: 'Доставки', value: '42', change: '+5', icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Расходы месяц', value: '₽1.2M', change: '+8%', icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  ];

  const recentTransactions = [
    { id: 1, description: 'Билет Москва - Санкт-Петербург', amount: '-₽3,500', date: 'Сегодня 14:30', status: 'completed' },
    { id: 2, description: 'Доставка документов', amount: '-₽850', date: 'Сегодня 12:15', status: 'completed' },
    { id: 3, description: 'Пополнение счета', amount: '+₽50,000', date: 'Вчера 16:45', status: 'completed' },
    { id: 4, description: 'Билет Новосибирск - Москва', amount: '-₽8,200', date: 'Вчера 11:20', status: 'completed' },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsData.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                          <IconComponent className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                          <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            <Badge variant="secondary" className="text-xs">
                              {stat.change}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Последние операции</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-500">{transaction.date}</p>
                        </div>
                        <div className={`font-semibold ${transaction.amount.startsWith('+') ? 'text-green-600' : 'text-gray-900'}`}>
                          {transaction.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Быстрые действия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Ticket className="h-4 w-4 mr-2" />
                    Создать билет
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
                    <FileText className="h-4 w-4 mr-2" />
                    Финансовый отчет
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'finance':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Финансы и документы</h2>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Сформировать отчет
              </Button>
            </div>

            {/* Balance Card */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Текущий баланс</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">₽2,450,000</p>
                    <p className="text-sm text-gray-500 mt-1">Лимит: ₽5,000,000</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Активен
                    </Badge>
                    <p className="text-sm text-gray-500 mt-2">Обновлено: 5 мин назад</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Documents */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Финансовые документы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Акт сверки за ноябрь 2024', 'Счет на оплату №123', 'УПД за октябрь 2024', 'Договор на обслуживание'].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{doc}</p>
                          <p className="text-sm text-gray-500">Дата создания: {new Date().toLocaleDateString('ru-RU')}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Скачать
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'admin':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Управление Сотрудниками</h2>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Добавить сотрудника
              </Button>
            </div>

            {/* Employees Table */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Сотрудники компании</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Сотрудник</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Должность</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Роль</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Статус</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Последний вход</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Иван Петров', position: 'Генеральный директор', role: 'company_admin', status: 'active', lastLogin: 'Сегодня 09:15' },
                        { name: 'Мария Иванова', position: 'Менеджер по бронированию', role: 'booking_agent', status: 'active', lastLogin: 'Сегодня 10:30' },
                        { name: 'Алексей Сидоров', position: 'Бухгалтер', role: 'accountant', status: 'active', lastLogin: 'Вчера 16:45' },
                        { name: 'Елена Кузнецова', position: 'Сотрудник', role: 'employee', status: 'inactive', lastLogin: '3 дня назад' },
                      ].map((employee, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">{employee.name}</p>
                                <p className="text-sm text-gray-500">{employee.position}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{employee.position}</td>
                          <td className="py-3 px-4">
                            <Badge variant={employee.role === 'company_admin' ? 'default' : 'secondary'}>
                              {employee.role === 'company_admin' ? 'Администратор' :
                               employee.role === 'booking_agent' ? 'Агент' :
                               employee.role === 'accountant' ? 'Бухгалтер' : 'Сотрудник'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                              {employee.status === 'active' ? 'Активен' : 'Неактивен'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-gray-500">{employee.lastLogin}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">Редактировать</Button>
                              <Button variant="ghost" size="sm" className="text-red-600">Удалить</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Role Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Роли и права доступа</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { role: 'company_admin', description: 'Полный доступ ко всем функциям', users: 1 },
                      { role: 'booking_agent', description: 'Бронирование билетов и управление доставками', users: 1 },
                      { role: 'accountant', description: 'Доступ к финансовым отчетам', users: 1 },
                      { role: 'employee', description: 'Доступ к личному кабинету', users: 1 },
                    ].map((role, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {role.role === 'company_admin' ? 'Администратор' :
                             role.role === 'booking_agent' ? 'Агент по бронированию' :
                             role.role === 'accountant' ? 'Бухгалтер' : 'Сотрудник'}
                          </p>
                          <p className="text-sm text-gray-500">{role.description}</p>
                        </div>
                        <Badge variant="secondary">{role.users} пользователей</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Статистика доступа</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Всего сотрудников</span>
                      <span className="font-semibold">24</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Активные сессии</span>
                      <span className="font-semibold text-green-600">8</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Заблокированные</span>
                      <span className="font-semibold text-red-600">1</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Последние 24 часа</span>
                      <span className="font-semibold">15 входов</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'audit':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Журнал Аудита</h2>
              <div className="flex space-x-2">
                <Button variant="outline">
                  Экспорт
                </Button>
                <Button>
                  Обновить
                </Button>
              </div>
            </div>

            {/* Security Alert */}
            <Card className="border-0 shadow-sm border-l-4 border-l-red-500 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                  <div>
                    <p className="font-medium text-red-900">Обнаружены критические события безопасности</p>
                    <p className="text-sm text-red-700">Рекомендуется немедленно проверить детали событий</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audit Table */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>События системы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Время</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Пользователь</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Действие</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">IP-адрес</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Риск</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { time: '14:30', user: 'Иван Петров', action: 'Вход в систему', ip: '192.168.1.100', risk: 15, status: 'success' },
                        { time: '14:15', user: 'Мария Иванова', action: 'Бронирование билета', ip: '192.168.1.101', risk: 25, status: 'success' },
                        { time: '13:45', user: 'Иван Петров', action: 'Изменение роли', ip: '192.168.1.100', risk: 45, status: 'warning' },
                        { time: '12:30', user: 'Алексей Сидоров', action: 'Подозрительная активность', ip: '10.0.0.50', risk: 85, status: 'critical' },
                        { time: '11:20', user: 'Елена Кузнецова', action: 'Вход в систему', ip: '192.168.1.103', risk: 12, status: 'success' },
                      ].map((entry, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-600">{entry.time}</td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{entry.user}</p>
                              <p className="text-sm text-gray-500">user_{index + 1}@company.com</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{entry.action}</td>
                          <td className="py-3 px-4 font-mono text-sm text-gray-600">{entry.ip}</td>
                          <td className="py-3 px-4">
                            <Badge variant={entry.risk > 70 ? 'destructive' : entry.risk > 40 ? 'secondary' : 'default'}>
                              {entry.risk}% риска
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={entry.status === 'success' ? 'default' : entry.status === 'warning' ? 'secondary' : 'destructive'}>
                              {entry.status === 'success' ? 'Успех' : entry.status === 'warning' ? 'Внимание' : 'Критично'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Audit Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">1,234</p>
                  <p className="text-sm text-gray-500">Всего событий</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">1,198</p>
                  <p className="text-sm text-gray-500">Успешных</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">28</p>
                  <p className="text-sm text-gray-500">Предупреждений</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">8</p>
                  <p className="text-sm text-gray-500">Критичных</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">Раздел в разработке</p>
              <p className="text-sm mt-2">Функционал для "{menuItems.find(item => item.id === activeTab)?.label}" будет доступен скоро</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Корпоративный портал</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
              </Button>

              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                  <AvatarFallback>АК</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">Администратор</p>
                  <p className="text-xs text-gray-500">ООО "Ромашка"</p>
                </div>
              </div>

              <Button variant="ghost" size="sm">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarOpen ? 'mt-16' : ''}
        `}>
          <nav className="flex flex-col h-full pt-5 pb-4 overflow-y-auto">
            <div className="flex-1 px-3 space-y-1">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`
                      w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${activeTab === item.id
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <IconComponent className="mr-3 h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-gray-600 bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}