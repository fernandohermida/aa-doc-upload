# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AA Ireland Motor Insurance Document Upload Portal - A React/TypeScript customer-facing document upload portal with simulated OCR validation.

**Tech Stack:**
- React 19 RC with TypeScript (strict mode)
- Vite 7+ as build tool
- Tailwind CSS for styling
- Vitest + React Testing Library for testing
- ESLint with zero warnings policy
- No external APIs - all services are mocked client-side

## Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production (includes type check)
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint (must have zero warnings)
npm run lint:fix         # Auto-fix ESLint issues

# Testing
npm test                 # Run tests in watch mode
npm test -- --run        # Run tests once (CI mode)
npm run test:ui          # Open Vitest UI
npm run test:coverage    # Generate coverage report
```

## Architecture Overview

### State Machine Architecture (Core Pattern)

**Critical:** This app uses a strict state machine pattern with React `useReducer` and discriminated union actions.

**State flow:**
```
IDLE → SELECTED → UPLOADING → SCANNING → SUCCESS/REJECTED/ERROR
         ↓                                      ↓
      REMOVE                                 RETRY → SELECTED
```

**Key implementation details:**
1. **Pure reducer** (`src/hooks/useUploadMachine.ts`): All state transitions are immutable, exhaustively typed
2. **Discriminated unions** (`src/types/state.ts`): Type-safe action creators with payload typing
3. **React 19 useTransition**: Async OCR operations use `startTransition` for automatic pending state
4. **Two-tier error handling**:
   - Expected errors (validation, OCR rejection) → handled in state machine
   - Unexpected errors (runtime exceptions) → caught by `ErrorBoundary`

**Reducer pattern example:**
```typescript
// State machine reducer is pure - no side effects, no mutations
function uploadReducer(state: UploadMachineState, action: UploadAction): UploadMachineState {
  switch (action.type) {
    case 'SELECT_FILE':
      return { ...state, status: 'SELECTED', file: action.payload.file, ... };
    // ... other cases
    default:
      const _exhaustive: never = action; // TypeScript exhaustiveness check
      return state;
  }
}
```

**Async operations pattern (React 19):**
```typescript
const [state, dispatch] = useUploadMachine();
const [isPending, startTransition] = useTransition();

const handleUpload = () => {
  startTransition(async () => {
    dispatch({ type: 'START_UPLOAD' });
    const result = await submitDocumentForOcr(file, docType);

    if (result.status === 'verified') {
      dispatch({ type: 'UPLOAD_SUCCESS', payload: { result } });
    } else {
      dispatch({ type: 'UPLOAD_REJECTED', payload: { result } });
    }
  });
};
```

### Project Structure

```
src/
├── components/
│   ├── DocumentUpload/       # Main upload flow components
│   ├── FilePreview/          # File preview card
│   ├── StatusDisplay/        # Status feedback with progress
│   ├── ResultSummary/        # Result display cards
│   └── ErrorBoundary/        # Error boundary wrapper
├── hooks/
│   ├── useUploadMachine.ts   # ⚠️ Core state machine hook
│   └── useFileValidation.ts  # File validation logic
├── services/
│   ├── mockOcrService.ts     # ⚠️ Simulated OCR (70% success rate)
│   └── progressSimulator.ts  # Upload/scan progress simulation
├── types/
│   ├── state.ts              # ⚠️ State machine types (discriminated unions)
│   └── ocr.ts                # OCR types and document types
├── utils/
│   ├── fileValidation.ts     # File type/size validation (10MB max)
│   ├── errorMapping.ts       # Error code → user message mapping
│   └── formatters.ts         # Data formatting helpers
└── test/
    └── setup.ts              # Vitest configuration
```

⚠️ = Critical files for understanding architecture

## Type System

**TypeScript strict mode enabled** - zero `any` types permitted, all functions fully typed.

### Core Types (`src/types/state.ts` and `src/types/ocr.ts`)

```typescript
// Document types
type DocumentType = 'NCB' | 'GAP_COVER' | 'POLICY_SCHEDULE';
type UploadState = 'IDLE' | 'SELECTED' | 'UPLOADING' | 'SCANNING' | 'SUCCESS' | 'REJECTED' | 'ERROR';

// State machine state
interface UploadMachineState {
  status: UploadState;
  file: File | null;
  documentType: DocumentType | null;
  result: OcrResult | null;
  error: string | null;
  progress: number;
}

