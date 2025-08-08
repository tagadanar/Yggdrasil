# 🎓 Yggdrasil Promotion System Migration Guide

This guide covers the complete migration from the legacy enrollment-based system to the new promotion-based cohort management system.

## 🚨 **CRITICAL: Read This First**

**This migration is IRREVERSIBLE without proper backup!**

The promotion system fundamentally changes how students access courses:
- **OLD**: Students enrolled directly in individual courses
- **NEW**: Students belong to promotions (cohorts) and access courses through promotion events

## 📋 Pre-Migration Checklist

### ✅ **Required Preparations**

1. **Complete Database Backup**
   ```bash
   # Create full MongoDB backup
   mongodump --uri="mongodb://localhost:27018/yggdrasil-dev" --out=./pre-migration-backup
   ```

2. **Stop All Services**
   ```bash
   # Stop all running services
   npm run dev:stop
   pkill -f "ts-node-dev|next|node.*service" || true
   ```

3. **Verify Database State**
   ```bash
   # Check current enrollment data
   mongosh mongodb://localhost:27018/yggdrasil-dev --eval "
     print('Course Enrollments:', db.course_enrollments.countDocuments());
     print('Enrollment Data:', db.enrollments.countDocuments());
     print('Users:', db.users.countDocuments());
     print('Courses:', db.courses.countDocuments());
   "
   ```

4. **Test Environment Readiness**
   ```bash
   # Ensure all packages are built
   npm run build
   npm run typecheck
   ```

## 🔄 Migration Process

### **Step 1: Dry Run (Recommended)**

Always start with a dry run to see what the migration will do:

```bash
# Run migration in dry-run mode
node scripts/migrate-to-promotions.js --dry-run
```

**Review the output carefully:**
- Check identified cohorts make sense
- Verify student-to-promotion assignments
- Look for any warnings or potential issues

### **Step 2: Production Migration**

**⚠️ FINAL WARNING**: This permanently modifies your database!

```bash
# Run the actual migration
node scripts/migrate-to-promotions.js
```

**The script will:**
1. ✅ Create automatic backup in `./migration-backup/`
2. 🔍 Analyze existing enrollment patterns
3. 🎯 Create promotions based on enrollment cohorts
4. 🔗 Create events linking courses to promotions
5. 👥 Assign students to appropriate promotions
6. 💾 Preserve all progress and submission data
7. 🗑️ Remove legacy enrollment collections
8. 📊 Generate detailed migration report

### **Step 3: Post-Migration Verification**

```bash
# Verify migration results
mongosh mongodb://localhost:27018/yggdrasil-dev --eval "
  print('Promotions Created:', db.promotions.countDocuments());
  print('Events Created:', db.events.countDocuments());
  print('Users with Promotions:', db.users.countDocuments({currentPromotionId: {$exists: true}}));
  print('Legacy Collections Removed:', !db.course_enrollments.findOne());
"
```

## 🎯 What the Migration Creates

### **Promotions (Academic Cohorts)**
- **September Intake**: Students starting in fall semester
- **March Intake**: Students starting in spring semester  
- **Semester Progression**: 1-10 semesters over 5 years
- **Automatic Naming**: "September 2024-2025 - Semester 1"

### **Events (Course Delivery)**
- Links specific courses to specific promotions
- Maintains teacher assignments
- Preserves course scheduling information
- Creates promotion-based course access

### **Student Assignments**
- Each student assigned to exactly ONE current promotion
- Promotion history tracks academic progression
- Current promotion determines course access rights
- Maintains all existing progress data

## 🔧 Migration Results

### **Database Changes**

#### ✅ **Created Collections:**
- `promotions` - Academic cohorts with student lists
- `events` - Course delivery events for promotions

#### ✅ **Updated Collections:**
- `users` - Added `currentPromotionId` and `promotionHistory`
- `events` - Added `promotionIds` and `teacherId` fields

#### ❌ **Removed Collections:**
- `course_enrollments` - Legacy direct enrollment records
- `enrollments` - Legacy enrollment data (progress/submissions preserved separately)

#### 💾 **Preserved Collections:**
- `progress` - All student progress maintained
- `submissions` - All exercise submissions maintained
- `users`, `courses`, `news_articles` - All other data intact

