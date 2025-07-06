import { Document, Model } from 'mongoose';
import { User as IUser, UserRole } from '../../../shared-utilities/src';
interface DatabaseUser extends Omit<IUser, '_id'> {
    password: string;
}
export interface User extends DatabaseUser, Document {
    getFullName(): string;
    hasRole(role: UserRole | UserRole[]): boolean;
    isAdmin(): boolean;
    isStaff(): boolean;
    updateLastLogin(): Promise<void>;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
}
export interface UserModel extends Model<User> {
    findByEmail(email: string): Promise<User | null>;
    findByRole(role: UserRole): Promise<User[]>;
    findActive(): Promise<User[]>;
    findInactive(): Promise<User[]>;
    searchByName(query: string): Promise<User[]>;
    countByRole(): Promise<Array<{
        _id: UserRole;
        count: number;
    }>>;
}
export declare const UserModel: UserModel;
export {};
//# sourceMappingURL=User.d.ts.map