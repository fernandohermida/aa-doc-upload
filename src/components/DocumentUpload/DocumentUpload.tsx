import { useTransition } from 'react';
import { useUploadMachine } from '../../hooks/useUploadMachine';
import { useFileValidation } from '../../hooks/useFileValidation';
import { submitDocumentForOcr } from '../../services/mockOcrService';
import { simulateProgress } from '../../services/progressSimulator';
import { mapErrorToUserMessage } from '../../utils/errorMapping';
import { DocumentTypeSelector } from './DocumentTypeSelector';
import { UploadZone } from './UploadZone';
import { FilePreview } from '../FilePreview/FilePreview';
import { StatusDisplay } from '../StatusDisplay/StatusDisplay';
import { ResultSummary } from '../ResultSummary/ResultSummary';
import type { DocumentType } from '../../types/ocr';

/**
 * Main document upload component
 * Integrates all sub-components and manages upload lifecycle
 */
export function DocumentUpload() {
  const [state, dispatch] = useUploadMachine();
  const [isPending, startTransition] = useTransition();
  const { validate } = useFileValidation();

  const handleDocumentTypeChange = (docType: DocumentType): void => {
    if (state.file && state.file.size > 0) {
      dispatch({
        type: 'SELECT_FILE',
        payload: { file: state.file, documentType: docType },
      });
    } else {
      // Store document type selection for later
      const dummyFile = new File([], 'pending', { type: 'application/pdf' });
      dispatch({
        type: 'SELECT_FILE',
        payload: { file: dummyFile, documentType: docType },
      });
    }
  };

  const handleFileSelect = (file: File): void => {
    // Validate file
    const validation = validate(file);
    if (!validation.valid) {
      dispatch({
        type: 'UPLOAD_ERROR',
        payload: { error: validation.error || 'Invalid file' },
      });
      return;
    }

    // If document type already selected, use it
    const docType = state.documentType || 'NCB'; // Default to NCB
    dispatch({
      type: 'SELECT_FILE',
      payload: { file, documentType: docType },
    });
  };

  const handleRemoveFile = (): void => {
    dispatch({ type: 'REMOVE_FILE' });
  };

  const handleSubmit = (): void => {
    if (!state.file || !state.documentType || state.file.size === 0) return;

    const currentFile = state.file;
    const currentDocType = state.documentType;

    startTransition(async () => {
      try {
        // Start upload phase
        dispatch({ type: 'START_UPLOAD' });

        // Simulate upload progress
        await simulateProgress((progress) => {
          dispatch({ type: 'UPLOAD_PROGRESS', payload: { progress } });
        }, 500, 1000);

        // Start scanning phase
        dispatch({ type: 'START_SCANNING' });

        // Simulate scanning progress with interval
        let scanProgress = 0;
        const progressInterval = setInterval(() => {
          scanProgress = Math.min(scanProgress + 10, 90);
          dispatch({
            type: 'SCANNING_PROGRESS',
            payload: { progress: scanProgress },
          });
        }, 200);

        // Call OCR service
        const result = await submitDocumentForOcr(currentFile, currentDocType);

        clearInterval(progressInterval);

        // Handle result
        if (result.status === 'verified') {
          dispatch({ type: 'UPLOAD_SUCCESS', payload: { result } });
        } else {
          dispatch({ type: 'UPLOAD_REJECTED', payload: { result } });
        }
      } catch (error) {
        const errorMessage = mapErrorToUserMessage(error);
        dispatch({ type: 'UPLOAD_ERROR', payload: { error: errorMessage } });
      }
    });
  };

  const handleRetry = (): void => {
    dispatch({ type: 'RETRY' });
  };

  const handleReset = (): void => {
    dispatch({ type: 'RESET' });
  };

  const canSubmit = state.status === 'SELECTED' && state.file && state.file.size > 0 && state.documentType && !isPending;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Insurance Document
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Please upload supporting documents to verify your policy discount eligibility
        </p>

        {/* Document Type Selector */}
        <DocumentTypeSelector
          value={state.documentType}
          onChange={handleDocumentTypeChange}
          disabled={state.status !== 'IDLE' && state.status !== 'SELECTED'}
        />

        {/* Upload Zone or File Preview */}
        <div className="mt-6">
          {state.file && state.file.size > 0 && state.status !== 'IDLE' ? (
            <FilePreview file={state.file} onRemove={handleRemoveFile} />
          ) : (
            <UploadZone
              onFileSelect={handleFileSelect}
              disabled={state.status !== 'IDLE' && state.status !== 'SELECTED'}
            />
          )}
        </div>

        {/* Submit Button */}
        {canSubmit && (
          <button
            onClick={handleSubmit}
            className="mt-6 w-full bg-aa-primary text-white py-3 px-4 rounded-lg hover:bg-blue-800 transition-colors font-medium"
          >
            Submit Document
          </button>
        )}

        {/* Status Display */}
        <StatusDisplay status={state.status} progress={state.progress} />

        {/* Result Summary */}
        <ResultSummary
          result={state.result}
          error={state.error}
          onRetry={handleRetry}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}
