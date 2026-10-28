# Task Management System - Workflow Documentation

## Overview
This document describes all supported task workflows, status transitions, review routing, ownership changes, cancellation, and final completion.

## Task Handling Methods

Every task must use exactly one of three handling methods, selected by the creator at task creation:

### 1. Work Alone
The creator completes the task themselves without assignment or collaboration.

**Workflow:**
1. Creator creates task with "Work Alone" method
2. Creator works on task, updates progress, adds comments/attachments
3. Creator submits task directly for final completion
4. Task status changes to "Completed"
5. Task appears in Completed view

**Special Rules:**
- No branch reviewer required
- No assignment or collaboration records created
- Direct path from creation to completion
- Creator has full control throughout

**Status Transitions:**
- pending → in_progress (when creator starts work)
- in_progress → completed (when creator submits)
- in_progress → on_hold (if put on hold)
- on_hold → in_progress (when resumed)
- pending → cancelled (if cancelled)

### 2. Assign to One or More People
The creator assigns the task to one or more employees.

**Workflow:**
1. Creator creates task with "Assign" method
2. Creator selects one or more assignees
3. System creates task_branch record(s) for each assignee
4. Each branch has one accountable owner
5. Assignee works on their branch
6. Assignee may further delegate or add collaborators
7. When work is ready, assignee submits for review
8. Submission goes to direct delegator or configured reviewer
9. Reviewer approves or returns with comments
10. If approved, work moves to next review level or back to creator
11. If returned, assignee corrects and resubmits
12. After all required reviews, creator performs final check
13. Creator submits for final completion
14. Task status changes to "Completed"

**Special Rules:**
- Each branch has exactly one owner
- Review routing follows delegation chain or configured reviewer
- Creator must do final submission
- All branches must be completed before parent completion

**Status Transitions:**
- pending → in_progress (when assignee starts work)
- in_progress → review (when submitted for review)
- review → in_progress (when returned with comments)
- review → review (when approved and moved to next reviewer)
- review → completed (when creator submits)
- Any status → on_hold (if put on hold)
- on_hold → previous status (when resumed)
- Any status → cancelled (if cancelled)

### 3. Collaborate with One or More People
The creator invites collaborators for parallel work on branches.

**Workflow:**
1. Creator creates task with "Collaborate" method
2. Creator creates branches or invites collaborators
3. Each branch has one accountable owner
4. Multiple collaborators can work on same branch
5. Branches progress independently
6. Each branch follows its own review path
7. Creator tracks all branch status
8. Parent task cannot complete until all branches approved
9. Creator performs final check on all branches
10. Creator submits for final completion
11. Task status changes to "Completed"

**Special Rules:**
- Parallel execution of branches
- Each branch has independent review path
- Parent completion waits for all branches
- Clear roll-up status (e.g., "2 of 3 branches approved")

**Status Transitions:**
- Same as Assign workflow for each branch
- Parent task status reflects overall progress
- Parent task: pending → in_progress (when any branch starts)
- Parent task: in_progress → review (when all branches in review)
- Parent task: review → completed (when creator submits)

## Detailed Status Definitions

### Pending
**Meaning:** Task or branch has not yet started or is waiting to be picked up.

**When Used:**
- Newly created tasks
- Tasks waiting for assignment
- Branches waiting for owner to start

**Transitions From:**
- Task creation

**Transitions To:**
- in_progress (when work starts)
- cancelled (if cancelled)

### In Progress
**Meaning:** Work is actively being performed.

**When Used:**
- Owner is working on task/branch
- Collaborators are contributing
- Progress updates being made

**Transitions From:**
- pending (when work starts)
- review (when returned with comments)
- on_hold (when resumed)

**Transitions To:**
- review (when submitted for review)
- on_hold (if put on hold)
- cancelled (if cancelled)

### Review
**Meaning:** A submission is awaiting its configured reviewer or the creator's final check.

