/**
 * Utility functions for debouncing and throttling
 */

/**
 * Debounce utility functions
 * Used to limit the rate at which a function can fire
 */

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked.
 * 
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @param immediate Whether to invoke the function immediately instead of on trailing edge
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    
    // Function to execute after delay
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    // Should the function be called now?
    const callNow = immediate && !timeout;
    
    // Clear existing timeout
    if (timeout) clearTimeout(timeout);
    
    // Set new timeout
    timeout = setTimeout(later, wait);
    
    // Call immediately if needed
    if (callNow) func.apply(context, args);
  };
}

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per every specified wait milliseconds
 * 
 * @param func The function to throttle
 * @param wait The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    const now = Date.now();
    const remaining = wait - (now - previous);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    } else if (!timeout) {
      timeout = setTimeout(function() {
        previous = Date.now();
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
}

/**
 * Creates a function that is delayed by the specified wait time
 * Useful for delaying execution without cancellation
 * 
 * @param func The function to delay
 * @param wait The number of milliseconds to delay
 * @returns A delayed version of the function
 */
export function delay<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const context = this;
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(func.apply(context, args));
      }, wait);
    });
  };
}

/**
 * Creates a memoized version of a function
 * Time Complexity: O(1) for lookup, O(n) for initial computation
 * Space Complexity: O(n) where n is the number of cached results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();
  
  return function(...args: Parameters<T>): ReturnType<T> {
    const key = resolver 
      ? resolver(...args) 
      : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Clear cache if it gets too large
    if (cache.size > 100) {
      const keysToDelete = Array.from(cache.keys()).slice(0, 50);
      keysToDelete.forEach(k => cache.delete(k));
    }
    
    return result;
  };
}

/**
 * Batch multiple function calls that occur within a time window
 * Time Complexity: O(n) where n is the number of batched items
 * Space Complexity: O(n)
 */
export function batch<T>(
  callback: (items: T[]) => void,
  wait: number = 100
): (item: T) => void {
  let items: T[] = [];
  let timeout: NodeJS.Timeout | null = null;
  
  const flush = () => {
    if (items.length > 0) {
      callback(items);
      items = [];
    }
    timeout = null;
  };
  
  return function(item: T): void {
    items.push(item);
    
    if (!timeout) {
      timeout = setTimeout(flush, wait);
    }
  };
}

/**
 * Run a function with request animation frame for smoother UI updates
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let queued = false;
  let lastArgs: Parameters<T> | null = null;
  
  return function(...args: Parameters<T>): void {
    lastArgs = args;
    
    if (!queued) {
      queued = true;
      
      requestAnimationFrame(() => {
        func(...lastArgs!);
        queued = false;
        lastArgs = null;
      });
    }
  };
} 