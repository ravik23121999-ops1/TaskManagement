# Task Management System - Database Design

## Overview
This document describes the complete database schema for the Task Management System, including tables, relationships, indexes, and constraints.

## Database Engine
- MySQL 8+
- InnoDB engine
- UTF8MB4 character set
- Foreign key constraints enabled

## Tables

### 1. users
Stores user accounts and authentication information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | User ID |
| name | VARCHAR(255) | NOT NULL | Full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email address |
| password | VARCHAR(255) | NOT NULL | Hashed password |
| role | ENUM('admin', 'sub_admin', 'employee') | NOT NULL | User role |
| department_id | BIGINT UNSIGNED | FK, NULLABLE | Department reference |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| email_verified_at | TIMESTAMP | NULLABLE | Email verification timestamp |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (email)
- INDEX (role)
- INDEX (department_id)
- INDEX (is_active)

**Relationships:**
- Belongs to: departments
- Has many: tasks (as creator)
- Has many: task_assignments
- Has many: task_collaborators
- Has many: task_reviews
- Has many: task_comments
- Has many: task_attachments
- Has many: activity_logs

### 2. departments
Organizational departments for task categorization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Department ID |
| name | VARCHAR(255) | UNIQUE, NOT NULL | Department name |
| description | TEXT | NULLABLE | Department description |
| is_active | BOOLEAN | DEFAULT TRUE | Department status |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (name)
- INDEX (is_active)

**Relationships:**
- Has many: users
- Has many: tasks

### 3. tasks
Main task records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Task ID |
| title | VARCHAR(255) | NOT NULL | Task title |
| description | TEXT | NOT NULL | Task description |
| expected_result | TEXT | NULLABLE | Expected outcome |
| acceptance_criteria | TEXT | NULLABLE | Acceptance criteria |
| handling_method | ENUM('work_alone', 'assign', 'collaborate') | NOT NULL | Task handling method |
| priority | ENUM('low', 'medium', 'high', 'urgent') | DEFAULT 'medium' | Task priority |
| status | ENUM('pending', 'in_progress', 'review', 'on_hold', 'post_comment', 'completed', 'cancelled', 'rejected') | DEFAULT 'pending' | Task status |
| due_date | DATETIME | NULLABLE | Due date |
| creator_id | BIGINT UNSIGNED | FK, NOT NULL | Task creator |
| department_id | BIGINT UNSIGNED | FK, NULLABLE | Department reference |
| completed_at | TIMESTAMP | NULLABLE | Completion timestamp |
| cancelled_at | TIMESTAMP | NULLABLE | Cancellation timestamp |
| cancellation_reason | TEXT | NULLABLE | Cancellation reason |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (creator_id)
- INDEX (department_id)
- INDEX (status)
- INDEX (priority)
- INDEX (due_date)
- INDEX (handling_method)
- INDEX (created_at)

**Relationships:**
- Belongs to: users (creator), departments
- Has many: task_branches
- Has many: task_comments
- Has many: task_attachments
- Has many: activity_logs

### 4. task_branches
Branches or subtasks for parallel work and delegation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Branch ID |
| task_id | BIGINT UNSIGNED | FK, NOT NULL | Parent task |
| title | VARCHAR(255) | NOT NULL | Branch title |
| description | TEXT | NULLABLE | Branch description |
| status | ENUM('pending', 'in_progress', 'review', 'on_hold', 'post_comment', 'completed', 'cancelled') | DEFAULT 'pending' | Branch status |
| owner_id | BIGINT UNSIGNED | FK, NOT NULL | Current owner |
| parent_assignment_id | BIGINT UNSIGNED | FK, NULLABLE | Parent assignment (for delegation chain) |
| due_date | DATETIME | NULLABLE | Branch due date |
| completed_at | TIMESTAMP | NULLABLE | Completion timestamp |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (task_id)
- INDEX (owner_id)
- INDEX (status)
- INDEX (parent_assignment_id)
- INDEX (due_date)

**Relationships:**
- Belongs to: tasks, users (owner)
- Has many: task_assignments
- Has many: task_collaborators
- Has many: task_reviews
- Has many: task_submissions

