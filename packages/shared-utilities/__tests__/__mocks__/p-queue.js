/**
 * Enhanced Mock for p-queue ESM module
 * Provides CommonJS-compatible mock for Jest testing
 * Matches p-queue v8+ API surface
 */

class MockPQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || Infinity;
    this.interval = options.interval || 0;
    this.intervalCap = options.intervalCap || Infinity;
    this.timeout = options.timeout;
    this.throwOnTimeout = options.throwOnTimeout || false;
    this.autoStart = options.autoStart !== false;

    this.queue = [];
    this.running = 0;
    this._isPaused = !this.autoStart;
    this._resolveEmpty = () => {};
    this._resolveIdle = () => {};
  }

  async add(task, options = {}) {
    return new Promise((resolve, reject) => {
      const wrappedTask = async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.queue.push({ task: wrappedTask, priority: options.priority || 0 });

      // Sort by priority if needed
      if (options.priority) {
        this.queue.sort((a, b) => b.priority - a.priority);
      }

      if (!this._isPaused) {
        this.process();
      }
    });
  }

  async addAll(tasks, options = {}) {
    return Promise.all(tasks.map(task => this.add(task, options)));
  }

  async process() {
    if (this._isPaused || this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task } = this.queue.shift();

    try {
      await task();
    } finally {
      this.running--;

      // Check if queue is empty
      if (this.queue.length === 0) {
        this._resolveEmpty();
      }

      // Check if idle
      if (this.running === 0 && this.queue.length === 0) {
        this._resolveIdle();
      }

      // Process next task if any
      setImmediate(() => this.process());
    }
  }

  start() {
    this._isPaused = false;
    this.process();
    return this;
  }

  pause() {
    this._isPaused = true;
  }

  clear() {
    this.queue = [];
  }

  async onEmpty() {
    if (this.queue.length === 0) {
      return;
    }
    return new Promise(resolve => {
      this._resolveEmpty = resolve;
    });
  }

  async onIdle() {
    if (this.running === 0 && this.queue.length === 0) {
      return;
    }
    return new Promise(resolve => {
      this._resolveIdle = resolve;
    });
  }

  async onSizeLessThan(limit) {
    if (this.queue.length < limit) {
      return;
    }
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (this.queue.length < limit) {
          clearInterval(interval);
          resolve();
        }
      }, 10);
    });
  }

  get size() {
    return this.queue.length;
  }

  get pending() {
    return this.running;
  }

  get isPaused() {
    return this._isPaused;
  }
}

// Export for both CommonJS and ESM compatibility
module.exports = MockPQueue;
module.exports.default = MockPQueue;
module.exports.PQueue = MockPQueue;
