# Task Management System - Architecture

## Overview
The Task Management System (TMS) is a full-stack application with a React frontend and Laravel backend, designed for internal company use.

## Technology Stack

### Frontend
- React 18+ with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Axios for API communication
- React Hook Form for form management
- Zod for validation
- TanStack Query for data fetching and caching
- Lucide React for icons

### Backend
- Laravel 12
- PHP 8.4+
- MySQL 8+
- Laravel Sanctum for authentication
- Laravel Queues for background jobs
- Laravel Notifications

### Database
- MySQL 8
- InnoDB engine
- Foreign key constraints
- Appropriate indexes

## Architecture Principles

### Separation of Concerns
- Frontend handles UI, validation, and user interaction
- Backend handles business logic, authorization, and data persistence
- API is the only communication layer between frontend and backend

### Security
- All sensitive operations validated on backend
- Role-based access control enforced at API level
- Resource-based permissions for task access
- Secure authentication with Laravel Sanctum
- Audit logging for all significant actions

### Scalability
- Modular component architecture
- Service layer for business logic
- Queue-based processing for notifications
- Database-backed pagination
- Efficient query patterns with eager loading

## Project Structure

```
task-management-system/
├── frontend/
│   ├── src/
│   │   ├── api/              # API client and endpoints
│   │   ├── app/              # App-wide components
│   │   ├── components/       # Reusable UI components
│   │   ├── features/         # Feature-based modules
│   │   │   ├── auth/         # Authentication
│   │   │   ├── dashboard/    # Dashboards
│   │   │   ├── tasks/        # Task management
│   │   │   ├── reviews/      # Review workflows
│   │   │   ├── users/        # User management
│   │   │   ├── departments/  # Department management
│   │   │   └── notifications/ # Notifications
│   │   ├── hooks/            # Custom React hooks
│   │   ├── layouts/          # Layout components
│   │   ├── routes/           # Route configuration
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utility functions
│   ├── tests/                # Frontend tests
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/  # API controllers
│   │   │   ├── Middleware/   # Custom middleware
│   │   │   ├── Requests/     # Form request validation
│   │   │   └── Resources/    # API resources
│   │   ├── Models/           # Eloquent models
│   │   ├── Policies/         # Authorization policies
│   │   ├── Services/         # Business logic services
│   │   ├── Jobs/             # Queue jobs
│   │   ├── Notifications/    # Notification classes
│   │   └── Enums/            # PHP enums
│   ├── database/
│   │   ├── migrations/       # Database migrations
│   │   ├── seeders/          # Database seeders
│   │   └── factories/        # Model factories
│   ├── routes/
│   │   └── api.php           # API routes
│   ├── tests/                # Backend tests
│   └── composer.json
│
└── docs/                     # Documentation
```

## Authentication Flow

1. User submits credentials to `/api/v1/auth/login`
2. Backend validates credentials
3. Backend generates Sanctum token
4. Token returned to frontend
5. Frontend stores token securely
6. Frontend includes token in Authorization header for all API requests
7. Backend validates token on each protected endpoint
8. Token expiration handled with refresh flow

## Authorization Model

### Roles
- **Admin**: Full system access
- **Sub-Admin**: Broad operational access, cannot delete protected records
- **Employee**: Task creation and participation, limited administrative access

### Permission Layers
1. **Role-based**: What actions a role can perform globally
2. **Resource-based**: What specific resources a user can access
3. **Context-based**: What actions are available based on task context (creator, assignee, reviewer, etc.)

### Policy Enforcement
- Laravel Policies for authorization
- Middleware for role checks
- Form Requests for validation
- Service layer for business logic

## Task Ownership Model

### Key Concepts
- **Creator**: Original task creator (unchanged throughout lifecycle)
- **Current Owner**: Person responsible for next action
- **Assignee**: Person assigned to a task branch
- **Collaborator**: Person invited to contribute to a branch
- **Reviewer**: Person authorized to review a submission
- **Direct Delegator**: Person who delegated the current work

### Ownership Rules
- Each active branch has exactly one accountable owner
- Creator remains the creator even after reassignment
- Current owner changes based on workflow state
- Review routing follows delegation chain or configured reviewer

## Review Hierarchy

### Typical Flow
```
Creator
  → Assignee
    → Further Assignee (if delegated)
      → Direct Delegator or Configured Reviewer
        → Next Review Level (if configured)
          → Creator's Final Check
            → Final Submission
              → Completed
```

### Review Configuration
- Support for multiple review levels
- Configurable per task or globally
- Direct delegator review by default
- Can specify specific reviewers per stage

## Database Relationships

