import type { DocumentType, DocumentTypeMetadata } from '../../types/ocr';

const DOCUMENT_TYPES: DocumentTypeMetadata[] = [
  {
    value: 'NCB',
    label: 'No Claims Bonus Letter',
    description: 'Proof of years without claims from previous insurer',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    value: 'GAP_COVER',
    label: 'Gap in Cover Letter',
    description: 'Explains periods without insurance coverage',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'POLICY_SCHEDULE',
    label: 'Policy Schedule',
    description: "Previous insurer's policy confirmation",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

interface DocumentTypeSelectorProps {
  value: DocumentType | null;
  onChange: (docType: DocumentType) => void;
  disabled?: boolean;
}

/**
 * Document type selector with elegant card-based design
 */
export function DocumentTypeSelector({
  value,
  onChange,
  disabled = false,
}: DocumentTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-900">
        Select Document Type <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DOCUMENT_TYPES.map((docType) => {
          const isSelected = value === docType.value;
          return (
            <button
              key={docType.value}
              type="button"
              onClick={() => !disabled && onChange(docType.value)}
              disabled={disabled}
              className={`
                relative group text-left p-6 rounded-xl border-2 transition-all duration-200
                ${isSelected
                  ? 'border-aa-yellow bg-yellow-50 shadow-lg ring-2 ring-aa-yellow ring-opacity-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-aa-yellow rounded-full flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`mb-4 ${isSelected ? 'text-aa-black' : 'text-gray-400 group-hover:text-gray-600'} transition-colors`}>
                {docType.icon}
              </div>

              {/* Content */}
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5 leading-tight">
                {docType.label}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {docType.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
