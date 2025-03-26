import '@testing-library/jest-dom';

// Mock canvas context for ForceGraph2D
const mockContext = {
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  measureText: jest.fn().mockReturnValue({ width: 50 }),
  fillText: jest.fn(),
  setTransform: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  clearRect: jest.fn(),
};

// Mock canvas context
HTMLCanvasElement.prototype.getContext = () => mockContext; 