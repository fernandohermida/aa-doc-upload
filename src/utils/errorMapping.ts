/**
 * Maps technical error codes to user-friendly messages
 */
export function mapErrorCodeToMessage(errorCode: string): string {
  const errorMap: Record<string, string> = {
    ILLEGIBLE_DOCUMENT: 'We were unable to read this document clearly. Please upload a clearer scan.',
    DATE_MISMATCH: "The dates on this document don't match our records. Please verify and re-upload.",
    UNSUPPORTED_FORMAT: "This document format couldn't be processed. Please try a different file.",
    OCR_SERVICE_UNAVAILABLE: 'Our verification service is temporarily unavailable. Please try again in a moment.',
    TIMEOUT: 'The upload took too long. Please check your connection and try again.',
    INVALID_FILE: 'This file appears to be invalid or corrupted. Please try a different file.',
  };

  return errorMap[errorCode] || 'An unexpected error occurred. Please try again.';
}

/**
 * Maps error objects to user-friendly messages
 */
export function mapErrorToUserMessage(error: unknown): string {
  if (error instanceof Error) {
    return mapErrorCodeToMessage(error.message);
  }

  return 'An unexpected error occurred. Please try again.';
}
