/**
Benchmark types and interfaces
*/

/**
Result from a single benchmark run
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
  Operations per second (if applicable)
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
  Additional metadata specific to the benchmark
  */
  metadata?: Record<string, unknown>;
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
