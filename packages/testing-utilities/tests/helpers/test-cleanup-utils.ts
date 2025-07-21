// Test cleanup utilities for enhanced error handling and timeout protection

/**
 * Wraps a cleanup operation with timeout protection and error isolation
 */
export async function safeCleanup(
  operation: () => Promise<void>,
  operationName: string = 'cleanup',
  timeoutMs: number = 15000
): Promise<void> {
  try {
    await Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  } catch (error) {
    console.error(`⚠️ ${operationName} failed:`, error);
    // Don't rethrow - allow test execution to continue
  }
}

/**
 * Enhanced afterEach wrapper with timeout protection
 */
export function createSafeAfterEach(
  cleanupFn: () => Promise<void>,
  timeoutMs: number = 15000
) {
  return async () => {
    await safeCleanup(cleanupFn, 'afterEach cleanup', timeoutMs);
  };
}

/**
 * Execute multiple cleanup operations in parallel with individual timeout protection
 */
export async function safeParallelCleanup(
  operations: Array<{ name: string; operation: () => Promise<void>; timeout?: number }>,
  defaultTimeout: number = 10000
): Promise<void> {
  const cleanupPromises = operations.map(async ({ name, operation, timeout = defaultTimeout }) => {
    try {
      await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${name} timed out after ${timeout}ms`)), timeout)
        )
      ]);
      console.log(`✅ ${name} completed successfully`);
    } catch (error) {
      console.error(`❌ ${name} failed:`, error);
      // Continue with other operations
    }
  });

  await Promise.allSettled(cleanupPromises);
}

/**
 * Execute cleanup operations sequentially with individual error isolation
 */
export async function safeSequentialCleanup(
  operations: Array<{ name: string; operation: () => Promise<void>; timeout?: number }>,
  defaultTimeout: number = 10000
): Promise<void> {
  let successCount = 0;
  let errorCount = 0;

  for (const { name, operation, timeout = defaultTimeout } of operations) {
    try {
      await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${name} timed out after ${timeout}ms`)), timeout)
        )
      ]);
      console.log(`✅ ${name} completed successfully`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${name} failed:`, error);
      errorCount++;
      // Continue with next operation
    }
  }

  console.log(`🧹 Cleanup summary: ${successCount} successful, ${errorCount} failed`);
}