import {
  ModuleExecutionError,
  ActionExecutionError,
  StateTimeoutError,
  BrowserNavigationError,
} from './errors';

describe('Custom Errors', () => {
  describe('ModuleExecutionError', () => {
    it('should include module name and state in message', () => {
      const error = new ModuleExecutionError(
        'test-module',
        'WAITING',
        'Something went wrong'
      );

      expect(error.message).toContain('[test-module]');
      expect(error.message).toContain('Something went wrong');
      expect(error.moduleName).toBe('test-module');
      expect(error.state).toBe('WAITING');
      expect(error.name).toBe('ModuleExecutionError');
    });

    it('should preserve cause chain', () => {
      const rootCause = new Error('Root error');
      const error = new ModuleExecutionError(
        'test-module',
        'FAILED',
        'Wrapped error',
        rootCause
      );

      expect(error.cause).toBe(rootCause);
      expect(error.message).toContain('Wrapped error');
    });

    it('should work without cause', () => {
      const error = new ModuleExecutionError(
        'test-module',
        'RUNNING',
        'Error without cause'
      );

      expect(error.cause).toBeUndefined();
      expect(error.message).toContain('Error without cause');
    });

    it('should have proper stack trace', () => {
      const error = new ModuleExecutionError(
        'test-module',
        'WAITING',
        'Test error'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ModuleExecutionError');
    });
  });

  describe('ActionExecutionError', () => {
    it('should include action name and type in message', () => {
      const error = new ActionExecutionError(
        'login',
        'api',
        'Request failed'
      );

      expect(error.message).toContain('[login:api]');
      expect(error.message).toContain('Request failed');
      expect(error.actionName).toBe('login');
      expect(error.actionType).toBe('api');
      expect(error.name).toBe('ActionExecutionError');
    });

    it('should preserve cause chain', () => {
      const rootCause = new Error('Network error');
      const error = new ActionExecutionError(
        'submit-form',
        'browser',
        'Navigation failed',
        rootCause
      );

      expect(error.cause).toBe(rootCause);
      expect(error.actionName).toBe('submit-form');
      expect(error.actionType).toBe('browser');
    });

    it('should work without cause', () => {
      const error = new ActionExecutionError(
        'test-action',
        'api',
        'Action failed'
      );

      expect(error.cause).toBeUndefined();
    });

    it('should have proper stack trace', () => {
      const error = new ActionExecutionError(
        'test-action',
        'api',
        'Test error'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ActionExecutionError');
    });
  });

  describe('StateTimeoutError', () => {
    it('should include timeout details in message', () => {
      const error = new StateTimeoutError('runner-123', 'RUNNING', 60000);

      expect(error.message).toContain('runner-123');
      expect(error.message).toContain('60000ms');
      expect(error.message).toContain('RUNNING');
      expect(error.runnerId).toBe('runner-123');
      expect(error.lastState).toBe('RUNNING');
      expect(error.timeoutMs).toBe(60000);
      expect(error.name).toBe('StateTimeoutError');
    });

    it('should work with different states', () => {
      const error = new StateTimeoutError('runner-456', 'WAITING', 30000);

      expect(error.message).toContain('WAITING');
      expect(error.lastState).toBe('WAITING');
      expect(error.timeoutMs).toBe(30000);
    });

    it('should have proper stack trace', () => {
      const error = new StateTimeoutError('runner-123', 'RUNNING', 60000);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('StateTimeoutError');
    });
  });

  describe('BrowserNavigationError', () => {
    it('should include URL in message', () => {
      const error = new BrowserNavigationError(
        'https://example.com',
        'Timeout'
      );

      expect(error.message).toContain('https://example.com');
      expect(error.message).toContain('Timeout');
      expect(error.url).toBe('https://example.com');
      expect(error.name).toBe('BrowserNavigationError');
    });

    it('should preserve cause chain', () => {
      const rootCause = new Error('Network timeout');
      const error = new BrowserNavigationError(
        'https://example.com/auth',
        'Page load failed',
        rootCause
      );

      expect(error.cause).toBe(rootCause);
      expect(error.url).toBe('https://example.com/auth');
    });

    it('should work without cause', () => {
      const error = new BrowserNavigationError(
        'https://example.com',
        'Navigation failed'
      );

      expect(error.cause).toBeUndefined();
    });

    it('should have proper stack trace', () => {
      const error = new BrowserNavigationError(
        'https://example.com',
        'Test error'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('BrowserNavigationError');
    });
  });

  describe('Error inheritance', () => {
    it('should be instances of Error', () => {
      const moduleError = new ModuleExecutionError('test', 'FAILED', 'msg');
      const actionError = new ActionExecutionError('test', 'api', 'msg');
      const timeoutError = new StateTimeoutError('test', 'RUNNING', 1000);
      const navError = new BrowserNavigationError('http://test', 'msg');

      expect(moduleError).toBeInstanceOf(Error);
      expect(actionError).toBeInstanceOf(Error);
      expect(timeoutError).toBeInstanceOf(Error);
      expect(navError).toBeInstanceOf(Error);
    });

    it('should be catchable with try-catch', () => {
      expect(() => {
        throw new ModuleExecutionError('test', 'FAILED', 'msg');
      }).toThrow(ModuleExecutionError);

      expect(() => {
        throw new ActionExecutionError('test', 'api', 'msg');
      }).toThrow(ActionExecutionError);

      expect(() => {
        throw new StateTimeoutError('test', 'RUNNING', 1000);
      }).toThrow(StateTimeoutError);

      expect(() => {
        throw new BrowserNavigationError('http://test', 'msg');
      }).toThrow(BrowserNavigationError);
    });
  });
});
