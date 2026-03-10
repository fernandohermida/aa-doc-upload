# Product Requirements Document
## Motor Insurance Document Upload Portal - Interview Assessment

**Version:** 1.0
**Date:** 2026-03-08
**Project Type:** Technical Assessment - Round 2
**Target:** AA Ireland Motor Insurance Customer Portal

---

## 1. Executive Summary

### 1.1 Purpose
Build a production-quality, customer-facing document upload portal for AA Ireland's motor insurance journey. The system enables customers to upload supporting documents to validate their policy discount eligibility through simulated AI/OCR validation.

### 1.2 Key Objectives
- Provide a seamless, user-friendly document upload experience
- Simulate realistic OCR validation with comprehensive status feedback
- Demonstrate production-ready React/TypeScript development skills
- Handle success, failure, and error scenarios gracefully
- Support multiple document uploads in a single session

### 1.3 Success Metrics
- Zero TypeScript errors in strict mode
- All upload states clearly communicated to users
- <200ms UI response time for state transitions
- Proper error handling and recovery paths
- Clean, maintainable, testable code architecture

---

## 2. Technical Constraints & Stack

### 2.1 Required Technologies
- **Framework:** React 18+
- **Language:** TypeScript (strict mode)
- **Build Tool:** Vite
- **Linting:** ESLint (zero warnings policy)
- **APIs:** No external API calls permitted - all services must be mocked

### 2.2 Technical Constraints
- All AI/OCR services simulated with typed mock functions
- No third-party API integration libraries
- Client-side only implementation
- Must work from fresh clone with `npm install && npm run dev`

### 2.3 Browser Support
- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features allowed
- No IE11 support required

---

## 3. User Scenario & Context

### 3.1 Customer Journey
1. Customer completes online motor insurance policy purchase
2. System prompts for supporting documents to validate quote discount
3. Customer selects document type from supported list
4. Customer uploads document (drag-drop or browse)
5. System validates file client-side (type, size)
6. System submits to OCR service for verification
7. Customer sees real-time status updates
8. System returns verification result (success/rejection/error)
9. Customer can upload additional documents or continue

### 3.2 Supported Document Types
| Document Type | Purpose | Expected Content |
|--------------|---------|------------------|
| **No Claims Bonus Letter** | Proof of years without claims from previous insurer | Years of claim-free driving |
| **Gap in Cover Letter** | Explains periods without insurance coverage | Duration of gap, reasons |
| **Policy Schedule** | Previous insurer's policy confirmation | Insurer name, policy details |

### 3.3 User Needs
- **Clarity:** Always know what's happening with their upload
- **Control:** Ability to cancel, retry, or remove selections
- **Confidence:** Clear feedback on success or reasons for rejection
- **Efficiency:** Quick file selection with drag-drop support
- **Guidance:** Plain English messaging (no technical jargon)

---

## 4. Mock OCR Service Specification

### 4.1 Service Contract
**Module:** `src/services/mockOcrService.ts`

**Function Signature:**
```typescript
submitDocumentForOcr(file: File, docType: DocumentType): Promise<OcrResult>
```

### 4.2 Behavior Requirements

#### 4.2.1 Timing Simulation
- **Upload Phase:** 500-1,000ms delay
- **Scanning Phase:** 1,000-2,500ms delay
- **Network Error:** 5,000ms timeout

#### 4.2.2 Success/Failure Distribution
- **Success Rate:** 70% (configurable constant)
- **Failure Rate:** 30% (configurable constant)
- **Randomization:** Math.random() for outcome determination

#### 4.2.3 Response Matrix

| Document Type | Outcome | Delay | Response Shape |
|--------------|---------|-------|----------------|
| NCB Letter | SUCCESS (70%) | 1,500-2,500ms | `{ status: 'verified', docType: 'NCB', yearsNoClaims: 3 }` |
| NCB Letter | FAILURE (30%) | 800-1,200ms | `{ status: 'rejected', reason: 'ILLEGIBLE_DOCUMENT' }` |
| Gap Cover Letter | SUCCESS (70%) | 1,500-2,500ms | `{ status: 'verified', docType: 'GAP_COVER', gapDays: 14 }` |
| Gap Cover Letter | FAILURE (30%) | 800-1,200ms | `{ status: 'rejected', reason: 'DATE_MISMATCH' }` |
| Policy Schedule | SUCCESS (70%) | 1,500-2,500ms | `{ status: 'verified', docType: 'POLICY', insurer: 'Mock Co' }` |
| Policy Schedule | FAILURE (30%) | 800-1,200ms | `{ status: 'rejected', reason: 'UNSUPPORTED_FORMAT' }` |
| Any Document | NETWORK ERROR | 5,000ms | `throw new Error('OCR_SERVICE_UNAVAILABLE')` |

