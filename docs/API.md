# Task Management System - API Documentation

## Overview
This document describes the REST API endpoints for the Task Management System, including authentication, permissions, request parameters, response formats, and error handling.

## Base URL
```
/api/v1
```

## Authentication
All endpoints except `/auth/*` require authentication using Laravel Sanctum tokens.

### Authentication Header
```
Authorization: Bearer {token}
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message",
  "meta": {
    "pagination": {
      "current_page": 1,
      "per_page": 15,
      "total": 100,
      "last_page": 7
    }
  }
}
```

### Error Response
```json
{
  "message": "Error message",
  "errors": {
    "field": ["error message"]
  }
}
```

### Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 409: Conflict (invalid state transition)
- 500: Server Error

## Endpoints

### Authentication

#### POST /auth/login
Login user and return authentication token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "data": {
    "token": " Sanctum token",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "employee",
      "department_id": null,
      "is_active": true
    }
  }
}
```

#### POST /auth/logout
Logout user and invalidate token.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

#### GET /auth/me
Get current authenticated user.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "employee",
    "department_id": null,
    "is_active": true,
    "department": null
  }
}
```

#### POST /auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

#### POST /auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token",
  "email": "user@example.com",
  "password": "new_password",
  "password_confirmation": "new_password"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

### Users

#### GET /users
List all users (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 15, max: 100)
- `search`: Search by name or email
- `role`: Filter by role (admin, sub_admin, employee)
- `department_id`: Filter by department
- `is_active`: Filter by active status

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "employee",
      "department_id": 1,
      "is_active": true,
      "department": {
        "id": 1,
        "name": "Engineering"
      },
      "created_at": "2026-10-26T10:00:00Z"
    }
  ],
  "meta": {
    "pagination": { ... }
  }
}
```

#### POST /users
Create new user (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "role": "employee",
  "department_id": 1
}
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "employee",
    "department_id": 1,
    "is_active": true,
    "department": {
      "id": 1,
      "name": "Engineering"
    }
  }
}
```

#### GET /users/{id}
Get user details.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "employee",
    "department_id": 1,
    "is_active": true,
    "department": {
      "id": 1,
      "name": "Engineering"
    },
    "created_at": "2026-10-26T10:00:00Z",
    "updated_at": "2026-10-26T10:00:00Z"
  }
}
```

#### PUT /users/{id}
Update user (Admin/Sub-Admin or own profile).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "department_id": 2
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "John Updated",
    "email": "john.updated@example.com",
    "role": "employee",
    "department_id": 2,
    "is_active": true
  }
}
```

#### PUT /users/{id}/activate
Activate user account (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "User activated successfully"
}
```

#### PUT /users/{id}/deactivate
Deactivate user account (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "User deactivated successfully"
}
```

### Departments

#### GET /departments
List all departments.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number
- `per_page`: Items per page
- `search`: Search by name
- `is_active`: Filter by active status

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Engineering",
      "description": "Software development team",
      "is_active": true,
      "created_at": "2026-10-26T10:00:00Z"
    }
  ],
  "meta": {
    "pagination": { ... }
  }
}
```

#### POST /departments
Create new department (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Marketing",
  "description": "Marketing and communications"
}
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "name": "Marketing",
    "description": "Marketing and communications",
    "is_active": true
  }
}
```

#### GET /departments/{id}
Get department details.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Engineering",
    "description": "Software development team",
    "is_active": true,
    "created_at": "2026-10-26T10:00:00Z",
    "updated_at": "2026-10-26T10:00:00Z"
  }
}
```

#### PUT /departments/{id}
Update department (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Engineering Team",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Engineering Team",
    "description": "Updated description",
    "is_active": true
  }
}
```

#### PUT /departments/{id}/activate
Activate department (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Department activated successfully"
}
```

#### PUT /departments/{id}/deactivate
Deactivate department (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Department deactivated successfully"
}
```

### Tasks