### 5. task_assignments
Task assignments linking users to branches.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Assignment ID |
| task_branch_id | BIGINT UNSIGNED | FK, NOT NULL | Branch reference |
| assigned_to_id | BIGINT UNSIGNED | FK, NOT NULL | Assignee |
| assigned_by_id | BIGINT UNSIGNED | FK, NOT NULL | Assigner |
| is_current | BOOLEAN | DEFAULT TRUE | Whether this is current assignment |
| assigned_at | TIMESTAMP | NOT NULL | Assignment timestamp |
| revoked_at | TIMESTAMP | NULLABLE | Revocation timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (task_branch_id)
- INDEX (assigned_to_id)
- INDEX (assigned_by_id)
- INDEX (is_current)
- INDEX (assigned_at)

**Relationships:**
- Belongs to: task_branches, users (assigned_to, assigned_by)

### 6. task_collaborators
Collaborators invited to work on branches.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Collaboration ID |
| task_branch_id | BIGINT UNSIGNED | FK, NOT NULL | Branch reference |
| user_id | BIGINT UNSIGNED | FK, NOT NULL | Collaborator |
| invited_by_id | BIGINT UNSIGNED | FK, NOT NULL | Inviter |
| can_assign | BOOLEAN | DEFAULT FALSE | Can further assign |
| can_collaborate | BOOLEAN | DEFAULT TRUE | Can invite others |
| invited_at | TIMESTAMP | NOT NULL | Invitation timestamp |
| removed_at | TIMESTAMP | NULLABLE | Removal timestamp |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (task_branch_id, user_id)
- INDEX (user_id)
- INDEX (invited_by_id)
- INDEX (invited_at)

**Relationships:**
- Belongs to: task_branches, users (user, invited_by)

### 7. task_reviews
Review records for task submissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Review ID |
| task_branch_id | BIGINT UNSIGNED | FK, NOT NULL | Branch reference |
| task_submission_id | BIGINT UNSIGNED | FK, NOT NULL | Submission reference |
| reviewer_id | BIGINT UNSIGNED | FK, NOT NULL | Reviewer |
| decision | ENUM('approved', 'returned', 'rejected') | NOT NULL | Review decision |
| comments | TEXT | NULLABLE | Review comments |
| reviewed_at | TIMESTAMP | NOT NULL | Review timestamp |
| next_reviewer_id | BIGINT UNSIGNED | FK, NULLABLE | Next reviewer in chain |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (task_branch_id)
- INDEX (task_submission_id)
- INDEX (reviewer_id)
- INDEX (decision)
- INDEX (reviewed_at)

**Relationships:**
- Belongs to: task_branches, task_submissions, users (reviewer)

### 8. task_submissions
Work submissions for review.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Submission ID |
| task_branch_id | BIGINT UNSIGNED | FK, NOT NULL | Branch reference |
| submitted_by_id | BIGINT UNSIGNED | FK, NOT NULL | Submitter |
| description | TEXT | NULLABLE | Submission description |
| submitted_at | TIMESTAMP | NOT NULL | Submission timestamp |
| is_final | BOOLEAN | DEFAULT FALSE | Final submission by creator |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (task_branch_id)
- INDEX (submitted_by_id)
- INDEX (submitted_at)
- INDEX (is_final)

**Relationships:**
- Belongs to: task_branches, users (submitted_by)
- Has many: task_reviews

### 9. task_comments
Comments on tasks, branches, or reviews.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Comment ID |
| task_id | BIGINT UNSIGNED | FK, NULLABLE | Task reference |
| task_branch_id | BIGINT UNSIGNED | FK, NULLABLE | Branch reference |
| task_review_id | BIGINT UNSIGNED | FK, NULLABLE | Review reference |
| user_id | BIGINT UNSIGNED | FK, NOT NULL | Comment author |
| comment | TEXT | NOT NULL | Comment content |
| is_internal | BOOLEAN | DEFAULT FALSE | Internal-only comment |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (task_id)
- INDEX (task_branch_id)
| INDEX (task_review_id)
- INDEX (user_id)
- INDEX (created_at)

**Relationships:**
- Belongs to: tasks, task_branches, task_reviews, users

