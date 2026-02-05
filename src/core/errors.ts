/**
 * Custom error classes for better error context and debugging.
 * These errors preserve cause chains and provide contextual information
 * about which module, action, or state the error occurred in.
 */

/**
 * Error thrown when a test module execution fails.
 * Includes context about which module failed and what state it was in.
 */
export class ModuleExecutionError extends Error {
  constructor(
    public readonly moduleName: string,
    public readonly state: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`[${moduleName}] ${message}`);
    this.name = 'ModuleExecutionError';

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ModuleExecutionError);
    }
  }
}

/**
 * Error thrown when an action execution fails.
 * Includes context about which action failed and what type it was.
 */
export class ActionExecutionError extends Error {
  constructor(
    public readonly actionName: string,
    public readonly actionType: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`[${actionName}:${actionType}] ${message}`);
    this.name = 'ActionExecutionError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ActionExecutionError);
    }
  }
}

/**
 * Error thrown when state polling times out.
 * Includes context about which runner timed out and what state it was in.
 */
export class StateTimeoutError extends Error {
  constructor(
    public readonly runnerId: string,
    public readonly lastState: string,
    public readonly timeoutMs: number
  ) {
    super(`Module ${runnerId} timed out after ${timeoutMs}ms in state ${lastState}`);
    this.name = 'StateTimeoutError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StateTimeoutError);
    }
  }
}

/**
 * Error thrown when browser navigation fails.
 * Includes context about which URL failed to load.
 */
export class BrowserNavigationError extends Error {
  constructor(
    public readonly url: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`Browser navigation failed for ${url}: ${message}`);
    this.name = 'BrowserNavigationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BrowserNavigationError);
    }
  }
}