### Core Relationships
- Users belong to Departments (optional)
- Tasks belong to Creators
- Tasks can have multiple Branches
- Branches belong to Tasks
- Branches have one Owner
- Branches can have multiple Collaborators
- Assignments link Users to Branches
- Reviews link Branches to Reviewers
- Comments belong to Tasks, Branches, or Reviews
- Attachments belong to Tasks, Branches, or Comments
- Activity Logs record all significant events

### Cascade Rules
- Soft deletes for most entities
- Historical preservation for completed tasks
- Deactivate instead of delete for used departments
- Cascade deletes for child records when appropriate

## API Design

### Versioning
- All endpoints prefixed with `/api/v1`
- Consistent response format
- Standard error responses

### Response Format
```json
{
  "data": { ... },
  "message": "Success message",
  "meta": {
    "pagination": { ... }
  }
}
```

### Error Format
```json
{
  "message": "Error message",
  "errors": {
    "field": ["error message"]
  }
}
```

## State Management

### Frontend
- TanStack Query for server state
- React Context for auth state
- Local component state for UI interactions
- Form state with React Hook Form

### Backend
- Database as single source of truth
- Laravel Eloquent for data access
- Service layer for business logic
- No client-side state for critical business data

## Notification Flow

### In-App Notifications
- Database-backed notification records
- Real-time updates via polling or websockets (future)
- Read/unread status tracking

### Background Processing
- Laravel Queues for notification jobs
- Retry logic for failed notifications
- Deduplication to prevent duplicates

### Notification Types
- Task assignment
- Task reassignment
- Collaboration invitation
- Work submission
- Review approval
- Return with comments
- On Hold/Resume
- Task cancellation
- Final completion

## File Storage

### Upload Flow
1. Frontend validates file type and size
2. File uploaded to backend endpoint
3. Backend validates again
4. File stored in configured storage (local or S3)
5. Metadata stored in database
6. File path returned to frontend

### Access Control
- File downloads validated by backend
- Permission checks on each download
- Secure storage paths
- No public access to private attachments

## Audit Logging

### Logged Events
- Task creation and updates
- Assignment and reassignment
- Collaboration changes
- Progress updates
- Comments and attachments
- Work submissions
- Review decisions
- Returns and corrections
- Holds and resumptions
- Cancellation
- Final submission
- User and permission changes

### Log Structure
- Actor (user ID)
- Action type
- Target (task/branch ID)
- Timestamp
- Before/after values (when applicable)
- Reason or comment

## Performance Considerations

### Database
- Indexes on frequently queried fields
- Composite indexes for common query patterns
- Eager loading to prevent N+1 queries
- Pagination for large datasets

### Frontend
- Code splitting with React Router
- Lazy loading for heavy components
- Debounced search inputs
- Optimistic updates where appropriate

### Backend
- Query optimization
- Queue processing for heavy operations
- Response caching where appropriate
- Rate limiting for sensitive endpoints

## Security Measures

### Authentication
- Secure password hashing (bcrypt/argon2)
- Token-based authentication with Sanctum
- Token expiration and refresh
- Secure session handling

### Authorization
- Backend-enforced permissions
- Role-based access control
- Resource-based access control
- Policy-based authorization

### Data Protection
- Input validation and sanitization
- SQL injection prevention (Eloquent ORM)
- XSS prevention (output escaping)
- CSRF protection
- Secure file uploads
- Environment variable secrets

### Audit Trail
- Append-only audit logs
- No modification of historical records
- Log retention policy
- Sensitive action logging

## Error Handling

### Frontend
- Global error boundary
- API error interceptors
- User-friendly error messages
- Retry mechanisms for transient failures

### Backend
- Exception handling middleware
- Logging of errors
- Appropriate HTTP status codes
- Generic error messages for security

## Testing Strategy

### Backend Tests
- Unit tests for services
- Feature tests for API endpoints
- Permission and authorization tests
- Workflow integration tests

### Frontend Tests
- Component tests with React Testing Library
- Hook tests
- Form validation tests
- User interaction tests

### End-to-End Tests
- Complete workflow tests with Playwright
- Critical user journeys
- Cross-browser compatibility

## Deployment Considerations

### Environment
- Environment-specific configuration
- Separate database per environment
- Different storage per environment
- Production-specific security settings

### Build Process
- Frontend production build
- Backend optimization
- Asset compilation
- Migration safety

### Monitoring
- Application logging
- Error tracking
- Performance monitoring
- Database query logging

## Future Enhancements

### Potential Features
- Real-time notifications with WebSockets
- Email notifications integration
- Advanced reporting and analytics
- Mobile app (React Native)
- Calendar integration
- Slack/Teams integration
- Advanced workflow customization
- Time tracking
- Budget and resource management

### Scalability Options
- Microservices for specific features
- Redis for caching
- Elasticsearch for advanced search
- CDN for static assets
- Load balancing for high traffic