#### GET /tasks
List authorized tasks.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number
- `per_page`: Items per page
- `status`: Filter by status
- `priority`: Filter by priority
- `department_id`: Filter by department
- `handling_method`: Filter by handling method
- `creator_id`: Filter by creator
- `search`: Search by title or description
- `my_action`: Show tasks requiring user's action
- `pending_with_others`: Show tasks pending with others
- `my_collaborations`: Show collaboration tasks
- `due_date_from`: Filter by due date range (from)
- `due_date_to`: Filter by due date range (to)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Implement API",
      "description": "Create REST API endpoints",
      "handling_method": "assign",
      "priority": "high",
      "status": "in_progress",
      "due_date": "2026-11-01T10:00:00Z",
      "creator": {
        "id": 1,
        "name": "John Doe"
      },
      "department": {
        "id": 1,
        "name": "Engineering"
      },
      "current_owner": {
        "id": 2,
        "name": "Jane Smith"
      },
      "created_at": "2026-10-26T10:00:00Z"
    }
  ],
  "meta": {
    "pagination": { ... }
  }
}
```

#### POST /tasks
Create new task.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Implement API",
  "description": "Create REST API endpoints",
  "expected_result": "Working API with documentation",
  "acceptance_criteria": "All endpoints tested",
  "handling_method": "assign",
  "priority": "high",
  "due_date": "2026-11-01T10:00:00Z",
  "department_id": 1,
  "assignees": [2, 3],
  "collaborators": [4, 5]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Implement API",
    "description": "Create REST API endpoints",
    "handling_method": "assign",
    "priority": "high",
    "status": "pending",
    "due_date": "2026-11-01T10:00:00Z",
    "creator": {
      "id": 1,
      "name": "John Doe"
    },
    "department": {
      "id": 1,
      "name": "Engineering"
    },
    "branches": [
      {
        "id": 1,
        "title": "Branch 1",
        "owner": {
          "id": 2,
          "name": "Jane Smith"
        },
        "status": "pending"
      }
    ],
    "created_at": "2026-10-26T10:00:00Z"
  }
}
```

#### GET /tasks/{id}
Get task details.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Implement API",
    "description": "Create REST API endpoints",
    "expected_result": "Working API with documentation",
    "acceptance_criteria": "All endpoints tested",
    "handling_method": "assign",
    "priority": "high",
    "status": "in_progress",
    "due_date": "2026-11-01T10:00:00Z",
    "creator": {
      "id": 1,
      "name": "John Doe"
    },
    "department": {
      "id": 1,
      "name": "Engineering"
    },
    "branches": [
      {
        "id": 1,
        "title": "Branch 1",
        "description": "Branch description",
        "owner": {
          "id": 2,
          "name": "Jane Smith"
        },
        "status": "in_progress",
        "due_date": "2026-11-01T10:00:00Z",
        "collaborators": [
          {
            "id": 3,
            "name": "Bob Johnson"
          }
        ]
      }
    ],
    "comments": [
      {
        "id": 1,
        "comment": "Started working on this",
        "user": {
          "id": 2,
          "name": "Jane Smith"
        },
        "created_at": "2026-10-26T11:00:00Z"
      }
    ],
    "attachments": [
      {
        "id": 1,
        "file_name": "spec.pdf",
        "file_size": 1024000,
        "uploaded_by": {
          "id": 1,
          "name": "John Doe"
        },
        "created_at": "2026-10-26T10:00:00Z"
      }
    ],
    "created_at": "2026-10-26T10:00:00Z",
    "updated_at": "2026-10-26T11:00:00Z"
  }
}
```

#### PUT /tasks/{id}
Update task (creator, Admin, Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": "urgent",
  "due_date": "2026-11-02T10:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Updated title",
    "description": "Updated description",
    "priority": "urgent",
    "due_date": "2026-11-02T10:00:00Z"
  }
}
```

#### POST /tasks/{id}/cancel
Cancel task (creator, Admin, Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "reason": "Project cancelled"
}
```

**Response:**
```json
{
  "message": "Task cancelled successfully"
}
```

#### POST /tasks/{id}/hold
Put task on hold (current owner, Admin, Sub-Admin).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "reason": "Waiting for requirements"
}
```

