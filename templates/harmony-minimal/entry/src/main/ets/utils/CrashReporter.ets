import { errorManager, businessError } from '@kit.BasicServicesKit';
import { deviceInfo } from '@kit.DeviceInfoKit';
import { http } from '@kit.NetworkKit';
import { systemDateTime } from '@kit.TimeKit';

export class CrashReporter {
  private static initialized: boolean = false;
  private static dsn: string = '';
  private static userId: string = '';
  private static breadcrumbs: string[] = [];
  private static maxBreadcrumbs: number = 100;
  private static reportQueue: CrashReport[] = [];
  private static flushTimer: number | null = null;
  private static flushInterval: number = 10000; // 10 seconds
  private static maxBatchSize: number = 5;
  private static appStartTime: number = 0;

  /**
   * Initialize the crash reporter.
   * Hooks into the error manager to capture uncaught errors.
   * Should be called once at app startup.
   *
   * @param dsn - Optional DSN endpoint for remote error reporting
   */
  static init(dsn?: string): void {
    if (CrashReporter.initialized) {
      return;
    }

    try {
      if (dsn) {
        CrashReporter.dsn = dsn;
      }

      CrashReporter.appStartTime = new Date().getTime();

      // Hook into global error manager for uncaught exceptions
      try {
        errorManager.on('error', (error: businessError.BusinessError) => {
          CrashReporter.reportError(error);
        });
      } catch {
        // errorManager hook not available in all contexts
      }

      // Capture unhandled promise rejections
      try {
        errorManager.on('unhandledRejection', (reason: Error) => {
          CrashReporter.reportError(reason);
        });
      } catch {
        // unhandledRejection hook not available
      }

      CrashReporter.addBreadcrumb('CrashReporter initialized', 'system');
      CrashReporter.initialized = true;
    } catch {
      // Graceful degradation: crash reporter init failed, continue without it
      CrashReporter.initialized = true;
    }
  }

  /**
   * Report an error to the crash reporting system.
   * Collects device info, adds breadcrumbs, and queues for batch sending.
   * Never throws - all errors are caught internally.
   *
   * @param error - The error object or Error instance
   * @param extra - Optional additional context key-value pairs
   */
  static reportError(error: Error | businessError.BusinessError, extra?: Record<string, string>): void {
    try {
      const report: CrashReport = {
        id: CrashReporter.generateId(),
        timestamp: new Date().getTime(),
        message: error.message || 'Unknown error',
        name: error.name || 'Error',
        stack: error.stack || '',
        userId: CrashReporter.userId,
        breadcrumbs: [...CrashReporter.breadcrumbs],
        deviceInfo: CrashReporter.collectDeviceInfo(),
        appInfo: CrashReporter.collectAppInfo(),
        extra: extra || {},
      };

      CrashReporter.reportQueue.push(report);

      // Flush immediately if we have enough reports
      if (CrashReporter.reportQueue.length >= CrashReporter.maxBatchSize) {
        CrashReporter.flush();
      } else {
        // Schedule flush if not already scheduled
        CrashReporter.scheduleFlush();
      }

      // Also log to console for development debugging
      console.error('[CrashReporter]', report.name, report.message);
    } catch {
      // Never throw from the error reporter
    }
  }

  /**
   * Set the current user ID for error attribution.
   *
   * @param userId - The user identifier to associate with errors
   */
  static setUser(userId: string): void {
    try {
      CrashReporter.userId = userId;
      CrashReporter.addBreadcrumb('User set: ' + userId, 'user');
    } catch {
      // Ignore
    }
  }

  /**
   * Add a breadcrumb to the trail of user actions leading up to an error.
   * Oldest breadcrumbs are trimmed when the buffer exceeds maxBreadcrumbs.
   *
   * @param message - The breadcrumb message
   * @param category - Optional category (e.g. 'ui', 'network', 'user', 'system')
   */
  static addBreadcrumb(message: string, category?: string): void {
    try {
      const now = new Date();
      const timeStr = now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0') + ':' +
        now.getSeconds().toString().padStart(2, '0');
      const prefix = category ? '[' + category + ']' : '';
      const crumb = timeStr + ' ' + prefix + ' ' + message;

      CrashReporter.breadcrumbs.push(crumb);

      // Trim oldest breadcrumbs when exceeding max
      if (CrashReporter.breadcrumbs.length > CrashReporter.maxBreadcrumbs) {
        CrashReporter.breadcrumbs.splice(0, CrashReporter.breadcrumbs.length - CrashReporter.maxBreadcrumbs);
      }
    } catch {
      // Ignore breadcrumb failures
    }
  }

  /**
   * Force-flush the report queue, sending all pending reports.
   */
  static flush(): void {
    try {
      if (CrashReporter.reportQueue.length === 0) {
        return;
      }

      // Clear any pending flush timer
      CrashReporter.clearFlushTimer();

      // Take a snapshot of the queue to send
      const batch = CrashReporter.reportQueue.splice(0);

      if (CrashReporter.dsn) {
        CrashReporter.sendToRemote(batch);
      } else {
        CrashReporter.logToConsole(batch);
      }
    } catch {
      // Flush failed, ensure queue is cleared to avoid memory leak
      CrashReporter.reportQueue = [];
    }
  }

  /**
   * Get the number of pending reports in the queue.
   *
   * @returns The number of reports waiting to be sent
   */
  static getPendingCount(): number {
    return CrashReporter.reportQueue.length;
  }

