# AA Ireland Senior Full-Stack Interview Enhancement Plan

## Executive Summary

**Goal:** Transform your frontend-focused assessment into a senior full-stack demonstration within 1-2 days (16-20 hours)

**Current State:** 75-80% complete React/TypeScript app with excellent architecture but missing:
- Testing infrastructure (0% coverage)
- CI/CD pipeline (no automation)
- Backend/cloud integration (all mocked)
- Production readiness features

**Strategic Approach:** High-impact additions that demonstrate:
1. **Testing culture** → DevOps mindset (required for role)
2. **Azure ecosystem knowledge** → Even without full .NET backend
3. **GenAI adoption** → Job explicitly requires this capability
4. **Production thinking** → Senior-level architectural decisions

---

## Implementation Phases (16-20 Hours)

### Phase 1: Testing Infrastructure (6-7 hours)
**Priority: CRITICAL** - Demonstrates quality engineering and enables live coding confidence

**Setup (1 hour):**
- Install Vitest + React Testing Library + @testing-library/jest-dom
- Configure `vitest.config.ts` (can extend existing `vite.config.ts`)
- Add test scripts to `package.json`
- Create first smoke test to verify setup

**Reducer Unit Tests (2-3 hours):**
- File: `src/hooks/__tests__/useUploadMachine.test.ts` (NEW)
- Test all 10 action types from uploadReducer
- Coverage target: 100% on reducer logic
- Example test cases:
  - `SELECT_FILE` transitions from IDLE → SELECTED
  - `UPLOAD_SUCCESS` sets result and progress to 100
  - `RETRY` clears error and returns to SELECTED
  - Exhaustiveness check (invalid actions)

**Service Unit Tests (1 hour):**
- File: `src/services/__tests__/mockOcrService.test.ts` (NEW)
- Test success/failure/error paths
- Verify configurable constants work
- Test document-type specific responses

**Deliverable:** Key tests demonstrating testing capability

**Interview Value:**
- Shows TDD/testing pyramid understanding
- Demonstrates knowledge of testing frameworks
- Enables confident live coding (well-tested codebase)

---

### Phase 2: CI/CD Pipeline (3-4 hours)
**Priority: CRITICAL** - Core DevOps requirement for the role

**GitHub Actions CI Workflow (2 hours):**
- File: `.github/workflows/ci.yml` (NEW)
- Triggers: PR creation, push to main
- Jobs:
  1. Lint (ESLint with zero warnings)
  2. Type check (TypeScript strict mode)
  3. Test (Vitest with coverage reporting)
  4. Build (Vite production build)
- Cache npm dependencies for faster runs
- Fail fast on any step failure

**Vercel Deployment (1 hour):**
- File: `vercel.json` (NEW) - Vercel configuration
- Deploy to Vercel (free tier)
  - **Why Vercel?** Fast setup, automatic PR previews, zero config
  - GitHub integration - automatic deployments
  - Can discuss Azure migration path in interview
- PR preview deployments (automatic staging environments)
- Production deployment on merge to main

**Documentation Updates (30 minutes):**
- Add build status badge to README.md
- Add deployment URL
- Document CI/CD pipeline stages
- Add "How to run tests" section

**Deliverable:** Automated pipeline with live deployment URL

**Interview Value:**
- Demonstrates DevOps practices (automation, quality gates)
- Provides talking points: branch protection, deployment slots, monitoring

---

## Key Interview Talking Points

### State Management
- "I chose useReducer over useState because the upload lifecycle has complex state transitions with 7 distinct states"
- "Discriminated union actions provide type safety - TypeScript enforces exhaustive handling"
- "Pure reducer function enables easy unit testing - no mocking required"

### Testing Strategy
- "I focused on high-value tests: reducer (pure business logic) and service layer"
- "Chose Vitest over Jest because it integrates with Vite - zero config, faster execution"
- "Tests demonstrate TDD understanding and enable confident refactoring"

### CI/CD Pipeline
- "Pipeline has 4 quality gates: lint, type check, test, build - fail fast on any step"
- "Vercel deployment with automatic PR previews enables stakeholder review"
- "Can discuss migration to Azure Static Web Apps for full Azure ecosystem integration"
