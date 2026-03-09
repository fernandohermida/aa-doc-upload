import { describe, it, expect } from 'vitest'
import { uploadReducer, initialState } from '../useUploadMachine'
import type { UploadMachineState, UploadAction } from '../../types/state'
import type { OcrResult } from '../../types/ocr'

describe('useUploadMachine - Reducer Tests', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(initialState).toEqual({
        status: 'IDLE',
        file: null,
        documentType: null,
        result: null,
        error: null,
        progress: 0,
      })
    })
  })

  describe('SELECT_FILE Action', () => {
    it('should transition from IDLE to SELECTED with file and document type', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const action: UploadAction = {
        type: 'SELECT_FILE',
        payload: {
          file: mockFile,
          documentType: 'NCB',
        },
      }

      const newState = uploadReducer(initialState, action)

      expect(newState.status).toBe('SELECTED')
      expect(newState.file).toBe(mockFile)
      expect(newState.documentType).toBe('NCB')
      expect(newState.error).toBeNull()
      expect(newState.result).toBeNull()
      expect(newState.progress).toBe(0)
    })

    it('should clear previous errors when selecting new file', () => {
      const stateWithError: UploadMachineState = {
        ...initialState,
        status: 'ERROR',
        error: 'Previous error',
      }
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const action: UploadAction = {
        type: 'SELECT_FILE',
        payload: {
          file: mockFile,
          documentType: 'GAP_COVER',
        },
      }

      const newState = uploadReducer(stateWithError, action)

      expect(newState.status).toBe('SELECTED')
      expect(newState.error).toBeNull()
    })
  })

  describe('REMOVE_FILE Action', () => {
    it('should reset to initial state when removing file', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const stateWithFile: UploadMachineState = {
        status: 'SELECTED',
        file: mockFile,
        documentType: 'NCB',
        result: null,
        error: null,
        progress: 0,
      }
      const action: UploadAction = { type: 'REMOVE_FILE' }

      const newState = uploadReducer(stateWithFile, action)

      expect(newState).toEqual(initialState)
    })
  })

  describe('START_UPLOAD Action', () => {
    it('should transition to UPLOADING state with progress at 0', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const selectedState: UploadMachineState = {
        status: 'SELECTED',
        file: mockFile,
        documentType: 'NCB',
        result: null,
        error: null,
        progress: 0,
      }
      const action: UploadAction = { type: 'START_UPLOAD' }

      const newState = uploadReducer(selectedState, action)

      expect(newState.status).toBe('UPLOADING')
      expect(newState.progress).toBe(0)
      expect(newState.error).toBeNull()
    })
  })

  describe('UPLOAD_PROGRESS Action', () => {
    it('should update progress value', () => {
      const uploadingState: UploadMachineState = {
        ...initialState,
        status: 'UPLOADING',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        documentType: 'NCB',
      }
      const action: UploadAction = {
        type: 'UPLOAD_PROGRESS',
        payload: { progress: 50 },
      }

      const newState = uploadReducer(uploadingState, action)

      expect(newState.progress).toBe(50)
    })
  })

  describe('START_SCANNING Action', () => {
    it('should transition from UPLOADING to SCANNING', () => {
      const uploadingState: UploadMachineState = {
        ...initialState,
        status: 'UPLOADING',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        documentType: 'NCB',
        progress: 100,
      }
      const action: UploadAction = { type: 'START_SCANNING' }

      const newState = uploadReducer(uploadingState, action)

      expect(newState.status).toBe('SCANNING')
      expect(newState.progress).toBe(0)
    })
  })

  describe('SCANNING_PROGRESS Action', () => {
    it('should update scanning progress', () => {
      const scanningState: UploadMachineState = {
        ...initialState,
        status: 'SCANNING',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        documentType: 'NCB',
      }
      const action: UploadAction = {
        type: 'SCANNING_PROGRESS',
        payload: { progress: 75 },
      }

      const newState = uploadReducer(scanningState, action)

      expect(newState.progress).toBe(75)
    })
  })

  describe('UPLOAD_SUCCESS Action', () => {
    it('should transition to SUCCESS with result and 100% progress', () => {
      const scanningState: UploadMachineState = {
        ...initialState,
        status: 'SCANNING',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        documentType: 'NCB',
      }
      const mockResult: OcrResult = {
        status: 'verified',
        docType: 'NCB',
        extractedData: {
          yearsNoClaims: 5,
          insurerName: 'Test Insurance',
        },
      }
      const action: UploadAction = {
        type: 'UPLOAD_SUCCESS',
        payload: { result: mockResult },
      }

      const newState = uploadReducer(scanningState, action)

      expect(newState.status).toBe('SUCCESS')
      expect(newState.result).toEqual(mockResult)
      expect(newState.progress).toBe(100)
    })
  })

  describe('UPLOAD_REJECTED Action', () => {
    it('should transition to REJECTED with rejection result', () => {
      const scanningState: UploadMachineState = {
        ...initialState,
        status: 'SCANNING',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        documentType: 'NCB',
      }
      const mockResult: OcrResult = {
        status: 'rejected',
        docType: 'NCB',
        reason: 'ILLEGIBLE_DOCUMENT',
      }
      const action: UploadAction = {
        type: 'UPLOAD_REJECTED',
        payload: { result: mockResult },
      }

      const newState = uploadReducer(scanningState, action)

      expect(newState.status).toBe('REJECTED')
      expect(newState.result).toEqual(mockResult)
      expect(newState.progress).toBe(100)
    })
  })

  describe('UPLOAD_ERROR Action', () => {
    it('should transition to ERROR state with error message', () => {
      const scanningState: UploadMachineState = {
        ...initialState,
        status: 'SCANNING',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        documentType: 'NCB',
        progress: 50,
      }
      const action: UploadAction = {
        type: 'UPLOAD_ERROR',
        payload: { error: 'Network error occurred' },
      }

      const newState = uploadReducer(scanningState, action)

      expect(newState.status).toBe('ERROR')
      expect(newState.error).toBe('Network error occurred')
      expect(newState.progress).toBe(0)
    })
  })

  describe('RETRY Action', () => {
    it('should transition from ERROR back to SELECTED', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const errorState: UploadMachineState = {
        status: 'ERROR',
        file: mockFile,
        documentType: 'NCB',
        result: null,
        error: 'Previous error',
        progress: 0,
      }
      const action: UploadAction = { type: 'RETRY' }

      const newState = uploadReducer(errorState, action)

      expect(newState.status).toBe('SELECTED')
      expect(newState.error).toBeNull()
      expect(newState.result).toBeNull()
      expect(newState.progress).toBe(0)
      expect(newState.file).toBe(mockFile)
      expect(newState.documentType).toBe('NCB')
    })

    it('should transition from REJECTED back to SELECTED', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const rejectedState: UploadMachineState = {
        status: 'REJECTED',
        file: mockFile,
        documentType: 'GAP_COVER',
        result: {
          status: 'rejected',
          docType: 'GAP_COVER',
          reason: 'DATE_MISMATCH',
        },
        error: null,
        progress: 100,
      }
      const action: UploadAction = { type: 'RETRY' }

      const newState = uploadReducer(rejectedState, action)

      expect(newState.status).toBe('SELECTED')
      expect(newState.result).toBeNull()
      expect(newState.progress).toBe(0)
    })
  })

  describe('RESET Action', () => {
    it('should reset any state back to initial state', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const successState: UploadMachineState = {
        status: 'SUCCESS',
        file: mockFile,
        documentType: 'POLICY_SCHEDULE',
        result: {
          status: 'verified',
          docType: 'POLICY_SCHEDULE',
          extractedData: { insurer: 'Test Co.' },
        },
        error: null,
        progress: 100,
      }
      const action: UploadAction = { type: 'RESET' }

      const newState = uploadReducer(successState, action)

      expect(newState).toEqual(initialState)
    })
  })

  describe('State Transitions - Complete Flow', () => {
    it('should handle complete successful upload flow', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      let state = initialState

      // Select file
      state = uploadReducer(state, {
        type: 'SELECT_FILE',
        payload: { file: mockFile, documentType: 'NCB' },
      })
      expect(state.status).toBe('SELECTED')

      // Start upload
      state = uploadReducer(state, { type: 'START_UPLOAD' })
      expect(state.status).toBe('UPLOADING')

      // Upload progress
      state = uploadReducer(state, {
        type: 'UPLOAD_PROGRESS',
        payload: { progress: 50 },
      })
      expect(state.progress).toBe(50)

      // Start scanning
      state = uploadReducer(state, { type: 'START_SCANNING' })
      expect(state.status).toBe('SCANNING')

      // Scanning progress
      state = uploadReducer(state, {
        type: 'SCANNING_PROGRESS',
        payload: { progress: 80 },
      })
      expect(state.progress).toBe(80)

      // Success
      state = uploadReducer(state, {
        type: 'UPLOAD_SUCCESS',
        payload: {
          result: {
            status: 'verified',
            docType: 'NCB',
            extractedData: { yearsNoClaims: 5 },
          },
        },
      })
      expect(state.status).toBe('SUCCESS')
      expect(state.progress).toBe(100)
    })

    it('should handle error and retry flow', () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      let state = initialState

      // Select and upload
      state = uploadReducer(state, {
        type: 'SELECT_FILE',
        payload: { file: mockFile, documentType: 'NCB' },
      })
      state = uploadReducer(state, { type: 'START_UPLOAD' })
      state = uploadReducer(state, { type: 'START_SCANNING' })

      // Error occurs
      state = uploadReducer(state, {
        type: 'UPLOAD_ERROR',
        payload: { error: 'Network timeout' },
      })
      expect(state.status).toBe('ERROR')

      // Retry
      state = uploadReducer(state, { type: 'RETRY' })
      expect(state.status).toBe('SELECTED')
      expect(state.error).toBeNull()
      expect(state.file).toBe(mockFile)
    })
  })
})