### 4.3 Type Definitions
**File:** `src/types/ocr.ts`

```typescript
export type DocumentType = 'NCB' | 'GAP_COVER' | 'POLICY_SCHEDULE';
export type OcrStatus = 'verified' | 'rejected';

export interface OcrResult {
  status: OcrStatus;
  docType: DocumentType;
  reason?: string; // present on rejection
  extractedData?: Record<string, unknown>; // present on success
}

export interface OcrServiceError extends Error {
  code: 'OCR_SERVICE_UNAVAILABLE' | 'TIMEOUT' | 'INVALID_FILE';
}

export type UploadState =
  | 'IDLE'
  | 'SELECTED'
  | 'UPLOADING'
  | 'SCANNING'
  | 'SUCCESS'
  | 'REJECTED'
  | 'ERROR';

// State machine state interface
export interface UploadMachineState {
  status: UploadState;
  file: File | null;
  documentType: DocumentType | null;
  result: OcrResult | null;
  error: string | null;
  progress: number;
}

// Action types for useReducer (discriminated union)
export type UploadAction =
  | { type: 'SELECT_FILE'; payload: { file: File; documentType: DocumentType } }
  | { type: 'REMOVE_FILE' }
  | { type: 'START_UPLOAD' }
  | { type: 'UPLOAD_PROGRESS'; payload: { progress: number } }
  | { type: 'START_SCANNING' }
  | { type: 'SCANNING_PROGRESS'; payload: { progress: number } }
  | { type: 'UPLOAD_SUCCESS'; payload: { result: OcrResult } }
  | { type: 'UPLOAD_REJECTED'; payload: { result: OcrResult } }
  | { type: 'UPLOAD_ERROR'; payload: { error: string } }
  | { type: 'RETRY' }
  | { type: 'RESET' };
```

### 4.4 Service Requirements
- ✓ Fully typed with no `any` types
- ✓ Unit-testable (no DOM/React dependencies)
- ✓ Configurable delays and success rates (constants at top)
- ✓ JSDoc comments for all public functions
- ✓ Proper error throwing with typed errors

---

## 5. UI/UX Requirements

### 5.1 Upload Lifecycle States

| State | Visual Indicator | User Message | Available Actions |
|-------|-----------------|--------------|-------------------|
| **IDLE** | Upload icon / dropzone | "Upload your document to begin" | Select / Drag file |
| **SELECTED** | File name + size badge | "Ready to submit — review your file" | Submit or Remove |
| **UPLOADING** | Animated progress bar | "Uploading your document..." | Cancel |
| **SCANNING** | Pulsing spinner + % steps | "Scanning document... Verifying content..." | Cancel |
| **SUCCESS** | Green checkmark + summary | "Document verified successfully" | Upload another / Continue |
| **REJECTED** | Amber warning + reason | "We could not verify this document. [reason]" | Re-upload / Use different doc |
| **ERROR** | Red alert + retry | "Something went wrong. Please try again." | Retry |

### 5.2 Component Requirements

#### 5.2.1 Document Type Selector
- Radio buttons or dropdown for document type selection
- Clear labels with brief descriptions
- Required selection before upload enabled

#### 5.2.2 Upload Zone
- **Drag-and-drop:** Visual feedback on hover/dragover
- **Click-to-browse:** HTML file input fallback
- **Visual states:** Default, hover, drag-over, disabled
- **File constraints:** Displayed prominently (PDF, JPG, PNG | Max 10MB)

#### 5.2.3 File Preview Card
- Filename display
- File type icon (PDF/Image)
- File size in human-readable format (KB/MB)
- Remove button (X icon)

#### 5.2.4 Status Display Panel
- Sequential status messages during SCANNING phase
  - "Uploading document..."
  - "Reading document..."
  - "Verifying details..."
- Animated progress indicators
- Clear success/failure visual hierarchy

#### 5.2.5 Result Summary Cards
- **Success:** Document type, extracted data fields, timestamp
- **Rejection:** Reason in plain English (not error codes)
- **Error:** Technical issue description, retry option

