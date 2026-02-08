import { Command } from "commander";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { loadConfig } from "./config/loadConfig";
import { ConformanceApi } from "./core/conformanceApi";
import { Runner } from "./core/runner";
import { createLogger } from "./core/logger";
import { CONSTANTS } from "./core/constants";

const DEFAULT_SERVER = "https://www.certification.openid.net";

export const runCli = async (): Promise<void> => {
  loadEnv();

  const program = new Command();
  program
    .name("auto-conformance-cli")
    .description("Automate OpenID conformance suite tests")
    .option("-c, --config <path>", "Path to config JSON file")
    .option("-p, --plan-id <id>", "Conformance plan id")
    .option("-s, --base-url <url>", "Conformance server base URL")
    .option("-t, --token <token>", "Bearer token for API")
    .option(
      "--poll-interval <seconds>",
      "Polling interval in seconds",
      String(CONSTANTS.POLL_INTERVAL_SECONDS_DEFAULT)
    )
    .option(
      "--timeout <seconds>",
      "Polling timeout in seconds",
      String(CONSTANTS.TIMEOUT_SECONDS_DEFAULT)
    )
    .option("--no-headless", "Run Playwright with a visible browser")
    .parse(process.argv);

  const options = program.opts();

  const configPath = options.config
    ? path.resolve(process.cwd(), options.config)
    : undefined;
  if (!configPath) {
    console.error("[ERROR]: --config is required");
    process.exit(1);
  }

  const planId = options.planId ?? process.env.CONFORMANCE_PLAN_ID;
  if (!planId) {
    console.error("[ERROR]: --plan-id or CONFORMANCE_PLAN_ID is required");
    process.exit(1);
  }

  const token = options.token ?? process.env.CONFORMANCE_TOKEN;
  if (!token) {
    console.error("[ERROR]: --token or CONFORMANCE_TOKEN is required");
    process.exit(1);
  }

  const baseUrl = options.baseUrl ?? process.env.CONFORMANCE_SERVER ?? DEFAULT_SERVER;
  const pollInterval = Number(options.pollInterval);
  const timeout = Number(options.timeout);
  const headless = Boolean(options.headless);

  // Validate numeric parameters
  if (!Number.isFinite(pollInterval) || pollInterval <= 0) {
    console.error(`[ERROR]: --poll-interval must be a positive number, got: ${options.pollInterval}`);
    process.exit(1);
  }
  if (!Number.isFinite(timeout) || timeout <= 0) {
    console.error(`[ERROR]: --timeout must be a positive number, got: ${options.timeout}`);
    process.exit(1);
  }

  const logger = createLogger();
  logger.info(`Connecting to server: "${baseUrl}"`);

  const planConfig = loadConfig(configPath);
  if (planConfig.modules.length === 0) {
    console.error("[ERROR]: No test modules found in configuration file.");
    process.exit(1);
  }

  logger.info(`Test Plan: ${path.basename(configPath)} (ID: ${planId})`);
  logger.info(`Modules to run: ${planConfig.modules.length}`);

  const api = new ConformanceApi({ baseUrl, token });
  const runner = new Runner({
    api,
    pollInterval,
    timeout,
    headless,
    logger,
  });

  try {
    const summary = await runner.executePlan({
      planId,
      config: planConfig,
    });

    logger.summary(summary);

    if (summary.failed > 0 || summary.interrupted > 0) {
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR]: ${message}`);
    process.exit(1);
  }
};