**When Used:**
- Work submitted for review
- Waiting for reviewer decision
- Creator's final check queue

**Transitions From:**
- in_progress (when submitted for review)
- review (when approved and moved to next level)

**Transitions To:**
- in_progress (when returned with comments)
- review (when approved to next level)
- completed (when creator finalizes)
- on_hold (if put on hold)

### On Hold
**Meaning:** Work is temporarily paused for a recorded reason.

**When Used:**
- Waiting for external dependencies
- Resource unavailability
- Strategic pause
- Information gathering

**Requirements:**
- Must provide reason when putting on hold
- Task remains open and visible
- Not counted as actively In Progress

**Transitions From:**
- Any status (except completed, cancelled)

**Transitions To:**
- Previous status (when resumed)

**Notifications:**
- Notify relevant participants when put on hold
- Notify when resumed

### Post Comment
**Meaning:** Work has been returned because information is missing or corrections are required.

**When Used:**
- Reviewer returns work with comments
- Creator requests corrections
- Missing information identified

**Requirements:**
- Must include correction comments
- Must identify responsible person or stage
- Preserve previous submission

**Transitions From:**
- review (when returned)

**Transitions To:**
- in_progress (when corrections begin)
- review (when resubmitted)

### Completed
**Meaning:** The required workflow and final submission have been successfully completed.

**When Used:**
- Work-alone tasks: after creator submission
- Assigned tasks: after all reviews and creator final submission
- Collaborative tasks: after all branches completed and creator final submission

**Requirements:**
- All required review stages approved
- Creator has performed final check
- Creator has submitted for completion
- Parent task cannot complete before all branches

**Transitions From:**
- review (when creator finalizes)
- in_progress (work-alone direct completion)

**Transitions To:**
- None (terminal state)

**Final Actions:**
- Record completion timestamp
- Notify creator, current owner, collaborators
- Move to Completed view
- Retain full history

### Cancelled
**Meaning:** An authorised person has cancelled the task.

**When Used:**
- No longer needed
- Duplicated work
- Strategic cancellation
- Invalid task

**Requirements:**
- Only creator, Admin, or Sub-Admin can cancel
- Must provide cancellation reason
- Record actor, timestamp, reason
- Preserve historical records

**Transitions From:**
- Any status except completed

**Transitions To:**
- None (terminal state)

**Branch Behavior:**
- All child branches also cancelled
- Participants notified
- History preserved

### Rejected
**Meaning:** A submission or task has been rejected through an explicitly defined, authorised workflow.

**When Used:**
- Work does not meet requirements
- Incorrect approach
- Cannot be corrected with comments

**Requirements:**
- Must be explicitly configured in workflow
- Cannot bypass required reviews
- Must provide clear reason
- Document rejection path

**Transitions From:**
- review (when rejected)

**Transitions To:**
- pending (if task can be restarted)
- cancelled (if rejection is final)

## Ownership and Delegation

### Ownership Types

#### Creator
- Original task creator
- Never changes throughout task lifecycle
- Responsible for final submission
- Can track complete task journey
- Has cancellation rights

#### Current Owner
- Person responsible for next action
- Changes with workflow state
- One owner per active branch
- Identified in task_branch.owner_id

#### Assignee
- Person assigned to a branch
- May be different from current owner if delegated
- Recorded in task_assignments table
- Can further delegate when authorised

#### Collaborator
- Person invited to contribute
- Can add comments, upload files
- May have assignment/collaboration permissions
- Does not replace owner

#### Reviewer
- Person authorized to review a submission
- Can be direct delegator or configured reviewer
- Makes approve/return/reject decision
- Recorded in task_reviews table

### Delegation Chain

```
Creator
  ↓ (assigns)
Assignee (current owner)
  ↓ (delegates further)
Further Assignee (current owner)
  ↓ (submits for review)
Direct Delegator or Configured Reviewer
  ↓ (approves)
Next Review Level (if configured)
  ↓ (all reviews complete)
Creator (final check)
  ↓ (submits)
Completed
```

