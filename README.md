# AA Ireland Motor Insurance Document Upload Portal

[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/AAWorflow/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/AAWorflow/actions/workflows/ci.yml)

Production-quality React + TypeScript document upload portal with simulated OCR validation for AA Ireland's motor insurance customer journey.

## Features

- ✅ 7-state upload lifecycle (IDLE → SELECTED → UPLOADING → SCANNING → SUCCESS/REJECTED/ERROR)
- ✅ Drag-and-drop file upload with browser fallback
- ✅ Client-side file validation (type, size)
- ✅ Simulated OCR processing with realistic delays
- ✅ Type-safe state machine using `useReducer`
- ✅ Async operations managed with `useTransition` (React 19)
- ✅ Comprehensive error handling with ErrorBoundary
- ✅ Tailwind CSS for modern, responsive UI
- ✅ Zero TypeScript errors in strict mode
- ✅ Zero ESLint warnings
- ✅ Comprehensive test suite (Vitest + React Testing Library)
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Automated deployment to Vercel

## Tech Stack

- **Framework:** React 19 (RC)
- **Language:** TypeScript (strict mode)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** useReducer + useTransition
- **Linting:** ESLint with React/TypeScript rules
- **Testing:** Vitest + React Testing Library
- **CI/CD:** GitHub Actions
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 20.15+ and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open browser to http://localhost:3000

### Available Commands

**Development:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Code Quality:**
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

**Testing:**
- `npm test` - Run tests in watch mode
- `npm test -- --run` - Run tests once
- `npm run test:ui` - Open Vitest UI
- `npm run test:coverage` - Generate coverage report

## Project Structure

```
src/
├── components/          # React components
│   ├── DocumentUpload/  # Main upload flow
│   │   ├── DocumentUpload.tsx
│   │   ├── DocumentTypeSelector.tsx
│   │   └── UploadZone.tsx
│   ├── FilePreview/     # File preview card
│   ├── StatusDisplay/   # Status feedback
│   ├── ResultSummary/   # Result cards
│   └── ErrorBoundary/   # Error boundary wrapper
├── hooks/               # Custom React hooks
│   ├── useUploadMachine.ts    # State machine
│   ├── useFileValidation.ts   # File validation
│   └── __tests__/       # Hook unit tests
├── services/            # Business logic
│   ├── mockOcrService.ts      # Simulated OCR
│   ├── progressSimulator.ts   # Progress simulation
│   └── __tests__/       # Service unit tests
├── types/               # TypeScript definitions
│   ├── ocr.ts          # OCR types
│   └── state.ts        # State machine types
├── utils/               # Pure utilities
│   ├── fileValidation.ts
│   ├── formatters.ts
│   └── errorMapping.ts
├── test/                # Test configuration
│   └── setup.ts         # Vitest setup
└── App.tsx              # Root component
```

## Architecture

### State Machine

The upload lifecycle is managed by a pure reducer function with discriminated union actions:

- **IDLE:** Initial state, no file selected
- **SELECTED:** File selected and validated
- **UPLOADING:** File upload in progress
- **SCANNING:** OCR processing in progress
- **SUCCESS:** Document verified successfully
- **REJECTED:** Document verification failed
- **ERROR:** Service error occurred

**State Transitions:**
```
IDLE → SELECTED → UPLOADING → SCANNING → SUCCESS
                                        → REJECTED → RETRY → SELECTED
                                        → ERROR → RETRY → SELECTED
```

### Async Operations

React 19's `useTransition` manages async OCR calls with automatic pending state tracking:

```typescript
startTransition(async () => {
  dispatch({ type: 'START_UPLOAD' });
  await simulateProgress(...);
  const result = await submitDocumentForOcr(file, docType);
  dispatch({ type: 'UPLOAD_SUCCESS', payload: { result } });
});
```

### Error Handling

Two-tier approach:
1. **Expected errors:** Handled in state (validation failures, OCR rejections)
2. **Unexpected errors:** Caught by ErrorBoundary (runtime exceptions)

## File Validation Rules

- **Allowed types:** PDF, JPG, PNG
- **Max size:** 10MB
- **Document types:** No Claims Bonus Letter, Gap in Cover Letter, Policy Schedule

## Mock OCR Service

Simulates realistic OCR behavior:
- 70% success rate (configurable in `mockOcrService.ts`)
- 30% rejection rate
- Upload delay: 500-1,000ms
- Scanning delay: 1,000-2,500ms
- 5% network error rate

