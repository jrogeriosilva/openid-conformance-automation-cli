import express from "express";
import nodePath from "node:path";
import fs from "node:fs";
import { config as loadEnv } from "dotenv";
import { createLogger, type LogContext } from "../core/logger";
import { loadConfig } from "../config/loadConfig";
import { ConformanceApi } from "../core/conformanceApi";
import { Runner } from "../core/runner";
import { CONSTANTS } from "../core/constants";
import { planConfigSchema } from "../config/schema";
import type { ExecutionSummary } from "../core/types";
import type { CaptureContext } from "../core/httpClient";

/** Shape of a single log line stored for late-joining SSE clients. */
interface LogLine {
  severity: string;
  message: string;
  moduleName: string | null;
  actionName: string | null;
  at: number;
}

/** Per-module live status sent to the dashboard as cards. */
interface ModuleCard {
  name: string;
  status: string;   // PENDING | RUNNING | WAITING | FINISHED | INTERRUPTED | ERROR
  result: string;   // "" | PASSED | FAILED | WARNING | SKIPPED | REVIEW | UNKNOWN
  lastMessage: string;
}

/** Environment variable defaults loaded from .env for form pre-fill. */
interface EnvDefaults {
  planId: string;
  token: string;
  serverUrl: string;
}

/** Maximum number of log lines kept in memory per execution. */
const LOG_LINE_CAP = 5_000;

/**
 * Scans the current working directory (recursively up to 2 levels)
 * for files ending in `.config.json`.
 */
function discoverConfigFiles(): string[] {
  const cwd = process.cwd();
  const results: string[] = [];

  function scanDir(dir: string, depth: number): void {
    if (depth > 2) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") continue;
      const fullPath = nodePath.join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith(".config.json")) {
        results.push(nodePath.relative(cwd, fullPath));
      } else if (entry.isDirectory()) {
        scanDir(fullPath, depth + 1);
      }
    }
  }

  scanDir(cwd, 0);
  return results.sort();
}

/**
 * Reads pre-fill values from environment variables (loaded via dotenv).
 */
function readEnvDefaults(): EnvDefaults {
  loadEnv();
  return {
    planId: process.env.CONFORMANCE_PLAN_ID ?? "",
    token: process.env.CONFORMANCE_TOKEN ?? "",
    serverUrl: process.env.CONFORMANCE_SERVER ?? "https://www.certification.openid.net",
  };
}

/**
 * Validates that a resolved file path is safe and within the working directory.
 * Protects against path traversal attacks including symlink-based escapes.
 */
function validateSafePath(filename: string, cwd: string): { valid: boolean; resolvedPath?: string; error?: string } {
  try {
    const resolved = nodePath.resolve(cwd, filename);
    const normalized = nodePath.normalize(resolved);
    
    // Check both original and normalized paths
    if (!normalized.startsWith(cwd) || !resolved.startsWith(cwd)) {
      return { valid: false, error: "Path traversal not allowed" };
    }

    // Check if path contains suspicious patterns
    if (filename.includes("..") || filename.includes("~")) {
      return { valid: false, error: "Invalid path pattern" };
    }

    // Resolve symlinks and verify they don't escape the working directory
    if (fs.existsSync(resolved)) {
      const realPath = fs.realpathSync(resolved);
      if (!realPath.startsWith(fs.realpathSync(cwd))) {
        return { valid: false, error: "Path traversal via symlink not allowed" };
      }
    }

    return { valid: true, resolvedPath: resolved };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Invalid path" };
  }
}

/**
 * OidcAutopilotDashboard encapsulates the entire GUI web application.
 *
 * It wires up an Express app whose routes let the user trigger
 * conformance-plan executions and watch their progress via SSE.
 * All state lives inside this single class instance.
 */
export class OidcAutopilotDashboard {
  private readonly expressApp = express();
  private readonly activeSseConnections = new Set<express.Response>();