### 5.3 Client-Side Validation

| Validation | Rule | Error Message |
|-----------|------|---------------|
| File type | PDF, JPG, PNG only | "Please upload a PDF, JPG, or PNG file" |
| File size | Max 10MB | "File size must be under 10MB" |
| Document type | Must be selected | "Please select a document type" |

### 5.4 Error Message Mapping
Transform technical error codes to user-friendly messages:

| Error Code | User Message |
|-----------|--------------|
| `ILLEGIBLE_DOCUMENT` | "We were unable to read this document clearly. Please upload a clearer scan." |
| `DATE_MISMATCH` | "The dates on this document don't match our records. Please verify and re-upload." |
| `UNSUPPORTED_FORMAT` | "This document format couldn't be processed. Please try a different file." |
| `OCR_SERVICE_UNAVAILABLE` | "Our verification service is temporarily unavailable. Please try again in a moment." |

### 5.5 Multi-Document Support
- Summary list of all uploaded documents in session
- Status badge per document (verified/rejected/pending)
- Ability to upload multiple documents sequentially
- Clear "Continue" action when all required docs uploaded

---

## 6. Architecture & Project Structure

### 6.1 Folder Structure
```
src/
├── components/                # React components
│   ├── DocumentUpload/       # Main upload component
│   │   ├── DocumentUpload.tsx
│   │   ├── DocumentTypeSelector.tsx
│   │   └── UploadZone.tsx
│   ├── FilePreview/          # File preview card
│   │   └── FilePreview.tsx
│   ├── StatusDisplay/        # Status feedback panel
│   │   ├── StatusDisplay.tsx
│   │   ├── ProgressBar.tsx
│   │   └── StatusMessage.tsx
│   ├── ResultSummary/        # Success/failure/error cards
│   │   └── ResultSummary.tsx
│   └── ErrorBoundary/        # Error boundary wrapper
│       └── ErrorBoundary.tsx
├── hooks/                    # Custom React hooks
│   ├── useUploadMachine.ts  # State machine with useReducer
│   └── useFileValidation.ts # Client-side file validation
├── services/                 # Business logic & mocks
│   ├── mockOcrService.ts    # Simulated OCR service
│   └── progressSimulator.ts # Upload/scan progress simulation
├── types/                    # TypeScript definitions
│   ├── ocr.ts               # Core types (DocumentType, OcrResult, etc.)
│   └── state.ts             # State machine types (UploadAction, UploadMachineState)
├── utils/                    # Pure utility functions
│   ├── fileValidation.ts    # File type/size validation
│   ├── formatters.ts        # Data formatting (file size, dates)
│   └── errorMapping.ts      # Error code to user message mapping
└── App.tsx                   # Root component with ErrorBoundary
```

### 6.2 Component Hierarchy
```
App
└── DocumentUploadPortal
    ├── DocumentTypeSelector
    ├── UploadZone
    │   └── FileInput (drag-drop + browse)
    ├── FilePreview
    ├── StatusDisplay
    │   ├── ProgressBar
    │   └── StatusMessage
    ├── ResultSummary
    └── DocumentList (multi-upload)
```

### 6.3 State Management Approach

**Primary Pattern: useReducer with State Machine**

Use React's `useReducer` hook to implement a predictable state machine for upload lifecycle management. This provides:
- Clear state transitions with type-safe actions
- Centralized state logic (easier to test and debug)
- Immutable state updates following React best practices
- Single source of truth for upload status

**Async Operations: useTransition (React 19)**

Leverage React 19's `useTransition` hook for async operations:
- Automatic pending state management during OCR submission
- Non-blocking UI updates during file processing
- Built-in error handling with ErrorBoundary integration
- Optimistic UI updates without manual isPending tracking

**State Architecture:**
- **Upload state machine:** `useReducer` with discriminated union actions
- **Async OCR calls:** `useTransition` + `startTransition` wrapper
- **Multi-document tracking:** Array state with individual upload machines
- **No external state library required:** React built-in hooks are sufficient

**Key Implementation Details:**
- Pure reducer functions with no side effects
- Side effects (file upload, API calls) handled in `useEffect` or event handlers
- Custom hooks (`useUploadMachine`) encapsulate reducer + transition logic
- Context API optional for deep component trees (not required for initial implementation)

### 6.4 State Machine Implementation Pattern

**Reducer Implementation** (`src/hooks/useUploadMachine.ts`):

