/**
 * Error codes for OCR service errors
 */
export type OcrErrorCode = 'OCR_SERVICE_UNAVAILABLE' | 'TIMEOUT' | 'INVALID_FILE';

/**
 * Custom error class for OCR service errors
 * Provides type-safe error creation with specific error codes
 */
export class OcrServiceError extends Error {
  readonly code: OcrErrorCode;

  constructor(code: OcrErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'OcrServiceError';
    this.code = code;
    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, OcrServiceError.prototype);
  }
}

/**
 * Type guard to check if an unknown error is an OcrServiceError
 * @param error - The error to check
 * @returns True if the error is an OcrServiceError instance
 */
export function isOcrServiceError(error: unknown): error is OcrServiceError {
  return error instanceof OcrServiceError;
}
