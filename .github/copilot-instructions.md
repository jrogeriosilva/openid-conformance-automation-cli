# oidc-autopilot: AI agent notes
## Project Overview

**oidc-autopilot** is a CLI tool that automates OpenID Connect Conformance Suite tests. It orchestrates test execution by registering test modules, polling their status, handling browser navigation via Playwright, and executing custom HTTP actions when tests enter WAITING state.

## Common Commands

### Setup
```bash
npm install
npx playwright install --with-deps
```

### Development
```bash
# Development mode with hot reload
npm run dev -- --config ./config.json --plan-id <PLAN_ID> --token <TOKEN>

# Build for production
npm run build

# Run built application
npm start -- --config ./config.json --plan-id <PLAN_ID>
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/core/runner.spec.ts

# Run tests in watch mode
npm test -- --watch
```

## Architecture

### Execution Flow
1. **Entry**: `src/index.ts` → `runCli()` in `src/cli.ts`
2. **Config Loading**: `loadConfig()` validates `.config.json` files using Zod schemas from `src/config/schema.ts`
3. **Sequential Module Execution**: `Runner` (src/core/runner.ts) executes test modules one at a time
4. **State Management**: `StateManager` (src/core/stateManager.ts) handles polling and state transitions

**IMPORTANT CONSTRAINT**: Modules MUST execute sequentially. The OpenID Conformance Suite does NOT support parallel test execution. Each test module must complete before the next one starts.

### Architecture Components

#### StateManager (src/core/stateManager.ts)
Encapsulates state polling logic for test modules:
- Polls module status until terminal state (FINISHED/INTERRUPTED)
- Handles WAITING state by triggering navigation and action execution
- Enforces timeout constraints
- Captures variables from API responses throughout polling
- Provides structured callbacks (`onNavigate`, `onExecuteActions`) for state transitions

**Note**: The legacy `pollRunnerStatus()` function in `src/core/runnerHelpers.ts` is deprecated and will be removed in a future version. Use `StateManager` for all new code.

#### Custom Error Classes (src/core/errors.ts)
Provides contextual error information for better debugging:
- `ModuleExecutionError` - Module execution failures with state context
- `ActionExecutionError` - Action execution failures with action name/type
- `StateTimeoutError` - State polling timeouts with last known state
- `BrowserNavigationError` - Browser navigation failures with URL

All errors preserve cause chains for full error traceability.

#### Enhanced Logging (src/core/logger.ts)
Supports structured logging with correlation IDs:
- `LogContext` interface with `correlationId`, `moduleName`, `actionName`, `state` fields
- Correlation IDs enable tracing execution flow across modules and actions
- Debug logging available via `DEBUG` environment variable
- Format: `[correlationId:moduleName:state:WAITING:action:login] message`
- Grep-able by module, action, or state for easier debugging

### Test State Machine
```
CREATED → CONFIGURED → RUNNING → WAITING → FINISHED/INTERRUPTED
                                     ↓
                    Browser Navigation (once) + Actions (once)
```

### Key State Handling (WAITING)
When a test enters WAITING state:
1. **Navigation** (once): Uses `runnerInfo.browser.urls[0]` or first GET from `urlsWithMethod`, navigates via Playwright
2. **Actions** (once): Executes configured actions (API or browser types) sequentially after navigation completes

### Variable Capture & Templating
- **Fixed Variables**: Can be defined at global (config) or module level for constant values
- **Variable Precedence**: captured > module variables > global variables
- **Capture**: `captureFromObject()` and `captureFromUrl()` (src/core/capture.ts) extract variables from JSON responses, URL params, and nested structures
- **Storage**: All captured vars are stored in a shared `captured` map passed through the execution chain
- **Templating**: `applyTemplate()` (src/core/template.ts) replaces `{{var}}` placeholders in action endpoints, payloads, headers, and URLs
- **HTTP Integration**: `HttpClient.requestJson()` (src/core/httpClient.ts) automatically captures from request URLs, response bodies, and text responses

### Typed Actions System
Actions are typed as either API (HTTP) or Browser (Playwright) operations:
- **API Actions**: Execute HTTP requests and capture response variables
  - Fields: `type: "api"`, `endpoint`, `method`, `payload`, `headers`
  - Executed via `HttpClient` with automatic variable capture
