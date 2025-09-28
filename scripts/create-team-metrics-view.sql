-- Create a view for team metrics that makes querying easier and more efficient
-- This replaces the complex database function with a simple, queryable view

CREATE OR REPLACE VIEW team_metrics_view AS
SELECT 
  -- User info
  u.id as user_id,
  u.email,
  u.role,
  SPLIT_PART(u.email, '@', 2) as email_domain,
  
  -- Call info
  c.id as call_id,
  c.score as call_score,
  c.created_at as call_date,
  c.scenario_name,
  
  -- Assignment info
  sa.id as assignment_id,
  sa.created_at as assignment_date,
  sa.assigned_by,
  
  -- Completion info
  ac.id as completion_id,
  ac.completed_at,
  ac.review_status,
  
  -- Derived fields for easy filtering
  CASE 
    WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN '7_days'
    WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN '30_days'
    WHEN c.created_at >= NOW() - INTERVAL '90 days' THEN '90_days'
    ELSE 'older'
  END as time_bucket

FROM simple_users u
LEFT JOIN calls c ON c.rep_id = u.id
LEFT JOIN scenario_assignments sa ON sa.assigned_to_user = u.id  
LEFT JOIN assignment_completions ac ON ac.assignment_id = sa.id;

-- Enable RLS on the view (inherits from base tables)
ALTER VIEW team_metrics_view OWNER TO postgres;

-- Grant access to authenticated users
GRANT SELECT ON team_metrics_view TO authenticated;

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_team_metrics_email_domain 
ON simple_users (SPLIT_PART(email, '@', 2));

CREATE INDEX IF NOT EXISTS idx_calls_created_at_score 
ON calls (created_at, score) 
WHERE score IS NOT NULL;

-- Example usage queries:

-- Get team metrics for a specific domain and time range:
/*
SELECT 
  email_domain,
  COUNT(DISTINCT user_id) as team_members,
  COUNT(call_id) as total_calls,
  AVG(call_score) as avg_score,
  COUNT(CASE WHEN completion_id IS NOT NULL THEN 1 END) as completed_assignments,
  COUNT(assignment_id) as total_assignments,
  COUNT(CASE WHEN review_status = 'approved' THEN 1 END) as approved_calls
FROM team_metrics_view 
WHERE email_domain = 'repscore.io'
  AND time_bucket IN ('7_days', '30_days')
GROUP BY email_domain;
*/

-- Get individual user performance:
/*
SELECT 
  user_id,
  email,
  COUNT(call_id) as calls_made,
  AVG(call_score) as avg_score,
  COUNT(completion_id) as assignments_completed
FROM team_metrics_view
WHERE email_domain = 'repscore.io'
  AND call_date >= NOW() - INTERVAL '30 days'
GROUP BY user_id, email;
*/