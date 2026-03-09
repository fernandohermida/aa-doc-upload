import type { DocumentType, DocumentTypeMetadata } from '../../types/ocr';

const DOCUMENT_TYPES: DocumentTypeMetadata[] = [
  {
    value: 'NCB',
    label: 'No Claims Bonus Letter',
    description: 'Proof of years without claims from previous insurer',
  },
  {
    value: 'GAP_COVER',
    label: 'Gap in Cover Letter',
    description: 'Explains periods without insurance coverage',
  },
  {
    value: 'POLICY_SCHEDULE',
    label: 'Policy Schedule',
    description: "Previous insurer's policy confirmation",
  },
];

interface DocumentTypeSelectorProps {
  value: DocumentType | null;
  onChange: (docType: DocumentType) => void;
  disabled?: boolean;
}

/**
 * Document type selector with radio buttons
 */
export function DocumentTypeSelector({
  value,
  onChange,
  disabled = false,
}: DocumentTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Document Type <span className="text-red-500">*</span>
      </label>
      <div className="space-y-2">
        {DOCUMENT_TYPES.map((docType) => (
          <label
            key={docType.value}
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              value === docType.value
                ? 'border-aa-primary bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="documentType"
              value={docType.value}
              checked={value === docType.value}
              onChange={() => onChange(docType.value)}
              disabled={disabled}
              className="mt-1 h-4 w-4 text-aa-primary border-gray-300 focus:ring-aa-primary"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {docType.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {docType.description}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
