# CLAUDE.md - Reading Diary

Project-specific instructions for Claude Code.

## Project Overview

**Reading Diary** is a Chrome Extension for capturing and managing reading notes with keyboard shortcuts.

- **Tech Stack:** React 19, TypeScript, Vite, Zustand, Tailwind CSS
- **Testing:** Vitest, React Testing Library, Playwright
- **Docs:** `docs/PRD.md`

## Quick Commands

```bash
npm run dev          # Development mode
npm run build        # Build extension
npm run test         # Unit tests (watch)
npm run test:run     # Unit tests (single run)
npm run test:e2e     # E2E tests
```

## Project Structure (Update frequently if changes)

```
reading-diary/
├── src/
│   ├── popup/          # Popup UI components
│   ├── background/     # Service worker
│   ├── store/          # Zustand store
│   ├── types/          # TypeScript types
│   └── utils/          # Utilities
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # E2E tests (Playwright)
├── docs/
│   ├── PRD.md          # Product Requirements
│   └── test-cases/     # Test case documents
│       ├── unit/
│       ├── integration/
│       └── e2e/
└── .claude/
    └── agents/         # Sub-agent definitions
```

---

## TDD Development Workflow

This project follows **strict TDD (Test-Driven Development)** with Red-Green-Refactor cycle.

### Sub-Agents

| Agent | File | Purpose |
|-------|------|---------|
| **unit-tester** | `.claude/agents/unit-tester.md` | Unit test cases & tests |
| **inte-tester** | `.claude/agents/inte-tester.md` | Integration test cases & tests |
| **e2e-tester** | `.claude/agents/e2e-tester.md` | E2E test cases & tests |

---

## CRITICAL: Testing Pyramid - Sequential Bottom-Up

```
           /\
          /  \        E2E Tests        ← LAST (Step 3)
         /    \
        /──────\
       /        \     Integration      ← SECOND (Step 2)
      /          \
     /────────────\
    /              \  Unit Tests       ← FIRST (Step 1)
   /                \
  ────────────────────
        FOUNDATION
```

### MANDATORY RULES

1. **NEVER run agents in parallel** - Always sequential: unit → integration → e2e
2. **NEVER start integration tests before unit tests pass**
3. **NEVER start e2e tests before integration tests pass**
4. **ALWAYS complete full cycle (test cases → review → tests → implement → pass) for each level before moving to next**

---

## TDD Workflow Per Feature

### Complete Flow for ONE Feature

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UNIT TESTS (Step 1 of 3)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  1.1  unit-tester writes test cases → docs/test-cases/unit/{feature}.md    │
│  1.2  ⏸️  PAUSE: User reviews & approves                                    │
│  1.3  unit-tester writes actual tests → tests/unit/{module}.test.ts        │
│  1.4  Run tests → 🔴 RED (expected)                                         │
│  1.5  Main agent implements code                                            │
│  1.6  Run tests → 🟢 GREEN                                                  │
│  1.7  Refactor if needed → 🟢 STILL GREEN                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    ✅ Unit tests PASS - proceed to integration
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION TESTS (Step 2 of 3)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  2.1  inte-tester writes test cases → docs/test-cases/integration/{f}.md   │
│  2.2  ⏸️  PAUSE: User reviews & approves                                    │
│  2.3  inte-tester writes actual tests → tests/integration/{f}.test.tsx     │
│  2.4  Run tests → 🔴 RED or 🟡 PARTIAL (some may pass from unit impl)       │
│  2.5  Main agent implements/adjusts code                                    │
│  2.6  Run tests → 🟢 GREEN                                                  │
│  2.7  Refactor if needed → 🟢 STILL GREEN                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    ✅ Integration tests PASS - proceed to e2e
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    E2E TESTS (Step 3 of 3)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  3.1  e2e-tester writes test cases → docs/test-cases/e2e/{feature}.md      │
│  3.2  ⏸️  PAUSE: User reviews & approves                                    │
│  3.3  e2e-tester writes actual tests → tests/e2e/{feature}.spec.ts         │
│  3.4  Run tests → 🔴 RED or 🟢 GREEN (may pass from previous impl)          │
│  3.5  Main agent adjusts if needed                                          │
│  3.6  Run tests → 🟢 GREEN                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    ✅ All tests PASS - commit feature
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMMIT                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  git commit -m "feat(F{X}): {description}"                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Example: Feature F2

