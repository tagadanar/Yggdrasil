# Yggdrasil Test ID Standardization Guide

## 🎯 **CORE PRINCIPLES**

### 1. **Data-testid First Approach**
- **Primary**: Use `data-testid` for all interactive and testable elements
- **Secondary**: Use semantic selectors (`:has-text()`) for content verification
- **Avoid**: CSS class selectors for functional testing (reserved for styling)

### 2. **Consistent Naming Convention**
```typescript
// Format: [context]-[element]-[action?]
data-testid="nav-users"           // Navigation to users
data-testid="users-table"         // Users listing table
data-testid="create-user-button"  // Create user action
data-testid="edit-user-button"    // Edit user action
data-testid="delete-user-button"  // Delete user action
```

### 3. **Hierarchical Organization**
```typescript
// Page Level
data-testid="[page-name]-page"           // data-testid="users-page"

// Section Level  
data-testid="[section-name]-section"     // data-testid="user-list-section"

// Component Level
data-testid="[component-name]-container" // data-testid="user-card-container"

// Element Level
data-testid="[element-purpose]"          // data-testid="create-user-button"
```

## 📋 **STANDARDIZED PATTERNS**

### **Navigation Elements**
```typescript
data-testid="sidebar-nav"          // Main navigation container
data-testid="nav-[route]"          // Navigation links (nav-users, nav-courses)
data-testid="mobile-nav"           // Mobile navigation
data-testid="nav-toggle"           // Mobile nav toggle button
```

### **Page Elements**
```typescript
data-testid="[page]-page"          // Page container (users-page, courses-page)
data-testid="page-header"          // Page header section
data-testid="page-content"         // Main content area
data-testid="page-footer"          // Page footer
```

### **Form Elements**
```typescript
// Form Container
data-testid="[form-name]-form"     // user-form, course-form

// Input Fields
data-testid="[field-name]-input"   // email-input, password-input
data-testid="[field-name]-select"  // role-select, category-select
data-testid="[field-name]-textarea" // description-textarea

// Form Actions
data-testid="submit-button"        // Primary form submission
data-testid="cancel-button"        // Form cancellation
data-testid="save-button"          // Save/update action
```

### **Table Elements**
```typescript
data-testid="[entity]-table"       // users-table, courses-table
data-testid="[entity]-row"         // user-row, course-row
data-testid="table-header"         // Table header row
data-testid="table-body"           // Table body container
data-testid="no-data-message"      // Empty state message
```

### **Action Buttons**
```typescript
data-testid="create-[entity]-button"  // create-user-button, create-course-button
data-testid="edit-[entity]-button"    // edit-user-button, edit-course-button
data-testid="delete-[entity]-button"  // delete-user-button, delete-course-button
data-testid="view-[entity]-button"    // view-user-button, view-course-button
```

### **Modal/Dialog Elements**
```typescript
data-testid="[action]-modal"       // create-user-modal, delete-confirmation-modal
data-testid="modal-header"         // Modal header section
data-testid="modal-content"        // Modal body content
data-testid="modal-footer"         // Modal footer with actions
data-testid="modal-close"          // Modal close button
data-testid="confirm-button"       // Confirmation action
data-testid="cancel-button"        // Cancel action
```

### **State Elements**
```typescript
data-testid="loading-state"        // Loading indicators
data-testid="error-state"          // Error messages
data-testid="success-state"        // Success messages
data-testid="empty-state"          // Empty/no data states
```

### **Dashboard Elements**
```typescript
data-testid="[role]-dashboard"     // admin-dashboard, teacher-dashboard, student-dashboard
data-testid="[metric]-stat"        // total-users-stat, total-courses-stat
data-testid="[component]-chart"    // engagement-chart, progress-chart
data-testid="[section]-table"      // analytics-table, recent-activity-table
```

### **Authentication Elements**
```typescript
data-testid="login-form"           // Login form container
data-testid="email-input"          // Email input field
data-testid="password-input"       // Password input field
data-testid="login-button"         // Main login button
data-testid="demo-[role]-button"   // demo-admin-button, demo-teacher-button
data-testid="logout-button"        // Logout action
```

## 🚫 **ANTI-PATTERNS TO AVOID**

