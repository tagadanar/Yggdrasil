export const forceSimulation = jest.fn().mockReturnValue({
  nodes: jest.fn().mockReturnThis(),
  force: jest.fn().mockReturnThis(),
  alpha: jest.fn().mockReturnThis(),
  alphaTarget: jest.fn().mockReturnThis(),
  restart: jest.fn(),
  stop: jest.fn(),
  tick: jest.fn(),
  on: jest.fn()
});

export const forceLink = jest.fn().mockReturnValue({
  links: jest.fn().mockReturnThis(),
  distance: jest.fn().mockReturnThis(),
  strength: jest.fn().mockReturnThis()
});

export const forceManyBody = jest.fn().mockReturnValue({
  strength: jest.fn().mockReturnThis()
});

export const forceCollide = jest.fn().mockReturnValue({
  radius: jest.fn().mockReturnThis()
});

export const forceRadial = jest.fn().mockReturnValue({
  radius: jest.fn().mockReturnThis(),
  strength: jest.fn().mockReturnThis()
});

export const forceCenter = jest.fn().mockReturnValue({
  x: jest.fn().mockReturnThis(),
  y: jest.fn().mockReturnThis()
}); 