### Step 1: UNIT TESTS

```
1.1 Main Agent → Call unit-tester (Phase 1)
    Output: docs/test-cases/unit/f2-entry-crud.md

1.2 User reviews test cases
    User: "Approved" ✅

1.3 Main Agent → Call unit-tester (Phase 2)
    Output: tests/unit/validation.test.ts
            tests/unit/store.test.ts

1.4 Run: npm run test:run
    Result: ❌ FAIL (no implementation)

1.5 Main Agent implements:
    → src/utils/validation.ts
    → src/store/diaryStore.ts

1.6 Run: npm run test:run
    Result: ✅ PASS

1.7 Refactor → ✅ STILL PASS
```

### Step 2: INTEGRATION TESTS (only after Step 1 complete)

```
2.1 Main Agent → Call inte-tester (Phase 1)
    Output: docs/test-cases/integration/f2-entry-crud.md

2.2 User reviews test cases
    User: "Approved" ✅

2.3 Main Agent → Call inte-tester (Phase 2)
    Output: tests/integration/f2-entry-crud.test.tsx

2.4 Run: npm run test:run
    Result: ❌ FAIL or 🟡 PARTIAL

2.5 Main Agent implements/adjusts:
    → src/popup/components/EntryForm.tsx
    → src/utils/storage.ts

2.6 Run: npm run test:run
    Result: ✅ PASS

2.7 Refactor → ✅ STILL PASS
```

### Step 3: E2E TESTS (only after Step 2 complete)

```
3.1 Main Agent → Call e2e-tester (Phase 1)
    Output: docs/test-cases/e2e/f2-entry-crud.md

3.2 User reviews test cases
    User: "Approved" ✅

3.3 Main Agent → Call e2e-tester (Phase 2)
    Output: tests/e2e/f2-entry-crud.spec.ts

3.4 Run: npm run test:e2e
    Result: ✅ PASS (likely, since impl done)

3.5 Adjust if needed

3.6 All green → COMMIT
```

---

## Agent Invocation Rules

### DO ✅

```
# Correct: Sequential, one at a time
1. Call unit-tester → wait for completion → user review → implement → pass
2. THEN call inte-tester → wait for completion → user review → implement → pass
3. THEN call e2e-tester → wait for completion → user review → implement → pass
```

### DON'T ❌

```
# WRONG: Parallel calls
Main Agent:
  → Call unit-tester    ┐
  → Call inte-tester    ├── NEVER DO THIS!
  → Call e2e-tester     ┘
```

---

## Test File Naming Convention

| Type | Location | Pattern |
|------|----------|---------|
| Unit | `tests/unit/` | `{module}.test.ts` |
| Integration | `tests/integration/` | `{feature}.test.tsx` |
| E2E | `tests/e2e/` | `{feature}.spec.ts` |
| Test Cases | `docs/test-cases/{type}/` | `{feature}.md` |

---

## Commit Convention

```
feat(F{X}): {short description}
fix(F{X}): {bug fix description}
test(F{X}): {test addition/fix}
refactor(F{X}): {refactoring description}
docs: {documentation update}
```

---

## Important Rules Summary

1. **NEVER write implementation before tests**
2. **NEVER run test agents in parallel - always sequential: unit → integration → e2e**
3. **NEVER proceed to next test level until current level passes**
4. **ALWAYS get user approval on test cases before writing actual tests**
5. **ALWAYS run tests after every implementation change**
6. **ALWAYS keep tests green before committing**

---

## References

- PRD: `docs/PRD.md`
- Unit Tester: `.claude/agents/unit-tester.md`
- Integration Tester: `.claude/agents/inte-tester.md`
- E2E Tester: `.claude/agents/e2e-tester.md`
