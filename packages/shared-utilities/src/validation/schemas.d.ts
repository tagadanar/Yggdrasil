import { z } from 'zod';
export declare const userRoleSchema: z.ZodEnum<["admin", "staff", "teacher", "student"]>;
export declare const contactInfoSchema: z.ZodObject<{
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    emergencyContact: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
        relation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        phone: string;
        relation: string;
    }, {
        name: string;
        phone: string;
        relation: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    phone?: string | undefined;
    address?: string | undefined;
    emergencyContact?: {
        name: string;
        phone: string;
        relation: string;
    } | undefined;
}, {
    phone?: string | undefined;
    address?: string | undefined;
    emergencyContact?: {
        name: string;
        phone: string;
        relation: string;
    } | undefined;
}>;
export declare const userProfileSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    photo: z.ZodOptional<z.ZodString>;
    studentId: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
    specialties: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    bio: z.ZodOptional<z.ZodString>;
    officeHours: z.ZodOptional<z.ZodString>;
    promotion: z.ZodOptional<z.ZodString>;
    contactInfo: z.ZodOptional<z.ZodObject<{
        phone: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        emergencyContact: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            phone: z.ZodString;
            relation: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            phone: string;
            relation: string;
        }, {
            name: string;
            phone: string;
            relation: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        phone?: string | undefined;
        address?: string | undefined;
        emergencyContact?: {
            name: string;
            phone: string;
            relation: string;
        } | undefined;
    }, {
        phone?: string | undefined;
        address?: string | undefined;
        emergencyContact?: {
            name: string;
            phone: string;
            relation: string;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    photo?: string | undefined;
    studentId?: string | undefined;
    department?: string | undefined;
    specialties?: string[] | undefined;
    bio?: string | undefined;
    officeHours?: string | undefined;
    promotion?: string | undefined;
    contactInfo?: {
        phone?: string | undefined;
        address?: string | undefined;
        emergencyContact?: {
            name: string;
            phone: string;
            relation: string;
        } | undefined;
    } | undefined;
}, {
    firstName: string;
    lastName: string;
    photo?: string | undefined;
    studentId?: string | undefined;
    department?: string | undefined;
    specialties?: string[] | undefined;
    bio?: string | undefined;
    officeHours?: string | undefined;
    promotion?: string | undefined;
    contactInfo?: {
        phone?: string | undefined;
        address?: string | undefined;
        emergencyContact?: {
            name: string;
            phone: string;
            relation: string;
        } | undefined;
    } | undefined;
}>;
export declare const notificationPreferencesSchema: z.ZodObject<{
    scheduleChanges: z.ZodDefault<z.ZodBoolean>;
    newAnnouncements: z.ZodDefault<z.ZodBoolean>;
    assignmentReminders: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    scheduleChanges: boolean;
    newAnnouncements: boolean;
    assignmentReminders: boolean;
}, {
    scheduleChanges?: boolean | undefined;
    newAnnouncements?: boolean | undefined;
    assignmentReminders?: boolean | undefined;
}>;
export declare const accessibilityPreferencesSchema: z.ZodObject<{
    colorblindMode: z.ZodDefault<z.ZodBoolean>;
    fontSize: z.ZodDefault<z.ZodEnum<["small", "medium", "large"]>>;
    highContrast: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    colorblindMode: boolean;
    fontSize: "medium" | "small" | "large";
    highContrast: boolean;
}, {
    colorblindMode?: boolean | undefined;
    fontSize?: "medium" | "small" | "large" | undefined;
    highContrast?: boolean | undefined;
}>;
export declare const userPreferencesSchema: z.ZodObject<{
    language: z.ZodDefault<z.ZodString>;
    notifications: z.ZodObject<{
        scheduleChanges: z.ZodDefault<z.ZodBoolean>;
        newAnnouncements: z.ZodDefault<z.ZodBoolean>;
        assignmentReminders: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        scheduleChanges: boolean;
        newAnnouncements: boolean;
        assignmentReminders: boolean;
    }, {
        scheduleChanges?: boolean | undefined;
        newAnnouncements?: boolean | undefined;
        assignmentReminders?: boolean | undefined;
    }>;
    accessibility: z.ZodObject<{
        colorblindMode: z.ZodDefault<z.ZodBoolean>;
        fontSize: z.ZodDefault<z.ZodEnum<["small", "medium", "large"]>>;
        highContrast: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        colorblindMode: boolean;
        fontSize: "medium" | "small" | "large";
        highContrast: boolean;
    }, {
        colorblindMode?: boolean | undefined;
        fontSize?: "medium" | "small" | "large" | undefined;
        highContrast?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    language: string;
    notifications: {
        scheduleChanges: boolean;
        newAnnouncements: boolean;
        assignmentReminders: boolean;
    };
    accessibility: {
        colorblindMode: boolean;
        fontSize: "medium" | "small" | "large";
        highContrast: boolean;
    };
}, {
    notifications: {
        scheduleChanges?: boolean | undefined;
        newAnnouncements?: boolean | undefined;
        assignmentReminders?: boolean | undefined;
    };
    accessibility: {
        colorblindMode?: boolean | undefined;
        fontSize?: "medium" | "small" | "large" | undefined;
        highContrast?: boolean | undefined;
    };
    language?: string | undefined;
}>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<["admin", "staff", "teacher", "student"]>;
    profile: z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodString;
        photo: z.ZodOptional<z.ZodString>;
        studentId: z.ZodOptional<z.ZodString>;
        department: z.ZodOptional<z.ZodString>;
        specialties: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        bio: z.ZodOptional<z.ZodString>;
        officeHours: z.ZodOptional<z.ZodString>;
        promotion: z.ZodOptional<z.ZodString>;
        contactInfo: z.ZodOptional<z.ZodObject<{
            phone: z.ZodOptional<z.ZodString>;
            address: z.ZodOptional<z.ZodString>;
            emergencyContact: z.ZodOptional<z.ZodObject<{
                name: z.ZodString;
                phone: z.ZodString;
                relation: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                phone: string;
                relation: string;
            }, {
                name: string;
                phone: string;
                relation: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        }, {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        firstName: string;
        lastName: string;
        photo?: string | undefined;
        studentId?: string | undefined;
        department?: string | undefined;
        specialties?: string[] | undefined;
        bio?: string | undefined;
        officeHours?: string | undefined;
        promotion?: string | undefined;
        contactInfo?: {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        } | undefined;
    }, {
        firstName: string;
        lastName: string;
        photo?: string | undefined;
        studentId?: string | undefined;
        department?: string | undefined;
        specialties?: string[] | undefined;
        bio?: string | undefined;
        officeHours?: string | undefined;
        promotion?: string | undefined;
        contactInfo?: {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        } | undefined;
    }>;
    preferences: z.ZodOptional<z.ZodObject<{
        language: z.ZodDefault<z.ZodString>;
        notifications: z.ZodObject<{
            scheduleChanges: z.ZodDefault<z.ZodBoolean>;
            newAnnouncements: z.ZodDefault<z.ZodBoolean>;
            assignmentReminders: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            scheduleChanges: boolean;
            newAnnouncements: boolean;
            assignmentReminders: boolean;
        }, {
            scheduleChanges?: boolean | undefined;
            newAnnouncements?: boolean | undefined;
            assignmentReminders?: boolean | undefined;
        }>;
        accessibility: z.ZodObject<{
            colorblindMode: z.ZodDefault<z.ZodBoolean>;
            fontSize: z.ZodDefault<z.ZodEnum<["small", "medium", "large"]>>;
            highContrast: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            colorblindMode: boolean;
            fontSize: "medium" | "small" | "large";
            highContrast: boolean;
        }, {
            colorblindMode?: boolean | undefined;
            fontSize?: "medium" | "small" | "large" | undefined;
            highContrast?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        language: string;
        notifications: {
            scheduleChanges: boolean;
            newAnnouncements: boolean;
            assignmentReminders: boolean;
        };
        accessibility: {
            colorblindMode: boolean;
            fontSize: "medium" | "small" | "large";
            highContrast: boolean;
        };
    }, {
        notifications: {
            scheduleChanges?: boolean | undefined;
            newAnnouncements?: boolean | undefined;
            assignmentReminders?: boolean | undefined;
        };
        accessibility: {
            colorblindMode?: boolean | undefined;
            fontSize?: "medium" | "small" | "large" | undefined;
            highContrast?: boolean | undefined;
        };
        language?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    role: "admin" | "staff" | "teacher" | "student";
    profile: {
        firstName: string;
        lastName: string;
        photo?: string | undefined;
        studentId?: string | undefined;
        department?: string | undefined;
        specialties?: string[] | undefined;
        bio?: string | undefined;
        officeHours?: string | undefined;
        promotion?: string | undefined;
        contactInfo?: {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        } | undefined;
    };
    preferences?: {
        language: string;
        notifications: {
            scheduleChanges: boolean;
            newAnnouncements: boolean;
            assignmentReminders: boolean;
        };
        accessibility: {
            colorblindMode: boolean;
            fontSize: "medium" | "small" | "large";
            highContrast: boolean;
        };
    } | undefined;
}, {
    email: string;
    password: string;
    role: "admin" | "staff" | "teacher" | "student";
    profile: {
        firstName: string;
        lastName: string;
        photo?: string | undefined;
        studentId?: string | undefined;
        department?: string | undefined;
        specialties?: string[] | undefined;
        bio?: string | undefined;
        officeHours?: string | undefined;
        promotion?: string | undefined;
        contactInfo?: {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        } | undefined;
    };
    preferences?: {
        notifications: {
            scheduleChanges?: boolean | undefined;
            newAnnouncements?: boolean | undefined;
            assignmentReminders?: boolean | undefined;
        };
        accessibility: {
            colorblindMode?: boolean | undefined;
            fontSize?: "medium" | "small" | "large" | undefined;
            highContrast?: boolean | undefined;
        };
        language?: string | undefined;
    } | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    profile: z.ZodOptional<z.ZodObject<{
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        photo: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        studentId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        department: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        specialties: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        bio: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        officeHours: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        promotion: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        contactInfo: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            phone: z.ZodOptional<z.ZodString>;
            address: z.ZodOptional<z.ZodString>;
            emergencyContact: z.ZodOptional<z.ZodObject<{
                name: z.ZodString;
                phone: z.ZodString;
                relation: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                phone: string;
                relation: string;
            }, {
                name: string;
                phone: string;
                relation: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        }, {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        firstName?: string | undefined;
        lastName?: string | undefined;
        photo?: string | undefined;
        studentId?: string | undefined;
        department?: string | undefined;
        specialties?: string[] | undefined;
        bio?: string | undefined;
        officeHours?: string | undefined;
        promotion?: string | undefined;
        contactInfo?: {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        } | undefined;
    }, {
        firstName?: string | undefined;
        lastName?: string | undefined;
        photo?: string | undefined;
        studentId?: string | undefined;
        department?: string | undefined;
        specialties?: string[] | undefined;
        bio?: string | undefined;
        officeHours?: string | undefined;
        promotion?: string | undefined;
        contactInfo?: {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        } | undefined;
    }>>;
    preferences: z.ZodOptional<z.ZodObject<{
        language: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        notifications: z.ZodOptional<z.ZodObject<{
            scheduleChanges: z.ZodDefault<z.ZodBoolean>;
            newAnnouncements: z.ZodDefault<z.ZodBoolean>;
            assignmentReminders: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            scheduleChanges: boolean;
            newAnnouncements: boolean;
            assignmentReminders: boolean;
        }, {
            scheduleChanges?: boolean | undefined;
            newAnnouncements?: boolean | undefined;
            assignmentReminders?: boolean | undefined;
        }>>;
        accessibility: z.ZodOptional<z.ZodObject<{
            colorblindMode: z.ZodDefault<z.ZodBoolean>;
            fontSize: z.ZodDefault<z.ZodEnum<["small", "medium", "large"]>>;
            highContrast: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            colorblindMode: boolean;
            fontSize: "medium" | "small" | "large";
            highContrast: boolean;
        }, {
            colorblindMode?: boolean | undefined;
            fontSize?: "medium" | "small" | "large" | undefined;
            highContrast?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        language?: string | undefined;
        notifications?: {
            scheduleChanges: boolean;
            newAnnouncements: boolean;
            assignmentReminders: boolean;
        } | undefined;
        accessibility?: {
            colorblindMode: boolean;
            fontSize: "medium" | "small" | "large";
            highContrast: boolean;
        } | undefined;
    }, {
        language?: string | undefined;
        notifications?: {
            scheduleChanges?: boolean | undefined;
            newAnnouncements?: boolean | undefined;
            assignmentReminders?: boolean | undefined;
        } | undefined;
        accessibility?: {
            colorblindMode?: boolean | undefined;
            fontSize?: "medium" | "small" | "large" | undefined;
            highContrast?: boolean | undefined;
        } | undefined;
    }>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    profile?: {
        firstName?: string | undefined;
        lastName?: string | undefined;
        photo?: string | undefined;
        studentId?: string | undefined;
        department?: string | undefined;
        specialties?: string[] | undefined;
        bio?: string | undefined;
        officeHours?: string | undefined;
        promotion?: string | undefined;
        contactInfo?: {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        } | undefined;
    } | undefined;
    preferences?: {
        language?: string | undefined;
        notifications?: {
            scheduleChanges: boolean;
            newAnnouncements: boolean;
            assignmentReminders: boolean;
        } | undefined;
        accessibility?: {
            colorblindMode: boolean;
            fontSize: "medium" | "small" | "large";
            highContrast: boolean;
        } | undefined;
    } | undefined;
    isActive?: boolean | undefined;
}, {
    profile?: {
        firstName?: string | undefined;
        lastName?: string | undefined;
        photo?: string | undefined;
        studentId?: string | undefined;
        department?: string | undefined;
        specialties?: string[] | undefined;
        bio?: string | undefined;
        officeHours?: string | undefined;
        promotion?: string | undefined;
        contactInfo?: {
            phone?: string | undefined;
            address?: string | undefined;
            emergencyContact?: {
                name: string;
                phone: string;
                relation: string;
            } | undefined;
        } | undefined;
    } | undefined;
    preferences?: {
        language?: string | undefined;
        notifications?: {
            scheduleChanges?: boolean | undefined;
            newAnnouncements?: boolean | undefined;
            assignmentReminders?: boolean | undefined;
        } | undefined;
        accessibility?: {
            colorblindMode?: boolean | undefined;
            fontSize?: "medium" | "small" | "large" | undefined;
            highContrast?: boolean | undefined;
        } | undefined;
    } | undefined;
    isActive?: boolean | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const courseLevelSchema: z.ZodEnum<["beginner", "intermediate", "advanced", "expert"]>;
export declare const courseCategorySchema: z.ZodEnum<["programming", "web-development", "mobile-development", "data-science", "artificial-intelligence", "cybersecurity", "cloud-computing", "devops", "database", "design", "project-management", "soft-skills", "other"]>;
export declare const courseStatusSchema: z.ZodEnum<["draft", "published", "archived", "cancelled"]>;
export declare const courseVisibilitySchema: z.ZodEnum<["public", "private", "restricted"]>;
export declare const courseDurationSchema: z.ZodObject<{
    weeks: z.ZodNumber;
    hoursPerWeek: z.ZodNumber;
    totalHours: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    weeks: number;
    hoursPerWeek: number;
    totalHours: number;
}, {
    weeks: number;
    hoursPerWeek: number;
    totalHours: number;
}>;
export declare const courseScheduleSchema: z.ZodObject<{
    dayOfWeek: z.ZodNumber;
    startTime: z.ZodString;
    endTime: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
    type: z.ZodDefault<z.ZodEnum<["lecture", "practical", "exam", "project"]>>;
}, "strip", z.ZodTypeAny, {
    type: "lecture" | "practical" | "exam" | "project";
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location?: string | undefined;
}, {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    type?: "lecture" | "practical" | "exam" | "project" | undefined;
    location?: string | undefined;
}>;
export declare const createCourseSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    code: z.ZodString;
    credits: z.ZodNumber;
    level: z.ZodEnum<["beginner", "intermediate", "advanced", "expert"]>;
    category: z.ZodEnum<["programming", "web-development", "mobile-development", "data-science", "artificial-intelligence", "cybersecurity", "cloud-computing", "devops", "database", "design", "project-management", "soft-skills", "other"]>;
    duration: z.ZodObject<{
        weeks: z.ZodNumber;
        hoursPerWeek: z.ZodNumber;
        totalHours: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    }, {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    }>;
    schedule: z.ZodDefault<z.ZodArray<z.ZodObject<{
        dayOfWeek: z.ZodNumber;
        startTime: z.ZodString;
        endTime: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        type: z.ZodDefault<z.ZodEnum<["lecture", "practical", "exam", "project"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "lecture" | "practical" | "exam" | "project";
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location?: string | undefined;
    }, {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        type?: "lecture" | "practical" | "exam" | "project" | undefined;
        location?: string | undefined;
    }>, "many">>;
    capacity: z.ZodNumber;
    prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    visibility: z.ZodDefault<z.ZodEnum<["public", "private", "restricted"]>>;
    startDate: z.ZodDate;
    endDate: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    code: string;
    title: string;
    startDate: Date;
    description: string;
    credits: number;
    level: "beginner" | "intermediate" | "advanced" | "expert";
    category: "programming" | "web-development" | "mobile-development" | "data-science" | "artificial-intelligence" | "cybersecurity" | "cloud-computing" | "devops" | "database" | "design" | "project-management" | "soft-skills" | "other";
    duration: {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    };
    schedule: {
        type: "lecture" | "practical" | "exam" | "project";
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location?: string | undefined;
    }[];
    capacity: number;
    visibility: "public" | "private" | "restricted";
    endDate: Date;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
}, {
    code: string;
    title: string;
    startDate: Date;
    description: string;
    credits: number;
    level: "beginner" | "intermediate" | "advanced" | "expert";
    category: "programming" | "web-development" | "mobile-development" | "data-science" | "artificial-intelligence" | "cybersecurity" | "cloud-computing" | "devops" | "database" | "design" | "project-management" | "soft-skills" | "other";
    duration: {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    };
    capacity: number;
    endDate: Date;
    schedule?: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        type?: "lecture" | "practical" | "exam" | "project" | undefined;
        location?: string | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    visibility?: "public" | "private" | "restricted" | undefined;
}>, {
    code: string;
    title: string;
    startDate: Date;
    description: string;
    credits: number;
    level: "beginner" | "intermediate" | "advanced" | "expert";
    category: "programming" | "web-development" | "mobile-development" | "data-science" | "artificial-intelligence" | "cybersecurity" | "cloud-computing" | "devops" | "database" | "design" | "project-management" | "soft-skills" | "other";
    duration: {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    };
    schedule: {
        type: "lecture" | "practical" | "exam" | "project";
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location?: string | undefined;
    }[];
    capacity: number;
    visibility: "public" | "private" | "restricted";
    endDate: Date;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
}, {
    code: string;
    title: string;
    startDate: Date;
    description: string;
    credits: number;
    level: "beginner" | "intermediate" | "advanced" | "expert";
    category: "programming" | "web-development" | "mobile-development" | "data-science" | "artificial-intelligence" | "cybersecurity" | "cloud-computing" | "devops" | "database" | "design" | "project-management" | "soft-skills" | "other";
    duration: {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    };
    capacity: number;
    endDate: Date;
    schedule?: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        type?: "lecture" | "practical" | "exam" | "project" | undefined;
        location?: string | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    visibility?: "public" | "private" | "restricted" | undefined;
}>;
export declare const updateCourseSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    credits: z.ZodOptional<z.ZodNumber>;
    level: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced", "expert"]>>;
    category: z.ZodOptional<z.ZodEnum<["programming", "web-development", "mobile-development", "data-science", "artificial-intelligence", "cybersecurity", "cloud-computing", "devops", "database", "design", "project-management", "soft-skills", "other"]>>;
    duration: z.ZodOptional<z.ZodObject<{
        weeks: z.ZodNumber;
        hoursPerWeek: z.ZodNumber;
        totalHours: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    }, {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    }>>;
    schedule: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        dayOfWeek: z.ZodNumber;
        startTime: z.ZodString;
        endTime: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        type: z.ZodDefault<z.ZodEnum<["lecture", "practical", "exam", "project"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "lecture" | "practical" | "exam" | "project";
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location?: string | undefined;
    }, {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        type?: "lecture" | "practical" | "exam" | "project" | undefined;
        location?: string | undefined;
    }>, "many">>>;
    capacity: z.ZodOptional<z.ZodNumber>;
    prerequisites: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    visibility: z.ZodOptional<z.ZodDefault<z.ZodEnum<["public", "private", "restricted"]>>>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    title?: string | undefined;
    startDate?: Date | undefined;
    description?: string | undefined;
    credits?: number | undefined;
    level?: "beginner" | "intermediate" | "advanced" | "expert" | undefined;
    category?: "programming" | "web-development" | "mobile-development" | "data-science" | "artificial-intelligence" | "cybersecurity" | "cloud-computing" | "devops" | "database" | "design" | "project-management" | "soft-skills" | "other" | undefined;
    duration?: {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    } | undefined;
    schedule?: {
        type: "lecture" | "practical" | "exam" | "project";
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location?: string | undefined;
    }[] | undefined;
    capacity?: number | undefined;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    visibility?: "public" | "private" | "restricted" | undefined;
    endDate?: Date | undefined;
}, {
    code?: string | undefined;
    title?: string | undefined;
    startDate?: Date | undefined;
    description?: string | undefined;
    credits?: number | undefined;
    level?: "beginner" | "intermediate" | "advanced" | "expert" | undefined;
    category?: "programming" | "web-development" | "mobile-development" | "data-science" | "artificial-intelligence" | "cybersecurity" | "cloud-computing" | "devops" | "database" | "design" | "project-management" | "soft-skills" | "other" | undefined;
    duration?: {
        weeks: number;
        hoursPerWeek: number;
        totalHours: number;
    } | undefined;
    schedule?: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        type?: "lecture" | "practical" | "exam" | "project" | undefined;
        location?: string | undefined;
    }[] | undefined;
    capacity?: number | undefined;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    visibility?: "public" | "private" | "restricted" | undefined;
    endDate?: Date | undefined;
}>;
export declare const recurringPatternSchema: z.ZodObject<{
    type: z.ZodEnum<["daily", "weekly", "monthly"]>;
    interval: z.ZodNumber;
    endDate: z.ZodOptional<z.ZodDate>;
    daysOfWeek: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: Date | undefined;
    daysOfWeek?: number[] | undefined;
}, {
    type: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: Date | undefined;
    daysOfWeek?: number[] | undefined;
}>;
export declare const createEventSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodDate;
    endDate: z.ZodDate;
    type: z.ZodEnum<["class", "exam", "meeting", "event"]>;
    attendees: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    location: z.ZodOptional<z.ZodString>;
    isRecurring: z.ZodDefault<z.ZodBoolean>;
    recurringPattern: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["daily", "weekly", "monthly"]>;
        interval: z.ZodNumber;
        endDate: z.ZodOptional<z.ZodDate>;
        daysOfWeek: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    }, {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "exam" | "class" | "meeting" | "event";
    title: string;
    startDate: Date;
    endDate: Date;
    attendees: string[];
    isRecurring: boolean;
    location?: string | undefined;
    description?: string | undefined;
    recurringPattern?: {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    } | undefined;
}, {
    type: "exam" | "class" | "meeting" | "event";
    title: string;
    startDate: Date;
    endDate: Date;
    location?: string | undefined;
    description?: string | undefined;
    attendees?: string[] | undefined;
    isRecurring?: boolean | undefined;
    recurringPattern?: {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    } | undefined;
}>, {
    type: "exam" | "class" | "meeting" | "event";
    title: string;
    startDate: Date;
    endDate: Date;
    attendees: string[];
    isRecurring: boolean;
    location?: string | undefined;
    description?: string | undefined;
    recurringPattern?: {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    } | undefined;
}, {
    type: "exam" | "class" | "meeting" | "event";
    title: string;
    startDate: Date;
    endDate: Date;
    location?: string | undefined;
    description?: string | undefined;
    attendees?: string[] | undefined;
    isRecurring?: boolean | undefined;
    recurringPattern?: {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    } | undefined;
}>;
export declare const updateEventSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    type: z.ZodOptional<z.ZodEnum<["class", "exam", "meeting", "event"]>>;
    attendees: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    location: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isRecurring: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    recurringPattern: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["daily", "weekly", "monthly"]>;
        interval: z.ZodNumber;
        endDate: z.ZodOptional<z.ZodDate>;
        daysOfWeek: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    }, {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    type?: "exam" | "class" | "meeting" | "event" | undefined;
    title?: string | undefined;
    startDate?: Date | undefined;
    location?: string | undefined;
    description?: string | undefined;
    endDate?: Date | undefined;
    attendees?: string[] | undefined;
    isRecurring?: boolean | undefined;
    recurringPattern?: {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    } | undefined;
}, {
    type?: "exam" | "class" | "meeting" | "event" | undefined;
    title?: string | undefined;
    startDate?: Date | undefined;
    location?: string | undefined;
    description?: string | undefined;
    endDate?: Date | undefined;
    attendees?: string[] | undefined;
    isRecurring?: boolean | undefined;
    recurringPattern?: {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: Date | undefined;
        daysOfWeek?: number[] | undefined;
    } | undefined;
}>;
export declare const createNewsSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    category: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isPublished: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    category: string;
    tags: string[];
    content: string;
    isPublished: boolean;
}, {
    title: string;
    category: string;
    content: string;
    tags?: string[] | undefined;
    isPublished?: boolean | undefined;
}>;
export declare const updateNewsSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    isPublished: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
    content?: string | undefined;
    isPublished?: boolean | undefined;
}, {
    title?: string | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
    content?: string | undefined;
    isPublished?: boolean | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const searchSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
} & {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    category?: string | undefined;
    tags?: string[] | undefined;
    query?: string | undefined;
}, {
    category?: string | undefined;
    tags?: string[] | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    query?: string | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map