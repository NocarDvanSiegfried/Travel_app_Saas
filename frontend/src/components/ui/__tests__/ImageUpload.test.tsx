import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ImageUpload } from '../ImageUpload';

// Mock fetch for API calls
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('ImageUpload', () => {
  const tourId = 'test-tour-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload area', () => {
    render(<ImageUpload tourId={tourId} />);

    expect(screen.getByText('Upload tour images')).toBeInTheDocument();
    expect(screen.getByText(/Maximum 20 images/)).toBeInTheDocument();
    expect(screen.getByText(/Allowed formats: jpeg, png, webp, gif/)).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    const user = userEvent.setup();
    render(<ImageUpload tourId={tourId} />);

    const fileInput = screen.getByRole('button', { name: /Select Files/i }).previousSibling as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('1 MB')).toBeInTheDocument();
    });
  });

  it('validates file size', async () => {
    const user = userEvent.setup();
    render(<ImageUpload tourId={tourId} maxFileSize={1 * 1024 * 1024} />); // 1MB limit

    const fileInput = screen.getByRole('button', { name: /Select Files/i }).previousSibling as HTMLInputElement;
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' }); // 6MB

    await user.upload(fileInput, largeFile);

    await waitFor(() => {
      expect(screen.getByText(/exceeds maximum/)).toBeInTheDocument();
    });
  });

  it('validates file types', async () => {
    const user = userEvent.setup();
    render(<ImageUpload tourId={tourId} />);

    const fileInput = screen.getByRole('button', { name: /Select Files/i }).previousSibling as HTMLInputElement;
    const invalidFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    await user.upload(fileInput, invalidFile);

    await waitFor(() => {
      expect(screen.getByText(/File type application\/pdf is not allowed/)).toBeInTheDocument();
    });
  });

  it('shows upload success after successful API call', async () => {
    const user = userEvent.setup();
    render(<ImageUpload tourId={tourId} onImagesChange={jest.fn()} />);

    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          images: [{
            id: 'image-123',
            url: 'http://example.com/image.jpg',
            filename: 'test.jpg'
          }],
          count: 1
        }
      })
    });

    const fileInput = screen.getByRole('button', { name: /Select Files/i }).previousSibling as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Upload 1 files')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Upload 1 files'));

    await waitFor(() => {
      expect(screen.getByText('Uploaded successfully')).toBeInTheDocument();
    });
  });

  it('handles upload errors', async () => {
    const user = userEvent.setup();
    render(<ImageUpload tourId={tourId} />);

    // Mock failed API response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Upload failed',
        code: 'UPLOAD_ERROR'
      })
    });

    const fileInput = screen.getByRole('button', { name: /Select Files/i }).previousSibling as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file);
    await user.click(screen.getByText('Upload 1 files'));

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('allows removing selected files', async () => {
    const user = userEvent.setup();
    render(<ImageUpload tourId={tourId} />);

    const fileInput = screen.getByRole('button', { name: /Select Files/i }).previousSibling as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    const removeButton = screen.getByRole('button', { name: /Remove/i });
    await user.click(removeButton);

    expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
  });

  it('handles drag and drop', async () => {
    const user = userEvent.setup();
    render(<ImageUpload tourId={tourId} />);

    const dropZone = screen.getByText(/Upload tour images/).closest('div') as HTMLElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    // Simulate drag enter
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveClass(/border-primary/);

    // Simulate drag leave
    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass(/border-primary/);

    // Simulate drop
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });

  it('disables upload area when disabled prop is true', () => {
    render(<ImageUpload tourId={tourId} disabled={true} />);

    expect(screen.getByRole('button', { name: /Select Files/i })).toBeDisabled();
    expect(screen.getByText(/Upload tour images/).closest('div')).toHaveClass('opacity-50');
  });

  it('respects custom configuration', () => {
    render(
      <ImageUpload
        tourId={tourId}
        maxImages={5}
        maxFileSize={2 * 1024 * 1024}
        allowedTypes={['image/jpeg']}
      />
    );

    expect(screen.getByText(/Maximum 5 images/)).toBeInTheDocument();
    expect(screen.getByText(/up to 2.0MB each/)).toBeInTheDocument();
    expect(screen.getByText(/Allowed formats: jpeg/)).toBeInTheDocument();
  });

  it('shows existing images when provided', async () => {
    const existingImages = [
      {
        id: 'existing-1',
        url: 'http://example.com/1.jpg',
        filename: 'existing1.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        isMain: true,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ];

    render(<ImageUpload tourId={tourId} existingImages={existingImages} />);

    await waitFor(() => {
      expect(screen.getByText('Uploaded Images (1)')).toBeInTheDocument();
      expect(screen.getByText('existing1.jpg')).toBeInTheDocument();
      expect(screen.getByText('Main')).toBeInTheDocument();
    });
  });

  it('displays loading state during upload', async () => {
    const user = userEvent.setup();
    render(<ImageUpload tourId={tourId} />);

    // Mock API response with delay
    mockFetch.mockImplementation(() =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                images: [{ id: 'image-123', url: 'test.jpg' }],
                count: 1
              }
            })
          });
        }, 1000);
      })
    );

    const fileInput = screen.getByRole('button', { name: /Select Files/i }).previousSibling as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file);
    await user.click(screen.getByText('Upload 1 files'));

    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });
});