- **Browser Actions**: Execute Playwright operations
  - Fields: `type: "browser"`, `operation`, `url`, `wait_for`
  - Currently supports `navigate` operation with different wait strategies
  - Browser session is shared across all actions within a module (preserves cookies/state)
- **Action Executor**: `src/core/actions.ts` handles both types via discriminated union
- **Variable Merging**: Actions receive merged variables (global + module + captured) following precedence rules

### Conformance API Integration
All conformance API calls are centralized in `src/core/conformanceApi.ts`:
- `registerRunner(planId, moduleName)` - POST /api/runner
- `getModuleInfo(runnerId)` - GET /api/info/{id}
- `getRunnerInfo(runnerId)` - GET /api/runner/{id}
- `getModuleLogs(runnerId)` - GET /api/log/{id}
- `startModule(runnerId)` - POST /api/runner/{id}

All use Bearer token authentication and accept `CaptureContext` for variable extraction.

## Important Conventions

### Configuration Files
- **Must** end with `.config.json` suffix (enforced in loadConfig.ts)
- Schema validation happens via `planConfigSchema` in src/config/schema.ts
- Add new config fields to schema first, then implement

### Error Handling
- `cli.ts` is the error-to-exit boundary
- All other modules throw custom error classes from `src/core/errors.ts`
- Custom errors provide contextual information (module, action, state)
- Errors preserve cause chains for full traceability
- Errors are caught in CLI and logged with context before exit

### Logging
- Use `createLogger()` from src/core/logger.ts
- Supports structured logging with `LogContext` parameter
- **Regular logs** show only module name and action (when relevant): `[module-name] message` or `[module-name:action-name] message`
- **Debug logs** (via `DEBUG` env var) show full context including correlation ID and state: `[timestamp:module:state:action] message`
- Correlation IDs are used internally for tracing but not shown in regular logs to reduce verbosity
- Keep logs plain English and avoid technical jargon in user-facing messages

#### Log Format Examples
```bash
# Regular logs (concise)
[module-name] Registering...
[module-name] Registering... OK (ID: ABC123)
[module-name:action-name] Executing action 'action-name'...
[module-name:action-name] Action 'action-name' completed.

# Debug logs (detailed)
DEBUG=true npm start
[DEBUG]: [1234567890:module-name:WAITING] Polling... State: WAITING
[DEBUG]: [1234567890:module-name:WAITING:action-name] Executing action
```

#### Log Filtering Examples
```bash
# All logs for specific module
npm start | grep "module-name"

# All action executions
npm start | grep ":"  # Lines with action names

# Debug logs with full context
DEBUG=true npm start
```

### Testing
- Tests use Jest with ts-jest preset
- Test files: `**/*.spec.ts` in src/ directory
- Use `isolateModule()` from src/testUtils/isolateModule.ts for module isolation when needed

### Environment Variables
Critical env vars (set in .env):
- `CONFORMANCE_TOKEN` - Bearer token for API auth (required)
- `CONFORMANCE_SERVER` - Base URL (optional, defaults to https://www.certification.openid.net)

## Modifying the Codebase

### Adding New Configuration Fields
1. Update schema in `src/config/schema.ts`
2. Add TypeScript types (auto-generated via Zod inference)
3. Handle in runner or action executor

### Adding Conformance API Endpoints
1. Add method to `ConformanceApi` class in src/core/conformanceApi.ts
2. Use `HttpClient` with `CaptureContext` to maintain variable capture
3. Include proper error handling and logging

### Extending Action Execution
1. Update action schemas in `src/config/schema.ts` (discriminated union)
2. Modify `ActionExecutor` in src/core/actions.ts to handle new action types
3. Ensure template interpolation via `applyTemplate()`
4. Capture variables from responses using appropriate mechanisms

### Browser Automation
- Browser session management via `BrowserSession` class (src/core/browserSession.ts)
- Each module gets its own browser session, shared across all actions in that module
- Session preserves cookies, localStorage, and other browser state
- Exported from src/core/playwrightRunner.ts
- Uses headless mode by default (override with --no-headless)
- Always capture final URL and query params after navigation
- Supports different wait strategies: networkidle, domcontentloaded, load

## Related Documentation

See README.md for:
- Detailed configuration examples
- Variable capture mechanics
- Action configuration reference
- CLI usage and options
- Execution flow diagrams