```typescript
import { useReducer } from 'react';
import type { UploadMachineState, UploadAction } from '../types/ocr';

const initialState: UploadMachineState = {
  status: 'IDLE',
  file: null,
  documentType: null,
  result: null,
  error: null,
  progress: 0,
};

function uploadReducer(state: UploadMachineState, action: UploadAction): UploadMachineState {
  switch (action.type) {
    case 'SELECT_FILE':
      return {
        ...state,
        status: 'SELECTED',
        file: action.payload.file,
        documentType: action.payload.documentType,
        error: null,
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

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = action;
      return state;
  }
}

export function useUploadMachine() {
  return useReducer(uploadReducer, initialState);
}
```

**Component Usage with useTransition** (`src/components/DocumentUpload.tsx`):

```typescript
import { useTransition, startTransition } from 'react';
import { useUploadMachine } from '../hooks/useUploadMachine';
import { submitDocumentForOcr } from '../services/mockOcrService';

function DocumentUpload() {
  const [state, dispatch] = useUploadMachine();
  const [isPending, startTransition] = useTransition();

  const handleFileSelect = (file: File, docType: DocumentType) => {
    dispatch({
      type: 'SELECT_FILE',
      payload: { file, documentType: docType }
    });
  };

  const handleSubmit = () => {
    if (!state.file || !state.documentType) return;

    startTransition(async () => {
      try {
        dispatch({ type: 'START_UPLOAD' });

        // Simulate upload progress
        await simulateProgress((progress) => {
          dispatch({ type: 'UPLOAD_PROGRESS', payload: { progress } });
        });

        dispatch({ type: 'START_SCANNING' });

        // Call OCR service
        const result = await submitDocumentForOcr(state.file, state.documentType);

        // Handle result based on status
        if (result.status === 'verified') {
          dispatch({ type: 'UPLOAD_SUCCESS', payload: { result } });
        } else {
          dispatch({ type: 'UPLOAD_REJECTED', payload: { result } });
        }
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'An unexpected error occurred';
        dispatch({ type: 'UPLOAD_ERROR', payload: { error: errorMessage } });
      }
    });
  };

  return (
    <div>
      {/* UI components here */}
      <button
        onClick={handleSubmit}
        disabled={isPending || state.status !== 'SELECTED'}
      >
        {isPending ? 'Uploading...' : 'Submit Document'}
      </button>
    </div>
  );
}
```

**State Transition Diagram:**

```
IDLE
  └─> SELECT_FILE → SELECTED
                      └─> START_UPLOAD → UPLOADING
                                           └─> START_SCANNING → SCANNING
                                                                  ├─> SUCCESS
                                                                  ├─> REJECTED → RETRY → SELECTED
                                                                  └─> ERROR → RETRY → SELECTED
```

**Valid State Transitions:**
- `IDLE` → `SELECTED` (file selected)
- `SELECTED` → `UPLOADING` (submit clicked)
- `SELECTED` → `IDLE` (file removed)
- `UPLOADING` → `SCANNING` (upload complete)
- `SCANNING` → `SUCCESS` (OCR verified)
- `SCANNING` → `REJECTED` (OCR failed validation)
- `SCANNING` → `ERROR` (service error)
- `REJECTED` → `SELECTED` (retry)
- `ERROR` → `SELECTED` (retry)
- Any → `IDLE` (reset)

---

## 7. Task Breakdown & Implementation Plan

### 7.1 CORE Tasks (Required)

#### Task 1: Project Setup & Type Definitions
**Priority:** P0 - Must complete first

**Acceptance Criteria:**
- ✓ Vite + React + TypeScript initialized
- ✓ `tsconfig.json` with `strict: true`
- ✓ ESLint configured, zero warnings
- ✓ Folder structure created
- ✓ All OCR types defined in `src/types/ocr.ts`
- ✓ `npm install && npm run dev` works from fresh clone
- ✓ README.md with setup instructions

**Deliverables:**
- Working dev environment
- Type definitions file
- Configuration files
- Documentation

---

#### Task 2: Mock OCR Service
**Priority:** P0 - Core functionality

**Acceptance Criteria:**
- ✓ `submitDocumentForOcr()` function implemented
- ✓ Two-phase delay simulation (upload + scanning)
- ✓ 70/30 success/failure ratio (configurable)
- ✓ Correct typed responses per document type
- ✓ Typed error throwing for network failures
- ✓ Constants clearly defined with JSDoc
- ✓ No DOM/React dependencies (unit-testable)

