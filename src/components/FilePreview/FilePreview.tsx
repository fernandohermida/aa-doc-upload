import { formatFileSize, getFileTypeIcon } from '../../utils/formatters';

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

/**
 * Professional file preview card with enhanced visual design
 */
export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const fileIcon = getFileTypeIcon(file);

  return (
    <div className="group relative p-6 bg-gradient-to-br from-yellow-50 to-white rounded-2xl border-2 border-aa-yellow shadow-md hover:shadow-lg transition-all duration-200">
      <div className="flex items-center gap-4">
        {/* File Icon */}
        <div className="flex-shrink-0 w-14 h-14 bg-white rounded-xl border-2 border-yellow-200 flex items-center justify-center shadow-sm">
          {fileIcon === 'pdf' ? (
            <svg className="w-7 h-7 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* File Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate mb-1">
            {file.name}
          </p>
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2 py-0.5 bg-aa-yellow text-black rounded-md font-bold uppercase">
              {fileIcon}
            </span>
            <span className="text-gray-600 font-medium">
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 group-hover:shadow-md"
          aria-label="Remove file"
        >
          <svg className="w-5 h-5 text-gray-600 hover:text-red-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Success Indicator */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-6 h-6 bg-aa-yellow rounded-full flex items-center justify-center shadow-md">
          <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
}
