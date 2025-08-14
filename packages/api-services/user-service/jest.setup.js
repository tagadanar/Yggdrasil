// jest.setup.js
// Load environment variables for Jest tests

require('dotenv').config();

// Mock problematic ES modules
jest.mock('p-queue', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      start: jest.fn(),
      pause: jest.fn(),
      clear: jest.fn(),
      size: 0,
      pending: 0,
      isPaused: false,
    })),
  };
});