**Deliverables:**
- `src/services/mockOcrService.ts`
- Configurable delay/success constants
- Full TypeScript typing
- JSDoc documentation

---

#### Task 3: Document Upload Interface
**Priority:** P0 - Core UI

**Acceptance Criteria:**
- ✓ Document type selector (3 types)
- ✓ Drag-and-drop upload zone
- ✓ Click-to-browse fallback
- ✓ Client-side validation (type, size)
- ✓ File preview (name, icon, size)
- ✓ Submit button (disabled until ready)
- ✓ Cancel/Remove functionality
- ✓ All props/state fully typed

**Deliverables:**
- DocumentUpload component
- FilePreview component
- File validation logic
- TypeScript interfaces

---

#### Task 4: Status Display & Feedback Panel
**Priority:** P0 - Core UX

**Acceptance Criteria:**
- ✓ All 7 upload states implemented (IDLE → ERROR)
- ✓ State machine reducer with type-safe actions (useReducer)
- ✓ useTransition for async OCR operations
- ✓ Sequential status messages during SCANNING
- ✓ Animated progress indicators
- ✓ Success summary with extracted data
- ✓ Rejection reasons in plain English
- ✓ Error state with retry option
- ✓ Visual distinction between states
- ✓ ErrorBoundary wrapping upload component

**Deliverables:**
- StatusDisplay component
- ResultSummary component
- State machine reducer (useUploadMachine hook)
- ErrorBoundary component
- State transition logic with discriminated unions
- Error message mapping utility

---

### 7.2 ADVANCED Tasks (Strongly Recommended)

#### Task 5: Progress Streaming & Cancellation
- Implement observable/stream pattern for status updates
- Add cancel functionality during upload/scanning
- Abort API call on cancellation
- Clean up resources properly

#### Task 6: Multi-Document Session Management
- Upload multiple documents in single session
- Summary list with status badges
- Track session state
- Persist upload history

#### Task 7: Accessibility (A11y)
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader announcements for state changes
- Focus management
- WCAG 2.1 AA compliance

---

### 7.3 STRETCH Tasks (Bonus)

#### Task 8: Unit Testing

**Testing the State Machine (Reducer):**
```typescript
import { describe, it, expect } from 'vitest';
import { uploadReducer, initialState } from './useUploadMachine';

describe('uploadReducer', () => {
  it('transitions from IDLE to SELECTED when file is selected', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const action = {
      type: 'SELECT_FILE' as const,
      payload: { file, documentType: 'NCB' as const }
    };

    const nextState = uploadReducer(initialState, action);

    expect(nextState.status).toBe('SELECTED');
    expect(nextState.file).toBe(file);
    expect(nextState.documentType).toBe('NCB');
  });

  it('transitions from SCANNING to SUCCESS with result', () => {
    const scanningState = {
      ...initialState,
      status: 'SCANNING' as const,
      file: new File([], 'test.pdf'),
      documentType: 'NCB' as const
    };

    const result = {
      status: 'verified' as const,
      docType: 'NCB' as const,
      extractedData: { yearsNoClaims: 3 }
    };

    const nextState = uploadReducer(scanningState, {
      type: 'UPLOAD_SUCCESS',
      payload: { result }
    });

    expect(nextState.status).toBe('SUCCESS');
    expect(nextState.result).toEqual(result);
  });
});
```

**Testing Components:**
- Use React Testing Library for component tests
- Mock the OCR service for predictable test results
- Test user interactions (file select, submit, retry)
- Verify UI updates for each state transition
- Test accessibility (ARIA labels, keyboard navigation)

**Testing Strategy:**
- **Unit tests:** Reducer functions (pure, easy to test)
- **Integration tests:** Components with mocked services
- **E2E tests (optional):** Full user workflows
- **Coverage target:** >80% for core business logic

**Setup:**
- Vitest or Jest + React Testing Library
- MSW (Mock Service Worker) for API mocking
- @testing-library/user-event for interactions

#### Task 9: Advanced UX Enhancements
- File preview thumbnails for images
- Retry with exponential backoff
- Offline detection
- Optimistic UI updates

#### Task 10: Performance Optimization
- Lazy loading components
- File compression before upload
- Debounced validation
- Virtual scrolling for document list

---

## 8. Quality Standards & Best Practices