### **Don't Use CSS Classes for Functional Testing**
```typescript
// ❌ AVOID
page.locator('.btn-primary')
page.locator('.nav-link-active')
page.locator('.animate-spin')

// ✅ USE INSTEAD
page.locator('[data-testid="submit-button"]')
page.locator('[data-testid="nav-users"][class*="active"]')
page.locator('[data-testid="loading-state"]')
```

### **Don't Use Overly Specific Text Selectors**
```typescript
// ❌ AVOID (brittle to text changes)
page.locator('button:has-text("Create New User Account")')

// ✅ USE INSTEAD
page.locator('[data-testid="create-user-button"]')
```

### **Don't Use Generic Element Selectors**
```typescript
// ❌ AVOID (not specific enough)
page.locator('button[type="submit"]')
page.locator('input[type="email"]')

// ✅ USE INSTEAD
page.locator('[data-testid="submit-button"]')
page.locator('[data-testid="email-input"]')
```

## 🔧 **IMPLEMENTATION GUIDELINES**

### **For React Components**
```typescript
// ✅ Proper testid implementation
interface ButtonProps {
  'data-testid'?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ 'data-testid': testId, children, onClick }: ButtonProps) {
  return (
    <button 
      data-testid={testId}
      onClick={onClick}
      className="btn btn-primary"
    >
      {children}
    </button>
  );
}

// Usage
<Button data-testid="create-user-button">Create User</Button>
```

### **For Page Components**
```typescript
// ✅ Page-level testid structure
export function UsersPage() {
  return (
    <div data-testid="users-page">
      <header data-testid="page-header">
        <h1>User Management</h1>
        <Button data-testid="create-user-button">Create User</Button>
      </header>
      
      <main data-testid="page-content">
        <table data-testid="users-table">
          <tbody data-testid="table-body">
            {users.map(user => (
              <tr key={user.id} data-testid="user-row">
                <td>{user.name}</td>
                <td>
                  <Button data-testid="edit-user-button">Edit</Button>
                  <Button data-testid="delete-user-button">Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
```

### **For Test Files**
```typescript
// ✅ Consistent test selector usage
test('User management - create user workflow', async ({ page }) => {
  await page.goto('/admin/users');
  
  // Use consistent testid selectors
  await expect(page.locator('[data-testid="users-page"]')).toBeVisible();
  await page.click('[data-testid="create-user-button"]');
  
  // Form interaction
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.selectOption('[data-testid="role-select"]', 'student');
  await page.click('[data-testid="submit-button"]');
  
  // Verification
  await expect(page.locator('[data-testid="success-state"]')).toBeVisible();
  await expect(page.locator('[data-testid="users-table"]')).toContainText('test@example.com');
});
```

## 📊 **MIGRATION STRATEGY**

### **Phase 1: Critical Components (Week 1)**
1. **Login page** - Add all authentication testids
2. **User management** - Add all admin user testids  
3. **Button component** - Add testid passthrough support

### **Phase 2: Core Navigation (Week 2)**
1. **Sidebar navigation** - Verify existing testids work
2. **Page headers** - Standardize across all pages
3. **Form components** - Add missing form testids

### **Phase 3: Advanced Components (Week 3)**
1. **Modal dialogs** - Add confirmation dialog testids
2. **Error states** - Standardize error/loading patterns
3. **Search/filter** - Add consistent search testids

### **Phase 4: Test Updates (Week 4)**
1. **Update test selectors** - Migrate to standardized patterns
2. **Remove deprecated selectors** - Clean up CSS class dependencies
3. **Add test coverage** - Fill gaps in test coverage

## ✅ **VERIFICATION CHECKLIST**

### **Before Component Implementation**
- [ ] Component follows naming convention
- [ ] All interactive elements have testids
- [ ] Testids follow hierarchical structure
- [ ] No CSS class dependencies for functionality

### **Before Test Implementation**
- [ ] Uses data-testid selectors primarily
- [ ] Has fallback semantic selectors for content
- [ ] Avoids CSS class selectors
- [ ] Follows consistent selector patterns

### **After Implementation**
- [ ] All tests pass with new testids
- [ ] No flaky/brittle selectors remain
- [ ] Performance impact is minimal
- [ ] Documentation is updated