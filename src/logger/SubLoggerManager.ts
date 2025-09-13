/**
 SubLoggerManager handles cleanup of active sub-loggers on process termination

 Ensures that all logs are written to disk even if the process exits unexpectedly
 */
export class SubLoggerManager
{
  private static activeLoggers = new Set<
    { finalize(): Promise<void>; emergencyFinalize(reason: string, error?: unknown): Promise<void> }
  >();
  private static initialized = false;

  /**
   Initialize signal handlers and error handlers
   */
  static initialize(): void
  {
    if (this.initialized) return;

    // Register signal handlers
    try
    {
      Deno.addSignalListener('SIGINT', () =>
      {
        void this.finalizeAll('SIGINT');
      });

      Deno.addSignalListener('SIGTERM', () =>
      {
        void this.finalizeAll('SIGTERM');
      });
    }
    catch (error: unknown)
    {
      // Signal handlers might not be available in all environments
      console.warn('Failed to register signal handlers:', error);
    }

    // Register unhandled rejection handler
    globalThis.addEventListener('unhandledrejection', (event) =>
    {
      void this.finalizeAll('unhandledrejection', event.reason);
    });

    this.initialized = true;
  }

  /**
   Register a logger for cleanup tracking
   */
  static register(
    logger: { finalize(): Promise<void>; emergencyFinalize(reason: string, error?: unknown): Promise<void> },
  ): void
  {
    this.initialize();
    this.activeLoggers.add(logger);
  }

  /**
   Unregister a logger (called when logger is finalized normally)
   */
  static unregister(
    logger: { finalize(): Promise<void>; emergencyFinalize(reason: string, error?: unknown): Promise<void> },
  ): void
  {
    this.activeLoggers.delete(logger);
  }

  /**
   Finalize all active loggers (called on process exit)
   */
  static async finalizeAll(reason: string, error?: unknown): Promise<void>
  {
    const loggers = Array.from(this.activeLoggers);

    // Clear the set first to prevent re-entrance
    this.activeLoggers.clear();

    for (const logger of loggers)
    {
      try
      {
        await logger.emergencyFinalize(reason, error);
      }
      catch (e: unknown)
      {
        console.error('Failed to finalize sub-logger:', e);
      }
    }

    // Exit after cleanup for signals
    if (reason === 'SIGINT' || reason === 'SIGTERM')
    {
      Deno.exit(0);
    }
  }
}