**Response:**
```json
{
  "message": "Task put on hold successfully"
}
```

#### POST /tasks/{id}/resume
Resume task from hold (current owner, Admin, Sub-Admin).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Task resumed successfully"
}
```

#### GET /tasks/{id}/history
Get task history/audit log.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "action": "task_created",
      "actor": {
        "id": 1,
        "name": "John Doe"
      },
      "description": "Task created",
      "created_at": "2026-10-26T10:00:00Z"
    },
    {
      "id": 2,
      "action": "task_assigned",
      "actor": {
        "id": 1,
        "name": "John Doe"
      },
      "description": "Assigned to Jane Smith",
      "created_at": "2026-10-26T10:05:00Z"
    }
  ]
}
```

### Task Branches

#### GET /tasks/{id}/branches
Get task branches.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Branch 1",
      "description": "Branch description",
      "status": "in_progress",
      "owner": {
        "id": 2,
        "name": "Jane Smith"
      },
      "due_date": "2026-11-01T10:00:00Z",
      "collaborators": [
        {
          "id": 3,
          "name": "Bob Johnson"
        }
      ],
      "created_at": "2026-10-26T10:00:00Z"
    }
  ]
}
```

#### POST /tasks/{id}/branches
Create new branch (creator, Admin, Sub-Admin).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "New branch",
  "description": "Branch description",
  "owner_id": 2,
  "due_date": "2026-11-01T10:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "title": "New branch",
    "description": "Branch description",
    "status": "pending",
    "owner": {
      "id": 2,
      "name": "Jane Smith"
    },
    "due_date": "2026-11-01T10:00:00Z"
  }
}
```

#### PUT /branches/{id}
Update branch (owner, Admin, Sub-Admin).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Updated branch title",
  "description": "Updated description",
  "due_date": "2026-11-02T10:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Updated branch title",
    "description": "Updated description",
    "due_date": "2026-11-02T10:00:00Z"
  }
}
```

### Assignments

#### POST /branches/{id}/assign
Assign branch to user.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "assigned_to_id": 3,
  "reason": "Reassigning due to workload"
}
```

**Response:**
```json
{
  "message": "Branch assigned successfully",
  "data": {
    "id": 1,
    "owner": {
      "id": 3,
      "name": "Bob Johnson"
    }
  }
}
```

#### GET /branches/{id}/assignments
Get branch assignment history.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "assigned_to": {
        "id": 2,
        "name": "Jane Smith"
      },
      "assigned_by": {
        "id": 1,
        "name": "John Doe"
      },
      "is_current": false,
      "assigned_at": "2026-10-26T10:00:00Z",
      "revoked_at": "2026-10-26T11:00:00Z"
    },
    {
      "id": 2,
      "assigned_to": {
        "id": 3,
        "name": "Bob Johnson"
      },
      "assigned_by": {
        "id": 1,
        "name": "John Doe"
      },
      "is_current": true,
      "assigned_at": "2026-10-26T11:00:00Z"
    }
  ]
}
```

### Collaborators

#### POST /branches/{id}/collaborators
Add collaborator to branch.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "user_id": 4,
  "can_assign": false,
  "can_collaborate": true
}
```

**Response:**
```json
{
  "message": "Collaborator added successfully",
  "data": {
    "id": 1,
    "user": {
      "id": 4,
      "name": "Alice Brown"
    },
    "can_assign": false,
    "can_collaborate": true
  }
}
```

#### DELETE /branches/{id}/collaborators/{userId}
Remove collaborator from branch.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Collaborator removed successfully"
}
```

### Work and Reviews

#### PUT /branches/{id}/progress
Update branch progress.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "in_progress",
  "progress_note": "Started implementation"
}
```

**Response:**
```json
{
  "message": "Progress updated successfully",
  "data": {
    "id": 1,
    "status": "in_progress"
  }
}
```

