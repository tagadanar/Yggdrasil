// Path: packages/api-services/course-service/src/types/models.ts

// Mock models for development
export const CourseModel = {
  create: async (data: any) => ({ _id: 'mock-id', ...data }),
  findById: async (id: string) => null,
  findOne: async (query: any) => null,
  find: async (query: any) => [],
  findByIdAndUpdate: async (id: string, data: any) => null,
  deleteMany: async (query: any) => ({ deletedCount: 0 }),
  countDocuments: async (query: any) => 0,
  aggregate: async (pipeline: any[]) => [],
  findByInstructor: async (instructorId: string) => []
};

export const UserModel = {
  create: async (data: any) => ({ _id: 'mock-user-id', ...data }),
  findById: async (id: string) => null,
  deleteMany: async (query: any) => ({ deletedCount: 0 })
};