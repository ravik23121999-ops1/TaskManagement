# Task Management System (TMS) - Complete User Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Installation & Setup](#installation--setup)
3. [Running the System](#running-the-system)
4. [User Guide](#user-guide)
5. [Testing Guide](#testing-guide)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

---

## System Overview

The Task Management System (TMS) is a full-stack application for internal company use that enables:
- Task creation and management
- Task assignment to employees
- Collaboration on tasks
- Review and approval workflows
- Comments and notifications
- User and department management

**Technology Stack:**
- Backend: Laravel 13 (PHP 8.4)
- Frontend: React 18 + TypeScript + Vite
- Database: MySQL 8
- Authentication: Laravel Sanctum

---

## Installation & Setup

### Prerequisites

**Required Software:**
- PHP 8.4 or higher
- Composer
- Node.js 18+ and npm
- MySQL 8 or MariaDB

### Step 1: Clone/Extract the Project

```bash
cd C:\Users\ADMIN\Desktop\TaskManagement
```

### Step 2: Backend Setup

```bash
cd backend
composer install
php artisan migrate
php artisan db:seed --class=AdminSeeder
```

### Step 3: Frontend Setup

```bash
cd frontend
npm install
```

### Step 4: Configure Environment

**Backend (.env):**
```env
APP_NAME=Laravel
APP_ENV=local
APP_KEY=base64:SWESzIAinWYhLxSEUeClXxl6D3psTMcvMTtuGLF8Kt4=
APP_DEBUG=true
APP_URL=http://localhost:8000
DB_CONNECTION=sqlite
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:8000
```

---

## Running the System

### Option 1: Run Both Servers (Recommended)

**Terminal 1 - Backend:**
```bash
cd backend
php artisan serve
```
Backend will run on: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on: http://localhost:5173 or 5174

### Option 2: Run Backend Only (API Usage)

```bash
cd backend
php artisan serve
```
Access API at: http://localhost:8000/api

### Option 3: Run Frontend Only (Mock Data)

```bash
cd frontend
npm run dev
```
Access UI at: http://localhost:5173

---

## User Guide

### Default Login Credentials

**Admin User:**
- Email: `admin@example.com`
- Password: `password`

### First-Time Login

1. Open browser: http://localhost:5173
2. You'll see the login page
3. Enter credentials:
   - Email: admin@example.com
   - Password: password
4. Click "Login"
5. You'll be redirected to the Dashboard

### Dashboard Overview

The dashboard shows:
- **My Tasks**: Tasks requiring your action
- **In Progress**: Tasks currently being worked on
- **Completed**: Finished tasks
- **Recent Tasks**: List of recent tasks

### Creating a Task

1. Click "Create Task" button
2. Fill in the form:
   - **Title** (required): Task name
   - **Description** (required): Detailed description
   - **Expected Result** (optional): What success looks like
   - **Acceptance Criteria** (optional): Requirements for completion
   - **Handling Method** (required):
     - **Work Alone**: You complete it yourself
     - **Assign**: Assign to other employees
     - **Collaborate**: Work together with others
   - **Priority**: Low, Medium, High, Urgent
   - **Due Date**: Optional deadline
   - **Assignees** (for Assign/Collaborate): Enter user IDs (comma-separated)
3. Click "Create Task"

### Viewing Tasks

1. Click "My Tasks" or navigate to Tasks page
2. You'll see a list of all tasks with:
   - Title
   - Status (color-coded)
   - Priority (color-coded)
   - Created By
   - Due Date

### Task Details

1. Click on any task in the list
2. View:
   - All task information
   - Description and requirements
   - Status and priority
   - Created by and due date
   - Cancel button (if authorized)

### Canceling a Task

1. Open task details
2. Click "Cancel Task"
3. Enter cancellation reason
4. Task will be marked as cancelled

### User Management (Admin/Sub-Admin Only)

**To manage users (via API):**
```bash
# List users
curl -X GET http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create user
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123","role":"employee"}'

# Activate user
curl -X PUT http://localhost:8000/api/users/{id}/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Department Management (Admin/Sub-Admin Only)

**To manage departments (via API):**
```bash
# List departments
curl -X GET http://localhost:8000/api/departments \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create department
curl -X POST http://localhost:8000/api/departments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Engineering","description":"Software development team"}'
```

---

## Testing Guide

### Test 1: Authentication

**Manual Test:**
1. Try to access dashboard without login → Should redirect to login
2. Login with wrong credentials → Should show error
3. Login with correct credentials → Should redirect to dashboard
4. Click logout → Should redirect to login

**API Test:**
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Expected: Returns token and user data
```

### Test 2: Task Creation

**Manual Test:**
1. Login as admin
2. Click "Create Task"
3. Fill in all required fields
4. Submit form
5. Should redirect to task list
6. Verify task appears in list

**API Test:**
```bash
# Get token first, then:
curl -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Task",
    "description":"This is a test task",
    "handling_method":"work_alone",
    "priority":"medium"
  }'

# Expected: Returns created task data
```

### Test 3: Task Assignment

**Manual Test:**
1. Create a task with "Assign" method
2. Enter assignee IDs (you'll need to know user IDs first)
3. Submit task
4. Task should create branches automatically

**API Test:**
```bash
# Create task with assignees
curl -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Assigned Task",
    "description":"Task to be assigned",
    "handling_method":"assign",
    "assignees":[2,3]
  }'

# Expected: Creates task with branches for each assignee
```

### Test 4: Task Cancellation

**Manual Test:**
1. Open any task details
2. Click "Cancel Task"
3. Enter reason
4. Should show success message
5. Task status should change to "cancelled"

**API Test:**
```bash
curl -X POST http://localhost:8000/api/tasks/{task_id}/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"No longer needed"}'

# Expected: Task status changes to cancelled
```

### Test 5: Comments

**API Test:**
```bash
curl -X POST http://localhost:8000/api/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id":1,
    "comment":"This is a test comment"
  }'

# Expected: Creates comment on task
```

### Test 6: Notifications

**API Test:**
```bash
# Get notifications
curl -X GET http://localhost:8000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mark as read
curl -X PUT http://localhost:8000/api/notifications/{id}/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 7: User Management

**API Test:**
```bash
# Create employee
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Employee",
    "email":"employee@example.com",
    "password":"password123",
    "role":"employee"
  }'

# List users
curl -X GET http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 8: Department Management

**API Test:**
```bash
# Create department
curl -X POST http://localhost:8000/api/departments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Marketing",
    "description":"Marketing department"
  }'

# List departments
curl -X GET http://localhost:8000/api/departments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Issue: Backend API returns 404

**Solution:**
1. Check Laravel routing configuration in `bootstrap/app.php`
2. Ensure routes are defined in `routes/api.php`
3. Run: `php artisan route:list --path=api`
4. Clear cache: `php artisan route:clear`

### Issue: Frontend Tailwind CSS error

**Solution:**
1. Ensure `@tailwindcss/postcss` is installed
2. Check `postcss.config.js` uses `@tailwindcss/postcss` instead of `tailwindcss`
3. Run: `npm install -D @tailwindcss/postcss`

### Issue: Database connection error

**Solution:**
1. Check `.env` file database configuration
2. Ensure MySQL is running
3. Run: `php artisan migrate:fresh`

### Issue: Authentication fails

**Solution:**
1. Verify admin user exists: `php artisan tinker`
2. Check: `User::where('email', 'admin@example.com')->first()`
3. Reset password if needed

### Issue: CORS errors

**Solution:**
1. Ensure Sanctum stateful domains include frontend URL
2. Check `config/sanctum.php` stateful domains
3. Verify `SANCTUM_STATEFUL_DOMAINS` in `.env`

### Issue: Frontend can't connect to backend

**Solution:**
1. Check backend is running: http://localhost:8000
2. Verify `VITE_API_URL` in frontend `.env`
3. Check network/firewall settings

---

## API Reference

### Authentication Endpoints

#### Login
```
POST /api/auth/login
Content-Type: application/json

Body:
{
  "email": "admin@example.com",
  "password": "password"
}

Response:
{
  "data": {
    "token": "sanctum_token",
    "user": { ... }
  }
}
```

#### Logout
```
POST /api/auth/logout
Authorization: Bearer {token}
```

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer {token}
```

### User Endpoints

#### List Users
```
GET /api/users
Authorization: Bearer {token}
Query params: page, per_page, search, role, department_id, is_active
```

#### Create User
```
POST /api/users
Authorization: Bearer {token}
Body: { name, email, password, role, department_id }
```

#### Update User
```
PUT /api/users/{id}
Authorization: Bearer {token}
Body: { name, email, role, department_id }
```

#### Activate/Deactivate User
```
PUT /api/users/{id}/activate
PUT /api/users/{id}/deactivate
Authorization: Bearer {token}
```

### Department Endpoints

#### List Departments
```
GET /api/departments
Authorization: Bearer {token}
Query params: page, per_page, search, is_active
```

#### Create Department
```
POST /api/departments
Authorization: Bearer {token}
Body: { name, description }
```

### Task Endpoints

#### List Tasks
```
GET /api/tasks
Authorization: Bearer {token}
Query params: page, per_page, status, priority, my_action
```

#### Create Task
```
POST /api/tasks
Authorization: Bearer {token}
Body: {
  title (required),
  description (required),
  expected_result,
  acceptance_criteria,
  handling_method (required): work_alone|assign|collaborate,
  priority,
  due_date,
  department_id,
  assignees (array of user IDs, for assign/collaborate)
}
```

#### Get Task Details
```
GET /api/tasks/{id}
Authorization: Bearer {token}
```

#### Update Task
```
PUT /api/tasks/{id}
Authorization: Bearer {token}
Body: { title, description, priority, due_date, status }
```

#### Cancel Task
```
POST /api/tasks/{id}/cancel
Authorization: Bearer {token}
Body: { reason (required) }
```

### Task Branch Endpoints

#### List Branches
```
GET /api/task-branches
Authorization: Bearer {token}
```

#### Create Branch
```
POST /api/task-branches
Authorization: Bearer {token}
Body: { task_id, title, description, owner_id, due_date }
```

### Comment Endpoints

#### List Comments
```
GET /api/comments?task_id={id}
Authorization: Bearer {token}
```

#### Add Comment
```
POST /api/comments
Authorization: Bearer {token}
Body: { task_id, task_branch_id, comment, is_internal }
```

### Notification Endpoints

#### List Notifications
```
GET /api/notifications
Authorization: Bearer {token}
```

#### Mark as Read
```
PUT /api/notifications/{id}/read
Authorization: Bearer {token}
```

#### Mark All as Read
```
PUT /api/notifications/read-all
Authorization: Bearer {token}
```

---

## Quick Start Checklist

### First-Time Setup
- [ ] Run `cd backend && composer install`
- [ ] Run `php artisan migrate`
- [ ] Run `php artisan db:seed --class=AdminSeeder`
- [ ] Run `cd frontend && npm install`
- [ ] Configure `.env` files
- [ ] Start backend: `php artisan serve`
- [ ] Start frontend: `npm run dev`

### Daily Use
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Login to system
- [ ] Create tasks
- [ ] Assign work
- [ ] Monitor progress
- [ ] Review and approve
- [ ] Cancel completed tasks

---

## Support

### Documentation Files
- README.md - Overview and setup
- docs/ARCHITECTURE.md - System architecture
- docs/DATABASE.md - Database schema
- docs/WORKFLOW.md - Business workflows
- docs/API.md - Complete API documentation
- USER_GUIDE.md - This file

### Getting Help
1. Check this guide's troubleshooting section
2. Review API documentation for endpoint details
3. Check browser console for frontend errors
4. Check Laravel logs in `storage/logs/laravel.log`

---

## Best Practices

### For Admins
- Create separate accounts for each employee
- Use departments to organize work
- Review tasks regularly
- Monitor overdue tasks
- Use comments to provide feedback

### For Employees
- Check your "My Action" tasks daily
- Update task progress regularly
- Add comments when information is missing
- Notify collaborators when work is complete
- Respond to review feedback promptly

### For Sub-Admins
- Manage department memberships
- Monitor team workload
- Review and approve work
- Create and manage employee accounts
- Help users with system issues

---

## Security Notes

### Passwords
- Default admin password should be changed after first login
- Use strong passwords for all accounts
- Never share passwords

### Data Protection
- All actions are logged in the database
- Sensitive operations require authentication
- File uploads are validated and permission-checked
- API requires authentication tokens

### Access Control
- Only Admin/Sub-Admin can manage users
- Only creator, Admin, Sub-Admin can cancel tasks
- Review permissions are enforced by backend
- API endpoints validate permissions

---

## System Requirements

### Minimum Requirements
- PHP 8.4+
- Node.js 18+
- MySQL 8+
- 2GB RAM
- 10GB disk space

### Recommended
- PHP 8.4
- Node.js 20+
- MySQL 8
- 4GB RAM
- 20GB disk space

---

## Performance Tips

### Backend
- Use database indexes on frequently queried fields
- Implement queue processing for notifications
- Use pagination for large datasets
- Cache frequently accessed data

### Frontend
- Use code splitting for large pages
- Implement lazy loading for images
- Debounce search inputs
- Use React Query for data caching

---

## Feature Usage Guide

### Work Alone Workflow
1. Create task with "Work Alone" method
2. Complete the work yourself
3. Submit for completion when done
4. Task is marked complete

### Assign Workflow
1. Create task with "Assign" method
2. Enter assignee user IDs (comma-separated)
3. Task automatically creates branches for each assignee
4. Assignees work on their branches
5. When ready, assignees submit for review
6. Reviewer approves or returns with comments
7. Creator performs final check
8. Creator submits for completion

### Collaborate Workflow
1. Create task with "Collaborate" method
2. Enter collaborator user IDs
3. Task creates branches with multiple collaborators
4. Team works together on branches
5. Follow same review process as Assign workflow

---

## Data Management

### Backup Database
```bash
# Backup SQLite database
cd backend
cp database/database.sqlite database/database.sqlite.backup

# Backup MySQL
mysqldump -u username -p database_name > backup.sql
```

### Restore Database
```bash
# Restore SQLite
cd backend
cp database/database.sqlite.backup database/database.sqlite

# Restore MySQL
mysql -u username -p database_name < backup.sql
```

### Reset System
```bash
# Reset everything (use with caution)
cd backend
php artisan migrate:fresh
php artisan db:seed --class=AdminSeeder
```

---

## Customization

### Adding New Roles
1. Update User model role enum
2. Update migration to include new role
3. Update validation rules in requests
4. Update policy files

### Adding New Task Status
1. Update Task model status enum
2. Update migration to include new status
3. Update frontend status mapping
4. Update workflow documentation

### Changing UI Colors
1. Edit `tailwind.config.js`
2. Or use custom Tailwind classes
3. Update CSS in `src/index.css`

---

## Conclusion

This Task Management System provides a solid foundation for managing work within your organization. The system supports the three main workflows (Work Alone, Assign, Collaborate) and includes essential features like comments, notifications, and user management.

For questions or issues, refer to the troubleshooting section or the detailed documentation files in the `docs/` folder.

**Happy Task Managing! 🚀**