#### POST /branches/{id}/submit
Submit branch for review.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "description": "Implementation complete, ready for review"
}
```

**Response:**
```json
{
  "message": "Branch submitted for review successfully",
  "data": {
    "id": 1,
    "status": "review",
    "submission": {
      "id": 1,
      "submitted_at": "2026-10-26T12:00:00Z"
    }
  }
}
```

#### POST /submissions/{id}/approve
Approve submission (authorized reviewer).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "comments": "Good work, approved",
  "next_reviewer_id": 5
}
```

**Response:**
```json
{
  "message": "Submission approved successfully",
  "data": {
    "id": 1,
    "decision": "approved",
    "reviewer": {
      "id": 4,
      "name": "Alice Brown"
    }
  }
}
```

#### POST /submissions/{id}/return
Return submission with comments (authorized reviewer).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "comments": "Please fix the authentication logic",
  "target_person_id": 2
}
```

**Response:**
```json
{
  "message": "Submission returned successfully",
  "data": {
    "id": 1,
    "decision": "returned",
    "reviewer": {
      "id": 4,
      "name": "Alice Brown"
    }
  }
}
```

#### POST /submissions/{id}/reject
Reject submission (if configured and authorized).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "comments": "Work does not meet requirements",
  "reason": "incorrect_approach"
}
```

**Response:**
```json
{
  "message": "Submission rejected successfully",
  "data": {
    "id": 1,
    "decision": "rejected",
    "reviewer": {
      "id": 4,
      "name": "Alice Brown"
    }
  }
}
```

#### POST /tasks/{id}/final-submit
Submit task for final completion (creator only).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "comments": "All requirements met, submitting for completion"
}
```

**Response:**
```json
{
  "message": "Task submitted for completion successfully",
  "data": {
    "id": 1,
    "status": "completed",
    "completed_at": "2026-10-26T14:00:00Z"
  }
}
```

### Comments

#### GET /tasks/{id}/comments
Get task comments.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "comment": "Started working on this",
      "user": {
        "id": 2,
        "name": "Jane Smith"
      },
      "is_internal": false,
      "created_at": "2026-10-26T11:00:00Z"
    }
  ]
}
```

#### POST /tasks/{id}/comments
Add comment to task.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "comment": "This needs more documentation",
  "is_internal": false
}
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "comment": "This needs more documentation",
    "user": {
      "id": 1,
      "name": "John Doe"
    },
    "is_internal": false,
    "created_at": "2026-10-26T12:00:00Z"
  }
}
```

#### POST /branches/{id}/comments
Add comment to branch.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "comment": "Branch-specific comment"
}
```

**Response:**
```json
{
  "data": {
    "id": 3,
    "comment": "Branch-specific comment",
    "user": {
      "id": 2,
      "name": "Jane Smith"
    },
    "created_at": "2026-10-26T12:30:00Z"
  }
}
```

### Attachments

#### POST /tasks/{id}/attachments
Upload attachment to task.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body:**
```
file: [binary file]
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "file_name": "document.pdf",
    "file_size": 1024000,
    "file_type": "application/pdf",
    "uploaded_by": {
      "id": 1,
      "name": "John Doe"
    },
    "created_at": "2026-10-26T10:00:00Z"
  }
}
```

#### POST /branches/{id}/attachments
Upload attachment to branch.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body:**
```
file: [binary file]
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "file_name": "branch_file.pdf",
    "file_size": 512000,
    "file_type": "application/pdf",
    "uploaded_by": {
      "id": 2,
      "name": "Jane Smith"
    },
    "created_at": "2026-10-26T11:00:00Z"
  }
}
```

#### GET /attachments/{id}/download
Download attachment.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
Binary file data

#### DELETE /attachments/{id}
Delete attachment (uploader, Admin, Sub-Admin).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Attachment deleted successfully"
}
```

### Dashboards

#### GET /dashboard/employee
Get employee dashboard data.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "total_tasks": 25,
    "my_action": 5,
    "tasks_i_created": 10,
    "pending_with_others": 8,
    "my_collaborations": 3,
    "awaiting_my_review": 2,
    "in_progress": 7,
    "on_hold": 1,
    "returned_for_corrections": 2,
    "completed": 15,
    "overdue_tasks": 2
  }
}
```

