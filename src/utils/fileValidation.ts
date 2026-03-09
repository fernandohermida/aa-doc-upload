import type { FileValidationResult } from '../types/ocr';

// Constants
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates file type based on MIME type and extension
 */
export function validateFileType(file: File): FileValidationResult {
  const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a PDF, JPG, or PNG file',
    };
  }

  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      valid: false,
      error: 'Please upload a PDF, JPG, or PNG file',
    };
  }

  return { valid: true };
}

/**
 * Validates file size against maximum allowed
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size must be under 10MB',
    };
  }

  return { valid: true };
}

/**
 * Comprehensive file validation
 */
export function validateFile(file: File): FileValidationResult {
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  return { valid: true };
}
