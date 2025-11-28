'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function B2BPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const [companySlug] = useState(params.company as string);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simple data loading without complex store dependencies
  useEffect(() => {
    const loadPortalData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Skip API calls for now since backend is not working
        // Just simulate loading
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(errorMessage);
        console.error('Failed to load portal data:', err);
        setIsLoading(false);
      }
    };

    if (companySlug) {
      loadPortalData();
    }
  }, [companySlug]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка B2B портала...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Ошибка доступа
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {error}
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Обновить страницу
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/b2b')}
                  className="w-full"
                >
                  Перейти в основной B2B раздел
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                B2B Portal - {companySlug}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/b2b')}
              >
                К основному B2B
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}