  /**
   * Get a copy of current breadcrumbs for inspection.
   *
   * @returns An array of breadcrumb strings
   */
  static getBreadcrumbs(): string[] {
    return [...CrashReporter.breadcrumbs];
  }

  /**
   * Check if the crash reporter has been initialized.
   *
   * @returns true if initialized, false otherwise
   */
  static isInitialized(): boolean {
    return CrashReporter.initialized;
  }

  /**
   * Clear the breadcrumb buffer.
   */
  static clearBreadcrumbs(): void {
    CrashReporter.breadcrumbs = [];
  }

  /**
   * Collect device information for error context.
   *
   * @returns A record of device info key-value pairs
   */
  private static collectDeviceInfo(): Record<string, string> {
    try {
      return {
        deviceType: deviceInfo.deviceType,
        osFullName: deviceInfo.osFullName,
        osVersion: deviceInfo.osVersion,
        sdkApiVersion: deviceInfo.sdkApiVersion,
        manufacturer: deviceInfo.manufacturer,
        brand: deviceInfo.brand,
        model: deviceInfo.model,
        product: deviceInfo.product,
      };
    } catch {
      return {};
    }
  }

  /**
   * Collect application information for error context.
   *
   * @returns A record of app info key-value pairs
   */
  private static collectAppInfo(): Record<string, string> {
    try {
      const uptime = new Date().getTime() - CrashReporter.appStartTime;
      const uptimeSeconds = Math.floor(uptime / 1000);
      return {
        uptimeMs: uptime.toString(),
        uptimeSeconds: uptimeSeconds.toString(),
      };
    } catch {
      return {};
    }
  }

  /**
   * Generate a unique report ID.
   *
   * @returns A unique string identifier
   */
  private static generateId(): string {
    const timestamp = new Date().getTime().toString(16);
    const random = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
    return timestamp + '-' + random;
  }

  /**
   * Schedule a flush to happen after flushInterval if no other flush is scheduled.
   */
  private static scheduleFlush(): void {
    try {
      if (CrashReporter.flushTimer !== null) {
        return;
      }
      CrashReporter.flushTimer = setTimeout(() => {
        CrashReporter.flushTimer = null;
        CrashReporter.flush();
      }, CrashReporter.flushInterval);
    } catch {
      // Timer scheduling failed, ignore
    }
  }

  /**
   * Clear any pending flush timer.
   */
  private static clearFlushTimer(): void {
    try {
      if (CrashReporter.flushTimer !== null) {
        clearTimeout(CrashReporter.flushTimer);
        CrashReporter.flushTimer = null;
      }
    } catch {
      CrashReporter.flushTimer = null;
    }
  }

  /**
   * Send reports to the remote DSN endpoint via HTTP.
   *
   * @param reports - The batch of crash reports to send
   */
  private static sendToRemote(reports: CrashReport[]): void {
    try {
      const http: http.HttpRequest = new http.HttpRequest();
      const url: string = CrashReporter.dsn + '/api/crash';

      const requestBody: string = JSON.stringify({
        reports: reports,
        sentAt: new Date().toISOString(),
      });

      http.open('POST', url);
      http.setRequestHeader('Content-Type', 'application/json');
      http.send(requestBody);

      http.on('headersReceive', () => {
        CrashReporter.addBreadcrumb('Reports sent to remote: ' + reports.length, 'network');
      });

      http.on('error', () => {
        // Remote send failed, restore reports to queue if possible
        CrashReporter.addBreadcrumb('Failed to send reports to remote', 'network');
      });
    } catch {
      CrashReporter.addBreadcrumb('Exception sending reports to remote', 'network');
    }
  }

  /**
   * Log reports to the console as a fallback when no DSN is configured.
   *
   * @param reports - The batch of crash reports to log
   */
  private static logToConsole(reports: CrashReport[]): void {
    try {
      for (let i = 0; i < reports.length; i++) {
        const report = reports[i];
        console.error('=== CrashReporter Report ===');
        console.error('ID:', report.id);
        console.error('Timestamp:', new Date(report.timestamp).toISOString());
        console.error('Name:', report.name);
        console.error('Message:', report.message);
        console.error('Stack:', report.stack);

        if (report.userId) {
          console.error('User ID:', report.userId);
        }

        if (report.breadcrumbs.length > 0) {
          console.error('Breadcrumbs:');
          for (let j = 0; j < report.breadcrumbs.length; j++) {
            console.error('  ', report.breadcrumbs[j]);
          }
        }

        const deviceKeys = Object.keys(report.deviceInfo);
        if (deviceKeys.length > 0) {
          console.error('Device Info:');
          for (let j = 0; j < deviceKeys.length; j++) {
            const key = deviceKeys[j];
            console.error('  ' + key + ':', report.deviceInfo[key]);
          }
        }

        const extraKeys = Object.keys(report.extra);
        if (extraKeys.length > 0) {
          console.error('Extra:');
          for (let j = 0; j < extraKeys.length; j++) {
            const key = extraKeys[j];
            console.error('  ' + key + ':', report.extra[key]);
          }
        }

        console.error('========================');
      }
    } catch {
      // Console logging failed
    }
  }
}

/**
 * Structure representing a single crash report.
 */
interface CrashReport {
  id: string;
  timestamp: number;
  message: string;
  name: string;
  stack: string;
  userId: string;
  breadcrumbs: string[];
  deviceInfo: Record<string, string>;
  appInfo: Record<string, string>;
  extra: Record<string, string>;
}