### 8.1 Code Quality
- **TypeScript:** Strict mode, no `any` types
- **Linting:** ESLint passing with zero warnings
- **Formatting:** Consistent code style
- **Comments:** JSDoc for public functions
- **Naming:** Clear, descriptive variable/function names

### 8.2 React Best Practices

**State Management:**
- Use `useReducer` for complex state machines with multiple states/transitions
- Leverage discriminated unions for type-safe action creators
- Keep reducer functions pure (no side effects, no mutations)
- Use `useTransition` for async operations with automatic pending state management
- Prefer `startTransition` over manual `isPending` state tracking (React 19+)

**Component Design:**
- Functional components only (no class components)
- Custom hooks for reusable stateful logic (`useUploadMachine`)
- Proper dependency arrays in `useEffect` (enable ESLint exhaustive-deps)
- Memoization where performance critical (`useMemo`, `useCallback`)
- Key props for lists (use stable IDs, not array indices)

**Code Organization:**
- Separate business logic from UI components
- Extract reducer logic to dedicated files
- Keep components focused (single responsibility)
- Use composition over prop drilling
- Co-locate related code (component + styles + tests)

### 8.3 Error Handling

**Error Classification:**
- **Expected Errors:** Validation failures, OCR rejections, known API errors → Handle in state, show in UI
- **Unexpected Errors:** Network failures, service crashes, invalid data → Catch with ErrorBoundary, show fallback UI

**Implementation Strategy:**

1. **Expected Errors (State-based):**
   ```typescript
   // Handle in reducer, display inline
   case 'UPLOAD_REJECTED':
     return {
       ...state,
       status: 'REJECTED',
       result: action.payload.result, // Contains user-friendly reason
     };
   ```

2. **Unexpected Errors (ErrorBoundary):**
   ```typescript
   // Wrap components with ErrorBoundary
   <ErrorBoundary
     fallbackRender={({ error, resetErrorBoundary }) => (
       <div>
         <h2>Something went wrong</h2>
         <p>The upload could not be completed.</p>
         <button onClick={resetErrorBoundary}>Try again</button>
       </div>
     )}
   >
     <DocumentUpload />
   </ErrorBoundary>
   ```

3. **Async Error Handling:**
   ```typescript
   startTransition(async () => {
     try {
       const result = await submitDocumentForOcr(file, docType);
       // Handle known error states
       if (result.status === 'rejected') {
         dispatch({ type: 'UPLOAD_REJECTED', payload: { result } });
       }
     } catch (error) {
       // Transform technical errors to user-friendly messages
       const message = mapErrorToUserMessage(error);
       dispatch({ type: 'UPLOAD_ERROR', payload: { error: message } });
     }
   });
   ```

**Error Message Transformation:**
- Always convert technical error codes to plain English
- Provide actionable next steps (retry, contact support, use different file)
- Never expose stack traces or technical details to users
- Log detailed errors to console for debugging (development only)

**Retry Strategy:**
- Manual retry for user-initiated operations
- Exponential backoff for network errors (advanced feature)
- Clear retry button in ERROR state
- Preserve file selection across retries

### 8.4 Performance
- Lazy load components where possible
- Debounce expensive operations
- Optimize re-renders
- File size validation before processing

---

## 9. Key Considerations & Risks

### 9.1 Technical Challenges
| Challenge | Mitigation Strategy |
|-----------|-------------------|
| State complexity | Use useReducer for complex state, custom hooks for reusability |
| File handling | Validate early, provide clear feedback, handle edge cases |
| Async timing | Proper loading states, cancellation support, timeout handling |
| Type safety | Define all types upfront, use discriminated unions for states |

### 9.2 UX Challenges
| Challenge | Solution |
|-----------|----------|
| User uncertainty during long operations | Sequential status messages, progress indicators |
| Error recovery | Clear retry options, preserve file selection |
| Multiple uploads | Visual document list, clear status per item |
| Mobile responsiveness | Responsive design, touch-friendly targets |

### 9.3 Common Pitfalls to Avoid
- ❌ Using `any` types to bypass TypeScript errors
- ❌ Not handling edge cases (network errors, large files)
- ❌ Poor error messages (showing technical codes to users)
- ❌ Missing loading states (leaving users uncertain)
- ❌ No file validation before submission
- ❌ Hardcoded values instead of constants
- ❌ Tightly coupled components (hard to test)
- ❌ Memory leaks from uncleared timeouts

---

