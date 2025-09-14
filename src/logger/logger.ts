import { formatDateForFilenameSuffix, writeNewFile, WriteNewOptions } from '@axhxrx/write-new-file';
import { ensureDir } from '@std/fs';
import { join } from '@std/path';
import { LOG_LEVELS, type LogContext, type LogEntry, type LogLevel, MULTI_LOG_LEVEL_MAP, MULTI_LOG_LEVELS,
  type MultiLogLevel } from '../types/logger.ts';
import { formatConsoleOutput, formatFileContent, formatSubLoggerLine, generateLogFilename } from './formatter.ts';
import { SubLoggerManager } from './SubLoggerManager.ts';

/**
 Metadata needed to resume a suspended logger
 */
export interface LoggerSuspensionMetadata
{
  operationName: string;
  partNumber: number;
}

/**
 Static logger class.

 Writes each log entry to both console and individual files
 */
export class Logger
{
  private static sessionDir: string | null = null;
  private static isInitialized = false;
  private static enabledLevels: Set<LogLevel> = new Set(MULTI_LOG_LEVEL_MAP.DEFAULT);
  private static apiLogDir: string | null = null;
  private static sessionTimestamp: string | null = null;

  // Instance properties for sub-logging
  private operationName?: string;
  private logs: LogEntry[] = [];
  private startTime?: Date;
  private finalized = false;
  private isSubLogger = false;
  private partNumber: number = 1;

  /**
   Constructor for sub-logger mode

   @param operationName - Name of the operation for the log filename
   */
  constructor(operationName: string)
  {
    this.operationName = operationName;
    this.startTime = new Date();
    this.logs = [];
    this.isSubLogger = true;
    this.finalized = false;

    // Register for cleanup
    SubLoggerManager.register(this);
  }

  /**
   Initialize the logger system - MUST be called at app startup before any logging

   Creates a timestamped directory for this CLI run
   */
  static async initialize(): Promise<void>
  {
    if (this.isInitialized) return;

    this.sessionTimestamp = formatDateForFilenameSuffix(new Date());
    this.sessionDir = join('logs', this.sessionTimestamp);

    // Create the session directory
    await ensureDir(this.sessionDir);

    // Create API log subdirectory
    this.apiLogDir = join(this.sessionDir, 'api');
    await ensureDir(this.apiLogDir);

    // Configure write-new-file to use our session directory
    WriteNewOptions.default = {
      outputDirectory: this.sessionDir,
    };

    this.isInitialized = true;

    // Log the session start directly
    console.log(formatConsoleOutput({
      level: 'INFO',
      message: `Logger session initialized: ${this.sessionTimestamp}`,
      timestamp: new Date(),
    }));
  }

  /**
   Set the enabled log levels
   */
  static setLogLevels(levels: string | string[]): void
  {
    const levelArray = typeof levels === 'string' ? levels.split(',').map((l) => l.trim()) : levels;
    const validLevels = new Set<LogLevel>();

    for (const level of levelArray)
    {
      const upperLevel = level.toUpperCase();

      // Check if it's a multi-level shortcut
      if (MULTI_LOG_LEVELS.includes(upperLevel as MultiLogLevel))
      {
        const multiLevel = upperLevel as MultiLogLevel;
        for (const logLevel of MULTI_LOG_LEVEL_MAP[multiLevel])
        {
          validLevels.add(logLevel);
        }
      }
      // Check if it's a regular log level
      else if (LOG_LEVELS.includes(upperLevel as LogLevel))
      {
        validLevels.add(upperLevel as LogLevel);
      }
      else
      {
        console.warn(`Invalid log level: ${level}. Skipping.`);
      }
    }

    if (validLevels.size > 0)
    {
      this.enabledLevels = validLevels;
    }
    else
    {
      console.warn(
        'No valid log levels provided. Using DEFAULT: INFO, WARNING, ERROR, COMPLETED_FILE, COMPLETED_GROUP',
      );
      this.enabledLevels = new Set(MULTI_LOG_LEVEL_MAP.DEFAULT);
    }
  }

  /**
   Check if a log entry should be displayed based on enabled levels
   */
  private static shouldLog(level: LogLevel): boolean
  {
    return this.enabledLevels.has(level);
  }

