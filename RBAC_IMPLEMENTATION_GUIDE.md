# 🔐 RBAC Implementation Guide

## Overview
This document describes the comprehensive Role-Based Access Control (RBAC) system implemented for the Sales Training Simulator platform. The system supports three user roles (User, Manager, Admin) with granular permissions for scenarios, simulations, assignments, and notifications.

## 🎯 Features Implemented

### Core RBAC Features
- ✅ **Role-based authentication** with user, manager, and admin roles
- ✅ **Team-based organization** with team assignments
- ✅ **Scenario assignments** with deadlines and tracking
- ✅ **Simulation visibility controls** (users see own, managers see all)
- ✅ **Feedback and review system** for simulations
- ✅ **Real-time notifications** for assignments and reviews
- ✅ **Activity logging** for audit trails
- ✅ **Row-level security** in database

### User Roles & Permissions

#### 👤 User (Sales Rep)
- Create personal scenarios
- Complete assigned scenarios
- View own simulations only
- Receive and view feedback
- Update assignment status
- Receive notifications for assignments

#### 👔 Manager
- All User permissions plus:
- Assign scenarios to users/teams
- View all team simulations
- Add feedback and coaching notes
- Approve/reject/certify simulations
- Request retries
- View team analytics
- Receive completion/overdue notifications

#### 🛡️ Admin
- All Manager permissions plus:
- Manage all users and roles
- Create company-wide scenarios
- View all organization data
- Delete any content
- Access audit logs
- Manage organization settings

## 📁 File Structure

### Database Migrations
```
scripts/
├── rbac-migration.sql          # Main RBAC database schema
├── seed-rbac-test-data.sql     # Test data for development
```

### API Endpoints
```
app/api/
├── notifications/route.ts       # Notification management
├── scenario-assignments/route.ts # Assignment CRUD operations
├── simulations/[id]/
│   ├── feedback/route.ts       # Simulation feedback
│   └── review/route.ts         # Approve/reject/certify
├── calls/route.ts              # Enhanced with RBAC filtering
└── users/route.ts              # User management for managers
```

### Middleware & Libraries
```
lib/
├── rbac-middleware.ts          # RBAC authentication & authorization
├── types.ts                    # Updated with RBAC types
```

### UI Components
```
components/
├── ui/notifications.tsx        # Notification bell component
├── pages/simulations.tsx       # Updated with manager views
└── layout/main-layout.tsx      # Integrated notifications
```

## 🗄️ Database Schema

### New Tables

#### `teams`
- Organizational structure for grouping users
- Links to manager

#### `scenario_assignments`
- Tracks scenario assignments to users/teams
- Status: not_started, in_progress, completed, overdue
- Result: pass/fail
- Deadline tracking

#### `simulation_feedback`
- Feedback and coaching notes on simulations
- Types: comment, coaching, approval, rejection

#### `notifications`
- In-app notifications
- Types: assignment, completion, overdue, review
- Read/unread status

#### `activity_logs`
- Audit trail of all actions
- IP address and user agent tracking

### Modified Tables

#### `simple_users`
- Added: `role` (user/manager/admin)
- Added: `team_id`, `manager_id`

#### `scenarios`
- Added: `is_company_generated`, `created_by`

#### `calls`
- Added: `scenario_assignment_id`
- Added: `approved`, `certified`, `request_retry`
- Added: `reviewed_by`, `reviewed_at`
- Added: `status` (draft/completed/reviewed)

## 🔌 API Endpoints

### Notifications
```typescript
GET    /api/notifications         // Fetch user notifications
PATCH  /api/notifications         // Mark as read
POST   /api/notifications         // Create notification (managers)
```

### Scenario Assignments
```typescript
GET    /api/scenario-assignments  // List assignments
POST   /api/scenario-assignments  // Create assignment (managers)
PATCH  /api/scenario-assignments  // Update status/result
DELETE /api/scenario-assignments  // Delete assignment
```

### Simulation Review
```typescript
GET    /api/simulations/[id]/review    // Get review status
POST   /api/simulations/[id]/review    // Review actions
GET    /api/simulations/[id]/feedback  // Get feedback
POST   /api/simulations/[id]/feedback  // Add feedback (managers)
```

### Enhanced Calls API
```typescript
GET /api/calls?scope=all&repId=xxx&teamId=xxx&certified=true
// scope: 'my' or 'all' (managers only)
// Additional filters for managers
```

