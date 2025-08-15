// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Simplified setup for pure function testing
// Complex integration testing is handled by Playwright

// Set up minimal browser environment for component tests
global.matchMedia =
  global.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

// Simple storage implementations for basic tests
const createStorage = () => {
  const storage = new Map();
  return {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
    clear: () => storage.clear(),
  };
};

global.localStorage = createStorage();
global.sessionStorage = createStorage();

// Suppress only specific React warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') || args[0].includes('Warning: Using UNSAFE_'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  global.localStorage.clear();
  global.sessionStorage.clear();
});
