import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

// GET: Get available categories and industries with counts
export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    console.log('Template categories API request');

    // Get category counts
    const { data: categoryData, error: categoryError } = await supabase
      .from('template_scenarios')
      .select('category')
      .eq('is_active', true);

    // Get industry counts
    const { data: industryData, error: industryError } = await supabase
      .from('template_scenarios')
      .select('industry')
      .eq('is_active', true);

    // Get difficulty counts
    const { data: difficultyData, error: difficultyError } = await supabase
      .from('template_scenarios')
      .select('difficulty')
      .eq('is_active', true);

    if (categoryError || industryError || difficultyError) {
      console.error('Database error:', { categoryError, industryError, difficultyError });
      return errorResponse('Database error', 500);
    }

    // Count occurrences
    const categoryCounts = categoryData?.reduce((acc: Record<string, number>, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}) || {};

    const industryCounts = industryData?.reduce((acc: Record<string, number>, item) => {
      if (item.industry) {
        acc[item.industry] = (acc[item.industry] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    const difficultyCounts = difficultyData?.reduce((acc: Record<string, number>, item) => {
      acc[item.difficulty] = (acc[item.difficulty] || 0) + 1;
      return acc;
    }, {}) || {};

    // Define category metadata
    const categoryMetadata = {
      cold_calling: {
        label: 'Cold Calling',
        description: 'Practice making initial contact with prospects',
        icon: 'phone'
      },
      product_demo: {
        label: 'Product Demo',
        description: 'Master product presentations and demonstrations',
        icon: 'presentation'
      },
      objection_handling: {
        label: 'Objection Handling',
        description: 'Learn to address common sales objections',
        icon: 'shield'
      },
      discovery: {
        label: 'Discovery',
        description: 'Develop skills for uncovering customer needs',
        icon: 'search'
      },
      closing: {
        label: 'Closing',
        description: 'Practice closing techniques and deal finalization',
        icon: 'target'
      },
      follow_up: {
        label: 'Follow-up',
        description: 'Master follow-up strategies and nurturing',
        icon: 'repeat'
      },
      negotiation: {
        label: 'Negotiation',
        description: 'Develop negotiation and deal structuring skills',
        icon: 'handshake'
      },
      upselling: {
        label: 'Upselling',
        description: 'Practice expanding existing customer relationships',
        icon: 'trending-up'
      }
    };

    const industryMetadata = {
      saas: 'Software as a Service',
      real_estate: 'Real Estate',
      insurance: 'Insurance',
      healthcare: 'Healthcare',
      finance: 'Financial Services',
      manufacturing: 'Manufacturing',
      retail: 'Retail',
      consulting: 'Consulting',
      general: 'General Sales'
    };

    const difficultyMetadata = {
      beginner: {
        label: 'Beginner',
        description: 'Perfect for new sales reps',
        color: 'green'
      },
      intermediate: {
        label: 'Intermediate',
        description: 'For developing sales professionals',
        color: 'yellow'
      },
      advanced: {
        label: 'Advanced',
        description: 'For experienced sales experts',
        color: 'red'
      }
    };

    return successResponse({
      categories: Object.entries(categoryCounts).map(([key, count]) => ({
        value: key,
        label: categoryMetadata[key as keyof typeof categoryMetadata]?.label || key,
        description: categoryMetadata[key as keyof typeof categoryMetadata]?.description || '',
        icon: categoryMetadata[key as keyof typeof categoryMetadata]?.icon || 'folder',
        count
      })),
      industries: Object.entries(industryCounts).map(([key, count]) => ({
        value: key,
        label: industryMetadata[key as keyof typeof industryMetadata] || key,
        count
      })),
      difficulties: Object.entries(difficultyCounts).map(([key, count]) => ({
        value: key,
        label: difficultyMetadata[key as keyof typeof difficultyMetadata]?.label || key,
        description: difficultyMetadata[key as keyof typeof difficultyMetadata]?.description || '',
        color: difficultyMetadata[key as keyof typeof difficultyMetadata]?.color || 'gray',
        count
      })),
      totalTemplates: categoryData?.length || 0
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Get template categories error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}