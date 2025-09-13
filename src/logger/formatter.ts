import { COLOR_RESET, LOG_COLORS, type LogEntry } from '../types/logger.ts';

/**
 Map to track counters for each millisecond timestamp

 Ensures unique filenames even when multiple logs occur in the same millisecond
 */
const millisecondCounters = new Map<string, number>();

/**
 Format timestamp for console output
 */
export function formatTimestamp(date: Date): string
{
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

/**
 Format log entry for console output with colors
 */
export function formatConsoleOutput(entry: LogEntry): string
{
  const color = LOG_COLORS[entry.level];
  const timestamp = formatTimestamp(entry.timestamp);
  const level = entry.level.padEnd(15); // Align columns

  let output = `${color}[${timestamp}] ${level} ${entry.message}${COLOR_RESET}`;

  // Add error stack trace if present
  if (entry.error)
  {
    output += `\n${color}${entry.error.stack || entry.error.message}${COLOR_RESET}`;
  }

  return output;
}

/**
 Format log entry for file output (no colors, full details)
 */
export function formatFileContent(entry: LogEntry): string
{
  const lines: string[] = [];

  // Header
  lines.push(`Timestamp: ${entry.timestamp.toISOString()}`);
  lines.push(`Level: ${entry.level}`);
  lines.push(`Message: ${entry.message}`);

  // Context if present
  if (entry.context)
  {
    lines.push('\nContext:');
    lines.push(JSON.stringify(entry.context, null, 2));
  }

  // Error details if present
  if (entry.error)
  {
    lines.push('\nError:');
    lines.push(`Name: ${entry.error.name}`);
    lines.push(`Message: ${entry.error.message}`);
    if (entry.error.stack)
    {
      lines.push(`Stack:\n${entry.error.stack}`);
    }
  }

  return lines.join('\n');
}

/**
 Sanitize text for use in filenames

 Replaces problematic characters with underscores
 */
export function sanitizeForFilename(text: string): string
{
  return text
    .replace(/[^a-zA-Z0-9\-_. ]/g, '_') // Replace special chars
    .replace(/\s+/g, '_') // Replace spaces
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Trim underscores
    .substring(0, 100); // Limit length
}

/**
 Generate filename for a log entry

 Format: YYYY-MM-DD-HH-MM-SS-mmm-N-LOGLEVEL-description.log
 Or: YYYY-MM-DD-HH-MM-SS-mmm-N-LOGLEVEL-description.partX.log

 Where N is a monotonic counter for the same millisecond
 */
export function generateLogFilename(entry: LogEntry, partNumber?: number): string
{
  const date = entry.timestamp;
  const yyyy = date.getFullYear().toString().padStart(4, '0');
  const MM = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');

  const timestampBase = `${yyyy}-${MM}-${dd}-${hh}-${mm}-${ss}-${ms}`;

  // Get and increment counter for this millisecond
  const counter = (millisecondCounters.get(timestampBase) || 0) + 1;
  millisecondCounters.set(timestampBase, counter);

  // Clean up old entries to prevent memory leak (keep last 1000 entries)
  if (millisecondCounters.size > 1000)
  {
    const keysToDelete = Array.from(millisecondCounters.keys()).slice(0, millisecondCounters.size - 900);
    for (const key of keysToDelete)
    {
      millisecondCounters.delete(key);
    }
  }

  const description = sanitizeForFilename(entry.message);
  const partSuffix = partNumber && partNumber > 1 ? `.part${partNumber}` : '';

  return `${timestampBase}-${counter}-${entry.level}-${description}${partSuffix}.log`;
}

/**
 Remove ANSI escape codes from a string

 Strips color codes and other terminal control sequences
 */
function stripAnsiCodes(text: string): string
{
  // deno-lint-ignore no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 Format a log entry as a single line for sub-logger files

 Each line contains: timestamp, level, message, and optionally context/error
 */
export function formatSubLoggerLine(entry: LogEntry): string
{
  const timestamp = entry.timestamp.toISOString();
  const level = entry.level.padEnd(15);

  // Strip ANSI codes from the message for file output
  const cleanMessage = stripAnsiCodes(entry.message);

  let line = `${timestamp} ${level} ${cleanMessage}`;

  // Add context inline if present (compact format)
  if (entry.context && Object.keys(entry.context).length > 0)
  {
    line += ` | Context: ${JSON.stringify(entry.context)}`;
  }

  // Add error inline if present
  if (entry.error)
  {
    line += ` | Error: ${entry.error.message}`;
  }

  return line;
}
