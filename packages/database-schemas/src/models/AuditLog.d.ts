import { Document, Model } from 'mongoose';
export interface AuditLog extends Document {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details: {
        before?: any;
        after?: any;
        metadata?: any;
    };
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'authentication' | 'authorization' | 'data' | 'system' | 'security';
}
export interface AuditLogModel extends Model<AuditLog> {
    logAction(userId: string, action: string, resource: string, details?: any, options?: {
        resourceId?: string;
        ipAddress?: string;
        userAgent?: string;
        sessionId?: string;
        severity?: string;
        category?: string;
    }): Promise<AuditLog>;
    findByUser(userId: string, limit?: number): Promise<AuditLog[]>;
    findByResource(resource: string, resourceId?: string): Promise<AuditLog[]>;
    findByAction(action: string): Promise<AuditLog[]>;
    findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]>;
    findSecurityEvents(): Promise<AuditLog[]>;
}
export declare const AuditLogModel: AuditLogModel;
//# sourceMappingURL=AuditLog.d.ts.map