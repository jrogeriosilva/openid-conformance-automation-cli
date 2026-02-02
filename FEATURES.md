# Next Features - OpenID Conformance Automation CLI

Based on a thorough analysis of this project, here are recommended features organized by priority and complexity. The project's core objective is to automate OpenID Connect Conformance Suite testing through a CLI tool that handles module execution, browser navigation, and dynamic actions with variable capture.

---

## 🔥 High Priority Features

### 1. **Parallel Module Execution**
**Complexity:** Medium | **Impact:** High

Currently, modules execute sequentially. Adding parallel execution would significantly reduce total test suite runtime.

```json
{
  "execution": {
    "mode": "parallel",     // or "sequential" (default)
    "maxConcurrency": 5
  }
}
```

**Implementation Notes:**
- Modify `Runner.executePlan()` to use a worker pool pattern
- Handle shared state (`capture_vars`) carefully between parallel runs
- Add module-level isolation for captured variables

---

### 2. **Retry Logic for Failed Modules**
**Complexity:** Low | **Impact:** High

Network issues and transient failures are common in conformance testing. Adding retry support would improve reliability.

```json
{
  "retry": {
    "maxAttempts": 3,
    "delayMs": 5000,
    // Valid states: CREATED, CONFIGURED, WAITING, RUNNING, FINISHED, INTERRUPTED
    "retryOnStates": ["INTERRUPTED"]
  },
  "modules": [
    {
      "name": "fapi1-advanced-final-ensure-expired-request-object-fails",
      "retry": { "maxAttempts": 2 }  // Module-level override
    }
  ]
}
```

**CLI Options:**
```bash
--retry-attempts 3
--retry-delay 5000
```

---

### 3. **Report Generation**
**Complexity:** Medium | **Impact:** High

Generate structured test reports for CI/CD integration and compliance documentation.

```bash
--output-format json|junit|html
--output-path ./reports/
```

**Report Types:**
- **JSON Report:** Machine-readable results with full captured variables
- **JUnit XML:** For CI/CD pipeline integration (Jenkins, GitHub Actions)
- **HTML Report:** Human-readable summary with pass/fail visualization

---

### 4. **Conditional Actions**
**Complexity:** Medium | **Impact:** High

Execute actions based on conditions (captured variable values, module state).

```json
{
  "actions": [
    {
      "name": "refresh_token",
      "condition": {
        "when": "{{token_expired}} == 'true'"
      },
      "endpoint": "https://auth.example.com/token/refresh"
    }
  ]
}
```

---

## 🎯 Medium Priority Features

### 5. **Module Filtering and Selection**
**Complexity:** Low | **Impact:** Medium

Run specific modules or filter by tags/patterns without modifying config.

```bash
--modules "fapi1-*"
--modules "module-a,module-b"
--skip-modules "slow-test-*"
--tags "critical,smoke"
```

```json
{
  "modules": [
    {
      "name": "fapi1-test-1",
      "tags": ["critical", "fapi1"]
    }
  ]
}
```

---

### 6. **Action Chaining and Dependencies**
**Complexity:** Medium | **Impact:** Medium

Define action dependencies to ensure proper execution order.

```json
{
  "actions": [
    {
      "name": "login",
      "endpoint": "https://auth.example.com/login"
    },
    {
      "name": "approve_consent",
      "dependsOn": ["login"],
      "endpoint": "https://auth.example.com/consent/approve"
    }
  ]
}
```

---

### 7. **Verbose/Debug Mode**
**Complexity:** Low | **Impact:** Medium

Enhanced logging for troubleshooting and development.

```bash
--verbose       # Show detailed logs
--debug         # Show HTTP requests/responses, captured variables
--log-file ./execution.log
```

**Output improvements:**
- Log HTTP request/response bodies (redacted sensitive data)
- Show captured variable values at each step
- Include timestamps in logs

---

### 8. **Configuration Validation Command**
**Complexity:** Low | **Impact:** Medium

Validate configuration files without running tests.

```bash
auto-conformance-cli validate --config ./config.json
```

**Validations:**
- Schema compliance
- Action references exist
- Template variables are defined in `capture_vars`
- URL format validation

---

### 9. **Environment-Specific Configuration**
**Complexity:** Low | **Impact:** Medium

Support multiple environments with config overlays.

```bash
--env staging
--env-file ./env.staging.json
```

