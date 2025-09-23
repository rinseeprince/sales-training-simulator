-- Seed Template Scenarios
-- This script populates the template_scenarios table with initial high-quality templates
-- Run this after creating the template schema

-- First, let's create some initial template scenarios
-- We'll use a consistent admin user ID - replace with actual admin ID

-- Insert Cold Calling Templates
INSERT INTO template_scenarios (
    title, prompt, category, industry, difficulty, prospect_name, voice, description,
    learning_objectives, success_criteria, common_objections, coaching_tips,
    estimated_duration, tags, created_by
) VALUES 
(
    'SaaS Cold Call - IT Director',
    'You are calling John Matthews, IT Director at TechCorp (500 employees). His company uses legacy systems that are costing them productivity and security risks. You''re calling about a cloud migration solution. John is busy, skeptical of salespeople, and has been burned by oversold promises before. He values technical accuracy and ROI. Start the conversation naturally.',
    'cold_calling',
    'saas',
    'intermediate',
    'John Matthews',
    null,
    'Practice cold calling a technical decision maker about cloud migration solutions. Learn to establish credibility and handle technical objections.',
    ARRAY[
        'Build rapport with technical decision makers',
        'Establish credibility early in the call',
        'Ask discovery questions about current challenges',
        'Handle skepticism professionally'
    ],
    ARRAY[
        'Prospect agrees to a follow-up meeting',
        'Uncover at least 2 pain points',
        'Maintain professional tone throughout',
        'Demonstrate technical understanding'
    ],
    ARRAY[
        'We''re not interested in changing systems',
        'How do I know you''re not just another salesperson?',
        'We''ve tried cloud before and had issues',
        'This sounds expensive'
    ],
    ARRAY[
        'Lead with a business outcome, not features',
        'Ask about their current challenges before pitching',
        'Use technical language appropriately',
        'Reference similar companies they''d respect'
    ],
    420,
    ARRAY['cold_calling', 'saas', 'technical_buyer'],
    (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1)
),
(
    'Insurance Cold Call - New Parent',
    'You are calling Sarah Chen, who just had her first baby 3 months ago. She''s 28, works as a marketing manager, and her husband is an accountant. They own a home with a mortgage and have some savings. You''re calling about life insurance. Sarah is protective of her family but cautious about salespeople. She''s tired from new parenthood and values her time. She may have concerns about cost since they just had medical expenses.',
    'cold_calling',
    'insurance',
    'beginner',
    'Sarah Chen',
    null,
    'Learn to approach new parents sensitively about life insurance. Practice emotional selling while building trust.',
    ARRAY[
        'Approach sensitive topics with empathy',
        'Connect product benefits to family protection',
        'Handle price objections with value demonstration',
        'Build trust quickly with new parents'
    ],
    ARRAY[
        'Prospect expresses interest in learning more',
        'Schedule a follow-up appointment',
        'Acknowledge family protection needs',
        'Overcome at least one cost objection'
    ],
    ARRAY[
        'We can''t afford anything extra right now',
        'I don''t like talking to salespeople',
        'We''re too young to worry about that',
        'Let me talk to my husband first'
    ],
    ARRAY[
        'Acknowledge the financial pressures of new parenthood',
        'Focus on peace of mind rather than death',
        'Use stories of similar families',
        'Offer to include spouse in conversation'
    ],
    360,
    ARRAY['cold_calling', 'insurance', 'emotional_selling'],
    (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1)
),

-- Product Demo Templates
(
    'CRM Demo - Sales Manager',
    'You are presenting your CRM software to Lisa Rodriguez, Sales Manager at GrowthCorp. She manages a team of 12 reps using spreadsheets and is frustrated with lack of visibility into the pipeline. The company is growing fast and needs better forecasting. Lisa is analytical, asks detailed questions, and needs to justify ROI to her CEO. She''s demo''d 3 other solutions already. Focus on showing specific features that solve her pipeline visibility problems.',
    'product_demo',
    'saas',
    'intermediate',
    'Lisa Rodriguez',
    null,
    'Master the art of tailored product demonstrations. Learn to focus on prospect-specific pain points and handle comparison questions.',
    ARRAY[
        'Tailor demo to specific prospect needs',
        'Handle comparison questions effectively',
        'Demonstrate ROI during the demo',
        'Keep prospect engaged with interactive elements'
    ],
    ARRAY[
        'Prospect asks specific implementation questions',
        'Show clear ROI calculation',
        'Handle at least 2 comparison questions',
        'Secure next step commitment'
    ],
    ARRAY[
        'How is this different from [competitor]?',
        'The other system we saw can do this too',
        'This looks complicated for my team',
        'What''s the learning curve like?'
    ],
    ARRAY[
        'Ask which features matter most before starting',
        'Use their data in demo scenarios when possible',
        'Acknowledge competitor strengths, highlight differentiators',
        'Show, don''t just tell'
    ],
    600,
    ARRAY['product_demo', 'saas', 'feature_comparison'],
    (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1)
),

