import { formatFileSize, getFileTypeIcon } from '../../utils/formatters';

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

/**
 * File preview card showing file details and remove option
 */
export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const fileIcon = getFileTypeIcon(file);

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {fileIcon === 'pdf' ? (
            <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h10l4 4v16H2v-1z"/>
            </svg>
          ) : (
            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
            {file.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
        aria-label="Remove file"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
