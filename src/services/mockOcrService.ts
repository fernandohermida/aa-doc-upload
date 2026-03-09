import type { DocumentType, OcrResult, OcrServiceError } from '../types/ocr';

// Configurable constants
const UPLOAD_DELAY_MIN = 500;
const UPLOAD_DELAY_MAX = 1000;
const SCAN_DELAY_MIN = 1000;
const SCAN_DELAY_MAX = 2500;
const SUCCESS_RATE = 0.7; // 70%
const NETWORK_ERROR_RATE = 0.05; // 5% chance of network error

/**
 * Generates a random delay within specified range
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Generates mock success response based on document type
 */
function generateSuccessResponse(docType: DocumentType): OcrResult {
  const responses: Record<DocumentType, OcrResult> = {
    NCB: {
      status: 'verified',
      docType: 'NCB',
      extractedData: {
        yearsNoClaims: Math.floor(Math.random() * 10) + 1,
        insurerName: 'Mock Insurance Co.',
        validFrom: '2023-01-01',
      },
    },
    GAP_COVER: {
      status: 'verified',
      docType: 'GAP_COVER',
      extractedData: {
        gapDays: Math.floor(Math.random() * 90) + 1,
        reason: 'Travel abroad',
        validFrom: '2023-03-01',
        validTo: '2023-04-30',
      },
    },
    POLICY_SCHEDULE: {
      status: 'verified',
      docType: 'POLICY_SCHEDULE',
      extractedData: {
        insurer: 'Previous Insurance Ltd.',
        policyNumber: `POL${Math.floor(Math.random() * 1000000)}`,
        effectiveDate: '2023-01-01',
      },
    },
  };

  return responses[docType];
}

/**
 * Generates mock rejection response based on document type
 */
function generateRejectionResponse(docType: DocumentType): OcrResult {
  const rejectionReasons: Record<DocumentType, string[]> = {
    NCB: ['ILLEGIBLE_DOCUMENT', 'DATE_MISMATCH'],
    GAP_COVER: ['DATE_MISMATCH', 'UNSUPPORTED_FORMAT'],
    POLICY_SCHEDULE: ['UNSUPPORTED_FORMAT', 'ILLEGIBLE_DOCUMENT'],
  };

  const reasons = rejectionReasons[docType];
  const reason = reasons[Math.floor(Math.random() * reasons.length)];

  return {
    status: 'rejected',
    docType,
    reason,
  };
}

/**
 * Main OCR submission function
 * Simulates two-phase upload process with realistic delays
 *
 * @param _file - The file to process (unused in mock implementation)
 * @param docType - The document type selected by user
 * @returns Promise resolving to OCR result
 * @throws OcrServiceError on network/service failures
 */
export async function submitDocumentForOcr(
  _file: File,
  docType: DocumentType
): Promise<OcrResult> {
  // Simulate network error (5% chance)
  if (Math.random() < NETWORK_ERROR_RATE) {
    await randomDelay(5000, 5000); // 5 second timeout
    const error = new Error('OCR_SERVICE_UNAVAILABLE') as OcrServiceError;
    error.code = 'OCR_SERVICE_UNAVAILABLE';
    throw error;
  }

  // Phase 1: Upload delay
  await randomDelay(UPLOAD_DELAY_MIN, UPLOAD_DELAY_MAX);

  // Phase 2: Scanning delay
  await randomDelay(SCAN_DELAY_MIN, SCAN_DELAY_MAX);

  // Determine success or failure (70/30 split)
  const isSuccess = Math.random() < SUCCESS_RATE;

  if (isSuccess) {
    return generateSuccessResponse(docType);
  } else {
    return generateRejectionResponse(docType);
  }
}