### **Access Control Changes**

#### **Students:**
- Course access now via promotion membership
- View promotion calendar with scheduled events
- Access courses through promotion events only

#### **Teachers:**
- Assigned to specific events (not promotions)
- Can teach same course across multiple promotions
- Event-based teaching dashboard

#### **Admin/Staff:**
- Full promotion management capabilities
- Can create/modify promotions and assign students
- Event creation and teacher assignment

## 🆘 Rollback Process

If something goes wrong, you can rollback:

```bash
# Rollback to pre-migration state
node scripts/migrate-to-promotions.js --rollback
```

**Rollback restores:**
- All user records to original state
- Original enrollment collections
- Removes created promotions and events

**Rollback does NOT affect:**
- Progress and submission data (always preserved)
- News articles and other unrelated data

## 🧪 Testing After Migration

### **Critical Tests**

1. **Student Course Access**
   ```bash
   # Test student login and course access
   npm run test:single -- --grep "Student Promotion Calendar"
   npm run test:single -- --grep "Course Access Control"
   ```

2. **Teacher Event Management**
   ```bash
   # Test teacher dashboard and event access
   npm run test:single -- --grep "Teacher Event Dashboard"
   ```

3. **Admin Promotion Management**
   ```bash
   # Test promotion CRUD operations
   npm run test:single -- --grep "Complete promotion workflow"
   ```

4. **Data Integrity**
   ```bash
   # Verify no data loss
   npm run test:single -- --grep "System Integration"
   ```

### **Manual Verification**

1. **Login as different user types** (student, teacher, admin)
2. **Check course access** works through promotion calendar
3. **Verify progress data** is still accessible
4. **Test promotion management** from admin interface
5. **Confirm teacher event assignments** are correct

## 📊 Migration Report Analysis

The migration generates a detailed report covering:

### **Success Metrics:**
- ✅ Enrollments processed
- ✅ Promotions created
- ✅ Events created  
- ✅ Students assigned
- ✅ Data preserved

### **Issue Tracking:**
- ⚠️ Warnings for review
- ❌ Errors requiring attention
- 🔍 Edge cases handled

### **Validation Steps:**
- Database integrity checks
- User assignment verification
- Progress data preservation
- Event linkage confirmation

## 🚀 Go-Live Process

### **Final Steps:**

1. ✅ Verify migration completed successfully
2. ✅ Run full test suite passes
3. ✅ Manual testing completed
4. ✅ Migration report reviewed
5. ✅ Start services and verify functionality

```bash
# Start services after successful migration
npm run dev
```

6. ✅ Monitor application logs for any issues
7. ✅ Archive migration backup files
8. ✅ Update documentation and notify users

### **Post-Migration Monitoring:**

- **Authentication flows** - Verify login still works
- **Course access patterns** - Monitor promotion-based access
- **Teacher workflows** - Ensure event management works
- **Admin operations** - Check promotion management
- **Performance** - Monitor for any regression

## 🆘 Support Information

### **Common Issues:**

#### **"No promotion found for student"**
- **Cause**: Student had enrollments that don't match any cohort pattern
- **Solution**: Manually assign student to appropriate promotion via admin interface

#### **"Course not accessible"**  
- **Cause**: Course not linked to student's promotion through events
- **Solution**: Create event linking the course to the student's promotion

#### **"Teacher can't access course"**
- **Cause**: Teacher not assigned to course events
- **Solution**: Update event with correct teacherId

#### **"Progress data missing"**
- **Cause**: Progress data should be preserved automatically
- **Solution**: Check backup files and restore if needed

### **Emergency Contacts:**

If migration fails or causes issues:
1. **Immediately stop all services**
2. **Run rollback command**  
3. **Restore from manual database backup if needed**
4. **Contact development team**

### **Files Created:**

- ✅ `/migration-backup/` - Complete data backup
- ✅ `/migration-backup/migration-report.txt` - Detailed results
- ✅ `/migration-backup/migration-state.json` - Process state
- ✅ Individual collection backups (`.json` files)

---

**🎉 Congratulations!** You have successfully migrated to the promotion-based system. Students now belong to academic cohorts with structured semester progression, providing better cohort management and academic progression tracking.

**Questions?** Check the migration report and test the system thoroughly before considering the migration complete.