**Configurable Constants:**
```typescript
// Located in src/services/mockOcrService.ts
const SUCCESS_RATE = 0.7; // 70%
const UPLOAD_DELAY_MIN = 500;
const UPLOAD_DELAY_MAX = 1000;
const SCAN_DELAY_MIN = 1000;
const SCAN_DELAY_MAX = 2500;
```

## Code Quality & Testing

### Type Safety
- TypeScript strict mode enabled
- Zero `any` types permitted
- All functions fully typed with interfaces

### Linting
- ESLint configured with zero warnings policy
- React/TypeScript recommended rules
- React Hooks exhaustive deps enforcement

### Testing Strategy
- **Framework:** Vitest (fast, Vite-native testing)
- **React Testing:** @testing-library/react
- **Test Coverage:** 23 tests covering core business logic
- **Focus Areas:**
  - ✅ Reducer unit tests (16 tests) - Pure state machine logic
  - ✅ Service tests (7 tests) - OCR service behavior
  - State transitions and complete upload flows
  - Error handling and retry mechanisms

**Running Tests:**
```bash
npm test              # Watch mode
npm test -- --run     # Single run
npm run test:ui       # Visual UI
```

### CI/CD Pipeline

**GitHub Actions Workflow:**
1. **Lint** - ESLint with zero warnings
2. **Type Check** - TypeScript strict mode
3. **Test** - Run full test suite
4. **Build** - Production bundle creation

The pipeline runs on every push and pull request, ensuring code quality before deployment.

### Deployment

**Vercel Configuration:**
- Automatic deployments on push to main
- PR preview environments for testing
- Security headers (CSP, X-Frame-Options, etc.)
- Optimized caching for static assets

**Live Demo:** [Deployed URL will appear after connecting to Vercel]

## Supported Document Types

| Type | Label | Purpose | Extracted Data |
|------|-------|---------|----------------|
| NCB | No Claims Bonus Letter | Proof of claim-free years | yearsNoClaims, insurerName, validFrom |
| GAP_COVER | Gap in Cover Letter | Explains coverage gaps | gapDays, reason, validFrom, validTo |
| POLICY_SCHEDULE | Policy Schedule | Previous policy confirmation | insurer, policyNumber, effectiveDate |

## Error Messages

Technical error codes are automatically translated to user-friendly messages:

| Error Code | User Message |
|-----------|--------------|
| ILLEGIBLE_DOCUMENT | "We were unable to read this document clearly. Please upload a clearer scan." |
| DATE_MISMATCH | "The dates on this document don't match our records. Please verify and re-upload." |
| UNSUPPORTED_FORMAT | "This document format couldn't be processed. Please try a different file." |
| OCR_SERVICE_UNAVAILABLE | "Our verification service is temporarily unavailable. Please try again in a moment." |

## Future Enhancements

- Real OCR API integration (Azure AI Document Intelligence)
- Multi-document session persistence
- Advanced file previews (thumbnails)
- Increased test coverage (component integration tests)
- Accessibility improvements (WCAG 2.1 AA compliance)
- Internationalization (i18n)
- Retry with exponential backoff
- Offline detection
- Performance monitoring (Lighthouse CI)

## Interview Demonstration Points

### Senior Full-Stack Capabilities Demonstrated

1. **Testing Culture:**
   - Vitest configuration with happy-dom environment
   - Reducer tests demonstrate pure function testing
   - Service tests show async/mock handling
   - 23 passing tests covering critical business logic

2. **CI/CD & DevOps:**
   - GitHub Actions pipeline with 4 quality gates
   - Automated testing and build verification
   - Vercel deployment with security headers
   - Branch-based deployment strategy

3. **State Management Architecture:**
   - Pure reducer function with discriminated unions
   - TypeScript exhaustiveness checking
   - Immutable state updates
   - Complete state transition coverage in tests

4. **Production Readiness:**
   - Error boundary for unexpected failures
   - Security headers (X-Frame-Options, CSP)
   - Type-safe error handling
   - User-friendly error messages

5. **Code Quality:**
   - TypeScript strict mode (zero errors)
   - ESLint zero warnings policy
   - Well-tested business logic
   - Clean architecture with separation of concerns

## License

Proprietary - AA Ireland Technical Assessment

## Author

Technical Assessment - Round 2
Date: March 8, 2026
