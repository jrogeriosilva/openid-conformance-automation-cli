# oidc-autopilot

[![Version](https://badges.ws/badge/Version-0.1.0-blue)](https://github.com/jrogeriosilva/oidc-autopilot)
[![Status](https://badges.ws/badge/Status-Beta-green)](https://github.com/jrogeriosilva/oidc-autopilot)
[![License](https://badges.ws/badge/License-MIT-yellow)](./LICENSE)
[![Node.js](https://badges.ws/badge/Node.js-18+-339933)](https://nodejs.org/)

<img width="540" height="196" alt="oidc-autopilot" src="https://github.com/user-attachments/assets/98921412-d18f-4813-968b-58b0a48981ec" />

**oidc-autopilot** automates [OpenID Connect Conformance Suite](https://www.certification.openid.net) tests using JSON configuration with dynamic actions and variable capture. Designed to streamline certification testing workflows for OpenID Connect implementations.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Configuration File Structure](#configuration-file-structure)
  - [Variable Capture](#variable-capture)
  - [Templating](#templating)
  - [Actions](#actions)
- [CLI Usage](#cli-usage)
  - [Options](#options)
  - [Environment Variables](#environment-variables)
- [GUI Dashboard](#gui-dashboard)
  - [Starting the Dashboard](#starting-the-dashboard)
  - [Dashboard Features](#dashboard-features)
- [Execution Flow](#execution-flow)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

| Feature | Description |
|---------|-------------|
| **Dual Interface** | Run as a CLI tool for CI/CD pipelines or use the Web GUI Dashboard for visual configuration and monitoring |
| **Automated Test Execution** | Sequentially execute multiple OpenID conformance test modules |
| **Dynamic Variable Capture** | Automatically extract variables from API responses, URLs, and redirects |
| **Template Interpolation** | Use `{{variable}}` placeholders in endpoints, payloads, and headers |
| **Browser Automation** | Handle OAuth/OIDC flows automatically using Playwright |
| **Custom Actions** | Execute HTTP requests and browser navigations when tests enter WAITING state |
| **Real-Time Monitoring** | Live SSE-powered dashboard with per-module status cards and streaming logs |
| **Status Polling** | Configurable polling intervals and timeouts |
| **Detailed Logging** | Comprehensive execution logs and test result summaries |

## Requirements

- **Node.js** 18 or higher
- **npm** or **yarn**
- Playwright-supported browsers

## Installation

1. Clone the repository:

```bash
git clone https://github.com/jrogeriosilva/oidc-autopilot.git
cd oidc-autopilot
```

2. Install dependencies:

```bash
npm install
```

3. Install Playwright browsers:

```bash
npx playwright install --with-deps
```

4. Build the project:

```bash
npm run build
```

## Quick Start

1. Copy the environment example file and configure your credentials:

```bash
cp env.example .env
# Edit .env with your CONFORMANCE_TOKEN
```

2. Create a configuration file (e.g., `config.json`):

```json
{
  "capture_vars": ["consent_id", "redirect_to"],
  "actions": [
    {
      "name": "approve_consent",
      "type": "api",
      "endpoint": "https://your-bank-api.com/consent/{{consent_id}}/approve",
      "method": "POST"
    }
  ],
  "modules": [
    {
      "name": "fapi1-advanced-final-ensure-request-object-signature-algorithm-is-valid",
      "actions": ["approve_consent"]
    }
  ]
}
```

3. Run the CLI:

```bash
node dist/index.js --config ./config.json --plan-id <YOUR_PLAN_ID>
```

## Configuration

### Configuration File Structure

The CLI expects a JSON configuration file with the following structure:

```json
{
  "capture_vars": ["var1", "var2", "..."],
  "actions": [
    {
      "name": "action_name",
      "type": "api",
      "endpoint": "https://api.example.com/{{var1}}/path",
      "method": "POST",
      "payload": { "key": "{{var2}}" },
      "headers": { "Authorization": "Bearer {{token}}" }
    }
  ],
  "modules": [
    {
      "name": "conformance-test-module-name",
      "actions": ["action_name"]
    }
  ]
}
```

### Variable Capture

The `capture_vars` array defines which variables to automatically extract during test execution. Variables are captured from:

- **API Response Bodies**: JSON fields matching variable names
- **URL Query Parameters**: Parameters in redirect URLs
- **Response Headers**: Header values during HTTP exchanges

Example:
```json
{
  "capture_vars": ["access_token", "session_id", "consent_id", "redirect_to"]
}
```

### Templating

Use `{{variable_name}}` syntax to reference captured variables anywhere in your configuration:

```json
{
  "endpoint": "https://api.example.com/consent/{{consent_id}}/approve",
  "headers": {
    "Authorization": "Bearer {{access_token}}"
  },
  "payload": {
    "session": "{{session_id}}"
  }
}
```

Variables are interpolated at runtime with the values captured during execution.

### Variables

Variables can be defined at two levels to provide fixed values for templating:

1. **Global variables**: Available to all modules
2. **Module variables**: Available to specific module (overrides global)

Variable precedence (highest to lowest):
- **Captured variables** (from API responses, URLs)
- **Module variables** (from config)
- **Global variables** (from config)

Example:
```json
{
  "variables": {
    "api_base": "https://api.example.com",
    "timeout": "5000"
  },
  "modules": [
    {
      "name": "test-module",
      "variables": {
        "timeout": "10000"
      }
    }
  ]
}
```

### Actions

Actions are typed operations executed when a test module enters the `WAITING` state. There are two types: **API** (HTTP) and **Browser** (Playwright).

#### API Actions

Execute HTTP requests and capture variables from responses:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"api"` |
| `name` | string | Yes | Unique identifier for the action |
| `endpoint` | string | Yes | URL to send the request (supports templating) |
| `method` | string | Yes | HTTP method (`GET`, `POST`, etc.) Default: `"POST"` |
| `payload` | object | No | Request body (supports templating) |
| `headers` | object | No | Custom headers (supports templating) |

Example:
```json
{
  "name": "approve_consent",
  "type": "api",
  "endpoint": "https://api.example.com/consent/{{consent_id}}",
  "method": "POST",
  "payload": {
    "status": "approved"
  },
  "headers": {
    "Authorization": "Bearer {{token}}"
  }
}
```

#### Browser Actions

Execute browser operations using Playwright:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"browser"` |
| `name` | string | Yes | Unique identifier for the action |
| `operation` | string | Yes | Browser operation (currently only `"navigate"`) |
| `url` | string | Yes | URL to navigate to (supports templating) |
| `wait_for` | string | No | Wait strategy: `"networkidle"` (default), `"domcontentloaded"`, or `"load"` |

Example:
```json
{
  "name": "navigate_callback",
  "type": "browser",
  "operation": "navigate",
  "url": "{{redirect_url}}",
  "wait_for": "networkidle"
}
```

**Note:** Browser actions within a module share the same browser session, preserving cookies and state.

## CLI Usage

```bash
node dist/index.js --config <path> [options]
```

### Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--config <path>` | Yes | - | Path to configuration JSON file |
| `--plan-id <id>` | Yes* | `CONFORMANCE_PLAN_ID` env | OpenID conformance test plan ID |
| `--token <token>` | Yes* | `CONFORMANCE_TOKEN` env | Bearer token for API authentication |
| `--base-url <url>` | No | `https://www.certification.openid.net` | Conformance server base URL |
| `--poll-interval <sec>` | No | `5` | Seconds between status checks |
| `--timeout <sec>` | No | `240` | Maximum seconds to wait for test completion |
| `--no-headless` | No | `false` | Show browser window during execution |

*Required if not set via environment variable

### Environment Variables

Create a `.env` file in the project root (see `env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `CONFORMANCE_TOKEN` | Yes | Bearer token for OpenID Conformance API authentication |
| `CONFORMANCE_SERVER` | No | Custom conformance server URL |
| `CONFORMANCE_PLAN_ID` | No | Default plan ID (overridden by `--plan-id`) |

## GUI Dashboard

In addition to the CLI, oidc-autopilot provides a modern **Web GUI Dashboard** built with React, Vite, and TailwindCSS. The dashboard offers a visual interface for configuring, launching, and monitoring conformance test runs in real time.

<!-- ![Dashboard Screenshot](docs/dashboard-screenshot.png) -->
> 📸 *Dashboard screenshot placeholder — replace with an actual capture of the running dashboard.*

### Starting the Dashboard

**Production mode** (builds the React SPA and serves it on a single port):

```bash
npm run gui                  # default port 3000
npm run gui -- --port=8080   # custom port
```

**Development mode** (hot-reload via Vite + Express backend):

```bash
npm run dev:gui
```

This starts the Vite dev server on port `5173` (proxying `/api` requests to the Express backend on port `3001`).

### Dashboard Features

| Feature | Description |
|---------|-------------|
| **Config Manager** | Discover, view, and select `*.config.json` files from the project directory |
| **Launch & Stop** | Start and cancel test runs directly from the browser |
| **Live Log Streaming** | Real-time Server-Sent Events (SSE) feed of execution logs |
| **Module Status Cards** | Per-module status indicators (PENDING, RUNNING, WAITING, FINISHED, INTERRUPTED, ERROR) |
| **Environment Defaults** | Pre-fill run parameters from `.env` values |

## Execution Flow

The CLI follows this execution flow for each test module:

```mermaid
flowchart TD
    A[1. Register Module] -->|POST /api/runner?test=module&plan=id| B[Returns: runner_id]
    B --> C[2. Poll for CONFIGURED State]
    C -->|GET /api/info/runner_id| D{CONFIGURED?}
    D -->|No| C
    D -->|Yes| E[3. Start Test]
    E -->|POST /api/runner/runner_id| F[4. Poll Until Terminal State]
    F -->|GET /api/info/runner_id| G{Check State}
    G -->|WAITING| H[Execute Actions]
    G -->|FINISHED / INTERRUPTED| I[Return Result]
    H --> J[Navigate browser to test URL]
    J --> K[Execute configured HTTP actions]
    K --> L[Capture variables from responses]
    L --> F
    I --> M((End))
```

**State Definitions:**

| State | Description |
|-------|-------------|
| `CREATED` | Module registered, waiting for configuration |
| `CONFIGURED` | Ready to start execution |
| `RUNNING` | Test in progress |
| `WAITING` | Test paused, waiting for external interaction |
| `FINISHED` | Test completed successfully |
| `INTERRUPTED` | Test stopped due to error or timeout |

## Architecture

The project is split into a **backend** (TypeScript / Node.js) and a **frontend** (React SPA). Both the CLI and the GUI dashboard share the same core engine.

```mermaid
graph LR
    subgraph Backend
        CLI["CLI (commander)"]
        GUI["GUI Server (Express + SSE)"]
        Runner["Runner / State Manager"]
        Actions["Action Executor"]
        PW["Playwright Browser"]
        API["Conformance API Client"]
    end
    subgraph Frontend
        React["React SPA (Vite + TailwindCSS)"]
    end
    CLI --> Runner
    GUI --> Runner
    React -- "/api/*" --> GUI
    Runner --> API
    Runner --> Actions
    Actions --> PW
    Actions --> API
```

> 🏗️ *Architecture diagram placeholder — the Mermaid chart above renders on GitHub. Replace or extend as needed.*

## Development

### Available Scripts

```bash
# CLI — development mode with hot reload
npm run dev -- --config ./config.json --plan-id <ID> --token <TOKEN>

# GUI — production (build + serve)
npm run gui

# GUI — development (Vite hot reload + Express backend)
npm run dev:gui

# Build backend only
npm run build

# Build backend + frontend
npm run build:all

# Run tests
npm test

# Start built CLI application
npm start -- --config ./config.json --plan-id <ID>
```

### Project Structure

```
src/
├── index.ts              # CLI entry point
├── cli.ts                # CLI argument parsing (commander)
├── guiEntry.ts           # GUI dashboard entry point
├── config/
│   ├── loadConfig.ts     # Configuration loader
│   └── schema.ts         # Zod validation schemas
├── core/
│   ├── runner.ts         # Main execution orchestrator
│   ├── stateManager.ts   # Status polling & state transitions
│   ├── conformanceApi.ts # OpenID Conformance API client
│   ├── httpClient.ts     # HTTP client with variable capture
│   ├── actions.ts        # Action execution logic (API & Browser)
│   ├── capture.ts        # Variable extraction from responses/URLs
│   ├── template.ts       # {{handlebar}} template interpolation
│   ├── browserSession.ts # Playwright browser lifecycle
│   ├── playwrightRunner.ts # Browser automation orchestration
│   └── logger.ts         # Structured logging utilities
├── gui/
│   └── server.ts         # Express server with SSE streaming
└── utils/
    └── sleep.ts          # Async sleep utility
web/
├── src/
│   ├── App.tsx           # React router (Dashboard / Config Manager)
│   ├── pages/            # DashboardPage, ConfigManagerPage
│   ├── components/       # Reusable UI components
│   ├── hooks/            # useDashboard, useSSE, useConfigManager
│   └── api/              # REST + SSE client helpers
├── index.html
└── vite.config.ts
```

## Troubleshooting

### Common Issues

**Browser fails to launch**
```bash
# Reinstall Playwright browsers
npx playwright install --with-deps
```

**Authentication errors**
- Verify your `CONFORMANCE_TOKEN` is valid and not expired
- Check that the token has the required permissions for the test plan

**Tests timing out**
- Increase `--timeout` value for longer-running tests
- Check network connectivity to the conformance server
- Verify the test module name is correct

**Variable capture not working**
- Ensure variable names in `capture_vars` match exactly the field names in responses
- Check the CLI logs for captured values during execution

### Debug Mode

Run with visible browser to debug automation issues:

**Visible browser debugging**
```bash
node dist/index.js --config ./config.json --plan-id <ID> --no-headless
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with TypeScript, Playwright, and Zod.
