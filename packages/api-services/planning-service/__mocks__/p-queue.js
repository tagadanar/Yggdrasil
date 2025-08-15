// Mock implementation of p-queue for Jest tests
class MockPQueue {
  constructor(options = {}) {
    this.options = options;
    this.pending = 0;
    this.size = 0;
  }

  async add(fn, options = {}) {
    this.pending++;
    try {
      const result = await fn();
      return result;
    } finally {
      this.pending--;
    }
  }

  async addAll(fns, options = {}) {
    return Promise.all(fns.map(fn => this.add(fn, options)));
  }

  clear() {
    // Mock clear operation
  }

  start() {
    // Mock start operation
  }

  pause() {
    // Mock pause operation
  }

  get isPaused() {
    return false;
  }
}

module.exports = MockPQueue;
module.exports.default = MockPQueue;