## 🚀 Deployment Instructions

### 1. Run Database Migrations
```sql
-- In Supabase SQL Editor, run in order:
1. scripts/rbac-migration.sql
2. scripts/seed-rbac-test-data.sql (optional, for testing)
```

### 2. Update Environment Variables
Ensure these are set:
```env
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 3. Deploy Application
```bash
npm run build
npm run start
```

### 4. Set Up Initial Roles
```sql
-- Make yourself an admin
UPDATE simple_users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Create teams
INSERT INTO teams (name, description) VALUES
  ('Sales Team A', 'Enterprise Sales'),
  ('Sales Team B', 'SMB Sales');
```

## 🧪 Testing the Implementation

### Test User Flows

#### As Admin:
1. Create company scenarios
2. Assign to teams/users
3. View all simulations
4. Approve/certify completions

#### As Manager:
1. Create and assign scenarios
2. View team simulations
3. Add feedback
4. Receive notifications

#### As User:
1. View assigned scenarios
2. Complete simulations
3. View only own simulations
4. Receive feedback

### Test Notifications
1. Assign scenario → User gets notification
2. Complete assignment → Manager gets notification
3. Miss deadline → Manager gets overdue notification
4. Add feedback → User gets notification

## 🔒 Security Features

### Row-Level Security (RLS)
- Database-level access control
- Users can only see their own data
- Managers see team data
- Admins see all data

### Server-Side Authorization
- All API endpoints check permissions
- Role verification on every request
- Resource-level access control
- Activity logging for audit

### Client-Side Controls
- UI elements hidden based on role
- Disabled actions for unauthorized users
- Role-aware navigation

## 📊 Monitoring & Maintenance

### Activity Logs
Query recent admin actions:
```sql
SELECT * FROM activity_logs 
WHERE user_id IN (
  SELECT id FROM simple_users WHERE role = 'admin'
)
ORDER BY created_at DESC
LIMIT 100;
```

### Check Overdue Assignments
```sql
SELECT * FROM scenario_assignments
WHERE deadline < NOW()
AND status != 'completed'
ORDER BY deadline;
```

### Notification Stats
```sql
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread
FROM notifications
GROUP BY type;
```

## 🐛 Troubleshooting

### Common Issues

#### Users can't see assigned scenarios
- Check `scenario_assignments` table
- Verify team assignments
- Check RLS policies

#### Notifications not appearing
- Verify notification triggers are created
- Check browser console for API errors
- Ensure user is authenticated

#### Managers can't see team simulations
- Verify manager role in `simple_users`
- Check team_id assignments
- Test API with scope=all parameter

### Debug Queries

Check user roles:
```sql
SELECT id, email, role, team_id FROM simple_users;
```

Check assignments:
```sql
SELECT * FROM scenario_assignments 
WHERE assigned_to_user = 'USER_ID';
```

Check notifications:
```sql
SELECT * FROM notifications 
WHERE recipient_id = 'USER_ID' 
ORDER BY triggered_at DESC;
```

## 📝 Future Enhancements

### Planned Features
- [ ] Bulk assignment UI for managers
- [ ] Email notifications (in addition to in-app)
- [ ] Role-based dashboards
- [ ] Team performance analytics
- [ ] Certification tracking
- [ ] Assignment templates
- [ ] Scheduled assignments
- [ ] Role delegation

### Performance Optimizations
- [ ] Notification batching
- [ ] Caching for team queries
- [ ] Pagination for large datasets
- [ ] Background job for overdue checks

## 📚 API Usage Examples

### Assign Scenario to Team
```javascript
const response = await fetch('/api/scenario-assignments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenarioId: 'xxx',
    assignToTeam: 'team-id',
    deadline: '2024-12-31'
  })
});
```

### Review Simulation
```javascript
const response = await fetch('/api/simulations/xxx/review', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'approve', // or 'reject', 'certify', 'request_retry'
    feedback: 'Great job!',
    score: 95
  })
});
```

### Get Team Simulations
```javascript
const response = await fetch('/api/calls?scope=all&teamId=xxx');
const { calls } = await response.json();
```

## 🤝 Support

For issues or questions about the RBAC implementation:
1. Check this documentation
2. Review the test data seed script
3. Check activity logs for debugging
4. Contact the development team

---

**Last Updated:** December 2024
**Version:** 1.0.0 