```json
{
  "environments": {
    "staging": {
      "base_url": "https://staging.example.com"
    },
    "production": {
      "base_url": "https://api.example.com"
    }
  }
}
```

---

### 10. **HTTP Response Assertions**
**Complexity:** Medium | **Impact:** Medium

Validate action responses beyond status codes using JSONPath syntax (similar to [JSONPath-Plus](https://github.com/JSONPath-Plus/JSONPath)).

```json
{
  "actions": [
    {
      "name": "get_token",
      "endpoint": "https://auth.example.com/token",
      "assertions": [
        { "path": "$.token_type", "equals": "Bearer" },         // Exact match
        { "path": "$.expires_in", "greaterThan": 0 },           // Numeric comparison
        { "path": "$.access_token", "matches": "^[A-Za-z0-9-_]+$" }  // Regex match
      ]
    }
  ]
}
```

---

## 💡 Lower Priority / Nice-to-Have Features

### 11. **Browser Interaction Scripts**
**Complexity:** High | **Impact:** Medium

Support custom Playwright scripts for complex login flows.

```json
{
  "modules": [
    {
      "name": "test-module",
      "browserScript": "./scripts/custom-login.js"
    }
  ]
}
```

```javascript
// custom-login.js
module.exports = async ({ page, captured }) => {
  await page.fill('#username', process.env.TEST_USER);
  await page.fill('#password', process.env.TEST_PASSWORD);
  await page.click('#submit');
  await page.waitForNavigation();
  
  // Use captured variables if needed
  if (captured.consent_id) {
    await page.click(`#consent-${captured.consent_id}`);
  }
};
```

---

### 12. **Dry-Run Mode**
**Complexity:** Low | **Impact:** Low

Preview what would be executed without making actual API calls.

```bash
--dry-run
```

---

### 13. **Progress Reporting / Watch Mode**
**Complexity:** Medium | **Impact:** Low

Real-time progress updates and file watching for development.

```bash
--watch                    # Re-run on config file changes
--progress-format minimal|verbose|json
```

---

### 14. **Plugin System**
**Complexity:** High | **Impact:** Medium

Extensibility for custom action types, capture methods, or reporters.

```json
{
  "plugins": [
    "./plugins/custom-auth.js",
    "openid-conformance-plugin-slack"
  ]
}
```

---

### 15. **State Persistence**
**Complexity:** Medium | **Impact:** Low

Save and restore execution state for resuming failed runs.

```bash
--save-state ./state.json
--resume-from ./state.json
```

---

### 16. **Interactive Mode**
**Complexity:** Medium | **Impact:** Low

Interactive CLI for selecting and running modules.

```bash
auto-conformance-cli interactive --config ./config.json
```

---

### 17. **Webhook Notifications**
**Complexity:** Low | **Impact:** Low

Send notifications on test completion.

```json
{
  "notifications": {
    "webhook": "https://slack.example.com/webhook",
    "events": ["completed", "failed"]
  }
}
```

---

## 🔧 Technical Improvements

### 18. **TypeScript Strict Mode**
Enable stricter TypeScript checks for better code quality.

### 19. **Improved Error Messages**
More descriptive errors with suggested fixes.

### 20. **Unit Test Coverage**
Increase test coverage for core modules (runner, actions, capture).

### 21. **API Rate Limiting**
Handle rate limiting with exponential backoff.

### 22. **Connection Pooling**
Reuse HTTP connections and Playwright browser instances.

---

## Implementation Roadmap

| Phase | Features | Estimated Effort |
|-------|----------|------------------|
| **Phase 1** | Retry Logic, Verbose Mode, Config Validation | 1-2 weeks |
| **Phase 2** | Report Generation (JSON/JUnit), Module Filtering | 2-3 weeks |
| **Phase 3** | Conditional Actions, Environment Config | 2 weeks |
| **Phase 4** | Parallel Execution, Action Dependencies | 3-4 weeks |
| **Phase 5** | Browser Scripts, Plugin System | 4+ weeks |

---

## Quick Wins (Can be implemented in < 1 day each)

1. ✅ `--dry-run` flag
2. ✅ `--verbose` flag  
3. ✅ Config validation command
4. ✅ Module filtering by name pattern
5. ✅ Basic retry logic (global setting)
6. ✅ JSON report output

---

## Contribution Areas

These features are well-suited for community contributions:
- Report formatters (HTML, JUnit)
- Additional action validators
- Environment configuration overlays
- Webhook notification integrations
