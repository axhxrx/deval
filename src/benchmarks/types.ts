/**
Benchmark types and interfaces
*/

/**
System information for benchmark context
*/
export interface SystemInfo
{
  /**
  Operating system platform
  */
  platform: string;

  /**
  CPU architecture
  */
  arch: string;

  /**
  CPU model/brand string
  */
  cpu: string;

  /**
  Total memory in GB
  */
  memoryGb: number;

  /**
  Available memory in GB
  */
  freeMemoryGb: number;

  /**
  Hostname
  */
  hostname: string;

  /**
  OS version
  */
  osVersion?: string;

  /**
  Unique machine identifier
  */
  machineId: string;
}

/**
Enhanced result from a single benchmark run
*/
export interface BenchmarkResult
{
  /**
  Name of the benchmark
  */
  name: string;

  /**
  Target directory where benchmark was run
  */
  target: string;

  /**
  Time taken in milliseconds
  */
  duration: number;

  /**
  Ops per second (if applicable)
  */
  opsPerSecond?: number;

  /**
  Whether the benchmark succeeded
  */
  success: boolean;

  /**
  Error message if benchmark failed
  */
  error?: string;

  /**
  Filesystem label for the target
  */
  filesystemLabel?: string;

  /**
  Timestamp when benchmark was run
  */
  timestamp?: Date;

  /**
  Additional metadata specific to the benchmark
  */
  metadata?: Record<string, unknown>;
}

/**
Complete benchmark report including system info and results
*/
export interface BenchmarkReport
{
  /**
  Report format version
  */
  reportVersion: string;

  /**
  Unique machine identifier
  */
  machineId: string;

  /**
  When the report was generated
  */
  timestamp: Date;

  /**
  System information
  */
  systemInfo: SystemInfo;

  /**
  User-provided comment about the benchmark run
  */
  userComment?: string;

  /**
  Filesystem label where benchmarks were run
  */
  filesystemLabel: string;

  /**
  All benchmark results
  */
  results: BenchmarkResult[];
}

/**
Command descriptor for benchmark Ops
*/
export interface BenchmarkCommand
{
  /**
  Display name for this command
  */
  name: string;

  /**
  Command to run
  */
  cmd: string;

  /**
  Command arguments
  */
  args?: string[];

  /**
  Working directory for command
  */
  cwd?: string;

  /**
  Expected files/directories to validate after command
  */
  validateExists?: string[];

  /**
  Whether to suppress output
  */
  quiet?: boolean;

  /**
  Timeout in milliseconds
  */
  timeout?: number;
}

/**
Interface for benchmark implementations
*/
export interface Benchmark
{
  /**
  Name of the benchmark
  */
  name: string;

  /**
  Description of what the benchmark tests
  */
  description: string;

  /**
  Run the benchmark at the specified target directory
  */
  run(target: string, quick?: boolean): Promise<BenchmarkResult>;
}