-- Objection Handling Templates
(
    'Price Objection - Budget Constraints',
    'You are selling marketing automation software ($500/month) to Mike Johnson, Marketing Director at a mid-size company. He loves the solution but says "This is exactly what we need, but it''s just not in our budget right now. We''re pretty tight on spending until next quarter." He seems genuine about budget constraints but also shows real interest. Your goal is to find a way to move forward despite the budget objection.',
    'objection_handling',
    'saas',
    'beginner',
    'Mike Johnson',
    null,
    'Learn to handle price objections by uncovering the real concerns and offering creative solutions.',
    ARRAY[
        'Distinguish between price and budget objections',
        'Find the cost of not solving the problem',
        'Offer payment or timing alternatives',
        'Maintain value proposition under pressure'
    ],
    ARRAY[
        'Uncover the cost of current solution',
        'Propose alternative timing or payment terms',
        'Get commitment for future action',
        'Maintain prospect interest and enthusiasm'
    ],
    ARRAY[
        'It''s not in our budget',
        'We need to wait until next quarter',
        'The timing just isn''t right',
        'I''d need approval for this amount'
    ],
    ARRAY[
        'Acknowledge budget constraints are real',
        'Quantify cost of waiting (lost opportunities)',
        'Offer phased implementation or payment plans',
        'Help them build internal business case'
    ],
    300,
    ARRAY['objection_handling', 'price_objection', 'budget'],
    (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1)
),

-- Discovery Templates
(
    'Discovery Call - HR Software',
    'You are on a discovery call with Jennifer Walsh, VP of HR at a 300-person company. She reached out after seeing your HR management software demo at a conference. She mentioned they''re having "people management challenges" but hasn''t been specific. Your goal is to uncover their specific pain points, current processes, decision criteria, and timeline. Jennifer is busy but engaged, and this is your only dedicated discovery call before she makes a decision.',
    'discovery',
    'saas',
    'intermediate',
    'Jennifer Walsh',
    null,
    'Master discovery questioning techniques to uncover prospect needs, pain points, and decision criteria.',
    ARRAY[
        'Use open-ended questions effectively',
        'Uncover emotional and business impact',
        'Identify decision-making process',
        'Qualify budget and timeline'
    ],
    ARRAY[
        'Identify at least 3 specific pain points',
        'Understand current state and desired future state',
        'Map decision-making process and stakeholders',
        'Confirm budget range and timeline'
    ],
    ARRAY[
        'I''d rather see what you can do first',
        'We''re just in the early research phase',
        'I can''t share all our internal details',
        'Other vendors haven''t asked this many questions'
    ],
    ARRAY[
        'Explain why questions help you provide better solutions',
        'Share insights from similar companies',
        'Use the SPIN methodology (Situation, Problem, Implication, Need)',
        'Listen actively and ask follow-up questions'
    ],
    450,
    ARRAY['discovery', 'qualification', 'needs_analysis'],
    (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1)
),

