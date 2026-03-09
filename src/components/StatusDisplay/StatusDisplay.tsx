import type { UploadState } from '../../types/ocr';

interface StatusDisplayProps {
  status: UploadState;
  progress: number;
}

const STATUS_MESSAGES: Record<UploadState, string[]> = {
  IDLE: ['Upload your document to begin'],
  SELECTED: ['Ready to submit — review your file'],
  UPLOADING: ['Uploading your document...'],
  SCANNING: [
    'Reading document...',
    'Extracting information...',
    'Verifying details...',
  ],
  SUCCESS: ['Document verified successfully'],
  REJECTED: ['Document could not be verified'],
  ERROR: ['Something went wrong'],
};

/**
 * Status display panel with progress indicators
 */
export function StatusDisplay({ status, progress }: StatusDisplayProps) {
  if (status === 'IDLE' || status === 'SELECTED') {
    return null;
  }

  const messages = STATUS_MESSAGES[status];
  const currentMessage = status === 'SCANNING'
    ? messages[Math.min(Math.floor(progress / 33), messages.length - 1)]
    : messages[0];

  const getStatusColor = (): string => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-aa-success';
      case 'REJECTED':
        return 'bg-aa-warning';
      case 'ERROR':
        return 'bg-aa-error';
      default:
        return 'bg-aa-primary';
    }
  };

  return (
    <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        {(status === 'UPLOADING' || status === 'SCANNING') && (
          <div className="flex-shrink-0">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-aa-primary" />
          </div>
        )}
        {status === 'SUCCESS' && (
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-aa-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {status === 'REJECTED' && (
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-aa-warning" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {status === 'ERROR' && (
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-aa-error" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{currentMessage}</p>
        </div>
      </div>

      {(status === 'UPLOADING' || status === 'SCANNING') && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${getStatusColor()} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">{progress}%</p>
        </div>
      )}
    </div>
  );
}
