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
 * Extracted data for No Claims Bonus documents
 */
export interface NcbExtractedData {
  yearsNoClaims: number;
  insurerName: string;
  validFrom: string;
}

/**
 * Extracted data for Gap in Cover documents
 */
export interface GapCoverExtractedData {
  gapDays: number;
  reason: string;
  validFrom: string;
  validTo: string;
}

/**
 * Extracted data for Policy Schedule documents
 */
export interface PolicyScheduleExtractedData {
  insurer: string;
  policyNumber: string;
  effectiveDate: string;
}

/**
 * Union type for all extracted data possibilities
 */
export type ExtractedData = NcbExtractedData | GapCoverExtractedData | PolicyScheduleExtractedData;

/**
 * Base interface for OCR results
 */
interface OcrResultBase {
  docType: DocumentType;
}

/**
 * OCR result when document is verified successfully
 */
export interface OcrResultVerified extends OcrResultBase {
  status: 'verified';
  extractedData: ExtractedData;
}

/**
 * OCR result when document is rejected
 */
export interface OcrResultRejected extends OcrResultBase {
  status: 'rejected';
  reason: string;
}

/**
 * OCR service result structure (discriminated union)
 * Type narrows automatically based on status field
 */
export type OcrResult = OcrResultVerified | OcrResultRejected;

/**
 * Document type metadata for UI display
 */
export interface DocumentTypeMetadata {
  value: DocumentType;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}
