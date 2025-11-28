import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configure multer for file uploads
const storage = multer.memoryStorage();

// File filter for CSV files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (fileExtension !== '.csv') {
    return cb(new Error('Only CSV files are allowed'));
  }

  // Check MIME type
  if (file.mimetype !== 'text/csv' && file.mimetype !== 'application/csv') {
    return cb(new Error('Invalid file type. Please upload a CSV file.'));
  }

  // Check file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return cb(new Error('File size too large. Maximum size is 5MB.'));
  }

  cb(null, true);
};

// Configure multer upload middleware
export const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files uploaded. Only one file is allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field name for file upload.'
      });
    }
  }

  if (error.message.includes('Only CSV files are allowed')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  next(error);
};