  // Mutable run state
  private executionInFlight = false;
  private stoppedByUser = false;
  private collectedLines: LogLine[] = [];
  private finalOutcome: ExecutionSummary | null = null;
  private errorDetail: string | null = null;
  private moduleCards: ModuleCard[] = [];
  private abortController: AbortController | null = null;
  private activeApi: ConformanceApi | null = null;
  private activeRunners: Array<{ runnerId: string; moduleName: string }> = [];

  constructor(private readonly listenPort: number) {
    this.expressApp.use(express.json());
    this.registerRoutes();
  }

  /** Start listening for HTTP connections. */
  boot(): void {
    this.expressApp.listen(this.listenPort, () => {
      console.log(`\n  OIDC Autopilot Dashboard → http://localhost:${this.listenPort}\n`);
    });

    // Gracefully close SSE connections on shutdown
    const shutdownHandler = () => {
      console.log('[GUI] Shutting down, closing active SSE connections...');
      for (const conn of this.activeSseConnections) {
        conn.end();
      }
      this.activeSseConnections.clear();
      process.exit(0);
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
  }

  // ── Route registration ──────────────────────────────

  private registerRoutes(): void {
    this.expressApp.get("/api/env-defaults", (_rq, rs) => {
      rs.json(readEnvDefaults());
    });

    this.expressApp.get("/api/health", (_rq, rs) => {
      rs.json({
        executionInFlight: this.executionInFlight,
        lineCount: this.collectedLines.length,
        outcome: this.finalOutcome,
        error: this.errorDetail,
        moduleCards: this.moduleCards,
      });
    });

    this.expressApp.get("/api/configs", (_rq, rs) => {
      rs.json({ files: discoverConfigFiles() });
    });

    this.expressApp.get("/api/feed", (rq, rs) => {
      rs.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      });
      rs.write(": connected\n\n");
      this.activeSseConnections.add(rs);
      rq.on("close", () => this.activeSseConnections.delete(rs));
    });

    // ── Config Manager routes ──

