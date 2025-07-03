// Path: packages/database-schemas/src/index.ts
export { DatabaseConnection } from './connection/database';

// User models
export type { User } from './models/User';
export { UserModel } from './models/User';

// Course models
export type { Course } from './models/Course';
export { CourseModel } from './models/Course';

// News models
export type { NewsArticle } from './models/News';
export { NewsModel } from './models/News';

// Schedule models
export type { CalendarEvent } from './models/Schedule';
export { ScheduleModel } from './models/Schedule';

// Statistics models
export type { UserStatistic, CourseStatistic, SystemStatistic } from './models/Statistics';
export { UserStatisticModel, CourseStatisticModel, SystemStatisticModel } from './models/Statistics';

// Audit Log models
export type { AuditLog } from './models/AuditLog';
export { AuditLogModel } from './models/AuditLog';

// Promotion models
export type { Promotion } from './models/Promotion';
export { PromotionModel } from './models/Promotion';