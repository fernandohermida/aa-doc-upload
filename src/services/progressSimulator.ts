/**
 * Simulates upload/scan progress with realistic timing
 *
 * @param onProgress - Callback function to report progress (0-100)
 * @param minDelay - Minimum delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 */
export async function simulateProgress(
  onProgress: (progress: number) => void,
  minDelay: number = 500,
  maxDelay: number = 1000
): Promise<void> {
  const totalDelay = Math.random() * (maxDelay - minDelay) + minDelay;
  const steps = 10;
  const stepDelay = totalDelay / steps;

  for (let i = 0; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, stepDelay));
    onProgress(Math.round((i / steps) * 100));
  }
}
