// Mock for p-queue to avoid ESM issues in Jest
module.exports = class PQueue {
  constructor() {
    this.size = 0;
    this.pending = 0;
  }

  add(fn) {
    return Promise.resolve(fn());
  }

  clear() {
    this.size = 0;
  }

  onEmpty() {
    return Promise.resolve();
  }

  onIdle() {
    return Promise.resolve();
  }

  pause() {}

  start() {}
};
