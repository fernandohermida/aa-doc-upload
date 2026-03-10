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

const STATUS_CONFIG: Record<UploadState, {
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  progressColor: string;
}> = {
  IDLE: {
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-900',
    iconColor: 'text-gray-600',
    progressColor: 'bg-gray-600',
  },
  SELECTED: {
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-900',
    iconColor: 'text-gray-600',
    progressColor: 'bg-gray-600',
  },
  UPLOADING: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-aa-yellow',
    textColor: 'text-gray-900',
    iconColor: 'text-aa-black',
    progressColor: 'bg-aa-yellow',
  },
  SCANNING: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-aa-yellow',
    textColor: 'text-gray-900',
    iconColor: 'text-aa-black',
    progressColor: 'bg-aa-yellow',
  },
  SUCCESS: {
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-900',
    iconColor: 'text-emerald-600',
    progressColor: 'bg-emerald-600',
  },
  REJECTED: {
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    iconColor: 'text-amber-600',
    progressColor: 'bg-amber-600',
  },
  ERROR: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-900',
    iconColor: 'text-red-600',
    progressColor: 'bg-red-600',
  },
};

/**
 * Professional status display with enhanced progress indicators
 */
export function StatusDisplay({ status, progress }: StatusDisplayProps) {
  if (status === 'IDLE' || status === 'SELECTED') {
    return null;
  }

  const messages = STATUS_MESSAGES[status];
  const currentMessage = status === 'SCANNING'
    ? messages[Math.min(Math.floor(progress / 33), messages.length - 1)]
    : messages[0];

  const config = STATUS_CONFIG[status];

  return (
    <div className={`mt-8 p-6 ${config.bgColor} rounded-2xl border ${config.borderColor} shadow-sm transition-all duration-300`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          {(status === 'UPLOADING' || status === 'SCANNING') && (
            <div className={`relative w-10 h-10 ${config.iconColor}`}>
              <div className="absolute inset-0 animate-spin">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          )}
          {status === 'SUCCESS' && (
            <div className={`w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center ${config.iconColor}`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {status === 'REJECTED' && (
            <div className={`w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center ${config.iconColor}`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {status === 'ERROR' && (
            <div className={`w-10 h-10 rounded-full bg-red-100 flex items-center justify-center ${config.iconColor}`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="flex-1">
          <p className={`text-base font-semibold ${config.textColor}`}>
            {currentMessage}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {(status === 'UPLOADING' || status === 'SCANNING') && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${config.textColor}`}>
              {status === 'UPLOADING' ? 'Uploading' : 'Processing'}
            </span>
            <span className={`font-semibold ${config.textColor}`}>
              {progress}%
            </span>
          </div>
          <div className="relative w-full h-2.5 bg-white rounded-full overflow-hidden shadow-inner">
            <div
              className={`${config.progressColor} h-full rounded-full transition-all duration-300 ease-out shadow-sm`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