// ⚠️ Discriminated union for type-safe actions
// This enables exhaustiveness checking and prevents invalid state transitions
type UploadAction =
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

## Mock OCR Service (`src/services/mockOcrService.ts`)

**Important:** No real API - all OCR behavior is simulated client-side with realistic delays.

**Configurable behavior:**
```typescript
const SUCCESS_RATE = 0.7;           // 70% success rate
const NETWORK_ERROR_RATE = 0.05;    // 5% network errors
const UPLOAD_DELAY_MIN = 500;       // Upload phase: 500-1000ms
const SCAN_DELAY_MIN = 1000;        // Scan phase: 1000-2500ms
```

**Possible outcomes:**
- Success (70%): Returns `{ status: 'verified', extractedData: {...} }`
- Rejection (25%): Returns `{ status: 'rejected', reason: 'ILLEGIBLE_DOCUMENT' | 'DATE_MISMATCH' | 'UNSUPPORTED_FORMAT' }`
- Network error (5%): Throws `Error` with `code: 'OCR_SERVICE_UNAVAILABLE'`

## File Validation

**Rules** (enforced in `src/utils/fileValidation.ts`):
- Allowed types: PDF, JPG, PNG
- Max size: 10MB
- Validation happens before upload starts

## Error Handling

**Error code → user message mapping** (`src/utils/errorMapping.ts`):

| Error Code | User Message |
|-----------|--------------|
| `ILLEGIBLE_DOCUMENT` | "We were unable to read this document clearly. Please upload a clearer scan." |
| `DATE_MISMATCH` | "The dates on this document don't match our records. Please verify and re-upload." |
| `UNSUPPORTED_FORMAT` | "This document format couldn't be processed. Please try a different file." |
| `OCR_SERVICE_UNAVAILABLE` | "Our verification service is temporarily unavailable. Please try again in a moment." |

**Never expose technical error codes to users.**

## Document Types

Supported document types for motor insurance verification:

| Type | Label | Extracted Data Fields |
|------|-------|----------------------|
| `NCB` | No Claims Bonus Letter | `yearsNoClaims`, `insurerName`, `validFrom` |
| `GAP_COVER` | Gap in Cover Letter | `gapDays`, `reason`, `validFrom`, `validTo` |
| `POLICY_SCHEDULE` | Policy Schedule | `insurer`, `policyNumber`, `effectiveDate` |

## Code Quality Standards

**TypeScript:**
- Strict mode enabled - zero `any` types permitted
- All functions fully typed with interfaces
- Use discriminated unions for action types

**React Patterns:**
- Functional components with hooks only
- `useReducer` for state machines (not useState for complex state)
- `useTransition` for async operations (React 19)
- Custom hooks for reusable logic
- ErrorBoundary for unexpected errors

**Linting:**
- ESLint must pass with **zero warnings**
- React Hooks exhaustive-deps enforced

**Critical Rules:**
- Never expose technical error codes to users
- Always validate files before upload
- All async operations must have error handling
- Reducer functions must be pure (no side effects, immutable updates)

## Testing

**Framework:** Vitest + React Testing Library + happy-dom

**Test files location:**
- `src/hooks/__tests__/useUploadMachine.test.ts` - State machine reducer tests (16 tests)
- `src/services/__tests__/mockOcrService.test.ts` - OCR service tests (7 tests)

**Testing priority:**
1. **Reducer unit tests** (highest value) - Test pure state machine logic independently
2. **Service tests** - Mock async operations, test error handling
3. **Component integration tests** - Test user interactions with mocked services

**Key testing pattern for reducer:**
```typescript
describe('uploadReducer', () => {
  it('transitions from IDLE to SELECTED', () => {
    const nextState = uploadReducer(initialState, {
      type: 'SELECT_FILE',
      payload: { file: mockFile, documentType: 'NCB' }
    });
    expect(nextState.status).toBe('SELECTED');
    expect(nextState.file).toBe(mockFile);
  });
});
```

**Running tests:**
- `npm test` - Watch mode
- `npm test -- --run` - Single run (CI mode)
- `npm run test:ui` - Visual UI

## Path Aliases

The codebase uses `@/` path alias configured in `tsconfig.json` and `vite.config.ts`:

```typescript
import { useUploadMachine } from '@/hooks/useUploadMachine';
import type { DocumentType } from '@/types/ocr';
```

This maps to `./src/*` - use it for cleaner imports.
