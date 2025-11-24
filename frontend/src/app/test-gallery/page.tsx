'use client';

import React from 'react';
import { TourImageGallery } from '@/components/ui/TourImageGallery';
import { TourImage } from '@/types/tour';

export default function TestGalleryPage() {
  // Замените 'your-image-name.jpg' на имя вашего файла
  const mockImages: TourImage[] = [
    {
      id: '1',
      tourId: 'test-tour',
      url: 'http://localhost:9000/tour-images/76547.jpg', // <-- Загруженное изображение
      filename: '76547.jpg', // <-- Загруженное изображение
      mimeType: 'image/jpeg',
      size: 1500000,
      width: 800,
      height: 600,
      isMain: true,
      sortOrder: 0,
      altText: 'Test image from MinIO',
      createdAt: '2024-01-20T10:00:00Z',
      updatedAt: '2024-01-20T10:00:00Z'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Тестовая галерея изображений</h1>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Изображения из MinIO</h2>
          <p className="text-gray-600 mb-6">
            URL изображения: <a href="http://localhost:9000/tour-images/76547.jpg" target="_blank" className="text-blue-600 hover:underline">http://localhost:9000/tour-images/76547.jpg</a>
          </p>

          <TourImageGallery
            images={mockImages}
            tourId="test-tour"
            editable={false}
            className="mb-8"
          />

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Как добавить свои изображения:</h3>
            <ol className="list-decimal list-inside text-blue-800 space-y-1">
              <li>✅ Изображение 76547.jpg загружено в MinIO</li>
              <li>✅ Код обновлен с вашим файлом</li>
              <li>✅ Галерея готова к использованию</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}