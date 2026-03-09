import type { OcrResult } from '../../types/ocr';
import { mapErrorCodeToMessage } from '../../utils/errorMapping';

interface ResultSummaryProps {
  result: OcrResult | null;
  error: string | null;
  onRetry?: () => void;
  onReset?: () => void;
}

/**
 * Result summary card for success/rejection/error states
 */
export function ResultSummary({
  result,
  error,
  onRetry,
  onReset,
}: ResultSummaryProps) {
  if (!result && !error) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-900">Upload Failed</h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Rejection state
  if (result && result.status === 'rejected') {
    const userMessage = result.reason
      ? mapErrorCodeToMessage(result.reason)
      : 'The document could not be verified.';

    return (
      <div className="mt-6 p-6 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="text-lg font-semibold text-amber-900">Document Not Verified</h3>
        <p className="mt-2 text-sm text-amber-700">{userMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Upload Different Document
          </button>
        )}
      </div>
    );
  }

  // Success state
  if (result && result.status === 'verified') {
    return (
      <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-900">Document Verified</h3>
        <p className="mt-2 text-sm text-green-700">
          Your document has been successfully verified.
        </p>
        {result.extractedData && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-green-800">Extracted Information:</p>
            <dl className="text-sm">
              {Object.entries(result.extractedData).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <dt className="font-medium text-green-900">{key}:</dt>
                  <dd className="text-green-700">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Upload Another Document
          </button>
        )}
      </div>
    );
  }

  return null;
}
