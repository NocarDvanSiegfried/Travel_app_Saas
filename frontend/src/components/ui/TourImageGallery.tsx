'use client';

import React, { useState } from 'react';
import { X, Star, Edit, Trash2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TourImage } from '@/types/tour';

interface TourImageGalleryProps {
  images: TourImage[];
  tourId: string;
  onImageUpdate?: (imageId: string, updates: Partial<TourImage>) => void;
  onImageDelete?: (imageId: string) => void;
  onSetMainImage?: (imageId: string) => void;
  editable?: boolean;
  className?: string;
}

export function TourImageGallery({
  images,
  tourId,
  onImageUpdate,
  onImageDelete,
  onSetMainImage,
  editable = false,
  className
}: TourImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<TourImage | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editAltText, setEditAltText] = useState('');

  if (!images || images.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="w-24 h-24 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-300 rounded" />
        </div>
        <p className="text-gray-500">No images uploaded yet</p>
      </div>
    );
  }

  const handleImageClick = (image: TourImage, index: number) => {
    setSelectedImage(image);
    setSelectedIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
    setEditingImage(null);
    setEditAltText('');
  };

  const handlePrevious = () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : images.length - 1;
    setSelectedIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleNext = () => {
    const newIndex = selectedIndex < images.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleSetMain = async () => {
    if (selectedImage && onSetMainImage) {
      await onSetMainImage(selectedImage.id);
      handleCloseModal();
    }
  };

  const handleDelete = async () => {
    if (selectedImage && onImageDelete) {
      await onImageDelete(selectedImage.id);
      handleCloseModal();
    }
  };

  const handleEditAltText = () => {
    if (selectedImage) {
      setEditingImage(selectedImage.id);
      setEditAltText(selectedImage.altText || '');
    }
  };

  const handleSaveAltText = async () => {
    if (selectedImage && onImageUpdate) {
      await onImageUpdate(selectedImage.id, { altText: editAltText });
      setEditingImage(null);
      setEditAltText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingImage(null);
    setEditAltText('');
  };

  const getImageUrl = (image: TourImage, size: 'thumbnail' | 'optimized' | 'original' = 'original') => {
    switch (size) {
      case 'thumbnail':
        return image.variants?.thumbnail?.url || image.url;
      case 'optimized':
        return image.variants?.optimized?.url || image.url;
      default:
        return image.url;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative group cursor-pointer"
            onClick={() => handleImageClick(image, index)}
          >
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={getImageUrl(image, 'thumbnail')}
                alt={image.altText || image.filename}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>

            {image.isMain && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Main
              </div>
            )}

            {/* Edit Controls (shown on hover for editable galleries) */}
            {editable && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                {!image.isMain && onSetMainImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetMainImage(image.id);
                    }}
                    className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                    title="Set as main image"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(image, index);
                  }}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="View details"
                >
                  <div className="w-4 h-4 bg-gray-400 rounded" />
                </button>
                {onImageDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageDelete(image.id);
                    }}
                    className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors text-red-600"
                    title="Delete image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <div className="mt-2">
              <p className="text-xs text-gray-600 truncate">{image.filename}</p>
              <p className="text-xs text-gray-400">
                {image.width && image.height && `${image.width}×${image.height}`}
                {image.size && ` • ${(image.size / 1024 / 1024).toFixed(1)}MB`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-6xl w-full">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Image */}
              <div className="flex-1">
                <img
                  src={getImageUrl(selectedImage, 'optimized')}
                  alt={selectedImage.altText || selectedImage.filename}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              </div>

              {/* Image Details */}
              <div className="lg:w-80 space-y-4 text-white">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Image Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-400">Filename:</span> {selectedImage.filename}</p>
                    <p><span className="text-gray-400">Size:</span> {(selectedImage.size / 1024 / 1024).toFixed(1)} MB</p>
                    {selectedImage.width && selectedImage.height && (
                      <p><span className="text-gray-400">Dimensions:</span> {selectedImage.width}×{selectedImage.height}</p>
                    )}
                    <p><span className="text-gray-400">Type:</span> {selectedImage.mimeType}</p>
                    <p><span className="text-gray-400">Main Image:</span> {selectedImage.isMain ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {/* Alt Text */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Alt Text</label>
                    {editable && (
                      <button
                        onClick={editingImage === selectedImage.id ? handleCancelEdit : handleEditAltText}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {editingImage === selectedImage.id ? 'Cancel' : 'Edit'}
                      </button>
                    )}
                  </div>
                  {editingImage === selectedImage.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editAltText}
                        onChange={(e) => setEditAltText(e.target.value)}
                        placeholder="Describe the image for accessibility"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAltText}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300">
                      {selectedImage.altText || 'No alt text provided'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {editable && (
                  <div className="space-y-2">
                    {!selectedImage.isMain && onSetMainImage && (
                      <button
                        onClick={handleSetMain}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Star className="h-4 w-4" />
                        Set as Main Image
                      </button>
                    )}

                    <a
                      href={selectedImage.url}
                      download={selectedImage.filename}
                      className="w-full px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Original
                    </a>

                    {onImageDelete && (
                      <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Image
                      </button>
                    )}
                  </div>
                )}

                {/* Image Counter */}
                {images.length > 1 && (
                  <div className="text-center text-sm text-gray-400">
                    {selectedIndex + 1} / {images.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}