### 10. task_attachments
File attachments for tasks, branches, or comments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Attachment ID |
| task_id | BIGINT UNSIGNED | FK, NULLABLE | Task reference |
| task_branch_id | BIGINT UNSIGNED | FK, NULLABLE | Branch reference |
| task_comment_id | BIGINT UNSIGNED | FK, NULLABLE | Comment reference |
| uploaded_by_id | BIGINT UNSIGNED | FK, NOT NULL | Uploader |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_path | VARCHAR(500) | NOT NULL | Storage path |
| file_size | BIGINT UNSIGNED | NOT NULL | File size in bytes |
| file_type | VARCHAR(100) | NOT NULL | MIME type |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (task_id)
- INDEX (task_branch_id)
- INDEX (task_comment_id)
- INDEX (uploaded_by_id)
- INDEX (created_at)

**Relationships:**
- Belongs to: tasks, task_branches, task_comments, users

### 11. task_status_history
History of status changes for tasks and branches.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | History ID |
| task_id | BIGINT UNSIGNED | FK, NULLABLE | Task reference |
| task_branch_id | BIGINT UNSIGNED | FK, NULLABLE | Branch reference |
| from_status | VARCHAR(50) | NULLABLE | Previous status |
| to_status | VARCHAR(50) | NOT NULL | New status |
| changed_by_id | BIGINT UNSIGNED | FK, NOT NULL | User who changed status |
| reason | TEXT | NULLABLE | Reason for change |
| changed_at | TIMESTAMP | NOT NULL | Change timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (task_id)
- INDEX (task_branch_id)
- INDEX (changed_by_id)
- INDEX (changed_at)

**Relationships:**
- Belongs to: tasks, task_branches, users

### 12. activity_logs
Append-only audit log for all significant actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Log ID |
| actor_id | BIGINT UNSIGNED | FK, NOT NULL | User who performed action |
| action | VARCHAR(100) | NOT NULL | Action type |
| subject_type | VARCHAR(255) | NOT NULL | Subject model type |
| subject_id | BIGINT UNSIGNED | NOT NULL | Subject model ID |
| description | TEXT | NULLABLE | Action description |
| properties | JSON | NULLABLE | Additional properties (before/after) |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (actor_id)
- INDEX (subject_type, subject_id)
- INDEX (action)
- INDEX (created_at)

**Relationships:**
- Belongs to: users

### 13. notifications
User notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Notification ID |
| user_id | BIGINT UNSIGNED | FK, NOT NULL | Recipient |
| type | VARCHAR(100) | NOT NULL | Notification type |
| title | VARCHAR(255) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification message |
| data | JSON | NULLABLE | Additional data |
| task_id | BIGINT UNSIGNED | FK, NULLABLE | Related task |
| task_branch_id | BIGINT UNSIGNED | FK, NULLABLE | Related branch |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| read_at | TIMESTAMP | NULLABLE | Read timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (user_id)
- INDEX (type)
- INDEX (task_id)
- INDEX (is_read)
- INDEX (created_at)

**Relationships:**
- Belongs to: users, tasks, task_branches

### 14. task_hold_records
Records of tasks put on hold.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Hold ID |
| task_id | BIGINT UNSIGNED | FK, NULLABLE | Task reference |
| task_branch_id | BIGINT UNSIGNED | FK, NULLABLE | Branch reference |
| put_on_hold_by_id | BIGINT UNSIGNED | FK, NOT NULL | User who put on hold |
| reason | TEXT | NOT NULL | Hold reason |
| held_at | TIMESTAMP | NOT NULL | Hold timestamp |
| resumed_at | TIMESTAMP | NULLABLE | Resume timestamp |
| resumed_by_id | BIGINT UNSIGNED | FK, NULLABLE | User who resumed |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (task_id)
- INDEX (task_branch_id)
- INDEX (put_on_hold_by_id)
- INDEX (held_at)

**Relationships:**
- Belongs to: tasks, task_branches, users

## Key Relationships

### Task Flow
```
users (creator) → tasks → task_branches → task_assignments → users (assignee)
                                 ↓
                          task_collaborators → users (collaborator)
                                 ↓
                          task_submissions → task_reviews → users (reviewer)
```