### Delegation Rules
- Only current owner can delegate
- Must record delegation in task_assignments
- Preserve previous assignments in history
- Cannot delegate to unauthorized users
- Cannot create circular delegation
- Owner cannot delegate to themselves

### Reassignment
- Admin/Sub-Admin can reassign at any time
- Must provide reason
- Record in task_assignments
- Notify previous and new owner
- Preserve history

## Review Routing

### Default Routing
- Review goes to direct delegator
- Delegator is person who assigned current work
- Identified via parent_assignment_id

### Configured Routing
- Can specify specific reviewers per stage
- Configured at task or department level
- Overrides default delegator routing
- Supports multiple review levels

### Review Level Hierarchy
- Level 1: Direct delegator or configured reviewer
- Level 2: Next configured reviewer
- Level N: Final configured reviewer
- Final: Creator's final check

### Review Decision Flow

```
Submission Received
  ↓
Reviewer Reviews
  ↓
Decision?
  ├─ Approve → Move to next level or creator
  ├─ Return → Back to responsible person with comments
  └─ Reject → Terminal rejection state (if configured)
```

### Approval Rules
- Only authorized reviewer can approve
- Must have access to review materials
- Cannot approve own work (unless configured)
- Record decision, comments, timestamp
- Notify next person in chain

### Return Rules
- Must include correction comments
- Must identify responsible person/stage
- Preserve previous submission
- Status changes to post_comment or in_progress
- Notify responsible person
- Cannot return to unauthorized person

## Comments and Communication

### Comment Types
- Progress updates
- Questions and clarifications
- Correction requests
- Review feedback
- Internal notes

### Comment Permissions
- Creator can comment at any time
- Current owner can comment
- Collaborators can comment
- Reviewers can comment during review
- Admin/Sub-Admin can comment (with visibility)

### Comment Visibility
- Public: Visible to all authorized participants
- Internal: Visible only to Admin/Sub-Admin
- Review-specific: Visible to reviewer and submitter

### Required Comments
- Must comment when returning work
- Must comment when putting on hold
- Must comment when cancelling
- Optional for other actions

## Attachments

### Attachment Types
- Task-level attachments
- Branch-level attachments
- Comment attachments
- Submission attachments

### Upload Rules
- Validate file type and size
- Generate safe storage names
- Store metadata in database
- Record uploader and timestamp
- Associate with correct entity

### Access Control
- Only authorized users can download
- Permission checked on each download
- No public URLs for private attachments
- Preserve attachments with historical records

## Notifications

### Notification Triggers
- Task assigned
- Task reassigned
- Collaborator invited
- Work submitted for review
- Review approved
- Work returned with comments
- Task put on hold
- Task resumed
- Task cancelled
- Final completion

### Notification Recipients
- Assignment: Assignee
- Reassignment: New and previous assignee
- Collaboration: Collaborator
- Submission: Reviewer
- Approval: Next reviewer or creator
- Return: Responsible person
- Hold/Resume: Relevant participants
- Cancellation: Creator, assignees, collaborators
- Completion: Creator, current owner, collaborators

### Notification Delivery
- In-app notifications (always)
- Email notifications (configurable)
- Real-time (future with WebSockets)

## Special Workflows

### Work Alone Exception
- Creator submits directly for completion
- No branch review required
- No assignment records
- Simplified status flow

### Parallel Branch Completion
- Parent task waits for all branches
- Branches complete independently
- Roll-up status displayed
- Creator checks all branches before final submission

### Emergency Cancellation
- Admin/Sub-Admin can cancel any task
- Must provide reason
- Override normal workflow
- Audit log required

### Hold and Resume
- Can hold at any stage
- Must provide reason
- Resume returns to previous status
- All holds recorded

## State Machine Summary

