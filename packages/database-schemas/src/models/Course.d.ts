import { Document, Model } from 'mongoose';
import { CourseLevel, CourseCategory, CourseStatus, CourseVisibility, CourseDuration, CourseSchedule, CourseChapter, CourseResource, CourseAssessment } from '@101-school/shared-utilities';
export interface Course extends Document {
    title: string;
    description: string;
    code: string;
    credits: number;
    level: CourseLevel;
    category: CourseCategory;
    instructor: string;
    instructorInfo?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    duration: CourseDuration;
    schedule: CourseSchedule[];
    capacity: number;
    enrolledStudents: string[];
    prerequisites: string[];
    tags: string[];
    status: CourseStatus;
    visibility: CourseVisibility;
    chapters: CourseChapter[];
    resources: CourseResource[];
    assessments: CourseAssessment[];
    isActive: boolean;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    updatedAt: Date;
    enrollStudent(studentId: string): Promise<boolean>;
    unenrollStudent(studentId: string): Promise<boolean>;
    hasCapacity(): boolean;
    getEnrollmentCount(): number;
    isStudentEnrolled(studentId: string): boolean;
    canStudentEnroll(studentId: string): Promise<boolean>;
    updateProgress(studentId: string, chapterId: string, sectionId: string): Promise<void>;
    enrollmentCount: number;
    availableSpots: number;
    isEnrollmentOpen: boolean;
}
export interface CourseModel extends Model<Course> {
    findByInstructor(instructorId: string): Promise<Course[]>;
    findByCategory(category: CourseCategory): Promise<Course[]>;
    findByLevel(level: CourseLevel): Promise<Course[]>;
    findPublished(): Promise<Course[]>;
    findWithAvailableSpots(): Promise<Course[]>;
    searchCourses(query: string): Promise<Course[]>;
    getPopularCourses(limit?: number): Promise<Course[]>;
    getCourseStats(): Promise<any>;
}
export declare const CourseModel: CourseModel;
//# sourceMappingURL=Course.d.ts.map