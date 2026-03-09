import type { DocumentType, OcrResult, UploadState } from './ocr';

/**
 * State machine state interface
 */
export interface UploadMachineState {
  status: UploadState;
  file: File | null;
  documentType: DocumentType | null;
  result: OcrResult | null;
  error: string | null;
  progress: number;
}

/**
 * Action types for useReducer (discriminated union)
 * This ensures type-safe action creators and exhaustive checking
 */
export type UploadAction =
  | { type: 'SELECT_FILE'; payload: { file: File; documentType: DocumentType } }
  | { type: 'REMOVE_FILE' }
  | { type: 'START_UPLOAD' }
  | { type: 'UPLOAD_PROGRESS'; payload: { progress: number } }
  | { type: 'START_SCANNING' }
  | { type: 'SCANNING_PROGRESS'; payload: { progress: number } }
  | { type: 'UPLOAD_SUCCESS'; payload: { result: OcrResult } }
  | { type: 'UPLOAD_REJECTED'; payload: { result: OcrResult } }
  | { type: 'UPLOAD_ERROR'; payload: { error: string } }
  | { type: 'RETRY' }
  | { type: 'RESET' };

/**
 * Multi-document session tracking (for future enhancement)
 */
export interface DocumentSession {
  id: string;
  file: File;
  documentType: DocumentType;
  status: UploadState;
  result: OcrResult | null;
  error: string | null;
  timestamp: number;
}
