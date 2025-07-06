import { Document, Model } from 'mongoose';
export interface Promotion extends Document {
    name: string;
    code: string;
    description?: string;
    startYear: number;
    endYear: number;
    students: string[];
    courses: string[];
    coordinator: string;
    status: 'active' | 'completed' | 'suspended';
    specialization?: string;
    capacity: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface PromotionModel extends Model<Promotion> {
    findByYear(year: number): Promise<Promotion[]>;
    findByCoordinator(coordinatorId: string): Promise<Promotion[]>;
    findActive(): Promise<Promotion[]>;
    addStudent(promotionId: string, studentId: string): Promise<boolean>;
    removeStudent(promotionId: string, studentId: string): Promise<boolean>;
    addCourse(promotionId: string, courseId: string): Promise<boolean>;
    removeCourse(promotionId: string, courseId: string): Promise<boolean>;
}
export declare const PromotionModel: PromotionModel;
//# sourceMappingURL=Promotion.d.ts.map