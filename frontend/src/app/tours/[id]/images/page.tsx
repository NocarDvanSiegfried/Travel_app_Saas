'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { TourImageGallery } from '@/components/ui/TourImageGallery';
import { useTourImages, useStorageProvider } from '@/hooks/useTourImages';
import { AlertCircle, CheckCircle2, Loader2, Server, HardDrive } from 'lucide-react';

export default function TourImagesPage() {
  const params = useParams();
  const tourId = params.id as string;

  const {
    images,
    loading,
    error,
    stats,
    updateImage,
    setMainImage,
    deleteImage,
    refresh,
  } = useTourImages(tourId);

  const { providerInfo, loading: providerLoading } = useStorageProvider();

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleImagesChange = (newImages: any[]) => {
    refresh();
    setSuccessMessage(`${newImages.length} images uploaded successfully`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleImageUpdate = async (imageId: string, updates: any) => {
    try {
      await updateImage(imageId, updates);
      setSuccessMessage('Image updated successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to update image:', error);
    }
  };

  const handleSetMainImage = async (imageId: string) => {
    try {
      await setMainImage(imageId);
      setSuccessMessage('Main image updated successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to set main image:', error);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        await deleteImage(imageId);
        setSuccessMessage('Image deleted successfully');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    }
  };

  if (loading && images.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading tour images...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tour Images</h1>
        <p className="text-gray-600">
          Manage images for tour {tourId}
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Storage Provider Info */}
      {!providerLoading && providerInfo && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            {providerInfo.type === 'minio' ? (
              <Server className="h-5 w-5 text-blue-600" />
            ) : (
              <HardDrive className="h-5 w-5 text-blue-600" />
            )}
            <h3 className="font-medium text-blue-900">Storage Provider</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Type:</span>{' '}
              <span className="font-medium capitalize">{providerInfo.type}</span>
            </div>
            <div>
              <span className="text-blue-700">Status:</span>{' '}
              <span className={`font-medium ${providerInfo.health.status === 'healthy' ? 'text-green-700' : 'text-red-700'}`}>
                {providerInfo.health.status}
              </span>
            </div>
            {providerInfo.health.latency && (
              <div>
                <span className="text-blue-700">Latency:</span>{' '}
                <span className="font-medium">{providerInfo.health.latency}ms</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Storage Stats */}
      {stats && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Storage Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Images:</span>{' '}
              <span className="font-medium">{stats.imageCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Size:</span>{' '}
              <span className="font-medium">
                {(stats.totalSize / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
            <div>
              <span className="text-gray-600">Main Image:</span>{' '}
              <span className={`font-medium ${stats.mainImageExists ? 'text-green-700' : 'text-gray-500'}`}>
                {stats.mainImageExists ? 'Set' : 'Not set'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Images</h2>
            <ImageUpload
              tourId={tourId}
              onImagesChange={handleImagesChange}
              maxImages={20}
              maxFileSize={5 * 1024 * 1024} // 5MB
              allowedTypes={['image/jpeg', 'image/png', 'image/webp', 'image/gif']}
            />
          </div>
        </div>

        {/* Gallery Section */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Image Gallery ({images.length})
            </h2>
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Refresh'}
            </button>
          </div>

          {images.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="w-24 h-24 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-400 rounded" />
              </div>
              <p className="text-gray-500 mb-2">No images uploaded yet</p>
              <p className="text-sm text-gray-400">
                Upload images using the form on the left to get started
              </p>
            </div>
          ) : (
            <TourImageGallery
              images={images}
              tourId={tourId}
              onImageUpdate={handleImageUpdate}
              onImageDelete={handleDeleteImage}
              onSetMainImage={handleSetMainImage}
              editable={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}