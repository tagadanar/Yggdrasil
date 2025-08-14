// Mock implementation of p-queue for Jest testing
class MockPQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 1;
    this.queue = [];
    this.running = 0;
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      // Process next task if any
      setImmediate(() => this.process());
    }
  }

  get size() {
    return this.queue.length;
  }

  get pending() {
    return this.running;
  }

  clear() {
    this.queue = [];
  }
}

module.exports = MockPQueue;
module.exports.default = MockPQueue;
