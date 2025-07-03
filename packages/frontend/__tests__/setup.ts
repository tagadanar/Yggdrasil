import '@testing-library/jest-dom';

// Suppress JSDOM navigation errors that are expected in test environment
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress specific JSDOM navigation errors and other known test environment issues
    const errorMessage = args[0]?.toString() || '';
    if (
      errorMessage.includes('Error: Not implemented: navigation') ||
      errorMessage.includes('Not implemented: navigation (except hash changes)')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Mock window.URL methods for file downloads in tests
Object.defineProperty(global, 'URL', {
  writable: true,
  value: class URL {
    constructor(url: string, base?: string) {
      this.href = url;
      this.protocol = 'http:';
      this.host = 'localhost';
      this.pathname = '/';
    }
    href: string;
    protocol: string;
    host: string;
    pathname: string;
    static createObjectURL = jest.fn(() => 'mock-url');
    static revokeObjectURL = jest.fn();
  },
});

// Test to satisfy Jest requirement
describe('Setup', () => {
  it('should setup test environment', () => {
    expect(true).toBe(true);
  });
});

// Mock AuthContext
const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  role: 'student' as const,
  profile: {
    firstName: 'Test',
    lastName: 'User',
  },
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock course hooks
jest.mock('@/hooks/useCourses', () => ({
  useCourses: () => ({
    courses: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCourse: () => ({
    course: null,
    loading: false,
    error: null,
    updateCourse: jest.fn(),
    refresh: jest.fn(),
  }),
  useCourseCreate: () => ({
    createCourse: jest.fn(),
    loading: false,
    error: null,
  }),
  useCourseEnrollment: () => ({
    enrollmentStatus: { enrolled: false },
    loading: false,
    error: null,
    enroll: jest.fn(),
    unenroll: jest.fn(),
    refresh: jest.fn(),
  }),
  useCourseProgress: () => ({
    progress: null,
    loading: false,
    error: null,
    updateProgress: jest.fn(),
    refresh: jest.fn(),
  }),
  useCourseStats: () => ({
    stats: null,
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
  useCourseSearch: () => ({
    results: [],
    loading: false,
    error: null,
    total: 0,
    search: jest.fn(),
    clearSearch: jest.fn(),
  }),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useParams: () => ({ id: 'test-id' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test-path',
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;