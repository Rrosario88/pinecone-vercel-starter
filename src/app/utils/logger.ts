/**
 * Simple logging utility for consistent logging across the application.
 *
 * Log levels are controlled by LOG_LEVEL environment variable:
 * - 'debug': All logs (debug, info, warn, error)
 * - 'info': Info and above (info, warn, error)
 * - 'warn': Warnings and errors only
 * - 'error': Errors only
 * - 'silent': No logging
 *
 * Default is 'info' in production, 'debug' in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel;
  }
  // Default: debug in development, info in production
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  // In production, format as JSON for better log aggregation
  if (process.env.NODE_ENV === 'production') {
    const logData = {
      timestamp,
      level,
      message,
      data: args.length > 0 ? args : undefined,
    };
    return JSON.stringify(logData);
  }

  return `${prefix} ${message}`;
}

export const logger = {
  /**
   * Debug-level logging. Only shown in development or when LOG_LEVEL=debug.
   */
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message), ...args);
    }
  },

  /**
   * Info-level logging. General operational information.
   */
  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message), ...args);
    }
  },

  /**
   * Warning-level logging. Potentially harmful situations.
   */
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },

  /**
   * Error-level logging. Error events.
   */
  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message), ...args);
    }
  },
};

export default logger;
