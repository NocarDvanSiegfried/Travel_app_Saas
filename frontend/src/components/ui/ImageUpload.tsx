'use client';

import React, { useState, useCallback, useRef } from 'react';
import { CloudUpload, X, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface TourImage {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  isMain: boolean;
  sortOrder: number;
  altText?: string;
  variants?: {
    thumbnail?: {
      url: string;
      width: number;
      height: number;
    };
    optimized?: {
      url: string;
      width: number;
      height: number;
    };
  };
}

interface ImageUploadProps {
  tourId: string;
  onImagesChange?: (images: TourImage[]) => void;
  maxImages?: number;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  tourId,
  onImagesChange,
  maxImages = 20,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  className,
  disabled = false
}: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<ImageFile[]>([]);
  const [uploadedImages, setUploadedImages] = useState<TourImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create preview for file
  const createPreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`;
    }
    if (file.size > maxFileSize) {
      return `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`;
    }
    if (uploadedImages.length + selectedFiles.filter(f => f.status !== 'error').length >= maxImages) {
      return `Maximum ${maxImages} images allowed`;
    }
    return null;
  }, [allowedTypes, maxFileSize, maxImages, uploadedImages.length, selectedFiles]);

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList) => {
    const newFiles: ImageFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateFile(file);

      if (validationError) {
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: '',
          progress: 0,
          status: 'error',
          error: validationError
        });
      } else {
        const preview = await createPreview(file);
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview,
          progress: 0,
          status: 'pending'
        });
      }
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [validateFile, createPreview]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Remove file from selection
  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  // Upload images
  const uploadImages = useCallback(async () => {
    const filesToUpload = selectedFiles.filter(file => file.status === 'pending');
    if (filesToUpload.length === 0) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      const validFiles = filesToUpload.map(file => file.file);

      validFiles.forEach(file => {
        formData.append('files', file);
      });

      // Update progress for each file
      setSelectedFiles(prev =>
        prev.map(file =>
          file.status === 'pending'
            ? { ...file, status: 'uploading', progress: 0 }
            : file
        )
      );

      const response = await fetch(`/api/v1/tours/${tourId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      // Mark all files as success
      setSelectedFiles(prev =>
        prev.map(file =>
          file.status === 'uploading' || file.status === 'pending'
            ? { ...file, status: 'success', progress: 100 }
            : file
        )
      );

      // Update uploaded images
      const newImages = result.data.images;
      setUploadedImages(prev => [...prev, ...newImages]);
      onImagesChange?.([...uploadedImages, ...newImages]);

      // Clear successful files after a delay
      setTimeout(() => {
        setSelectedFiles(prev => prev.filter(file => file.status !== 'success'));
      }, 2000);

    } catch (error) {
      // Mark files as error
      setSelectedFiles(prev =>
        prev.map(file =>
          file.status === 'uploading' || file.status === 'pending'
            ? { ...file, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : file
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, tourId, uploadedImages, onImagesChange]);

  const hasFiles = selectedFiles.length > 0 || uploadedImages.length > 0;
  const canUpload = selectedFiles.some(file => file.status === 'pending') && !isUploading;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <CloudUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragging ? 'Drop files here' : 'Upload tour images'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Drag and drop images here, or click to select files
        </p>
        <p className="text-xs text-gray-400">
          Maximum {maxImages} images, up to {(maxFileSize / 1024 / 1024).toFixed(1)}MB each
          <br />
          Allowed formats: {allowedTypes.map(type => type.split('/')[1]).join(', ')}
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Select Files
        </button>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Selected Files</h4>
            {canUpload && (
              <button
                onClick={uploadImages}
                disabled={isUploading}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : `Upload ${selectedFiles.filter(f => f.status === 'pending').length} files`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedFiles.map(file => (
              <div
                key={file.id}
                className={cn(
                  'relative border rounded-lg overflow-hidden',
                  file.status === 'error' && 'border-red-300 bg-red-50',
                  file.status === 'success' && 'border-green-300 bg-green-50',
                  file.status === 'uploading' && 'border-blue-300 bg-blue-50'
                )}
              >
                {file.preview && (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-full h-32 object-cover"
                  />
                )}

                <div className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium truncate flex-1 mr-2">
                      {file.file.name}
                    </p>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    {(file.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>

                  {file.status === 'error' && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span>{file.error}</span>
                    </div>
                  )}

                  {file.status === 'uploading' && (
                    <div className="space-y-1">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-600">Uploading...</p>
                    </div>
                  )}

                  {file.status === 'success' && (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Uploaded successfully</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Images Gallery */}
      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">
            Uploaded Images ({uploadedImages.length})
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map(image => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={image.variants?.thumbnail?.url || image.url}
                    alt={image.altText || image.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                {image.isMain && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                    Main
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
        </div>
      )}
    </div>
  );
}