# auto-conformance-cli: AI agent notes

## Overview
This project is a TypeScript-based CLI tool that automates interaction with an OpenID conformance server. It registers conformance test plans, polls for their status, and performs configured actions (like following URLs or submitting data) based on the server's responses. The tool captures variables from API responses and uses them to template subsequent requests, enabling dynamic workflows.

## Architecture and data flow
- Entry point is [src/index.ts](src/index.ts) which calls `runCli()` in [src/cli.ts](src/cli.ts).
- CLI builds a `Runner` with `ConformanceApi`, then runs `executePlan()` for each module (see [src/core/runner.ts](src/core/runner.ts)).
- `Runner` orchestrates the conformance lifecycle: register module → poll until `FINISHED`/`INTERRUPTED`.
- When a module is `WAITING`, `Runner` triggers configured actions once (tracked via `executedActions`).
- Actions come from config JSON and are executed by `ActionExecutor` (see [src/core/actions.ts](src/core/actions.ts)).
- Variable capture is central: `captureFromObject()` crawls API responses/logs and URLs to extract `capture_vars` into a shared map (see [src/core/capture.ts](src/core/capture.ts)).
- Templating uses `{{var}}` placeholders across strings, objects, arrays (see [src/core/template.ts](src/core/template.ts)).
- `ConformanceApi` is the only place that talks to the OpenID conformance server APIs (see [src/core/conformanceApi.ts](src/core/conformanceApi.ts)).
- Playwright is only used to simulate browser navigation requested by the conformance tool and callbacks (redirect back after approve or reject consent) (see [src/core/playwrightRunner.ts](src/core/playwrightRunner.ts)).

- All the redirects made by Playwright or Actions (API Calls) must capture vars from config (query params and response) and update the shared `capture_vars` map.

## Key config patterns
- Config schema is validated with Zod in [src/config/schema.ts](src/config/schema.ts); add new config fields here first.
- `capture_vars` is optional but used across actions, keep execution as single mutable capture map.
- Action payload/headers are templated before request;

## Developer workflows
- Setup (run once per clone): `npm install` and `npx playwright install --with-deps` before running the commands below.
- Build: `npm run build` (tsc output to dist/).
- Dev run: `npm run dev -- --config ./config.json --plan-id <PLAN_ID> --token <TOKEN>`.
- Runtime entry: `node dist/index.js` or `npm start`.
- Tests: `npm test` (Jest with ts-jest; test files `**/*.spec.ts` or `**/*.test.ts`).

## Project-specific conventions
- Logging is intentionally plain and in English (see [src/core/logger.ts](src/core/logger.ts)); keep style consistent.
- Errors are surfaced as thrown `Error` instances; `cli.ts` is the central error-to-exit boundary.
- HTTP calls use the shared `HttpClient` wrapper (see [src/core/httpClient.ts](src/core/httpClient.ts)) to enforce auth headers and timeouts. This Wrapper should be used for all HTTP calls outside Playwright and must capture vars from responses.

## Integration points
- External API endpoints: 
  - `POST api/runner`
    - to register a new test plan run
  - `GET api/runner/{id}`
    - get the details from a registered runner (browser interactions may be needed based on response)
  - `GET api/info/{id}`
    - get the informations about a conformance test running
  - `GET api/log/{id}`
    - get the logs for a conformance test running
- Auth is always Bearer token from CLI flag or `CONFORMANCE_TOKEN`. Use if present.
- Playwright browser automation for handling redirects and consent pages.
- Polling intervals and timeouts are CLI-configurable; default values are in [src/cli.ts](src/cli.ts).
- Any new `ConformanceApi` endpoint should go through the shared [HttpClient](src/core/httpClient.ts) and invoke [captureFromObject](src/core/capture.ts) so templated capture variables stay up to date.
