// Path: packages/api-services/course-service/__tests__/setup.ts

// Mock the database models before they're imported
jest.mock('../../../database-schemas/src', () => {
  const mockTeacher = {
    _id: 'mockUserId',
    email: 'test@example.com',
    role: 'teacher',
    profile: { firstName: 'Test', lastName: 'User' },
    save: jest.fn().mockResolvedValue(true)
  };

  const mockStudent = {
    _id: 'mockStudentId',
    email: 'student@example.com',
    role: 'student',
    profile: { firstName: 'Student', lastName: 'User' },
    save: jest.fn().mockResolvedValue(true)
  };

  const mockAdmin = {
    _id: 'mockAdminId',
    email: 'admin@example.com',
    role: 'admin',
    profile: { firstName: 'Admin', lastName: 'User' },
    save: jest.fn().mockResolvedValue(true)
  };

  const mockCourse = {
    _id: 'mockCourseId',
    title: 'Default Mock Course',
    code: 'MOCK101',
    instructor: 'mockUserId',
    enrolledStudents: [],
    capacity: 30,
    status: 'draft', // Set to draft so it doesn't interfere with published course searches
    isActive: true,
    level: 'intermediate',
    category: 'programming',
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
    save: jest.fn().mockResolvedValue(true),
    enrollStudent: jest.fn().mockImplementation(function(this: any, studentId: string) {
      // Add a small delay to simulate real database operation and allow race conditions
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!this.enrolledStudents.includes(studentId) && this.enrolledStudents.length < this.capacity) {
            this.enrolledStudents.push(studentId);
            resolve(true);
          } else {
            resolve(false);
          }
        }, Math.random() * 10); // Random delay 0-10ms to simulate realistic timing
      });
    }),
    unenrollStudent: jest.fn().mockImplementation(function(this: any, studentId: string) {
      const index = this.enrolledStudents.indexOf(studentId);
      if (index > -1) {
        this.enrolledStudents.splice(index, 1);
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    }),
    hasCapacity: jest.fn().mockImplementation(function(this: any) {
      return this.enrolledStudents.length < this.capacity;
    }),
    getEnrollmentCount: jest.fn().mockImplementation(function(this: any) {
      return this.enrolledStudents.length;
    }),
    isStudentEnrolled: jest.fn().mockImplementation(function(this: any, studentId: string) {
      return this.enrolledStudents.includes(studentId);
    }),
    canStudentEnroll: jest.fn().mockImplementation(function(this: any, studentId: string) {
      if (this.isStudentEnrolled(studentId)) return Promise.resolve(false);
      if (!this.hasCapacity()) return Promise.resolve(false);
      if (this.status !== 'published' || !this.isActive) return Promise.resolve(false);
      const now = new Date();
      if (now >= this.startDate) return Promise.resolve(false);
      return Promise.resolve(true);
    })
  };

  // Helper function to create course with fresh methods
  const createCourseInstance = (baseData: any) => {
    return {
      ...baseData,
      enrolledStudents: [...(baseData.enrolledStudents || [])],
      save: jest.fn().mockResolvedValue(true),
      enrollStudent: jest.fn().mockImplementation(function(this: any, studentId: string) {
        // Add a small delay to simulate real database operation and allow race conditions
        return new Promise((resolve) => {
          setTimeout(() => {
            if (!this.enrolledStudents.includes(studentId) && this.enrolledStudents.length < this.capacity) {
              this.enrolledStudents.push(studentId);
              resolve(true);
            } else {
              resolve(false);
            }
          }, Math.random() * 10); // Random delay 0-10ms to simulate realistic timing
        });
      }),
      unenrollStudent: jest.fn().mockImplementation(function(this: any, studentId: string) {
        const index = this.enrolledStudents.indexOf(studentId);
        if (index > -1) {
          this.enrolledStudents.splice(index, 1);
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }),
      hasCapacity: jest.fn().mockImplementation(function(this: any) {
        return this.enrolledStudents.length < this.capacity;
      }),
      getEnrollmentCount: jest.fn().mockImplementation(function(this: any) {
        return this.enrolledStudents.length;
      }),
      isStudentEnrolled: jest.fn().mockImplementation(function(this: any, studentId: string) {
        return this.enrolledStudents.includes(studentId);
      }),
      canStudentEnroll: jest.fn().mockImplementation(function(this: any, studentId: string) {
        if (this.isStudentEnrolled(studentId)) return Promise.resolve(false);
        if (!this.hasCapacity()) return Promise.resolve(false);
        if (this.status !== 'published' || !this.isActive) return Promise.resolve(false);
        const now = new Date();
        if (now >= this.startDate) return Promise.resolve(false);
        return Promise.resolve(true);
      })
    };
  };

  // Dynamic mock course storage
  let createdCourses = new Map();
  let courseIdCounter = 1;
  
  // Dynamic mock user storage
  let createdUsers = new Map();
  let userIdCounter = 1;

  // Initial mock course data (using codes that don't conflict with tests)
  // All set to draft status so they don't interfere with published course searches
  const initialMockCourses = [
    { ...mockCourse, _id: 'mockCourseId1', title: 'Initial Course 1', code: 'INIT101', level: 'intermediate', category: 'programming', enrolledStudents: [], status: 'draft' },
    { ...mockCourse, _id: 'mockCourseId2', title: 'Advanced Python Course', code: 'PY301', level: 'advanced', category: 'programming', enrolledStudents: [], status: 'draft' },
    { ...mockCourse, _id: 'mockCourseId3', title: 'Basic Web Development', code: 'WEB101', level: 'beginner', category: 'web-development', enrolledStudents: [], status: 'draft' }
  ];
  
  // Initialize created courses map
  initialMockCourses.forEach(courseData => {
    const course = createCourseInstance(courseData);
    createdCourses.set(course._id, course);
  });

  // Create a mock query builder that supports chaining with actual filtering
  const createMockQuery = (baseQuery: any = {}) => {
    let filteredCourses = Array.from(createdCourses.values());
    let skipValue = 0;
    let limitValue = 10;
    let sortValue: any = {};
    let populateFields: string[] = [];

    const query = {
      populate: jest.fn().mockImplementation((field, select) => {
        populateFields.push(field);
        return query;
      }),
      sort: jest.fn().mockImplementation((sortObj) => {
        sortValue = sortObj;
        return query;
      }),
      limit: jest.fn().mockImplementation((value) => {
        limitValue = value;
        return query;
      }),
      skip: jest.fn().mockImplementation((value) => {
        skipValue = value;
        return query;
      }),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        // Apply filtering based on baseQuery
        if (baseQuery.category) {
          filteredCourses = filteredCourses.filter((c: any) => c.category === baseQuery.category);
        }
        if (baseQuery.level) {
          filteredCourses = filteredCourses.filter((c: any) => c.level === baseQuery.level);
        }
        if (baseQuery.status) {
          filteredCourses = filteredCourses.filter((c: any) => c.status === baseQuery.status);
        }
        if (baseQuery.isActive !== undefined) {
          filteredCourses = filteredCourses.filter((c: any) => c.isActive === baseQuery.isActive);
        }
        if (baseQuery.instructor) {
          filteredCourses = filteredCourses.filter((c: any) => c.instructor === baseQuery.instructor);
        }
        if (baseQuery.enrolledStudents) {
          filteredCourses = filteredCourses.filter((c: any) => 
            c.enrolledStudents && c.enrolledStudents.includes(baseQuery.enrolledStudents)
          );
        }
        if (baseQuery.code && baseQuery.code.$in) {
          filteredCourses = filteredCourses.filter((c: any) => 
            baseQuery.code.$in.includes(c.code)
          );
        }
        if (baseQuery.tags && baseQuery.tags.$in) {
          filteredCourses = filteredCourses.filter((c: any) => 
            c.tags && c.tags.some((tag: string) => baseQuery.tags.$in.includes(tag))
          );
        }
        if (baseQuery.credits) {
          filteredCourses = filteredCourses.filter((c: any) => {
            let passesFilter = true;
            if (baseQuery.credits.$gte !== undefined) {
              passesFilter = passesFilter && c.credits >= baseQuery.credits.$gte;
            }
            if (baseQuery.credits.$lte !== undefined) {
              passesFilter = passesFilter && c.credits <= baseQuery.credits.$lte;
            }
            return passesFilter;
          });
        }
        if (baseQuery.$expr && baseQuery.$expr.$lt) {
          // Handle hasAvailableSpots filter: $expr: { $lt: [{ $size: '$enrolledStudents' }, '$capacity'] }
          filteredCourses = filteredCourses.filter((c: any) => 
            (c.enrolledStudents ? c.enrolledStudents.length : 0) < c.capacity
          );
        }
        
        // Handle $or queries (text search)
        if (baseQuery.$or) {
          filteredCourses = filteredCourses.filter((c: any) => {
            return baseQuery.$or.some((condition: any) => {
              if (condition.title && condition.title.$regex) {
                const regex = new RegExp(condition.title.$regex, condition.title.$options || '');
                return regex.test(c.title);
              }
              if (condition.description && condition.description.$regex) {
                const regex = new RegExp(condition.description.$regex, condition.description.$options || '');
                return c.description && regex.test(c.description);
              }
              if (condition.code && condition.code.$regex) {
                const regex = new RegExp(condition.code.$regex, condition.code.$options || '');
                return regex.test(c.code);
              }
              if (condition.tags && condition.tags.$in) {
                return c.tags && c.tags.some((tag: string) => 
                  condition.tags.$in.some((tagRegex: RegExp) => tagRegex.test(tag))
                );
              }
              return false;
            });
          });
        }
        
        // Apply sorting
        if (sortValue.title) {
          filteredCourses.sort((a: any, b: any) => {
            const comparison = a.title.localeCompare(b.title);
            return sortValue.title === 1 ? comparison : -comparison;
          });
        }
        
        // Apply pagination
        const startIndex = skipValue;
        const endIndex = startIndex + limitValue;
        const paginatedCourses = filteredCourses.slice(startIndex, endIndex);
        
        return Promise.resolve(paginatedCourses);
      }),
      // For direct awaiting without exec()
      then: (resolve: (value: any) => any) => {
        return query.exec().then(resolve);
      },
      catch: (reject: (reason: any) => any) => {
        return query.exec().catch(reject);
      }
    };
    
    return query;
  };

  return {
    CourseModel: {
      create: jest.fn().mockImplementation((data) => {
        // Check for duplicate code only among existing courses
        const existingCourses = Array.from(createdCourses.values());
        if (existingCourses.some((c: any) => c.code === data.code)) {
          throw new Error('Course code already exists');
        }
        
        // Create new course with unique ID
        const newCourseId = `mockCourseId_${courseIdCounter++}`;
        
        // Add instructorInfo if not present but instructor is provided
        let courseData = { ...data };
        if (data.instructor && !data.instructorInfo && createdUsers.has(data.instructor)) {
          const instructorUser = createdUsers.get(data.instructor);
          courseData.instructorInfo = {
            firstName: instructorUser.profile.firstName,
            lastName: instructorUser.profile.lastName,
            email: instructorUser.email
          };
        }
        
        const newCourse = createCourseInstance({ 
          ...mockCourse, 
          ...courseData, 
          _id: newCourseId,
          enrolledStudents: [...(data.enrolledStudents || [])] // Ensure fresh array for each course
        });
        
        // Store the created course
        createdCourses.set(newCourseId, newCourse);
        return Promise.resolve(newCourse);
      }),
      findById: jest.fn().mockImplementation((id) => {
        const course = createdCourses.get(id);
        const query = createMockQuery();
        // Override the then method to return the found course with potential population
        query.then = (resolve: (value: any) => any) => {
          if (!course) {
            return Promise.resolve(null).then(resolve);
          }
          
          let result = { ...course };
          
          // Handle instructor population
          if (query.populate.mock.calls.some((call: any[]) => call[0] === 'instructor')) {
            if (result.instructor && createdUsers.has(result.instructor)) {
              result.instructor = createdUsers.get(result.instructor);
            }
          }
          
          return Promise.resolve(result).then(resolve);
        };
        return query;
      }),
      findOne: jest.fn().mockImplementation((query) => {
        const courses = Array.from(createdCourses.values());
        let course: any = null;
        if (query.code) {
          course = courses.find((c: any) => c.code === query.code) || null;
        } else {
          course = courses[0] || null;
        }
        return createMockQuery().exec().then(() => course);
      }),
      find: jest.fn().mockImplementation((query = {}) => createMockQuery(query)),
      findByIdAndUpdate: jest.fn().mockImplementation((id, updateData, options) => {
        const course = createdCourses.get(id);
        if (course) {
          // Handle $set operator if present
          const actualUpdateData = updateData.$set || updateData;
          const updatedCourse = { ...course, ...actualUpdateData };
          createdCourses.set(id, updatedCourse);
          return Promise.resolve(updatedCourse);
        }
        return Promise.resolve(null);
      }),
      findByIdAndDelete: jest.fn().mockImplementation((id) => {
        const course = createdCourses.get(id);
        if (course) {
          createdCourses.delete(id);
          return createMockQuery().exec().then(() => course);
        }
        return createMockQuery().exec().then(() => null);
      }),
      deleteMany: jest.fn().mockImplementation(() => {
        const deletedCount = createdCourses.size;
        createdCourses.clear();
        initialMockCourses.forEach(course => {
          createdCourses.set(course._id, course);
        });
        return Promise.resolve({ deletedCount });
      }),
      countDocuments: jest.fn().mockImplementation((query = {}) => {
        // Use the same filtering logic as the find operation
        const mockQuery = createMockQuery(query);
        return mockQuery.exec().then((courses: any[]) => courses.length);
      }),
      distinct: jest.fn().mockImplementation((field, query = {}) => {
        // Get all courses that match the query
        const mockQuery = createMockQuery(query);
        return mockQuery.exec().then((courses: any[]) => {
          if (field === 'category') {
            const categories = courses
              .map((c: any) => c.category)
              .filter((cat: string) => cat) // Remove null/undefined
              .filter((cat: string, index: number, arr: string[]) => arr.indexOf(cat) === index); // Remove duplicates
            return categories.sort(); // Return sorted categories
          }
          return [];
        });
      }),
      aggregate: jest.fn().mockImplementation((pipeline) => {
        // Mock different responses based on aggregation pipeline
        if (pipeline.some((stage: any) => stage.$group && stage.$group._id === null)) {
          // Base stats aggregation - calculate dynamically
          const courses = Array.from(createdCourses.values());
          const totalCourses = courses.length;
          const publishedCourses = courses.filter((c: any) => c.status === 'published').length;
          const totalEnrollments = courses.reduce((total: number, c: any) => {
            return total + (c.enrolledStudents ? c.enrolledStudents.length : 0);
          }, 0);
          return Promise.resolve([{ totalCourses, publishedCourses, totalEnrollments }]);
        } else if (pipeline.some((stage: any) => stage.$group && stage.$group._id === '$category')) {
          // Category stats aggregation - calculate dynamically
          const courses = Array.from(createdCourses.values());
          const categoryStats: { [key: string]: number } = {};
          courses.forEach((c: any) => {
            if (c.category) {
              categoryStats[c.category] = (categoryStats[c.category] || 0) + 1;
            }
          });
          const result = Object.entries(categoryStats).map(([category, count]) => ({
            _id: category,
            count
          }));
          return Promise.resolve(result);
        } else if (pipeline.some((stage: any) => stage.$group && stage.$group._id === '$instructor')) {
          // Instructor stats aggregation - calculate dynamically
          const courses = Array.from(createdCourses.values());
          const instructorStats: { [key: string]: number } = {};
          courses.forEach((c: any) => {
            if (c.instructor) {
              instructorStats[c.instructor] = (instructorStats[c.instructor] || 0) + 1;
            }
          });
          const result = Object.entries(instructorStats).map(([instructorId, courseCount]) => ({
            _id: instructorId,
            courseCount,
            instructorInfo: [{ 
              profile: { firstName: 'Test', lastName: 'User' } 
            }] 
          }));
          return Promise.resolve(result);
        }
        return Promise.resolve([]);
      }),
      findByInstructor: jest.fn().mockImplementation((instructorId) => {
        const courses = Array.from(createdCourses.values());
        const instructorCourses = courses.filter((c: any) => c.instructor === instructorId);
        return Promise.resolve(instructorCourses);
      }),
      
      // Reset function for test cleanup
      __resetMockData: () => {
        createdCourses.clear();
        courseIdCounter = 1;
        initialMockCourses.forEach(courseData => {
          const course = createCourseInstance(courseData);
          createdCourses.set(course._id, course);
        });
      }
    },
    UserModel: {
      create: jest.fn().mockImplementation((userData) => {
        const timestamp = Date.now();
        const uniqueId = `${userData.role}Id_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
        
        let baseUser;
        if (userData.role === 'student') {
          baseUser = { ...mockStudent };
        } else if (userData.role === 'admin') {
          baseUser = { ...mockAdmin };
        } else {
          baseUser = { ...mockTeacher };
        }
        
        const newUser = { ...baseUser, ...userData, _id: uniqueId };
        
        // Store the created user for later retrieval by findById
        createdUsers.set(uniqueId, newUser);
        
        return Promise.resolve(newUser);
      }),
      findById: jest.fn().mockImplementation((id) => {
        // Return null for fake instructor ID to test validation
        if (id === 'fakeInstructorId' || id.toString().startsWith('507f1f77bcf86cd79943901')) {
          return Promise.resolve(null);
        }
        
        // First check if this user was created dynamically
        if (createdUsers.has(id)) {
          return Promise.resolve(createdUsers.get(id));
        }
        
        // Return different users based on ID patterns or specific test IDs
        if (id.toString().includes('student') || id.toString().includes('Student')) {
          return Promise.resolve(mockStudent);
        }
        if (id.toString().includes('admin') || id.toString().includes('Admin')) {
          return Promise.resolve(mockAdmin);
        }
        // Default to teacher for instructor IDs
        return Promise.resolve(mockTeacher);
      }),
      findOne: jest.fn().mockResolvedValue(mockTeacher),
      deleteMany: jest.fn().mockImplementation(() => {
        const deletedCount = createdUsers.size;
        createdUsers.clear();
        return Promise.resolve({ deletedCount });
      }),
      
      // Reset function for test cleanup
      __resetMockUsers: () => {
        createdUsers.clear();
        userIdCounter = 1;
      }
    }
  };
});

// Mock mongoose ObjectId validation
jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn().mockImplementation((id) => {
        // Return false for obviously invalid IDs
        if (id === 'invalid-id') {
          return false;
        }
        // Return true for mock IDs and properly formatted ObjectIds
        if (typeof id === 'string' && (
          id.startsWith('mockCourseId') || 
          id.startsWith('mockUserId') || 
          id.startsWith('mockStudentId') || 
          id.startsWith('mockAdminId') ||
          id.startsWith('teacherId_') ||
          id.startsWith('studentId_') ||
          id.startsWith('adminId_') ||
          id.startsWith('staffId_') ||
          id.includes('mockCourseId') ||
          id.includes('student') ||
          id.includes('instructor') ||
          id.includes('admin')
        )) {
          return true;
        }
        // Return true for properly formatted ObjectIds (24 char hex string)
        return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
      })
    }
  }
}));

// Basic setup without real database connection
beforeAll(async () => {
  // No real database setup needed with mocks
});

afterAll(async () => {
  // No cleanup needed with mocks
});

afterEach(async () => {
  // Reset mocks after each test
  jest.clearAllMocks();
  
  // Reset the mock course data
  const { CourseModel, UserModel } = require('../../../database-schemas/src');
  if (CourseModel.__resetMockData) {
    CourseModel.__resetMockData();
  }
  
  // Reset the mock user data
  if (UserModel.__resetMockUsers) {
    UserModel.__resetMockUsers();
  }
});