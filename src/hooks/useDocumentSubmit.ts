import { useCallback, useRef, useEffect } from 'react';
import { submitDocumentForOcr } from '../services/mockOcrService';
import { simulateProgress } from '../services/progressSimulator';
import { mapErrorToUserMessage } from '../utils/errorMapping';
import type { DocumentType } from '../types/ocr';
import type { UploadAction } from '../types/state';

interface UseDocumentSubmitOptions {
  dispatch: React.Dispatch<UploadAction>;
  startTransition: (callback: () => Promise<void>) => void;
}

interface UseDocumentSubmitReturn {
  submit: (file: File, documentType: DocumentType) => void;
}

/**
 * Custom hook for document submission with proper cleanup
 * Handles async upload/scan operations and prevents memory leaks
 */
export function useDocumentSubmit({
  dispatch,
  startTransition,
}: UseDocumentSubmitOptions): UseDocumentSubmitReturn {
  const intervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const submit = useCallback(
    (file: File, documentType: DocumentType): void => {
      startTransition(async () => {
        try {
          dispatch({ type: 'START_UPLOAD' });

          // Phase 1: Upload progress simulation
          await simulateProgress((progress) => {
            if (isMountedRef.current) {
              dispatch({ type: 'UPLOAD_PROGRESS', payload: { progress } });
            }
          }, 500, 1000);

          if (!isMountedRef.current) return;

          dispatch({ type: 'START_SCANNING' });

          // Phase 2: Scanning progress simulation with interval
          let scanProgress = 0;
          intervalRef.current = window.setInterval(() => {
            if (!isMountedRef.current) {
              if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
              }
              return;
            }
            scanProgress = Math.min(scanProgress + 10, 90);
            dispatch({
              type: 'SCANNING_PROGRESS',
              payload: { progress: scanProgress },
            });
          }, 200);

          // Call OCR service
          const result = await submitDocumentForOcr(file, documentType);

          // Clean up interval
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          if (!isMountedRef.current) return;

          // Handle result based on status
          if (result.status === 'verified') {
            dispatch({ type: 'UPLOAD_SUCCESS', payload: { result } });
          } else {
            dispatch({ type: 'UPLOAD_REJECTED', payload: { result } });
          }
        } catch (error) {
          // Clean up interval on error
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (isMountedRef.current) {
            const errorMessage = mapErrorToUserMessage(error);
            dispatch({ type: 'UPLOAD_ERROR', payload: { error: errorMessage } });
          }
        }
      });
    },
    [dispatch, startTransition]
  );

  return { submit };
}
