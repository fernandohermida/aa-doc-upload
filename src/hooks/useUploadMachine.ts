import { useReducer } from 'react';
import type { UploadMachineState, UploadAction } from '../types/state';

/**
 * Initial state for the upload state machine
 */
const initialState: UploadMachineState = {
  status: 'IDLE',
  file: null,
  documentType: null,
  result: null,
  error: null,
  progress: 0,
};

/**
 * Pure reducer function for upload state machine
 * Handles all state transitions with type-safe actions
 */
function uploadReducer(
  state: UploadMachineState,
  action: UploadAction
): UploadMachineState {
  switch (action.type) {
    case 'SET_DOCUMENT_TYPE':
      return {
        ...state,
        documentType: action.payload.documentType,
      };

    case 'SELECT_FILE':
      return {
        ...state,
        status: 'SELECTED',
        file: action.payload.file,
        documentType: action.payload.documentType,
        error: null,
        result: null,
        progress: 0,
      };

    case 'REMOVE_FILE':
      return initialState;

    case 'START_UPLOAD':
      return {
        ...state,
        status: 'UPLOADING',
        progress: 0,
        error: null,
      };

    case 'UPLOAD_PROGRESS':
      return {
        ...state,
        progress: action.payload.progress,
      };

    case 'START_SCANNING':
      return {
        ...state,
        status: 'SCANNING',
        progress: 0,
      };

    case 'SCANNING_PROGRESS':
      return {
        ...state,
        progress: action.payload.progress,
      };

    case 'UPLOAD_SUCCESS':
      return {
        ...state,
        status: 'SUCCESS',
        result: action.payload.result,
        progress: 100,
      };

    case 'UPLOAD_REJECTED':
      return {
        ...state,
        status: 'REJECTED',
        result: action.payload.result,
        progress: 100,
      };

    case 'UPLOAD_ERROR':
      return {
        ...state,
        status: 'ERROR',
        error: action.payload.error,
        progress: 0,
      };

    case 'RETRY':
      return {
        ...state,
        status: 'SELECTED',
        error: null,
        result: null,
        progress: 0,
      };

    case 'RESET':
      return initialState;

    default: {
      // TypeScript exhaustiveness check
      const exhaustiveCheck: never = action;
      void exhaustiveCheck;
      return state;
    }
  }
}

/**
 * Custom hook for upload state machine
 * Provides type-safe state and dispatch
 */
export function useUploadMachine() {
  return useReducer(uploadReducer, initialState);
}

// Export for testing
export { initialState, uploadReducer };
