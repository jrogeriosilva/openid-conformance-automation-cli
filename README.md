# OpenID Conformance Automation CLI

[<img src="https://badges.ws/badge/Version-0.1.0-red" />](https://github.com/jrogeriosilva/openid-conformance-automation-cli)
[<img src="https://badges.ws/badge/Status-Beta-green" />](https://github.com/jrogeriosilva/openid-conformance-automation-cli)

<img width="540" height="196" alt="image" src="https://github.com/user-attachments/assets/98921412-d18f-4813-968b-58b0a48981ec" />

CLI tool to automate OpenID Connect Conformance Suite tests using a JSON configuration with dynamic actions and variable capture.

## Requirements

- Node.js 18+
- Playwright browsers (installed after npm install)

## Install

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install --with-deps
```

## Configuration

The CLI expects a JSON file with this shape:

```json
{
  "capture_vars": ["access_token", "session_id", "consent_id", "redirect_to"],
  "actions": [
    {
      "name": "approve_consent",
      "endpoint": "https://bank.example.com/api/consent/{{consent_id}}/approve",
      "method": "POST",
      "payload": { "session_id": "{{session_id}}" },
      "headers": { "Authorization": "Bearer {{access_token}}" },
      "callback_to": "{{redirect_to}}"
    }
  ],
  "modules": [
    {
      "name": "fapi1-advanced-final-ensure-expired-request-object-fails",
      "actions": ["approve_consent"]
    }
  ]
}
```

Notes:
- `capture_vars` are extracted from API responses and URLs.
- `actions` are executed when a module is in `WAITING` state.
- Templating uses `{{var}}` placeholders.

## Environment Variables

- `CONFORMANCE_TOKEN` (required) - Bearer token for API auth
- `CONFORMANCE_SERVER` (optional) - Defaults to https://www.certification.openid.net
- `CONFORMANCE_PLAN_ID` (optional) - Used if `--plan-id` is not provided

## Usage

```bash
npm run build
node dist/index.js --config ./config.json --plan-id <PLAN_ID> --token <TOKEN>
```

Or use environment variables:

```bash
CONFORMANCE_TOKEN=your-token \
CONFORMANCE_PLAN_ID=your-plan-id \
node dist/index.js --config ./config.json
```

### Options

- `--config <path>`: Path to config JSON file (required)
- `--plan-id <id>`: Conformance plan ID (required if env not set)
- `--token <token>`: API token (required if env not set)
- `--base-url <url>`: Conformance base URL
- `--poll-interval <seconds>`: Polling interval (default: 5)
- `--timeout <seconds>`: Polling timeout (default: 240)
- `--no-headless`: Run Playwright with a visible browser

## Execution Flow

1. Register module: POST `api/runner?test={name}&plan={id}`
2. Poll for `CONFIGURED` or terminal state.
3. Start test: POST `api/runner/{module_id}` if `CONFIGURED`.
4. Poll until `FINISHED` or `INTERRUPTED`.
5. If a module enters `WAITING`, execute configured actions.

## Development

```bash
npm run dev -- --config ./example.config.json --plan-id <PLAN_ID> --token <TOKEN>
```

## Tests

```bash
npm test
```
