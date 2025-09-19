# Database Schema Documentation

## 🔑 Core Principle: Unified User ID System

**CRITICAL**: This application uses a unified user ID system where:
- `simple_users.id` = `auth.users.id` (same UUID)
- ALL tables reference `simple_users.id`, never `auth.users.id` directly
- The `auth_user_id` field in `simple_users` is legacy and can be ignored

## 📊 Database Tables Overview

### User Management Tables

#### `simple_users` (Core User Table)
The central user table that bridges Supabase Auth with application data.

| Column | Type | Description |
|--------|------|-------------|
| **id** | UUID | Primary key (same as auth.users.id) |
| email | TEXT | User email (unique) |
| name | TEXT | Display name |
| **role** | TEXT | RBAC role: 'user', 'manager', 'admin' |
| **team_id** | UUID | References teams(id) |
| **manager_id** | UUID | References simple_users(id) |
| simulation_count | INTEGER | Number of simulations used |
| simulation_limit | INTEGER | Maximum simulations allowed (default: 50) |
| subscription_status | TEXT | 'free', 'paid', 'trial' |
| avatar_url | TEXT | Profile picture URL |
| department | TEXT | User department (default: 'sales') |

#### `teams` (Team Organization)
Organizational structure for grouping users.

| Column | Type | Description |
|--------|------|-------------|
| **id** | UUID | Primary key |
| name | TEXT | Team name |
| description | TEXT | Team description |
| **manager_id** | UUID | Team manager (references simple_users) |

### Scenario & Training Tables

#### `scenarios` (Training Scenarios)
Sales training scenarios that users can practice.

| Column | Type | Description |
|--------|------|-------------|
| **id** | UUID | Primary key |
| **user_id** | UUID | Owner (references simple_users) |
| **created_by** | UUID | Creator (references simple_users) |
| title | TEXT | Scenario title |
| prompt | TEXT | AI prospect instructions [[memory:6401509]] |
| is_company_generated | BOOLEAN | Company-wide scenario flag |
| voice_settings | JSONB | Voice configuration |

#### `scenario_assignments` (Manager Assignments)
Tracks scenarios assigned by managers to users/teams.

| Column | Type | Description |
|--------|------|-------------|
| **id** | UUID | Primary key |
| **scenario_id** | UUID | References scenarios(id) |
| **assigned_by** | UUID | Manager who assigned (references simple_users) |
| **assigned_to_user** | UUID | Individual assignee (references simple_users) |
| **assigned_to_team** | UUID | Team assignee (references teams) |
| deadline | TIMESTAMP | Due date |
| status | TEXT | 'not_started', 'in_progress', 'completed', 'overdue' |
| **approved_by** | UUID | Manager who approved (references simple_users) |
| **call_id** | UUID | Completed simulation (references calls) |

#### `assignment_completions` (Completion Tracking)
Records when assignments are completed.

| Column | Type | Description |
|--------|------|-------------|
| **assignment_id** | UUID | References scenario_assignments(id) |
| **call_id** | UUID | References calls(id) |
| **completed_by** | UUID | References simple_users(id) |

### Simulation & Performance Tables

#### `calls` (Simulation Records)
Records of all practice calls/simulations.

| Column | Type | Description |
|--------|------|-------------|
| **id** | UUID | Primary key |
| **rep_id** | UUID | User who made the call (references simple_users) |
| **scenario_id** | UUID | References scenarios(id) |
| **scenario_assignment_id** | UUID | If from assignment (references scenario_assignments) |
| transcript | TEXT | Call transcript |
| score | INTEGER | Performance score |
| enhanced_scoring | JSONB | Detailed scoring metrics |
| status | TEXT | 'draft', 'completed', 'reviewed' |
| approved | BOOLEAN | Manager approval status |
| certified | BOOLEAN | Certification status |
| **reviewed_by** | UUID | Manager who reviewed (references simple_users) |

#### `simulation_feedback` (Manager Feedback)
Feedback and coaching notes on simulations.

| Column | Type | Description |
|--------|------|-------------|
| **simulation_id** | UUID | References calls(id) |
| **author_id** | UUID | Feedback author (references simple_users) |
| body | TEXT | Feedback content |
| feedback_type | TEXT | 'comment', 'coaching', 'approval', 'rejection' |

#### `performance_trends` (Analytics)
Tracks performance metrics over time.

