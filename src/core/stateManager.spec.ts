import { StateManager } from './stateManager';
import { StateTimeoutError } from './errors';
import type { ConformanceApi } from './conformanceApi';
import type { Logger } from './logger';

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockApi: jest.Mocked<ConformanceApi>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockApi = {
      getModuleInfo: jest.fn(),
      getRunnerInfo: jest.fn(),
      getModuleLogs: jest.fn(),
      registerRunner: jest.fn(),
      startModule: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      summary: jest.fn(),
    } as any;

    stateManager = new StateManager(mockApi, 0.1, 5, mockLogger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('pollUntilTerminal', () => {
    it('should poll until FINISHED state', async () => {
      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'CREATED', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'CONFIGURED', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'RUNNING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'FINISHED', result: 'PASSED' } as any);

      const result = await stateManager.pollUntilTerminal(
        'test-runner-id',
        [],
        {},
        {}
      );

      expect(result.state).toBe('FINISHED');
      expect(result.info.result).toBe('PASSED');
      expect(mockApi.getModuleInfo).toHaveBeenCalledTimes(4);
    });

    it('should poll until INTERRUPTED state', async () => {
      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'RUNNING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'INTERRUPTED', result: 'FAILED' } as any);

      const result = await stateManager.pollUntilTerminal(
        'test-runner-id',
        [],
        {},
        {}
      );

      expect(result.state).toBe('INTERRUPTED');
      expect(result.info.result).toBe('FAILED');
      expect(mockApi.getModuleInfo).toHaveBeenCalledTimes(2);
    });

    it('should call navigation handler on WAITING state', async () => {
      const onNavigate = jest.fn().mockResolvedValue(true);

      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'WAITING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'FINISHED', result: 'PASSED' } as any);

      mockApi.getRunnerInfo.mockResolvedValue({
        browser: { urls: ['https://example.com'], urlsWithMethod: [] },
      } as any);

      await stateManager.pollUntilTerminal(
        'test-runner-id',
        [],
        {},
        { onNavigate }
      );

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(mockApi.getRunnerInfo).toHaveBeenCalledWith('test-runner-id', {
        captureVars: [],
        store: {},
      });
    });

    it('should call navigation handler only once', async () => {
      const onNavigate = jest.fn().mockResolvedValue(true);

      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'WAITING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'WAITING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'FINISHED', result: 'PASSED' } as any);

      mockApi.getRunnerInfo.mockResolvedValue({
        browser: { urls: ['https://example.com'], urlsWithMethod: [] },
      } as any);

      await stateManager.pollUntilTerminal(
        'test-runner-id',
        [],
        {},
        { onNavigate }
      );

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('should call action handler after navigation', async () => {
      const onNavigate = jest.fn().mockResolvedValue(true);
      const onExecuteActions = jest.fn().mockResolvedValue(undefined);

      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'WAITING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'FINISHED', result: 'PASSED' } as any);

      mockApi.getRunnerInfo.mockResolvedValue({
        browser: { urls: ['https://example.com'], urlsWithMethod: [] },
      } as any);

      await stateManager.pollUntilTerminal(
        'test-runner-id',
        [],
        {},
        { onNavigate, onExecuteActions }
      );

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onExecuteActions).toHaveBeenCalledTimes(1);
      expect(onExecuteActions).toHaveBeenCalledWith(expect.any(Set));
    });

    it('should call action handler multiple times until terminal', async () => {
      const onNavigate = jest.fn().mockResolvedValue(true);
      const onExecuteActions = jest.fn().mockResolvedValue(undefined);

      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'WAITING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'WAITING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'FINISHED', result: 'PASSED' } as any);

      mockApi.getRunnerInfo.mockResolvedValue({
        browser: { urls: ['https://example.com'], urlsWithMethod: [] },
      } as any);

      await stateManager.pollUntilTerminal(
        'test-runner-id',
        [],
        {},
        { onNavigate, onExecuteActions }
      );

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onExecuteActions).toHaveBeenCalledTimes(2);
    });

    it('should not call navigation handler if not provided', async () => {
      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'WAITING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'FINISHED', result: 'PASSED' } as any);

      await stateManager.pollUntilTerminal(
        'test-runner-id',
        [],
        {},
        {}
      );

      expect(mockApi.getRunnerInfo).not.toHaveBeenCalled();
    });

    it('should not call action handler if navigation returns false', async () => {
      const onNavigate = jest.fn().mockResolvedValue(false);
      const onExecuteActions = jest.fn().mockResolvedValue(undefined);

      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'WAITING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'FINISHED', result: 'PASSED' } as any);

      mockApi.getRunnerInfo.mockResolvedValue({
        browser: { urls: [], urlsWithMethod: [] },
      } as any);

      await stateManager.pollUntilTerminal(
        'test-runner-id',
        [],
        {},
        { onNavigate, onExecuteActions }
      );

      // Navigation returned false (no URL), so actions should not execute
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onExecuteActions).not.toHaveBeenCalled();
    });

    it('should throw StateTimeoutError on timeout', async () => {
      mockApi.getModuleInfo.mockResolvedValue({
        status: 'RUNNING',
        result: 'UNKNOWN',
      } as any);

      const shortTimeout = new StateManager(mockApi, 0.01, 0.1, mockLogger);

      const error = await shortTimeout
        .pollUntilTerminal('test-runner-id', [], {}, {})
        .catch((err) => err);

      expect(error).toBeInstanceOf(StateTimeoutError);
      expect(error).toMatchObject({
        runnerId: 'test-runner-id',
        lastState: 'RUNNING',
        timeoutMs: 100,
      });
    });

    it('should capture variables from module info', async () => {
      const captured: Record<string, string> = {};

      mockApi.getModuleInfo
        .mockResolvedValueOnce({
          status: 'RUNNING',
          result: 'UNKNOWN',
          testId: 'test-123',
        } as any)
        .mockResolvedValueOnce({
          status: 'FINISHED',
          result: 'PASSED',
          testId: 'test-123',
        } as any);

      await stateManager.pollUntilTerminal(
        'test-runner-id',
        ['testId'],
        captured,
        {}
      );

      expect(captured.testId).toBe('test-123');
    });

    it('should log state transitions with context', async () => {
      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'CREATED', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'FINISHED', result: 'PASSED' } as any);

      await stateManager.pollUntilTerminal(
        'test-runner-id',
        [],
        {},
        {},
        { correlationId: 'test-123', moduleName: 'test-module' }
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Polling... State: CREATED',
        expect.objectContaining({
          correlationId: 'test-123',
          moduleName: 'test-module',
          state: 'CREATED',
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Polling... State: FINISHED',
        expect.objectContaining({
          correlationId: 'test-123',
          moduleName: 'test-module',
          state: 'FINISHED',
        })
      );
    });

    it('should capture variables from runner info during navigation', async () => {
      const captured: Record<string, string> = {};
      const onNavigate = jest.fn().mockResolvedValue(true);

      mockApi.getModuleInfo
        .mockResolvedValueOnce({ status: 'WAITING', result: 'UNKNOWN' } as any)
        .mockResolvedValueOnce({ status: 'FINISHED', result: 'PASSED' } as any);

      mockApi.getRunnerInfo.mockResolvedValue({
        browser: { urls: ['https://example.com'], urlsWithMethod: [] },
        authCode: 'ABC123',
      } as any);

      await stateManager.pollUntilTerminal(
        'test-runner-id',
        ['authCode'],
        captured,
        { onNavigate }
      );

      expect(captured.authCode).toBe('ABC123');
    });
  });
});