### Work Alone State Machine
```
[pending] → [in_progress] → [completed]
           ↓
        [on_hold] → [in_progress]
           ↓
        [cancelled]
```

### Assign/Collaborate State Machine
```
[pending] → [in_progress] → [review] → [completed]
           ↓              ↓
        [on_hold]     [post_comment] → [in_progress]
           ↓              ↓
        [cancelled]   [cancelled]
```

### Invalid Transitions
- completed → any other status
- cancelled → any other status
- pending → completed (without work)
- in_progress → post_comment (without review)
- review → pending (bypassing corrections)

## Permission Requirements by Action

### Create Task
- Any authenticated employee
- No special permissions required

### Assign Task
- Creator of task
- Admin
- Sub-Admin

### Reassign Task
- Current owner (if authorized)
- Admin
- Sub-Admin

### Add Collaborator
- Creator of task
- Current branch owner (if authorized)
- Admin
- Sub-Admin

### Submit for Review
- Current branch owner
- Creator (work-alone)

### Review and Approve
- Authorized reviewer
- Admin (if authorized)
- Sub-Admin (if authorized)

### Return with Comments
- Authorized reviewer
- Creator (during final check)
- Admin (if authorized)
- Sub-Admin (if authorized)

### Cancel Task
- Creator
- Admin
- Sub-Admin

### Put On Hold
- Current owner
- Admin
- Sub-Admin

### Final Submission
- Creator (assigned/collaborative tasks)
- Current owner (work-alone)

## Audit Requirements

### Logged Events
- Task creation
- Task updates
- Assignment and reassignment
- Collaboration changes
- Delegation
- Progress changes
- Comments
- File uploads
- Work submissions
- Review decisions
- Returns and corrections
- Holds and resumptions
- Cancellation
- Rejection
- Final submission
- Completion
- User and permission changes

### Log Content
- Actor (user ID)
- Action type
- Target (task/branch ID)
- Timestamp
- Before/after values (when applicable)
- Reason or comment

### Log Access
- Admin: Full access
- Sub-Admin: Full access (if authorized)
- Employee: Only their own task logs

## Error Handling

### Common Errors
- Invalid status transition
- Unauthorized action
- Missing required comments
- Invalid ownership
- Circular delegation
- Missing reviewer
- Incomplete branches

### Error Responses
- 400: Bad request (invalid input)
- 401: Unauthorized (not logged in)
- 403: Forbidden (no permission)
- 404: Not found (resource doesn't exist or no access)
- 422: Validation error
- 409: Conflict (invalid state transition)
- 500: Server error

### Error Messages
- Clear and actionable
- Don't expose internal details
- Guide user to correct action
- Log technical details server-side

## Workflow Validation

### Pre-Submission Checks
- All required fields filled
- All required attachments uploaded
- All required branches completed
- All required approvals obtained
- Creator final check completed

### Pre-Completion Checks
- All review stages approved
- All branches completed
- Creator has submitted
- No outstanding returns
- No active holds

### Pre-Cancellation Checks
- User has cancellation permission
- Cancellation reason provided
- Affected parties notified
- History preserved

## Configuration Options

### Review Levels
- Configurable per department
- Configurable per task type
- Default: Direct delegator review
- Can specify named reviewers

### Permission Rules
- Who can assign
- Who can collaborate
- Who can review
- Who can cancel
- Who can put on hold

### Notification Rules
- Who receives what notifications
- Email enabled/disabled
- Real-time enabled/disabled
- Notification frequency

### File Restrictions
- Allowed file types
- Maximum file size
- Storage location
- Retention policy

## Future Workflow Enhancements

### Potential Features
- Custom workflow definitions
- Conditional routing
- Automatic escalation
- SLA tracking
- Approval voting
- Sequential and parallel review combinations
- Task templates
- Recurring tasks

### Extension Points
- Custom status types
- Custom review stages
- Custom notification types
- Custom permissions
- Workflow plugins