#### GET /dashboard/admin
Get admin dashboard data (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `date_from`: Filter by date range (from)
- `date_to`: Filter by date range (to)
- `department_id`: Filter by department

**Response:**
```json
{
  "data": {
    "total_tasks": 150,
    "open_tasks": 75,
    "pending_review": 20,
    "in_progress": 35,
    "pending_with_others": 40,
    "on_hold": 5,
    "overdue": 8,
    "returned": 10,
    "completed": 75,
    "cancelled": 5,
    "workload_by_employee": [
      {
        "user_id": 2,
        "user_name": "Jane Smith",
        "active_tasks": 8
      }
    ],
    "workload_by_department": [
      {
        "department_id": 1,
        "department_name": "Engineering",
        "active_tasks": 50
      }
    ],
    "recent_activity": [
      {
        "action": "task_created",
        "description": "New task created",
        "created_at": "2026-10-26T10:00:00Z"
      }
    ]
  }
}
```

### Notifications

#### GET /notifications
Get user notifications.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number
- `per_page`: Items per page
- `is_read`: Filter by read status

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "type": "task_assigned",
      "title": "Task Assigned",
      "message": "You have been assigned to task 'Implement API'",
      "task": {
        "id": 1,
        "title": "Implement API"
      },
      "is_read": false,
      "created_at": "2026-10-26T10:00:00Z"
    }
  ],
  "meta": {
    "pagination": { ... }
  }
}
```

#### PUT /notifications/{id}/read
Mark notification as read.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Notification marked as read"
}
```

#### PUT /notifications/read-all
Mark all notifications as read.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "All notifications marked as read"
}
```

### Reports

#### GET /reports/tasks
Get task report (Admin/Sub-Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `date_from`: Filter by date range (from)
- `date_to`: Filter by date range (to)
- `department_id`: Filter by department
- `status`: Filter by status
- `format`: Export format (json, csv)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Implement API",
      "status": "completed",
      "priority": "high",
      "creator": "John Doe",
      "department": "Engineering",
      "created_at": "2026-10-26T10:00:00Z",
      "completed_at": "2026-10-26T14:00:00Z"
    }
  ]
}
```

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "message": "Unauthenticated"
}
```

#### 403 Forbidden
```json
{
  "message": "You do not have permission to perform this action"
}
```

#### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

#### 422 Validation Error
```json
{
  "message": "The given data was invalid",
  "errors": {
    "title": ["The title field is required"],
    "email": ["The email must be a valid email address"]
  }
}
```

#### 409 Conflict
```json
{
  "message": "Invalid state transition",
  "errors": {
    "status": ["Cannot transition from completed to in_progress"]
  }
}
```

#### 500 Server Error
```json
{
  "message": "Internal server error"
}
```

## Rate Limiting

- Unauthenticated: 60 requests per minute
- Authenticated: 120 requests per minute
- Sensitive endpoints (login, password reset): 5 requests per minute

## Pagination

Default pagination: 15 items per page
Maximum pagination: 100 items per page

Pagination response format:
```json
{
  "meta": {
    "pagination": {
      "current_page": 1,
      "per_page": 15,
      "total": 100,
      "last_page": 7,
      "from": 1,
      "to": 15
    }
  }
}
```

## Filtering and Sorting

### Filtering
Most list endpoints support filtering via query parameters:
- `status`: Filter by status
- `priority`: Filter by priority
- `department_id`: Filter by department
- `created_at`: Filter by creation date
- `due_date`: Filter by due date

### Sorting
Most list endpoints support sorting:
- `sort_by`: Field to sort by (default: created_at)
- `sort_order`: asc or desc (default: desc)

Example:
```
GET /tasks?sort_by=due_date&sort_order=asc
```

## File Upload Limits

- Maximum file size: 10MB
- Allowed file types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG, ZIP
- Files are validated on both frontend and backend

## Security Notes

- All endpoints except `/auth/*` require authentication
- Role-based access control enforced on backend
- Resource-based permissions for task access
- Sensitive actions require additional authorization
- All sensitive operations are audited
- No password exposure in API responses
- File downloads are permission-checked
