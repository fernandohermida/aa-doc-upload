import type { OcrResult } from '../../types/ocr';
import { mapErrorCodeToMessage } from '../../utils/errorMapping';

interface ResultSummaryProps {
  result: OcrResult | null;
  error: string | null;
  onRetry?: () => void;
  onReset?: () => void;
}

/**
 * Professional result summary cards with enhanced visual design
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
      <div className="mt-8 p-8 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-2xl shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-900">Upload Failed</h3>
            <p className="mt-2 text-sm text-red-700 leading-relaxed">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-6 px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 active:bg-red-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Rejection state
  if (result && result.status === 'rejected') {
    const userMessage = result.reason
      ? mapErrorCodeToMessage(result.reason)
      : 'The document could not be verified.';

    return (
      <div className="mt-8 p-8 bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-2xl shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-amber-900">Document Not Verified</h3>
            <p className="mt-2 text-sm text-amber-700 leading-relaxed">{userMessage}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-6 px-6 py-3 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 active:bg-amber-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Upload Different Document
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (result && result.status === 'verified') {
    return (
      <div className="mt-8 p-8 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-emerald-900">Document Verified</h3>
            <p className="mt-2 text-sm text-emerald-700 leading-relaxed">
              Your document has been successfully verified and processed.
            </p>

            {result.extractedData && Object.keys(result.extractedData).length > 0 && (
              <div className="mt-6 p-4 bg-white rounded-xl border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-3">
                  Extracted Information
                </p>
                <dl className="space-y-2">
                  {Object.entries(result.extractedData).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-emerald-100 last:border-0">
                      <dt className="text-sm font-medium text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </dt>
                      <dd className="text-sm font-semibold text-emerald-900">
                        {String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {onReset && (
              <button
                onClick={onReset}
                className="mt-6 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Upload Another Document
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
