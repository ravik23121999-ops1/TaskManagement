# Task Management System (TMS)

A complete, production-ready Task Management System for internal company use.

## Technology Stack

### Backend
- Laravel 13
- PHP 8.4
- MySQL 8
- Laravel Sanctum (Authentication)

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- Axios
- React Hook Form
- Zod
- TanStack Query

## Installation

### Backend
```bash
cd backend
composer install
php artisan migrate
php artisan db:seed --class=AdminSeeder
php artisan serve
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Default Admin User
- Email: admin@example.com
- Password: password

## Features Implemented

### Backend ✅
- ✅ Database schema (14 tables with relationships)
- ✅ All Eloquent models with relationships
- ✅ Authentication with Laravel Sanctum
- ✅ User management (CRUD + activate/deactivate)
- ✅ Department management (CRUD + activate/deactivate)
- ✅ Task management (create, list, show, update, cancel)
- ✅ Task branch management (create, list, show, update)
- ✅ Comments system (create, list)
- ✅ Notifications system (list, mark as read)
- ✅ Form validation for all endpoints
- ✅ API resources for consistent responses
- ✅ Assignment workflow (auto-creates branches when assignees provided)

### Frontend ✅
- ✅ Authentication system (login, logout, protected routes)
- ✅ Dashboard with task statistics
- ✅ Task list with filtering
- ✅ Task creation form (all fields including assignees)
- ✅ Task details page
- ✅ Responsive UI with Tailwind CSS
- ✅ API client with interceptors
- ✅ Error handling

### Documentation ✅
- ✅ ARCHITECTURE.md - Complete system architecture
- ✅ DATABASE.md - Full database schema
- ✅ WORKFLOW.md - All business logic
- ✅ API.md - All API endpoints

## API Endpoints

### Authentication
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Users
- GET /api/users
- POST /api/users
- GET /api/users/{user}
- PUT /api/users/{user}
- DELETE /api/users/{user}
- PUT /api/users/{user}/activate
- PUT /api/users/{user}/deactivate

### Departments
- GET /api/departments
- POST /api/departments
- GET /api/departments/{department}
- PUT /api/departments/{department}
- DELETE /api/departments/{department}
- PUT /api/departments/{department}/activate
- PUT /api/departments/{department}/deactivate

### Tasks
- GET /api/tasks
- POST /api/tasks
- GET /api/tasks/{task}
- PUT /api/tasks/{task}
- DELETE /api/tasks/{task}
- POST /api/tasks/{task}/cancel

### Task Branches
- GET /api/task-branches
- POST /api/task-branches
- GET /api/task-branches/{task_branch}
- PUT /api/task-branches/{task_branch}
- DELETE /api/task-branches/{task_branch}

### Comments
- GET /api/comments
- POST /api/comments

### Notifications
- GET /api/notifications
- PUT /api/notifications/{notification}/read
- PUT /api/notifications/read-all

## Known Issues
- None (API routing fixed, both backend and frontend working)

## Remaining Features (Optional Enhancements)
- Review and approval system with multiple levels
- File attachments upload/download
- Email notifications
- Advanced dashboards with reporting
- Activity audit logs
- Subtask/branch review workflow
- Time tracking
- Custom workflows

## Status
**✅ SYSTEM IS WORKING**
- Backend API: http://localhost:8000
- Frontend: http://localhost:5174
- Login: admin@example.com / password
