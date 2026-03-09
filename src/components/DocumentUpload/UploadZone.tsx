import { useRef, useState, DragEvent, ChangeEvent } from 'react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

/**
 * Modern drag-and-drop upload zone with professional minimal design
 */
export function UploadZone({ onFileSelect, disabled = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = (): void => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-2xl p-12 text-center cursor-pointer
        transition-all duration-300 ease-out
        ${isDragging
          ? 'border-2 border-aa-yellow bg-yellow-50 shadow-xl scale-[1.02] ring-4 ring-aa-yellow ring-opacity-30'
          : 'border-2 border-dashed border-gray-300 bg-gray-50'
        }
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-gray-400 hover:bg-white hover:shadow-lg'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
        aria-label="File upload input"
      />

      <div className="space-y-6">
        {/* Upload Icon with Animation */}
        <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full transition-all duration-300 ${
          isDragging ? 'bg-aa-yellow text-black scale-110 shadow-lg' : 'bg-gray-200 text-gray-500'
        }`}>
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* Upload Instructions */}
        <div className="space-y-2">
          <p className="text-base font-medium text-gray-900">
            {isDragging ? (
              <span className="text-aa-black font-bold">Drop your file here</span>
            ) : (
              <>
                <span className="text-aa-black font-bold">Click to upload</span>
                <span className="text-gray-600"> or drag and drop</span>
              </>
            )}
          </p>
          <p className="text-sm text-gray-500">
            Maximum file size: <span className="font-medium">10MB</span>
          </p>
        </div>

        {/* Supported File Types */}
        <div className="flex items-center justify-center gap-4 pt-4">
          {['PDF', 'JPG', 'PNG'].map((type) => (
            <div key={type} className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                {type === 'PDF' ? (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium text-gray-600">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