    this.expressApp.get("/api/plan/info/:planName", async (rq, rs) => {
      const env = readEnvDefaults();
      if (!env.token) {
        rs.status(401).json({ error: "CONFORMANCE_TOKEN not set in environment" });
        return;
      }
      try {
        const api = new ConformanceApi({ baseUrl: env.serverUrl, token: env.token });
        const info = await api.getPlanInfo(rq.params.planName);
        rs.json(info);
      } catch (err) {
        rs.status(502).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    this.expressApp.get("/api/config/:filename(*)", (rq, rs) => {
      const cwd = process.cwd();
      const validation = validateSafePath(rq.params.filename, cwd);
      
      if (!validation.valid) {
        rs.status(403).json({ error: validation.error });
        return;
      }

      const resolved = validation.resolvedPath!;
      if (!resolved.endsWith(".config.json")) {
        rs.status(400).json({ error: "File must end with .config.json" });
        return;
      }
      try {
        const raw = fs.readFileSync(resolved, "utf-8");
        rs.json(JSON.parse(raw));
      } catch (err) {
        rs.status(404).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    this.expressApp.put("/api/config/:filename(*)", (rq, rs) => {
      const cwd = process.cwd();
      const validation = validateSafePath(rq.params.filename, cwd);
      
      if (!validation.valid) {
        rs.status(403).json({ error: validation.error });
        return;
      }

      const resolved = validation.resolvedPath!;
      if (!resolved.endsWith(".config.json")) {
        rs.status(400).json({ error: "File must end with .config.json" });
        return;
      }
      try {
        const validated = planConfigSchema.parse(rq.body);
        const dir = nodePath.dirname(resolved);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(resolved, JSON.stringify(validated, null, 2) + "\n", "utf-8");
        rs.json({ saved: true, filename: rq.params.filename });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "issues" in err) {
          rs.status(400).json({ error: "Validation failed", details: (err as any).issues });
          return;
        }
        rs.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    this.expressApp.delete("/api/config/:filename(*)", (rq, rs) => {
      const cwd = process.cwd();
      const validation = validateSafePath(rq.params.filename, cwd);
      
      if (!validation.valid) {
        rs.status(403).json({ error: validation.error });
        return;
      }

      const resolved = validation.resolvedPath!;
      if (!resolved.endsWith(".config.json")) {
        rs.status(400).json({ error: "File must end with .config.json" });
        return;
      }
      try {
        fs.unlinkSync(resolved);
        rs.json({ deleted: true });
      } catch (err) {
        rs.status(404).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    // ── Execution routes ──

    this.expressApp.post("/api/launch", (rq, rs) => {
      this.handleLaunch(rq, rs);
    });

    this.expressApp.post("/api/stop", (_rq, rs) => {
      this.handleStop(rs);
    });

    // ── SPA serving (React frontend) ──
    const clientDir = nodePath.resolve(__dirname, "../../dist/client");
    const clientIndex = nodePath.join(clientDir, "index.html");
    if (fs.existsSync(clientIndex)) {
      this.expressApp.use(express.static(clientDir));
      // Catch-all: serve index.html for client-side routing
      this.expressApp.get("*", (_rq, rs) => {
        rs.sendFile(clientIndex);
      });
    }
  }

  // ── SSE broadcasting ────────────────────────────────

  private broadcastLine(lineObj: LogLine): void {
    this.collectedLines.push(lineObj);
    while (this.collectedLines.length > LOG_LINE_CAP) this.collectedLines.shift();

    const wire = `data: ${JSON.stringify(lineObj)}\n\n`;
    for (const conn of this.activeSseConnections) conn.write(wire);

    this.updateModuleCardFromLog(lineObj);
  }

  private broadcastOutcome(outcome: ExecutionSummary): void {
    const wire = `event: planDone\ndata: ${JSON.stringify(outcome)}\n\n`;
    for (const conn of this.activeSseConnections) conn.write(wire);
  }

  private broadcastModuleList(cards: ModuleCard[]): void {
    const wire = `event: moduleList\ndata: ${JSON.stringify(cards)}\n\n`;
    for (const conn of this.activeSseConnections) conn.write(wire);
  }

  private broadcastModuleUpdate(card: ModuleCard): void {
    const wire = `event: moduleUpdate\ndata: ${JSON.stringify(card)}\n\n`;
    for (const conn of this.activeSseConnections) conn.write(wire);
  }

  private broadcastStopped(): void {
    const wire = `event: stopped\ndata: ${JSON.stringify({ cards: this.moduleCards })}\n\n`;
    for (const conn of this.activeSseConnections) conn.write(wire);
  }

  /** Parse log messages to extract per-module state changes and update cards. */
  private updateModuleCardFromLog(line: LogLine): void {
    if (!line.moduleName) return;
    const card = this.moduleCards.find((c) => c.name === line.moduleName);
    if (!card) return;

    card.lastMessage = line.message;

    // Detect state from polling messages like "Polling... Current state: WAITING"
    const stateMatch = line.message.match(/Current state:\s*(\w+)/);
    if (stateMatch) {
      const detectedState = stateMatch[1];
      card.status = detectedState;
      this.broadcastModuleUpdate(card);
      return;
    }

    // Detect registration start
    if (line.message === "Registering...") {
      card.status = "RUNNING";
      this.broadcastModuleUpdate(card);
      return;
    }

    // Detect module completion
    if (line.message === "Module execution completed") {
      card.status = "FINISHED";
      this.broadcastModuleUpdate(card);
    }
  }

  // ── Launch handler ──────────────────────────────────

  private handleLaunch(rq: express.Request, rs: express.Response): void {
    if (this.executionInFlight) {
      rs.status(409).json({ error: "A plan is already running" });
      return;
    }

    const b = rq.body as Record<string, unknown>;
    const cfgPath = typeof b.configPath === "string" ? b.configPath : null;
    const planId = typeof b.planId === "string" ? b.planId : null;
    const tok = typeof b.token === "string" ? b.token : null;

    if (!cfgPath || !planId || !tok) {
      rs.status(400).json({ error: "configPath, planId, and token are required" });
      return;
    }

    const hostUrl = typeof b.serverUrl === "string" ? b.serverUrl : "https://www.certification.openid.net";
    const pollSec = typeof b.pollInterval === "number" ? b.pollInterval : CONSTANTS.POLL_INTERVAL_SECONDS_DEFAULT;
    const toutSec = typeof b.timeout === "number" ? b.timeout : CONSTANTS.TIMEOUT_SECONDS_DEFAULT;
    const hdls = typeof b.headless === "boolean" ? b.headless : true;

    // Validate numeric parameters
    if (!Number.isFinite(pollSec) || pollSec <= 0) {
      rs.status(400).json({ error: `pollInterval must be a positive number, got: ${b.pollInterval}` });
      return;
    }
    if (!Number.isFinite(toutSec) || toutSec <= 0) {
      rs.status(400).json({ error: `timeout must be a positive number, got: ${b.timeout}` });
      return;
    }

    // Reset for new run
    this.collectedLines = [];
    this.finalOutcome = null;
    this.errorDetail = null;
    this.executionInFlight = true;
    this.stoppedByUser = false;
    this.moduleCards = [];
    this.abortController = new AbortController();
    this.activeApi = null;
    this.activeRunners = [];

    rs.status(202).json({ accepted: true });

    try {
      this.executeConformancePlan(
        nodePath.resolve(process.cwd(), cfgPath),
        planId, tok, hostUrl, pollSec, toutSec, hdls,
      );
    } catch (err) {
      // If executeConformancePlan throws synchronously, reset the flag
      this.executionInFlight = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.errorDetail = msg;
      throw err;
    }
  }

  // ── Stop handler ────────────────────────────────────

  private handleStop(rs: express.Response): void {
    if (!this.executionInFlight) {
      rs.status(409).json({ error: "No execution is currently running" });
      return;
    }

    this.stoppedByUser = true;
    this.executionInFlight = false;
    this.errorDetail = "Stopped by user";

    // Abort the background execution
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Respond immediately, then perform remote cleanup in the background
    rs.json({ stopped: true });

    // Handle remote cleanup errors to prevent unhandled promise rejections
    this.stopRunnersRemotely().catch(err => {
      console.error(`[GUI] Failed to stop runners remotely: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  /**
   * For each active runner:
   *   1. DELETE /api/runner/{runnerId} — stop the test remotely
   *   2. GET /api/info/{runnerId}     — capture the final status
   *   3. Update the corresponding card and broadcast to the frontend
   */
  private async stopRunnersRemotely(): Promise<void> {
    const api = this.activeApi;
    const runners = [...this.activeRunners];
    this.activeRunners = [];

    if (!api || runners.length === 0) {
      // No remote runners to clean up — just update cards locally
      for (const card of this.moduleCards) {
        if (card.status !== "FINISHED") {
          card.status = "INTERRUPTED";
          card.lastMessage = "Stopped by user";
          this.broadcastModuleUpdate(card);
        }
      }
      this.broadcastStopped();
      return;
    }

    for (const { runnerId, moduleName } of runners) {
      const card = this.moduleCards.find((c) => c.name === moduleName);

      try {
        // Step 1 — Delete the runner on the remote server
        await api.deleteRunner(runnerId);
      } catch (err) {
        console.error(`[GUI] Failed to delete runner ${runnerId}: ${err instanceof Error ? err.message : String(err)}`);
      }

      try {
        // Step 2 — Query the remote server for the actual final status
        const info = await api.getModuleInfo(runnerId);
        if (card) {
          card.status = info.status;
          card.result = info.result;
          card.lastMessage = `${info.status} (${info.result})`;
          this.broadcastModuleUpdate(card);
        }
      } catch (err) {
        // If info query fails, fall back to INTERRUPTED
        console.error(`[GUI] Failed to get info for runner ${runnerId}: ${err instanceof Error ? err.message : String(err)}`);
        if (card) {
          card.status = "INTERRUPTED";
          card.lastMessage = "Stopped by user";
          this.broadcastModuleUpdate(card);
        }
      }
    }

    // Mark any remaining non-finished cards that weren't associated with a runner
    for (const card of this.moduleCards) {
      if (card.status !== "FINISHED" && card.status !== "INTERRUPTED") {
        card.status = "INTERRUPTED";
        card.lastMessage = "Stopped by user";
        this.broadcastModuleUpdate(card);
      }
    }

    this.broadcastStopped();
  }

  // ── Background plan execution ───────────────────────

  private executeConformancePlan(
    resolvedCfgPath: string, planId: string, tok: string,
    hostUrl: string, pollSec: number, toutSec: number, hdls: boolean,
  ): void {
    const signal = this.abortController?.signal;

    // Build a logger that feeds into our SSE pipeline
    const logger = createLogger({
      onLine: (severity: string, message: string, context?: LogContext) => {
        if (this.stoppedByUser) return;
        this.broadcastLine({
          severity,
          message,
          moduleName: context?.moduleName ?? null,
          actionName: context?.actionName ?? null,
          at: Date.now(),
        });
      },
      onSummary: (outcome: ExecutionSummary) => {
        if (this.stoppedByUser) return;
        this.finalOutcome = outcome;
        this.executionInFlight = false;
        this.broadcastOutcome(outcome);
      },
    });

    const doWork = async (): Promise<void> => {
      logger.info(`Targeting conformance host "${hostUrl}"`);
      const planCfg = loadConfig(resolvedCfgPath);
      if (planCfg.modules.length === 0) {
        throw new Error("Config contains zero test modules.");
      }
      logger.info(`Plan: ${nodePath.basename(resolvedCfgPath)} [${planId}] – ${planCfg.modules.length} module(s)`);

      // Initialize module cards from config so the dashboard can show them immediately
      this.moduleCards = planCfg.modules.map((m) => ({
        name: m.name,
        status: "PENDING",
        result: "",
        lastMessage: "Waiting to start",
      }));
      this.broadcastModuleList(this.moduleCards);

      const api = new ConformanceApi({ baseUrl: hostUrl, token: tok });
      this.activeApi = api;

      // Wrap registerRunner to track active runner IDs for remote cancellation
      const originalRegister = api.registerRunner.bind(api);
      api.registerRunner = async (planIdArg: string, testName: string, capture?: CaptureContext) => {
        const runnerId = await originalRegister(planIdArg, testName, capture);
        this.activeRunners.push({ runnerId, moduleName: testName });
        return runnerId;
      };

      const runner = new Runner({ api, pollInterval: pollSec, timeout: toutSec, headless: hdls, logger, signal });
      const result = await runner.executePlan({ planId, config: planCfg });

      if (this.stoppedByUser) return;

      // Update cards with final results
      for (const mod of result.modules) {
        const card = this.moduleCards.find((c) => c.name === mod.name);
        if (card) {
          card.status = mod.state;
          card.result = mod.result;
          card.lastMessage = mod.result;
        }
      }

      logger.summary(result);
    };

    doWork().catch((err) => {
      if (this.stoppedByUser) return;
      const msg = err instanceof Error ? err.message : String(err);
      this.errorDetail = msg;
      this.executionInFlight = false;
      logger.error(msg);
    });
  }
}

/** Convenience function matching the CLI's openDashboard style. */
export function openDashboard(port: number): void {
  new OidcAutopilotDashboard(port).boot();
}
