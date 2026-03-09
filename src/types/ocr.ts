/**
 * Document types supported by the OCR system
 */
export type DocumentType = 'NCB' | 'GAP_COVER' | 'POLICY_SCHEDULE';

/**
 * OCR verification status
 */
export type OcrStatus = 'verified' | 'rejected';

/**
 * Upload lifecycle states
 */
export type UploadState =
  | 'IDLE'
  | 'SELECTED'
  | 'UPLOADING'
  | 'SCANNING'
  | 'SUCCESS'
  | 'REJECTED'
  | 'ERROR';

/**
 * OCR service result structure
 */
export interface OcrResult {
  status: OcrStatus;
  docType: DocumentType;
  reason?: string; // Present on rejection
  extractedData?: Record<string, unknown>; // Present on success
}

/**
 * Typed OCR service errors
 */
export interface OcrServiceError extends Error {
  code: 'OCR_SERVICE_UNAVAILABLE' | 'TIMEOUT' | 'INVALID_FILE';
}

/**
 * Document type metadata for UI display
 */
export interface DocumentTypeMetadata {
  value: DocumentType;
  label: string;
  description: string;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}