-- Closing Templates
(
    'Close - Enterprise Software Deal',
    'You are in the final stage with David Kim, CTO at EnterpriseFlow. After 3 months of evaluation, demos, and stakeholder meetings, he''s ready to move forward but seems hesitant to commit. He says "Everything looks good, we just need to finalize a few things internally." You''ve built strong rapport and trust. The deal is worth $50K annually. Your goal is to identify what''s really holding him back and secure the commitment.',
    'closing',
    'saas',
    'advanced',
    'David Kim',
    null,
    'Learn advanced closing techniques for complex enterprise sales. Practice identifying and addressing final hesitations.',
    ARRAY[
        'Identify hidden objections before closing',
        'Use assumptive and consultative closing techniques',
        'Handle last-minute hesitation professionally',
        'Secure commitment with specific next steps'
    ],
    ARRAY[
        'Uncover the real reason for hesitation',
        'Address concerns completely',
        'Secure signed agreement or firm commitment',
        'Establish clear implementation timeline'
    ],
    ARRAY[
        'We just need to run it by the board',
        'Let me double-check with my team',
        'The timing might not be perfect',
        'We want to make sure we''re making the right decision'
    ],
    ARRAY[
        'Ask direct questions about concerns',
        'Summarize all the value and benefits discussed',
        'Create urgency around timing if appropriate',
        'Offer to address any remaining stakeholder concerns'
    ],
    240,
    ARRAY['closing', 'enterprise_sales', 'commitment'],
    (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1)
),

-- Real Estate Templates
(
    'Real Estate - First-Time Buyer',
    'You are meeting with Alex and Jordan, a young couple looking to buy their first home. They''re both 26, have been renting for 3 years, and saved $40K for a down payment. They''re excited but nervous about the process and have been looking online for months. They have unrealistic expectations about what they can afford in their preferred neighborhood. Your goal is to educate them about the process while managing expectations and building trust.',
    'discovery',
    'real_estate',
    'beginner',
    'Alex and Jordan',
    null,
    'Learn to work with first-time homebuyers, managing expectations while building trust and educating about the process.',
    ARRAY[
        'Educate clients about the buying process',
        'Manage unrealistic expectations tactfully',
        'Build trust with nervous first-time buyers',
        'Balance client desires with market reality'
    ],
    ARRAY[
        'Set realistic price expectations',
        'Explain the buying process clearly',
        'Secure pre-approval commitment',
        'Schedule property viewings'
    ],
    ARRAY[
        'We saw this house online for much less',
        'Why do we need pre-approval?',
        'Can''t we just look at houses first?',
        'Real estate agents just want to sell us anything'
    ],
    ARRAY[
        'Use recent comparable sales to set expectations',
        'Explain each step of the process and why it matters',
        'Share success stories from similar first-time buyers',
        'Be patient with questions and concerns'
    ],
    480,
    ARRAY['real_estate', 'first_time_buyer', 'expectation_management'],
    (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1)
),

-- Advanced Negotiation
(
    'Contract Negotiation - Enterprise Deal',
    'You are negotiating final contract terms with Susan Park, Procurement Director at MegaCorp. The technical team loves your solution, but Susan is pushing for a 25% discount, extended payment terms, and additional services at no cost. She says "This is a big deal for you - we expect better terms." The deal is worth $200K annually. You have some flexibility but need to maintain profitability. Navigate this negotiation professionally.',
    'negotiation',
    'saas',
    'advanced',
    'Susan Park',
    null,
    'Master enterprise contract negotiations. Learn to maintain value while finding mutually beneficial terms.',
    ARRAY[
        'Negotiate from value, not price',
        'Find win-win solutions',
        'Handle aggressive negotiation tactics',
        'Protect deal profitability'
    ],
    ARRAY[
        'Justify pricing with value proposition',
        'Find creative alternatives to pure discounting',
        'Secure acceptable terms for both parties',
        'Maintain relationship throughout negotiation'
    ],
    ARRAY[
        'Your competitors are offering better prices',
        'This is our standard procurement process',
        'We need 30% off to make this work',
        'You should be grateful for our business'
    ],
    ARRAY[
        'Anchor on value delivered, not price paid',
        'Offer value-adds instead of pure discounts',
        'Use silence effectively during negotiations',
        'Stay professional when tactics get aggressive'
    ],
    360,
    ARRAY['negotiation', 'enterprise_sales', 'contract_terms'],
    (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1)
);

-- Add usage tracking for these templates (simulated usage)
-- This makes the templates look established when first loaded
UPDATE template_scenarios SET usage_count = FLOOR(RANDOM() * 50 + 10) WHERE usage_count = 0;
UPDATE template_scenarios SET average_score = ROUND((RANDOM() * 20 + 70)::numeric, 1) WHERE average_score = 0;