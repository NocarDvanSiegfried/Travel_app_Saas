'use client';

import { useState, useEffect, useCallback } from 'react';
import { TourImage, TourImageUpdateRequest, TourStorageStats } from '@/types/tour';

interface UseTourImagesOptions {
  autoFetch?: boolean;
  onError?: (error: Error) => void;
}

interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: any;
}

export function useTourImages(tourId: string, options: UseTourImagesOptions = {}) {
  const { autoFetch = true, onError } = options;

  const [images, setImages] = useState<TourImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TourStorageStats | null>(null);

  // Fetch images
  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/tours/${tourId}/images`);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || 'Failed to fetch images');
      }

      const data = await response.json();
      setImages(data.data.images);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [tourId, onError]);

  // Fetch storage stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/tours/${tourId}/images/stats`);

      if (!response.ok) {
        throw new Error('Failed to fetch storage stats');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      console.error('Failed to fetch storage stats:', err);
    }
  }, [tourId]);

  // Update image metadata
  const updateImage = useCallback(async (imageId: string, updates: TourImageUpdateRequest) => {
    try {
      const response = await fetch(`/api/v1/tours/${tourId}/images/${imageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || 'Failed to update image');
      }

      const data = await response.json();

      // Update local state
      setImages(prev =>
        prev.map(img =>
          img.id === imageId
            ? { ...img, ...data.data }
            : img
        )
      );

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [tourId, onError]);

  // Set main image
  const setMainImage = useCallback(async (imageId: string) => {
    try {
      const response = await fetch(`/api/v1/tours/${tourId}/images/${imageId}/main`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || 'Failed to set main image');
      }

      // Update local state - remove main flag from all images, add to selected one
      setImages(prev =>
        prev.map(img => ({
          ...img,
          isMain: img.id === imageId
        }))
      );

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [tourId, onError]);

  // Update sort order
  const updateSortOrder = useCallback(async (imageIds: string[]) => {
    try {
      const response = await fetch(`/api/v1/tours/${tourId}/images/sort-order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageIds }),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || 'Failed to update sort order');
      }

      // Update local state with new sort order
      setImages(prev => {
        const imageMap = new Map(prev.map(img => [img.id, img]));
        return imageIds.map((id, index) => {
          const img = imageMap.get(id);
          return img ? { ...img, sortOrder: index } : img;
        }).filter(Boolean) as TourImage[];
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [tourId, onError]);

  // Delete image
  const deleteImage = useCallback(async (imageId: string) => {
    try {
      const response = await fetch(`/api/v1/tours/${tourId}/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || 'Failed to delete image');
      }

      // Update local state
      setImages(prev => prev.filter(img => img.id !== imageId));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [tourId, onError]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchImages();
    fetchStats();
  }, [fetchImages, fetchStats]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && tourId) {
      fetchImages();
      fetchStats();
    }
  }, [autoFetch, tourId, fetchImages, fetchStats]);

  return {
    images,
    loading,
    error,
    stats,
    fetchImages,
    fetchStats,
    updateImage,
    setMainImage,
    updateSortOrder,
    deleteImage,
    refresh,
  };
}

// Hook for storage provider info
export function useStorageProvider() {
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviderInfo = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/storage/provider');

      if (!response.ok) {
        throw new Error('Failed to fetch storage provider info');
      }

      const data = await response.json();
      setProviderInfo(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviderInfo();
  }, [fetchProviderInfo]);

  return {
    providerInfo,
    loading,
    error,
    refetch: fetchProviderInfo,
  };
}