  /**
   Write a log entry to file
   */
  private static async writeLogEntry(fullEntry: LogEntry): Promise<void>
  {
    if (!this.isInitialized)
    {
      console.warn('Logger not initialized, skipping file write');
      return;
    }

    const filename = generateLogFilename(fullEntry);
    const content = formatFileContent(fullEntry);

    try
    {
      // Write to appropriate directory based on log level
      if (fullEntry.level === 'API_REQUEST' || fullEntry.level === 'API_RESPONSE')
      {
        const apiOptions = { outputDirectory: this.apiLogDir! };
        await writeNewFile(filename, content, apiOptions);
      }
      else
      {
        await writeNewFile(filename, content);
      }
    }
    catch (error)
    {
      // If file writing fails, at least show it in console
      console.error(`Failed to write log file: ${error}`);
    }
  }

  /**
   Core static logging method
   */
  private static async logStatic(entry: Omit<LogEntry, 'timestamp'>): Promise<void>
  {
    // Check if we should log this level
    if (!this.shouldLog(entry.level))
    {
      return;
    }

    // Create the full entry with timestamp
    const fullEntry: LogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // Always output to console
    if (fullEntry.level === 'API_REQUEST' || fullEntry.level === 'API_RESPONSE')
    {
      const filename = generateLogFilename(fullEntry);
      const filePath = this.apiLogDir ? join(this.apiLogDir, filename) : filename;
      console.log(formatConsoleOutput({
        ...fullEntry,
        message: `${fullEntry.message} → ${filePath}`,
      }));
    }
    else
    {
      console.log(formatConsoleOutput(fullEntry));
    }

    // Write to file if initialized
    if (this.isInitialized)
    {
      await this.writeLogEntry(fullEntry);
    }
  }

  /**
   Core instance logging method — outputs to console and collects in memory
   */
  private log(entry: Omit<LogEntry, 'timestamp'> & { timestamp?: Date }): void
  {
    // Check if we should log this level
    if (!Logger.shouldLog(entry.level))
    {
      return;
    }

    // Create the full entry with timestamp defaulted to now
    const fullEntry: LogEntry = {
      ...entry,
      timestamp: entry.timestamp ?? new Date(),
    };

    // Always output to console (same for both static and instance)
    if (fullEntry.level === 'API_REQUEST' || fullEntry.level === 'API_RESPONSE')
    {
      const filename = generateLogFilename(fullEntry);
      const filePath = Logger.apiLogDir ? join(Logger.apiLogDir, filename) : filename;
      console.log(formatConsoleOutput({
        ...fullEntry,
        message: `${fullEntry.message} → ${filePath}`,
      }));
    }
    else
    {
      console.log(formatConsoleOutput(fullEntry));
    }

    if (this.isSubLogger)
    {
      // Sub-logger: collect in memory
      if (this.finalized)
      {
        throw new Error('Cannot log to finalized sub-logger');
      }
      this.logs.push(fullEntry);
    }
  }

  /**
   Log a debug message (static)
   */
  static async debug(message: string, context?: LogContext): Promise<void>
  {
    await this.logStatic({
      level: 'DEBUG',
      message,
      context,
    });
  }

  /**
   Log a debug message (instance)
   */
  debug(message: string, context?: LogContext): void
  {
    this.log({
      level: 'DEBUG',
      message,
      context,
    });
  }

  /**
   Log an info message (static)
   */
  static async info(message: string, context?: LogContext): Promise<void>
  {
    await this.logStatic({
      level: 'INFO',
      message,
      context,
    });
  }

  /**
   Log an info message (instance)
   */
  info(message: string, context?: LogContext): void
  {
    this.log({
      level: 'INFO',
      message,
      context,
    });
  }

  /**
   Log a warning message (static)
   */
  static async warning(message: string, context?: LogContext): Promise<void>
  {
    await this.logStatic({
      level: 'WARNING',
      message,
      context,
    });
  }

  /**
   Log a warning message (instance)
   */
  warning(message: string, context?: LogContext): void
  {
    this.log({
      level: 'WARNING',
      message,
      context,
    });
  }

  /**
   Log an error message (static)
   */
  static async error(message: string, error?: Error | unknown, context?: LogContext): Promise<void>
  {
    // dprint-ignore
    const errorObj = (error instanceof Error) ? error : error ? new Error(String(error)) : undefined;

    await this.logStatic({
      level: 'ERROR',
      message,
      error: errorObj,
      context,
    });
  }

