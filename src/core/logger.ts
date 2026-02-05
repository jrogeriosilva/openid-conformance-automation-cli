import type { ExecutionSummary } from "./types";

/**
 * Contextual information for structured logging.
 * Allows tracing execution flow across modules, actions, and states.
 */
export interface LogContext {
  correlationId?: string;
  moduleName?: string;
  actionName?: string;
  state?: string;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  log(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  summary(summary: ExecutionSummary): void;
}

export const createLogger = (): Logger => {
  const formatMessage = (message: string, context?: LogContext): string => {
    if (!context) {
      return message;
    }

    const parts: string[] = [];

    // Only show module name (don't repeat correlation ID which contains module name)
    if (context.moduleName) {
      parts.push(context.moduleName);
    }

    // Only show action name when relevant (not for every log)
    if (context.actionName) {
      parts.push(context.actionName);
    }

    // Don't show state in regular logs (only in debug mode)

    if (parts.length === 0) {
      return message;
    }

    const prefix = `[${parts.join(':')}]`;
    return `${prefix} ${message}`;
  };

  const formatDebugMessage = (message: string, context?: LogContext): string => {
    if (!context) {
      return message;
    }

    const parts: string[] = [];

    // In debug mode, show more details including correlation ID and state
    if (context.correlationId) {
      // Extract just the timestamp portion from correlation ID for brevity
      const shortId = context.correlationId.split('-').pop() || context.correlationId;
      parts.push(shortId);
    }
    if (context.moduleName) {
      parts.push(context.moduleName);
    }
    if (context.state) {
      parts.push(context.state);
    }
    if (context.actionName) {
      parts.push(context.actionName);
    }

    if (parts.length === 0) {
      return message;
    }

    const prefix = `[${parts.join(':')}]`;
    return `${prefix} ${message}`;
  };

  return {
    info: (message, context) => console.log(`[INFO]: ${formatMessage(message, context)}`),
    log: (message, context) => console.log(formatMessage(message, context)),
    error: (message, context) => console.error(`[ERROR]: ${formatMessage(message, context)}`),
    debug: (message, context) => {
      if (process.env.DEBUG) {
        console.debug(`[DEBUG]: ${formatDebugMessage(message, context)}`);
      }
    },
    summary: (summary) => {
      console.log("");
      console.log("--- EXECUTION SUMMARY ---");
      console.log(`Total Modules: ${summary.total}`);
      console.log(`PASS: ${summary.passed}`);
      console.log(`FAIL: ${summary.failed}`);
      if (summary.warning > 0) {
        console.log(`WARNING: ${summary.warning}`);
      }
      console.log(`SKIPPED/INTERRUPTED: ${summary.skipped + summary.interrupted}`);
      console.log("-".repeat(40));
    },
  };
};
