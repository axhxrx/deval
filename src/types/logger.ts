/**
 Available log levels for the application
 Standard levels + app-specific ones
 */
export const LOG_LEVELS = [
  'DEBUG',
  'INFO',
  'WARNING',
  'ERROR',
  // App-specific levels for tracking progress
  'COMPLETED_FILE',
  'COMPLETED_GROUP',
  // API-specific levels with special behavior
  'API_REQUEST',
  'API_RESPONSE',
] as const;

/**
 Log level type derived from the array
 */
export type LogLevel = typeof LOG_LEVELS[number];

/**
 Structured log entry
 */
export interface LogEntry
{
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

/**
 Additional context for log entries

 Used especially for COMPLETED_FILE and COMPLETED_GROUP logs
 */
export interface LogContext
{
  fileName?: string;
  groupName?: string;
  csvData?: Record<string, unknown>;
  pdfMetadata?: Record<string, unknown>;
  processingTime?: number;
  [key: string]: unknown;
}

/**
 Console color codes for different log levels
 */
export const LOG_COLORS: Record<LogLevel, string> = {
  DEBUG: '\x1b[90m', // Gray
  INFO: '\x1b[36m', // Cyan
  WARNING: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  COMPLETED_FILE: '\x1b[32m', // Green
  COMPLETED_GROUP: '\x1b[35m', // Magenta
  API_REQUEST: '\x1b[34m', // Blue
  API_RESPONSE: '\x1b[34m', // Blue
};

/**
 Reset color code for console output
 */
export const COLOR_RESET = '\x1b[0m';

/**
 Multi-level log level shortcuts
 */
export const MULTI_LOG_LEVELS = ['DEFAULT', 'VERBOSE'] as const;

/**
 Multi-level log level type
 */
export type MultiLogLevel = typeof MULTI_LOG_LEVELS[number];

/**
 Mapping of multi-level shortcuts to actual log levels
 */
export const MULTI_LOG_LEVEL_MAP: Record<MultiLogLevel, LogLevel[]> = {
  DEFAULT: ['INFO', 'WARNING', 'ERROR', 'COMPLETED_FILE', 'COMPLETED_GROUP'],
  VERBOSE: [...LOG_LEVELS], // All log levels
};
