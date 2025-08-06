import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || 'all'; // all, week, month, year
    const limit = parseInt(searchParams.get('limit') || '50');
    const role = searchParams.get('role') || 'all'; // all, rep, manager, admin

    // Build date filter based on timeRange
    let dateFilter = '';
    const now = new Date();
    
    switch (timeRange) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `created_at >= '${weekAgo.toISOString()}'`;
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = `created_at >= '${monthAgo.toISOString()}'`;
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = `created_at >= '${yearAgo.toISOString()}'`;
        break;
      default:
        dateFilter = '';
    }

    // Get leaderboard data from Supabase
    let query = supabase
      .from('calls')
      .select(`
        rep_id,
        score,
        created_at,
        scenario_name,
        duration,
        objections_handled,
        cta_used,
        sentiment
      `);

    // Apply date filter if specified
    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    const { data: calls, error: callsError } = await query;

    if (callsError) {
      console.error('Supabase calls fetch error:', callsError);
      return errorResponse(`Database error: ${callsError.message}`, 500);
    }

    // Get user information
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, department');

    if (usersError) {
      console.error('Supabase users fetch error:', usersError);
      return errorResponse(`Database error: ${usersError.message}`, 500);
    }

    // Create user lookup map
    const userMap = new Map(users?.map(user => [user.id, user]) || []);

    // Aggregate data by rep
    const repStats = new Map();

    calls?.forEach(call => {
      const repId = call.rep_id;
      if (!repStats.has(repId)) {
        repStats.set(repId, {
          repId,
          totalCalls: 0,
          totalScore: 0,
          averageScore: 0,
          totalDuration: 0,
          totalObjectionsHandled: 0,
          totalCtaUsed: 0,
          scenarios: new Set(),
          recentCalls: [],
          user: userMap.get(repId) || { name: 'Unknown User', role: 'rep' }
        });
      }

      const stats = repStats.get(repId);
      stats.totalCalls++;
      stats.totalScore += call.score || 0;
      stats.totalDuration += call.duration || 0;
      stats.totalObjectionsHandled += call.objections_handled || 0;
      if (call.cta_used) stats.totalCtaUsed++;
      stats.scenarios.add(call.scenario_name);
      
      // Keep track of recent calls for detailed stats
      stats.recentCalls.push({
        score: call.score,
        scenario: call.scenario_name,
        date: call.created_at,
        duration: call.duration,
        objectionsHandled: call.objections_handled,
        ctaUsed: call.cta_used,
        sentiment: call.sentiment
      });
    });

    // Calculate averages and prepare leaderboard
    const leaderboard = Array.from(repStats.values()).map(stats => {
      const averageScore = stats.totalCalls > 0 ? stats.totalScore / stats.totalCalls : 0;
      const ctaSuccessRate = stats.totalCalls > 0 ? (stats.totalCtaUsed / stats.totalCalls) * 100 : 0;
      const avgObjectionsHandled = stats.totalCalls > 0 ? stats.totalObjectionsHandled / stats.totalCalls : 0;
      const avgDuration = stats.totalCalls > 0 ? stats.totalDuration / stats.totalCalls : 0;

      return {
        repId: stats.repId,
        name: stats.user.name,
        email: stats.user.email,
        role: stats.user.role,
        department: stats.user.department,
        totalCalls: stats.totalCalls,
        averageScore: Math.round(averageScore * 100) / 100,
        totalScore: stats.totalScore,
        ctaSuccessRate: Math.round(ctaSuccessRate * 100) / 100,
        avgObjectionsHandled: Math.round(avgObjectionsHandled * 100) / 100,
        avgDuration: Math.round(avgDuration),
        uniqueScenarios: stats.scenarios.size,
        recentCalls: stats.recentCalls.slice(-5), // Last 5 calls
        certifications: getCertifications(averageScore, stats.totalCalls)
      };
    });

    // Sort by average score (descending)
    leaderboard.sort((a, b) => b.averageScore - a.averageScore);

    // Apply limit
    const limitedLeaderboard = leaderboard.slice(0, limit);

    // Calculate overall stats
    const overallStats = {
      totalReps: leaderboard.length,
      totalCalls: leaderboard.reduce((sum, rep) => sum + rep.totalCalls, 0),
      averageScore: leaderboard.length > 0 
        ? Math.round(leaderboard.reduce((sum, rep) => sum + rep.averageScore, 0) / leaderboard.length * 100) / 100 
        : 0,
      topPerformer: limitedLeaderboard[0] || null,
      timeRange,
      lastUpdated: new Date().toISOString()
    };

    return successResponse({
      leaderboard: limitedLeaderboard,
      overallStats,
      filters: { timeRange, limit, role }
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Leaderboard error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// Helper function to determine certifications based on performance
function getCertifications(averageScore: number, totalCalls: number): string[] {
  const certifications = [];
  
  if (totalCalls >= 10) {
    if (averageScore >= 90) certifications.push('Elite Sales Professional');
    else if (averageScore >= 80) certifications.push('Advanced Sales Professional');
    else if (averageScore >= 70) certifications.push('Sales Professional');
    else if (averageScore >= 60) certifications.push('Sales Associate');
    else certifications.push('Sales Trainee');
  }
  
  if (totalCalls >= 50) certifications.push('Experienced Rep');
  if (totalCalls >= 100) certifications.push('Veteran Sales Rep');
  
  return certifications;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 