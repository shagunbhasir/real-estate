/**
 * Request Animation Frame Throttle Utility
 * 
 * This utility provides a way to throttle functions using requestAnimationFrame
 * for performance optimization, especially for event handlers like scroll, resize,
 * mousemove, and other high-frequency events.
 */

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per animation frame using requestAnimationFrame
 * 
 * @param callback The function to throttle
 * @returns A throttled version of the function
 */
export function rafThrottle<T extends (...args: any[]) => void>(callback: T): T {
  let requestId: number | null = null;
  let lastArgs: any[] | null = null;
  
  const throttled = function(...args: any[]) {
    // Save the most recent arguments
    lastArgs = args;
    
    // If we already have a frame queued, do nothing
    if (requestId !== null) return;
    
    // Schedule a frame
    requestId = requestAnimationFrame(() => {
      // When the frame fires, call the callback with the most recent args
      if (lastArgs) {
        callback(...lastArgs);
      }
      
      // Reset for next throttle
      requestId = null;
      lastArgs = null;
    });
  };
  
  // Add a cancel method to the throttled function
  (throttled as any).cancel = () => {
    if (requestId !== null) {
      cancelAnimationFrame(requestId);
      requestId = null;
      lastArgs = null;
    }
  };
  
  return throttled as T;
}

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last invocation
 * 
 * @param callback The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function rafDebounce<T extends (...args: any[]) => void>(
  callback: T,
  wait: number = 100
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;
  
  const debounced = function(...args: any[]) {
    // Save the most recent arguments
    lastArgs = args;
    
    // Clear any existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    // Schedule a new timeout
    timeoutId = setTimeout(() => {
      // When the timeout expires, request an animation frame
      requestAnimationFrame(() => {
        if (lastArgs) {
          callback(...lastArgs);
        }
        
        // Reset for next debounce
        timeoutId = null;
        lastArgs = null;
      });
    }, wait);
  };
  
  // Add a cancel method to the debounced function
  (debounced as any).cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };
  
  return debounced as T;
} 