  /**
   Log an error message (instance)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void
  {
    // dprint-ignore
    const errorObj = (error instanceof Error) ? error : error ? new Error(String(error)) : undefined;

    this.log({
      level: 'ERROR',
      message,
      error: errorObj,
      context,
    });
  }

  /**
   Log file completion (static)
   */
  static async completedFile(
    fileName: string,
    context?: LogContext & { csvData?: unknown; pdfMetadata?: unknown; processingTime?: number },
  ): Promise<void>
  {
    await this.logStatic({
      level: 'COMPLETED_FILE',
      message: `Completed processing: ${fileName}`,
      context: {
        ...context,
        fileName,
      },
    });
  }

  /**
   Log group completion (static)
   */
  static async completedGroup(
    groupName: string,
    context?: LogContext & { fileCount?: number; totalTime?: number },
  ): Promise<void>
  {
    await this.logStatic({
      level: 'COMPLETED_GROUP',
      message: `Completed group: ${groupName}`,
      context: {
        ...context,
        groupName,
      },
    });
  }

  /**
   Get the current session directory path
   */
  static getSessionDir(): string | null
  {
    return this.sessionDir;
  }

  /**
   Log an API request (static)
   */
  static async apiRequest(
    method: string,
    url: string,
    details: {
      headers?: Record<string, string>;
      body?: string;
      [key: string]: unknown;
    },
  ): Promise<void>
  {
    await this.logStatic({
      level: 'API_REQUEST',
      message: `${method} ${url}`,
      context: details,
    });
  }

  /**
   Log an API response (static)
   */
  static async apiResponse(
    method: string,
    url: string,
    details: {
      status: number;
      statusText: string;
      headers?: Record<string, string>;
      body?: string;
      duration?: number;
      [key: string]: unknown;
    },
  ): Promise<void>
  {
    await this.logStatic({
      level: 'API_RESPONSE',
      message: `${method} ${url} → ${details.status} ${details.statusText}`,
      context: details,
    });
  }

  /**
   Suspend this logger, finalizing it and returning metadata for resumption
   */
  async suspend(): Promise<LoggerSuspensionMetadata>
  {
    if (!this.isSubLogger)
    {
      throw new Error('Cannot suspend a non-sub-logger');
    }

    // Finalize current part
    await this.finalize();

    return {
      operationName: this.operationName!,
      partNumber: this.partNumber,
    };
  }

  /**
   Create a new logger that continues from a suspended logger
   */
  static resumeFrom(metadata: LoggerSuspensionMetadata): Logger
  {
    const logger = new Logger(metadata.operationName);
    logger.partNumber = metadata.partNumber + 1;
    return logger;
  }

  /**
   Finalize the sub-logger and write all logs to disk
   */
  async finalize(): Promise<void>
  {
    if (!this.isSubLogger || this.finalized) return;

    this.finalized = true;
    SubLoggerManager.unregister(this);

    if (this.logs.length === 0) return;

    // Use the FIRST log's timestamp for the filename
    const firstEntry = this.logs[0];
    const filename = generateLogFilename({
      ...firstEntry,
      message: this.operationName!, // Use operation name instead of message
    }, this.partNumber);

    // Add continuation header if this is not the first part
    let content: string;
    if (this.partNumber > 1)
    {
      const header = `[CONTINUED FROM PART ${this.partNumber - 1}]\n\n`;
      const lines = this.logs.map((entry) => formatSubLoggerLine(entry));
      content = header + lines.join('\n');
    }
    else
    {
      const lines = this.logs.map((entry) => formatSubLoggerLine(entry));
      content = lines.join('\n');
    }

    // Write to the same session directory as regular logs
    await writeNewFile(filename, content);
  }

  /**
   Emergency finalize called on process exit
   */
  async emergencyFinalize(reason: string, error?: unknown): Promise<void>
  {
    if (!this.isSubLogger || this.finalized) return;

    // Add a final log entry about the emergency finalization
    this.warning(`Sub-logger finalized due to ${reason}`, error ? { error: String(error) } : undefined);

    // Normal finalization
    await this.finalize();
  }
}