### Ownership Chain
- task.creator_id → Original creator (never changes)
- task_branch.owner_id → Current owner (changes with workflow)
- task_assignment.assigned_to_id → Current assignee
- task_review.reviewer_id → Reviewer

### Review Hierarchy
- task_submission submitted_by_id → Submitter
- task_review reviewer_id → Reviewer
- task_review.next_reviewer_id → Next reviewer in chain

## Data Integrity Rules

### Cascade Rules
- Soft deletes on users, departments, tasks
- Cascade delete on task_branches when task deleted
- Cascade delete on task_assignments when branch deleted
- Cascade delete on task_collaborators when branch deleted
- Cascade delete on task_submissions when branch deleted
- Cascade delete on task_reviews when submission deleted
- Cascade delete on task_comments when task/branch deleted
- Cascade delete on task_attachments when task/branch/comment deleted
- Cascade delete on task_status_history when task/branch deleted
- Cascade delete on task_hold_records when task/branch deleted
- Cascade delete on notifications when user deleted

### Constraints
- Every task must have a creator
- Every branch must have an owner
- Every branch must belong to a task
- Active branches must have exactly one current assignment
- A user cannot be both owner and collaborator on same branch
- Department deactivation instead of deletion if used
- Append-only activity logs (no updates/deletes)

### Validation Rules
- Email uniqueness
- Department name uniqueness
- Due date cannot be in the past for new tasks
- Status transitions must follow workflow rules
- Only creator, admin, or sub-admin can cancel
- Work-alone tasks skip branch review
- Parent task cannot complete before all branches

## Index Strategy

### Single Column Indexes
- Foreign keys (user_id, task_id, etc.)
- Status fields (status, is_active, is_read)
- Timestamps (created_at, due_date)
- Role fields

### Composite Indexes
- (task_id, status) for filtering tasks by status
- (user_id, is_read) for unread notifications
- (task_branch_id, assigned_to_id) for user assignments
- (created_at, status) for recent activity

### Unique Indexes
- users.email
- departments.name
- task_collaborators (task_branch_id, user_id)

## Migration Order

1. Create departments table
2. Create users table
3. Create tasks table
4. Create task_branches table
5. Create task_assignments table
6. Create task_collaborators table
7. Create task_submissions table
8. Create task_reviews table
9. Create task_comments table
10. Create task_attachments table
11. Create task_status_history table
12. Create activity_logs table
13. Create notifications table
14. Create task_hold_records table

## Data Retention

### Active Data
- All active tasks and related records
- All users and departments
- Current year notifications

### Historical Data
- Completed tasks retained indefinitely
- Activity logs retained per company policy
- Notifications retained for 1 year (configurable)

### Archive Strategy
- Soft delete for most entities
- Hard delete after X years for audit compliance
- Export to cold storage for long-term retention

## Performance Considerations

### Query Optimization
- Use indexes on foreign keys
- Use composite indexes for common query patterns
- Avoid SELECT * in production
- Use eager loading to prevent N+1 queries
- Use pagination for large datasets

### Common Query Patterns
- Get user's tasks: INDEX(user_id, status)
- Get department tasks: INDEX(department_id, status)
- Get overdue tasks: INDEX(due_date, status)
- Get recent activity: INDEX(created_at)
- Get unread notifications: INDEX(user_id, is_read)

### Partitioning (Future)
- Partition activity_logs by date for large installations
- Partition notifications by date for cleanup
- Consider read replicas for reporting queries

## Backup and Recovery

### Backup Strategy
- Daily full database backups
- Binary logging for point-in-time recovery
- Backup retention: 30 days daily, 12 weekly, 36 monthly

### Recovery Procedures
- Restore from most recent backup
- Apply binary logs for point-in-time recovery
- Verify data integrity after restore
- Test recovery procedures regularly

## Security Considerations

### Sensitive Data
- Passwords hashed (never stored in plain text)
- Email addresses encrypted at rest (optional)
- File paths not exposed in API responses
- Audit logs cannot be modified by normal users

### Access Control
- Database user with least privileges
- Separate read and write users for reporting
- Application-level encryption for sensitive fields
- Row-level security for multi-tenant (future)

### Audit Trail
- All modifications to critical tables logged
- Before/after values captured in activity_logs
- Log retention policy enforced
- Regular audit log reviews
