---
### **Project Refactoring Plan**

**1. Project Structure Understanding**:
    - **Main Source Directories**: src/ (cli, config, core, utils)
    - **Refactoring Scope**: src/ only; add tests under tests/; avoid dist/, node_modules/, .github/, config JSON files, and build artifacts.
    - **Architecture Pattern**: CLI entry → Runner orchestration → ConformanceApi + ActionExecutor + Playwright; shared utilities for capture/template/http.

**2. Refactoring Overview**:
    - **Primary Objectives**:
        1. Add unit tests for capture/template/http/config utilities to ensure safe refactors.
        2. Centralize polling/timeout defaults and related literals into a single constants module.
        3. Tighten input guards for external API parsing to reduce defensive branching in runtime flow.
    - **Expected Benefits**: Reduce regression risk; standardize defaults; improve reliability for variable capture and API responses.
    - **Safety Boundaries**: No behavior changes to CLI flags, network request semantics, or Playwright flow unless tests prove parity.

**2.1 Baseline & Measurable Targets (SMART)**:
    - **Baseline (src/ only)**:
        - Total LOC: 964
        - Duplication rate: <2%
        - Oversized files (>500 lines): 0
        - Oversized functions (>100 lines): 0
        - Max function length: 83 lines
        - Cyclomatic complexity p95: 6
        - Avg imports per file (coupling): 3.1; Max imports in a file: 9
        - Dependency tangles (cycles): 0
        - Test files: 0; Test cases: 0
    - **Phase targets**:
        - **Phase 1 (Test supplementation)**: Test files ≥ 4, test cases ≥ 20; src LOC ≤ 980; duplication ≤ 2%; max function length ≤ 90; complexity p95 ≤ 6.
        - **Phase 2 (Defaults centralization)**: Default literals for polling/timeout defined in exactly 1 module; src LOC ≤ 990; duplication ≤ 2%; complexity p95 ≤ 6.
        - **Phase 3 (Guard tightening)**: Reduce runtime type-guard branches in API parsing by 2 (targeted removals) while keeping behavior parity; src LOC ≤ 1000; complexity p95 ≤ 6.

**2.2 Feasibility & Estimates**:
    - Capacity: 1 developer, 1 week
    - Estimates per phase: P1 1.5d, P2 1d, P3 1d; Risk buffer 25%
    - Constraints: No API surface changes, no CLI option changes, no breaking config schema changes.
    - Feasibility conclusion: Targets are achievable within 1 week given small scope. If Phase 1 test count misses by >15%, split into P1a (capture/template) and P1b (http/config).

**3. Test Assurance Plan**:
    - **Current Test Coverage Assessment**: No existing tests.
    - **Tests to Add (minimum)**:
        - Unit tests for `captureFromUrl()` and `captureFromObject()` covering strings, arrays, nested objects, missing keys.
        - Unit tests for `applyTemplate()` across strings, arrays, objects, and unknown values.
        - Unit tests for `HttpClient.requestJson()` with mocked fetch: ok/expected status, non-JSON response handling, capture behavior.
        - Unit tests for `loadConfig()` and `planConfigSchema` validation (valid config, missing fields, invalid suffix).
    - **Test Framework**: Jest + ts-jest (already configured).

**4. Detailed Refactoring Steps**:
    - **Phase One: Test Supplementation**
        - **Objective (SMART)**: Add ≥4 test files and ≥20 test cases; keep src LOC ≤ 980; duplication ≤ 2%.
        - **Steps**:
            1. Add tests for `src/core/capture.ts`.
            2. Add tests for `src/core/template.ts`.
            3. Add tests for `src/core/httpClient.ts` with fetch mocks.
            4. Add tests for `src/config/loadConfig.ts` and `src/config/schema.ts`.
            5. Run full test suite; confirm no changes to runtime behavior.
        - **Exit criteria**: All tests pass; targets met; no change in CLI behavior.

    - **Phase Two: Centralize Defaults**
        - **Objective (SMART)**: Default literals for polling/timeout defined in exactly 1 module; src LOC ≤ 990.
        - **Steps**:
            1. Add constants for polling/timeout defaults in `src/core/constants.ts`.
            2. Update `src/cli.ts` to use centralized defaults.
            3. Add/adjust tests to confirm default values remain unchanged.
            4. Run full test suite.
        - **Exit criteria**: Tests pass; default literals appear in a single module; targets met.

    - **Phase Three: Guard Tightening (API Parsing)**
        - **Objective (SMART)**: Remove 2 redundant runtime guard branches by relying on Zod schemas; complexity p95 ≤ 6.
        - **Steps**:
            1. Review `src/core/conformanceApi.ts` schemas to add minimal refinements (e.g., stricter URL list types where safe).
            2. Adjust `src/core/runner.ts` to reduce redundant checks using typed outputs.
            3. Extend tests to cover schema parsing of optional fields.
            4. Run full test suite.
        - **Exit criteria**: Tests pass; guard reduction achieved; targets met.

**5. Phase Exit Criteria & Replan Triggers**:
    - **Go/No-Go**: Do not proceed if any exit criteria are unmet.
    - **Replan Trigger**: If any numeric target is missed by >15% or any critical tests fail, add a micro-phase to close the gap or re-scope with updated feasibility and targets.

**6. Progress Tracking & Validation Table**:

| Phase | Metric | Baseline | Target | Actual | Status |
| :--- | :--- | :---: | :---: | :---: | :--- |
| P1 | Test files | 0 | ≥4 | TBD | Pending |
| P1 | Test cases | 0 | ≥20 | TBD | Pending |
| P1 | src LOC | 964 | ≤980 | TBD | Pending |
| P1 | Duplication | <2% | ≤2% | TBD | Pending |
| P2 | Default literals locations | 2 | 1 | TBD | Pending |
| P2 | src LOC | 964 | ≤990 | TBD | Pending |
| P3 | Guard branches reduced | 0 | 2 | TBD | Pending |
| P3 | Complexity p95 | 6 | ≤6 | TBD | Pending |

**7. Plan Documentation**:
This plan is recorded in this file for approval before any code changes begin.
---
