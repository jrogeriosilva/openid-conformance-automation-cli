import express from "express";
import nodePath from "node:path";
import fs from "node:fs";
import { config as loadEnv } from "dotenv";
import { createLogger, type LogContext } from "../core/logger";
import { loadConfig } from "../config/loadConfig";
import { ConformanceApi } from "../core/conformanceApi";
import { Runner } from "../core/runner";
import { CONSTANTS } from "../core/constants";
import { buildPage } from "./pageBuilder";
import type { ExecutionSummary } from "../core/types";

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

  constructor(private readonly listenPort: number) {
    this.expressApp.use(express.json());
    this.registerRoutes();
  }

  /** Start listening for HTTP connections. */
  boot(): void {
    this.expressApp.listen(this.listenPort, () => {
      console.log(`\n  OIDC Autopilot Dashboard → http://localhost:${this.listenPort}\n`);
    });
  }

  // ── Route registration ──────────────────────────────

  private registerRoutes(): void {
    this.expressApp.get("/", (_rq, rs) => {
      const envDefaults = readEnvDefaults();
      const configFiles = discoverConfigFiles();
      rs.type("html").send(buildPage(envDefaults, configFiles));
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

    this.expressApp.post("/api/launch", (rq, rs) => {
      this.handleLaunch(rq, rs);
    });

    this.expressApp.post("/api/stop", (_rq, rs) => {
      this.handleStop(rs);
    });
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
    const wire = `event: stopped\ndata: {}\n\n`;
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

    // Reset for new run
    this.collectedLines = [];
    this.finalOutcome = null;
    this.errorDetail = null;
    this.executionInFlight = true;
    this.stoppedByUser = false;
    this.moduleCards = [];

    rs.status(202).json({ accepted: true });

    const hostUrl = typeof b.serverUrl === "string" ? b.serverUrl : "https://www.certification.openid.net";
    const pollSec = typeof b.pollInterval === "number" ? b.pollInterval : CONSTANTS.POLL_INTERVAL_SECONDS_DEFAULT;
    const toutSec = typeof b.timeout === "number" ? b.timeout : CONSTANTS.TIMEOUT_SECONDS_DEFAULT;
    const hdls = typeof b.headless === "boolean" ? b.headless : true;

    this.executeConformancePlan(
      nodePath.resolve(process.cwd(), cfgPath),
      planId, tok, hostUrl, pollSec, toutSec, hdls,
    );
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

    // Mark all non-finished cards as interrupted
    for (const card of this.moduleCards) {
      if (card.status !== "FINISHED") {
        card.status = "INTERRUPTED";
        card.lastMessage = "Stopped by user";
      }
    }

    this.broadcastStopped();
    rs.json({ stopped: true });
  }

  // ── Background plan execution ───────────────────────

  private executeConformancePlan(
    resolvedCfgPath: string, planId: string, tok: string,
    hostUrl: string, pollSec: number, toutSec: number, hdls: boolean,
  ): void {
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
      const runner = new Runner({ api, pollInterval: pollSec, timeout: toutSec, headless: hdls, logger });
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