| Column | Type | Description |
|--------|------|-------------|
| **user_id** | UUID | References simple_users(id) ⚠️ |
| metric_name | TEXT | Metric being tracked |
| score | NUMERIC | Metric value |
| **call_id** | UUID | Related call (references calls) |

⚠️ **Note**: Currently incorrectly references auth.users(id). Run `fix-performance-trends-reference.sql` to correct.

### System Tables

#### `notifications` (User Notifications)
System notifications for users.

| Column | Type | Description |
|--------|------|-------------|
| **recipient_id** | UUID | References simple_users(id) |
| type | TEXT | Notification type (8 types) |
| entity_type | TEXT | Related entity type |
| entity_id | UUID | Related entity ID |

#### `activity_logs` (Audit Trail)
Tracks user actions for audit purposes.

| Column | Type | Description |
|--------|------|-------------|
| **user_id** | UUID | References simple_users(id) |
| action | TEXT | Action performed |
| entity_type | TEXT | Entity affected |
| entity_id | UUID | Entity ID |
| ip_address | INET | User IP |

#### `user_usage` (Usage Tracking)
Tracks feature usage for analytics.

| Column | Type | Description |
|--------|------|-------------|
| **user_id** | UUID | References simple_users(id) |
| action | TEXT | Action performed |
| metadata | JSONB | Additional data |

## 🔐 RBAC Structure

### Role Hierarchy
```
admin
  ├── Full system access
  ├── Manage all teams
  └── System configuration

manager
  ├── Manage assigned team
  ├── Create/assign scenarios
  ├── Review simulations
  └── Approve completions

user
  ├── Complete assignments
  ├── Create personal scenarios
  └── View own performance
```

### Key RBAC Relationships

1. **Team Management**
   - Users belong to teams via `team_id`
   - Teams have managers via `manager_id`
   - Users have direct managers via `manager_id`

2. **Scenario Assignment Flow**
   ```
   Manager creates scenario_assignment
      ↓
   User completes simulation (creates call)
      ↓
   Assignment_completion created
      ↓
   Manager reviews/approves call
      ↓
   Simulation_feedback added
   ```

3. **Notification Triggers**
   - `scenario_assigned` - New assignment created
   - `assignment_completed` - User completes assignment
   - `simulation_reviewed` - Manager reviews simulation
   - `simulation_approved/rejected` - Final decision
   - `feedback_received` - New feedback added

## 🔄 Data Flow Examples

### User Completes Assigned Scenario
1. User has `scenario_assignment` with status 'not_started'
2. User runs simulation → creates `call` record
3. System creates `assignment_completion` record
4. Assignment status → 'completed'
5. Manager notified via `notifications`
6. Manager reviews → updates `call.reviewed_by`
7. Manager adds `simulation_feedback`
8. User notified of review

### Manager Creates Team Assignment
1. Manager creates `scenario` (or uses existing)
2. Creates `scenario_assignment` with `assigned_to_team`
3. All team members notified
4. Each completion tracked individually
5. Manager dashboard shows team progress

## 🛠️ Migration Scripts

### Required Fixes
```bash
# Fix performance_trends foreign key
psql> \i scripts/fix-performance-trends-reference.sql
```

### Active Schema Scripts
- `scripts/supabase-auth-migration.sql` - Core auth setup
- `scripts/simple-auth-schema.sql` - User table structure
- `scripts/add-simulation-limits.sql` - Usage limits
- `scripts/fix-scenarios-prompt-only.sql` - Scenario structure

## ⚠️ Important Notes

1. **Never reference auth.users directly** - Always use simple_users(id)
2. **Scenario prompts are freeform** - No predefined fields [[memory:6401509]]
3. **All user IDs are UUIDs** - Consistent across the system
4. **RLS policies needed** - Implement based on role checks
5. **Cascade deletes** - Be careful with user deletion

## 📈 Future Considerations

### Potential Enhancements
- [ ] Add `organization_id` for multi-tenant support
- [ ] Add `skills` table for competency tracking
- [ ] Add `learning_paths` for structured training
- [ ] Add `achievements` for gamification

### Performance Optimizations
- [ ] Add indexes on foreign keys
- [ ] Partition `calls` table by date
- [ ] Archive old `activity_logs`
- [ ] Implement materialized views for analytics 