## 10. Deliverables & Submission

### 10.1 Required Deliverables
1. **GitHub Repository** (public or shared access)
   - Complete source code
   - All configuration files
   - README.md with setup instructions
   - Clean commit history

2. **Working Application**
   - Runs with `npm install && npm run dev`
   - All core tasks implemented
   - Zero TypeScript errors
   - Zero ESLint warnings

3. **Documentation**
   - README with architecture notes
   - Setup/installation instructions
   - Known limitations/future improvements
   - Inline code comments where needed

### 10.2 Evaluation Criteria
| Criteria | Weight | Key Points |
|----------|--------|-----------|
| **Functionality** | 30% | All core features working, proper error handling |
| **Code Quality** | 25% | TypeScript usage, clean architecture, best practices |
| **UX/UI** | 20% | Clear feedback, intuitive flow, visual polish |
| **Type Safety** | 15% | Strict mode, no `any`, proper interfaces |
| **Testing** | 10% | Testable code structure, edge cases handled |

### 10.3 Success Checklist
- [ ] All CORE tasks completed
- [ ] TypeScript strict mode, zero errors
- [ ] ESLint configured, zero warnings
- [ ] All 7 upload states working
- [ ] Mock service returns correct responses
- [ ] Client-side validation functional
- [ ] Drag-drop and browse both work
- [ ] Error messages user-friendly
- [ ] README with clear instructions
- [ ] Application runs from fresh clone
- [ ] Code is well-organized and documented

---

## 11. Timeline & Approach Recommendations

### 11.1 Suggested Development Sequence
1. **Day 1: Foundation** (4-6 hours)
   - Project setup, types, folder structure
   - Mock OCR service implementation
   - Basic component shells

2. **Day 2: Core UI** (4-6 hours)
   - Upload zone with drag-drop
   - File validation
   - Document type selector
   - Integration with mock service

3. **Day 3: Status & Polish** (3-5 hours)
   - Status display implementation
   - Success/failure/error states
   - Visual polish and animations
   - README and documentation

4. **Day 4: Advanced/Testing** (2-4 hours)
   - Advanced tasks if time permits
   - Testing and bug fixes
   - Final polish and submission

### 11.2 Time Management Tips
- Focus on CORE tasks first
- Don't over-engineer early
- Test frequently during development
- Leave time for polish and documentation
- Advanced tasks only after core is solid

---

## 12. Additional Resources & References

### 12.1 Technical Documentation
- [React 18 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File)

### 12.2 Design Inspiration
- Progressive disclosure of information
- Clear visual hierarchy for states
- Insurance industry UX patterns
- Mobile-first responsive design

### 12.3 Testing Resources
- React Testing Library
- Jest for unit tests
- MSW for API mocking (if needed)

---

## 13. Notes & Assumptions

### 13.1 Assumptions Made
- Modern browser environment (ES6+ support)
- No IE11 compatibility required
- Desktop and mobile support expected
- English language only
- No authentication/user session required
- Single-page application (no routing)

### 13.2 Out of Scope
- Real OCR integration
- Backend API development
- Database persistence
- User authentication
- Multi-language support
- Print functionality
- Email notifications

### 13.3 Future Enhancements (Post-Interview)
- Real OCR API integration
- Document history/persistence
- Advanced file previews
- Batch upload support
- Admin dashboard for reviewing uploads
- Analytics and monitoring

---

## Appendix A: Quick Reference

### Mock Service Constants
```typescript
// Configurable at top of mockOcrService.ts
const UPLOAD_DELAY_MIN = 500;
const UPLOAD_DELAY_MAX = 1000;
const SCAN_DELAY_MIN = 1000;
const SCAN_DELAY_MAX = 2500;
const SUCCESS_RATE = 0.7; // 70%
const NETWORK_ERROR_TIMEOUT = 5000;
```

### File Validation Rules
- **Allowed types:** PDF, JPG, JPEG, PNG
- **Max size:** 10MB (10,485,760 bytes)
- **MIME types:** `application/pdf`, `image/jpeg`, `image/png`

### Document Type Mapping
```typescript
const DOC_TYPE_LABELS = {
  NCB: 'No Claims Bonus Letter',
  GAP_COVER: 'Gap in Cover Letter',
  POLICY_SCHEDULE: 'Policy Schedule'
};
```

---

**Document End**

*This PRD is a living document and should be updated as requirements evolve or clarifications are needed during development.*
