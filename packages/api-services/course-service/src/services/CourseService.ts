// packages/api-services/course-service/src/services/CourseService.ts
// Business logic for course management

import {
  CourseModel,
  CourseEnrollmentModel,
  ExerciseSubmissionModel,
  type CourseDocument,
  type CourseEnrollmentDocument,
  type ExerciseSubmissionDocument,
} from '@yggdrasil/database-schemas';
import {
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateChapterRequest,
  UpdateChapterRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  CreateContentRequest,
  UpdateContentRequest,
  SubmitExerciseRequest,
  CourseFilters,
  CourseSearchResult,
  UserRole,
} from '@yggdrasil/shared-utilities';
import { courseLogger as logger } from '@yggdrasil/shared-utilities';

export class CourseService {
  // =============================================================================
  // COURSE CRUD OPERATIONS
  // =============================================================================

  async createCourse(
    instructorId: string,
    instructorName: string,
    instructorEmail: string,
    courseData: CreateCourseRequest,
  ): Promise<CourseDocument> {
    try {
      logger.info('Creating course:', {
        instructorId,
        instructorName,
        courseData: {
          title: courseData.title,
          category: courseData.category,
          level: courseData.level,
        },
      });
      // Convert string dates to Date objects if they exist
      const processedSettings = courseData.settings ? {
        ...courseData.settings,
        startDate: courseData.settings.startDate ? new Date(courseData.settings.startDate) : undefined,
        endDate: courseData.settings.endDate ? new Date(courseData.settings.endDate) : undefined,
      } : undefined;

      logger.info('Creating course model instance...');
      const course = new CourseModel({
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        level: courseData.level,
        status: 'draft', // Default status
        tags: courseData.tags || [],
        prerequisites: courseData.prerequisites || [],
        estimatedDuration: courseData.estimatedDuration || 0,
        settings: processedSettings || {
          isPublic: false,
          allowEnrollment: true,
          requiresApproval: false,
          allowLateSubmissions: true,
          enableDiscussions: true,
          enableCollaboration: false,
        },
        instructor: {
          _id: instructorId,
          name: instructorName,
          email: instructorEmail,
        },
        chapters: [],
        resources: [],
        collaborators: [],
        stats: {
          enrolledStudents: 0,
          completedStudents: 0,
          averageRating: 0, 
          totalRatings: 0,
          totalViews: 0,
          lastAccessed: new Date(),
        },
        version: 1,
        createdAt: new Date(),
        lastModified: new Date(),
      });

      logger.info('Generating slug...');
      // Generate slug from title
      try {
        course.slug = course.generateSlug();
      } catch (slugError) {
        logger.warn('Slug generation failed, using fallback:', slugError);
        // Fallback slug generation
        course.slug = courseData.title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') + '-' + Date.now();
      }

      logger.info(`Generated slug: ${course.slug}`);

      logger.info('Checking slug uniqueness...');
      // Ensure slug is unique
      let slugCounter = 1;
      const originalSlug = course.slug;
      let maxAttempts = 10; // Prevent infinite loop
      
      while (maxAttempts > 0 && await CourseModel.findBySlug(course.slug)) {
        course.slug = `${originalSlug}-${slugCounter}`;
        slugCounter++;
        maxAttempts--;
      }
      
      if (maxAttempts === 0) {
        // Ultimate fallback with timestamp
        course.slug = `${originalSlug}-${Date.now()}`;
      }

      logger.info('Saving course to database...');
      await course.save();
      logger.info('Course saved successfully');
      return course;
    } catch (error: any) {
      logger.error('Course creation failed with error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      
      // Check for specific MongoDB errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.keys(error.errors).map(key => 
          `${key}: ${error.errors[key].message}`
        );
        throw new Error(`Validation error: ${validationErrors.join(', ')}`);
      }
      
      if (error.code === 11000) {
        throw new Error('Course with this title or slug already exists');
      }
      
      throw new Error(`Failed to create course: ${error.message}`);
    }
  }

  async getCourseById(courseId: string): Promise<CourseDocument | null> {
    try {
      return await CourseModel.findById(courseId);
    } catch (error: any) {
      throw new Error(`Failed to get course: ${error.message}`);
    }
  }

  async getCourseBySlug(slug: string): Promise<CourseDocument | null> {
    try {
      return await CourseModel.findBySlug(slug);
    } catch (error: any) {
      throw new Error(`Failed to get course by slug: ${error.message}`);
    }
  }

  async updateCourse(
    courseId: string,
    updateData: UpdateCourseRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      // Check permissions
      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      // Convert string dates to Date objects if they exist
      const processedUpdateData = { ...updateData };
      if (processedUpdateData.settings) {
        processedUpdateData.settings = {
          ...processedUpdateData.settings,
          startDate: processedUpdateData.settings.startDate ? new Date(processedUpdateData.settings.startDate) : undefined,
          endDate: processedUpdateData.settings.endDate ? new Date(processedUpdateData.settings.endDate) : undefined,
        };
      }

      // Update fields
      Object.assign(course, processedUpdateData);

      // Increment version on significant changes
      if (updateData.title || updateData.description || updateData.status) {
        await course.incrementVersion();
      }

      await course.save();
      return course;
    } catch (error: any) {
      throw new Error(`Failed to update course: ${error.message}`);
    }
  }

  async deleteCourse(courseId: string, userId: string, userRole: UserRole): Promise<boolean> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return false;
      }

      // Check permissions (only admins or course instructors can delete)
      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to delete this course');
      }

      await CourseModel.findByIdAndDelete(courseId);

      // Clean up related data
      await CourseEnrollmentModel.deleteMany({ courseId });

      return true;
    } catch (error: any) {
      throw new Error(`Failed to delete course: ${error.message}`);
    }
  }

  // =============================================================================
  // COURSE SEARCH AND LISTING
  // =============================================================================

  async searchCourses(filters: CourseFilters): Promise<CourseSearchResult> {
    try {
      logger.info('CourseService.searchCourses called with filters:', JSON.stringify(filters, null, 2));
      const { search, page = 1, limit = 20, ...otherFilters } = filters;
      const skip = (page - 1) * limit;

      logger.info('Calling CourseModel.searchCourses with:', { search: search || '', otherFilters });
      const courses = await CourseModel.searchCourses(search || '', otherFilters)
        .skip(skip)
        .limit(limit);

      const total = await CourseModel.countDocuments({
        status: 'published',
        'settings.isPublic': true,
        ...(otherFilters.category && { category: otherFilters.category }),
        ...(otherFilters.level && { level: otherFilters.level }),
        ...(otherFilters.instructor && { 'instructor._id': otherFilters.instructor }),
        ...(otherFilters.tags && { tags: { $in: otherFilters.tags } }),
      });

      logger.info('CourseService.searchCourses completed successfully');
      return {
        courses,
        total,
        page,
        limit,
        filters,
      };
    } catch (error: any) {
      logger.error('CourseService.searchCourses error:', error);
      throw new Error(`Failed to search courses: ${error?.message || error}`);
    }
  }

  async getCoursesByInstructor(instructorId: string): Promise<CourseDocument[]> {
    try {
      return await CourseModel.findByInstructor(instructorId);
    } catch (error: any) {
      throw new Error(`Failed to get courses by instructor: ${error.message}`);
    }
  }

  async getPublishedCourses(): Promise<CourseDocument[]> {
    try {
      return await CourseModel.findPublished();
    } catch (error: any) {
      throw new Error(`Failed to get published courses: ${error.message}`);
    }
  }

  // =============================================================================
  // CHAPTER MANAGEMENT
  // =============================================================================

  async addChapter(
    courseId: string,
    chapterData: CreateChapterRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const newChapter = {
        title: chapterData.title,
        description: chapterData.description,
        order: chapterData.order,
        sections: [],
        isPublished: false,
        estimatedDuration: 0,
      };

      course.chapters.push(newChapter as any);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to add chapter: ${error.message}`);
    }
  }

  async updateChapter(
    courseId: string,
    chapterId: string,
    updateData: UpdateChapterRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      Object.assign(chapter, updateData);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to update chapter: ${error.message}`);
    }
  }

  async deleteChapter(
    courseId: string,
    chapterId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const chapterIndex = course.chapters.findIndex((ch: any) => ch._id.toString() === chapterId);
      if (chapterIndex !== -1) {
        course.chapters.splice(chapterIndex, 1);
      }
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to delete chapter: ${error.message}`);
    }
  }

  // =============================================================================
  // SECTION MANAGEMENT
  // =============================================================================

  async addSection(
    courseId: string,
    chapterId: string,
    sectionData: CreateSectionRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const newSection = {
        title: sectionData.title,
        description: sectionData.description,
        order: sectionData.order,
        content: [],
        isPublished: false,
        estimatedDuration: 0,
      };

      chapter.sections.push(newSection as any);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to add section: ${error.message}`);
    }
  }

  async updateSection(
    courseId: string,
    chapterId: string,
    sectionId: string,
    updateData: UpdateSectionRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const section = chapter.sections.find((sec: any) => sec._id.toString() === sectionId);
      if (!section) {
        throw new Error('Section not found');
      }

      Object.assign(section, updateData);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to update section: ${error.message}`);
    }
  }

  // =============================================================================
  // CONTENT MANAGEMENT
  // =============================================================================

  async addContent(
    courseId: string,
    chapterId: string,
    sectionId: string,
    contentData: CreateContentRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const section = chapter.sections.find((sec: any) => sec._id.toString() === sectionId);
      if (!section) {
        throw new Error('Section not found');
      }

      const newContent = {
        type: contentData.type,
        title: contentData.title,
        order: contentData.order,
        data: contentData.data,
        isPublished: false,
      };

      section.content.push(newContent as any);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to add content: ${error.message}`);
    }
  }

  async updateContent(
    courseId: string,
    chapterId: string,
    sectionId: string,
    contentId: string,
    updateData: UpdateContentRequest,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseDocument | null> {
    try {
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return null;
      }

      if (!this.canModifyCourse(course, userId, userRole)) {
        throw new Error('Insufficient permissions to modify this course');
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const section = chapter.sections.find((sec: any) => sec._id.toString() === sectionId);
      if (!section) {
        throw new Error('Section not found');
      }

      const content = section.content.find((cont: any) => cont._id.toString() === contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      Object.assign(content, updateData);
      await course.incrementVersion();
      await course.save();

      return course;
    } catch (error: any) {
      throw new Error(`Failed to update content: ${error.message}`);
    }
  }

  // =============================================================================
  // COURSE ENROLLMENT
  // =============================================================================

  async enrollStudent(courseId: string, studentId: string): Promise<CourseEnrollmentDocument> {
    try {
      // Check if already enrolled
      const existingEnrollment = await CourseEnrollmentModel.findEnrollment(courseId, studentId);
      if (existingEnrollment) {
        throw new Error('Student is already enrolled in this course');
      }

      // Check if course allows enrollment
      const course = await CourseModel.findById(courseId);
      if (!course || course.status !== 'published' || !course.settings.allowEnrollment) {
        throw new Error('Course is not available for enrollment');
      }

      // Check enrollment limits
      if (course.settings.maxStudents) {
        const enrollmentCount = await CourseEnrollmentModel.countDocuments({
          courseId,
          status: 'active',
        });
        if (enrollmentCount >= course.settings.maxStudents) {
          throw new Error('Course has reached maximum enrollment capacity');
        }
      }

      const enrollment = new CourseEnrollmentModel({
        courseId,
        studentId,
        status: 'active',
      });

      await enrollment.save();

      // Update course stats
      course.stats.enrolledStudents += 1;
      await course.save();

      return enrollment;
    } catch (error: any) {
      throw new Error(`Failed to enroll student: ${error.message}`);
    }
  }

  async getStudentEnrollments(studentId: string): Promise<CourseEnrollmentDocument[]> {
    try {
      return await CourseEnrollmentModel.findByStudent(studentId);
    } catch (error: any) {
      throw new Error(`Failed to get student enrollments: ${error.message}`);
    }
  }

  async getCourseEnrollments(courseId: string): Promise<CourseEnrollmentDocument[]> {
    try {
      return await CourseEnrollmentModel.findByCourse(courseId);
    } catch (error: any) {
      throw new Error(`Failed to get course enrollments: ${error.message}`);
    }
  }

  // =============================================================================
  // EXERCISE SUBMISSIONS
  // =============================================================================

  async submitExercise(
    exerciseId: string,
    studentId: string,
    submissionData: SubmitExerciseRequest,
  ): Promise<ExerciseSubmissionDocument> {
    try {
      const submission = new ExerciseSubmissionModel({
        exerciseId,
        studentId,
        code: submissionData.code,
        answer: submissionData.answer,
        files: submissionData.files || [],
      });

      await submission.save();

      // Exercise evaluation logic
      const evaluationResult = await this.evaluateExerciseSubmission(exerciseId, submissionData);

      // Update submission with evaluation results
      submission.result = evaluationResult;
      submission.gradedAt = new Date();
      await submission.save();

      return submission;
    } catch (error: any) {
      throw new Error(`Failed to submit exercise: ${error.message}`);
    }
  }

  async getExerciseSubmissions(
    exerciseId: string,
    studentId?: string,
  ): Promise<ExerciseSubmissionDocument[]> {
    try {
      if (studentId) {
        return await ExerciseSubmissionModel.find({ exerciseId, studentId });
      }
      return await ExerciseSubmissionModel.findByExercise(exerciseId);
    } catch (error: any) {
      throw new Error(`Failed to get exercise submissions: ${error.message}`);
    }
  }

  // =============================================================================
  // EXERCISE EVALUATION
  // =============================================================================

  private async evaluateExerciseSubmission(
    exerciseId: string,
    submissionData: SubmitExerciseRequest,
  ): Promise<any> {
    try {
      // Find the exercise definition in the course structure
      const exercise = await this.findExerciseById(exerciseId);
      if (!exercise) {
        return {
          isCorrect: false,
          score: 0,
          feedback: 'Exercise not found',
          testResults: [],
          executionTime: 0,
        };
      }

      // Handle different exercise types
      switch (exercise.type) {
        case 'code':
          return await this.evaluateCodeExercise(exercise, submissionData);
        case 'quiz':
          return await this.evaluateQuizExercise(exercise, submissionData);
        case 'assignment':
          return await this.evaluateAssignmentExercise(exercise, submissionData);
        default:
          return {
            isCorrect: false,
            score: 0,
            feedback: `Unsupported exercise type: ${exercise.type}`,
            testResults: [],
            executionTime: 0,
          };
      }
    } catch (error: any) {
      return {
        isCorrect: false,
        score: 0,
        feedback: `Evaluation error: ${error.message}`,
        testResults: [],
        executionTime: 0,
      };
    }
  }

  private async findExerciseById(exerciseId: string): Promise<any | null> {
    try {
      // Search through all courses to find the exercise
      // In a real implementation, you might want to optimize this with better indexing
      const courses = await CourseModel.find({ status: 'published' });

      for (const course of courses) {
        for (const chapter of course.chapters) {
          for (const section of chapter.sections) {
            for (const content of section.content) {
              if (content.type === 'exercise' && content.data?.exercise &&
                  content.data.exercise._id.toString() === exerciseId) {
                return content.data.exercise;
              }
            }
          }
        }
      }
      return null;
    } catch (error) {
      logger.error('Error finding exercise:', error);
      return null;
    }
  }

  private async evaluateCodeExercise(exercise: any, submissionData: SubmitExerciseRequest): Promise<any> {
    const startTime = Date.now();
    const testResults: any[] = [];
    let passedTests = 0;

    try {
      // Evaluate against test cases
      if (exercise.testCases && exercise.testCases.length > 0) {
        for (const testCase of exercise.testCases) {
          try {
            // Simulate code execution and comparison
            // In a real implementation, you would use a secure code sandbox
            const result = await this.executeCodeWithTestCase(
              submissionData.code || '',
              testCase,
              exercise.programmingLanguage || 'javascript',
            );

            testResults.push({
              testCaseId: testCase._id.toString(),
              passed: result.passed,
              actualOutput: result.actualOutput,
              errorMessage: result.errorMessage,
            });

            if (result.passed) {
              passedTests++;
            }
          } catch (error: any) {
            testResults.push({
              testCaseId: testCase._id.toString(),
              passed: false,
              actualOutput: '',
              errorMessage: `Test execution error: ${error.message}`,
            });
          }
        }
      }

      // Calculate score based on passed test cases
      const totalTests = exercise.testCases?.length || 1;
      const score = Math.round((passedTests / totalTests) * 100);
      const isCorrect = score >= 70; // 70% threshold for correctness

      // Generate feedback
      let feedback = '';
      if (score === 100) {
        feedback = 'Excellent! All test cases passed. Your solution is correct.';
      } else if (score >= 70) {
        feedback = `Good work! ${passedTests}/${totalTests} test cases passed. Score: ${score}%`;
      } else if (score > 0) {
        feedback = `Keep trying! ${passedTests}/${totalTests} test cases passed. Review the failed test cases and try again.`;
      } else {
        feedback = 'No test cases passed. Please review the problem requirements and try again.';
      }

      // Add specific feedback for failed tests
      if (passedTests < totalTests) {
        const failedTests = testResults.filter(t => !t.passed);
        if (failedTests.length > 0) {
          feedback += ' Failed tests: ' + failedTests.map(t => t.errorMessage).join('; ');
        }
      }

      return {
        isCorrect,
        score,
        feedback,
        testResults,
        executionTime: Date.now() - startTime,
        codeQuality: this.analyzeCodeQuality(submissionData.code || ''),
      };

    } catch (error: any) {
      return {
        isCorrect: false,
        score: 0,
        feedback: `Code evaluation failed: ${error.message}`,
        testResults,
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async evaluateQuizExercise(exercise: any, submissionData: SubmitExerciseRequest): Promise<any> {
    // For quiz exercises, compare the answer against correct answers
    try {
      const userAnswer = submissionData.answer?.trim().toLowerCase() || '';
      let isCorrect = false;
      let score = 0;

      // Simple answer comparison (in practice, you'd have more sophisticated logic)
      if (exercise.solution) {
        const correctAnswer = exercise.solution.trim().toLowerCase();
        isCorrect = userAnswer === correctAnswer;
        score = isCorrect ? 100 : 0;
      }

      const feedback = isCorrect
        ? 'Correct! Well done.'
        : 'Incorrect answer. Please review the material and try again.';

      return {
        isCorrect,
        score,
        feedback,
        testResults: [{
          testCaseId: 'quiz-answer',
          passed: isCorrect,
          actualOutput: userAnswer,
          errorMessage: isCorrect ? '' : 'Answer does not match expected solution',
        }],
        executionTime: 0,
      };
    } catch (error: any) {
      return {
        isCorrect: false,
        score: 0,
        feedback: `Quiz evaluation failed: ${error.message}`,
        testResults: [],
        executionTime: 0,
      };
    }
  }

  private async evaluateAssignmentExercise(_exercise: any, _submissionData: SubmitExerciseRequest): Promise<any> {
    // Assignment exercises require manual grading, so we just save the submission
    return {
      isCorrect: false, // Will be updated when manually graded
      score: 0, // Will be updated when manually graded
      feedback: 'Assignment submitted successfully. Awaiting instructor review.',
      testResults: [],
      executionTime: 0,
    };
  }

  private async executeCodeWithTestCase(
    code: string,
    testCase: any,
    _language: string,
  ): Promise<{ passed: boolean; actualOutput: string; errorMessage: string }> {
    // This is a simplified mock implementation
    // In a real system, you would use a secure sandboxed execution environment
    try {
      // For now, we'll do basic pattern matching and mock execution
      if (!code || code.trim().length === 0) {
        return {
          passed: false,
          actualOutput: '',
          errorMessage: 'No code provided',
        };
      }

      // Mock execution: simple pattern matching for common cases
      const expectedOutput = testCase.expectedOutput.trim();
      let actualOutput = '';

      // Very basic simulation - in practice, you'd execute in a sandbox
      if (code.includes('console.log') || code.includes('print')) {
        // Extract potential output patterns
        if (code.includes('"Hello World"') || code.includes("'Hello World'")) {
          actualOutput = 'Hello World';
        } else if (code.includes('input') && testCase.input) {
          // Mock processing of input
          actualOutput = `Processed: ${testCase.input}`;
        } else {
          actualOutput = 'Output generated';
        }
      }

      const passed = actualOutput.trim() === expectedOutput;

      return {
        passed,
        actualOutput,
        errorMessage: passed ? '' : `Expected "${expectedOutput}", got "${actualOutput}"`,
      };

    } catch (error: any) {
      return {
        passed: false,
        actualOutput: '',
        errorMessage: `Execution error: ${error.message}`,
      };
    }
  }

  private analyzeCodeQuality(code: string): any {
    // Basic code quality analysis
    const lines = code.split('\n').filter(line => line.trim().length > 0);
    const linesOfCode = lines.length;

    // Simple heuristics for code quality
    const codeSmells = [];
    if (linesOfCode > 50) {
      codeSmells.push('Long function - consider breaking into smaller functions');
    }
    if (code.includes('var ')) {
      codeSmells.push('Use let/const instead of var');
    }
    if (!code.includes('//') && !code.includes('/*')) {
      codeSmells.push('Consider adding comments to explain your code');
    }

    return {
      linesOfCode,
      complexity: Math.min(Math.floor(linesOfCode / 5), 10), // Simple complexity score
      duplicateLines: 0, // Would require more sophisticated analysis
      codeSmells,
    };
  }

  // =============================================================================
  // PERMISSION HELPERS
  // =============================================================================

  private canModifyCourse(course: CourseDocument, userId: string, userRole: UserRole): boolean {
    // Admins can modify any course
    if (userRole === 'admin') {
      return true;
    }

    // Teachers and staff can modify courses they created or are collaborators on
    if (userRole === 'teacher' || userRole === 'staff') {
      // Check if user is the instructor
      if (course.instructor._id.toString() === userId) {
        return true;
      }

      // Check if user is a collaborator
      return course.collaborators.some(
        collaborator => collaborator._id.toString() === userId,
      );
    }

    return false;
  }

}
