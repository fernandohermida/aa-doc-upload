import { useCallback } from 'react';
import { validateFile } from '../utils/fileValidation';
import type { FileValidationResult } from '../types/ocr';

/**
 * Custom hook for file validation
 */
export function useFileValidation() {
  const validate = useCallback((file: File): FileValidationResult => {
    return validateFile(file);
  }, []);

  return { validate };
}
