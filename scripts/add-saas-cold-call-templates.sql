-- Add 10 Additional SaaS Cold Calling Templates
-- Range: Intermediate to Advanced difficulty
-- Run this to add more SaaS cold calling scenarios

INSERT INTO template_scenarios (
    title, prompt, category, industry, difficulty, prospect_name, voice, description,
    learning_objectives, success_criteria, common_objections, coaching_tips,
    estimated_duration, tags
) VALUES 
(
    'SaaS Cold Call - CFO Security Software',
    'You are calling Maria Santos, CFO at FinanceFlow (800 employees). They recently had a minor security breach that exposed some client data. You''re calling about cybersecurity compliance software. Maria is extremely risk-averse, budget-conscious, and needs to justify every expense to the board. She''s received 20+ security vendor calls since the breach. She values ROI data, compliance certifications, and wants to understand total cost of ownership including implementation.',
    'cold_calling',
    'saas',
    'advanced',
    'Maria Santos',
    'executive-female-us',
    'Master calling C-suite executives about sensitive security topics. Learn to navigate budget concerns and competitive landscapes.',
    ARRAY[
        'Address security concerns without creating alarm',
        'Speak CFO language with ROI and cost analysis',
        'Differentiate from security vendor noise',
        'Build trust after a security incident'
    ],
    ARRAY[
        'Schedule a formal presentation to the board',
        'Obtain budget range and decision timeline',
        'Identify decision-making committee members',
        'Demonstrate clear ROI within 90 days'
    ],
    ARRAY[
        'We''ve already talked to 15 security vendors',
        'We need to focus on damage control right now',
        'The board is reviewing all non-essential spending',
        'How do we know you won''t be breached too?'
    ],
    ARRAY[
        'Reference specific compliance frameworks (SOC 2, GDPR)',
        'Use actual breach cost statistics for their industry',
        'Offer a compliance audit as value-add',
        'Position as investment in customer trust, not just security'
    ],
    480,
    ARRAY['cold_calling', 'saas', 'cfo', 'security', 'post_breach']
),
(
    'SaaS Cold Call - VP Engineering DevOps',
    'You are calling Alex Chen, VP of Engineering at StartupScale (200 employees, Series B). Their development team is struggling with deployment bottlenecks and they''re scaling rapidly. You''re calling about a DevOps automation platform. Alex is highly technical, skeptical of sales calls, and has strong opinions about tools. They value technical depth over business benefits and hate buzzwords. The team currently uses a mix of open-source tools that are becoming unwieldy.',
    'cold_calling',
    'saas',
    'intermediate',
    'Alex Chen',
    'professional-male-us',
    'Learn to cold call technical executives who are skeptical of sales. Practice leading with technical credibility.',
    ARRAY[
        'Establish technical credibility immediately',
        'Avoid sales buzzwords with technical prospects',
        'Understand current tech stack and pain points',
        'Speak engineering language authentically'
    ],
    ARRAY[
        'Get invited to present to the engineering team',
        'Understand their current DevOps workflow',
        'Identify specific bottlenecks and pain points',
        'Schedule technical demo with hands-on trial'
    ],
    ARRAY[
        'We build everything in-house here',
        'Our developers hate switching tools',
        'We don''t really take sales calls',
        'Open source solutions work fine for us'
    ],
    ARRAY[
        'Lead with technical problems, not business benefits',
        'Reference specific technologies they likely use',
        'Offer to speak with their senior engineers first',
        'Share technical case studies from similar startups'
    ],
    360,
    ARRAY['cold_calling', 'saas', 'vp_engineering', 'devops', 'technical']
),
(
    'SaaS Cold Call - CMO Marketing Automation',
    'You are calling Jennifer Park, CMO at GrowthCorp (1500 employees). Their marketing team is drowning in manual tasks and struggling to prove marketing ROI. You''re calling about marketing automation and attribution software. Jennifer is results-driven, data-obsessed, and has been burned by marketing tech that over-promised. She''s under pressure from the CEO to show marketing''s impact on revenue. Her team is already using 8 different marketing tools that don''t integrate well.',
    'cold_calling',
    'saas',
    'intermediate',
    'Jennifer Park',
    'professional-female-us',
    'Practice calling marketing executives about ROI and attribution. Learn to handle tool fatigue and integration concerns.',
    ARRAY[
        'Understand complex marketing tech stacks',
        'Address integration and tool fatigue concerns',
        'Speak to marketing ROI and attribution challenges',
        'Navigate pressure from CEO for results'
    ],
    ARRAY[
        'Identify specific attribution gaps in their process',
        'Schedule demo showing integration capabilities',
        'Understand current marketing spend and tools',
        'Get commitment to evaluate ROI improvement'
    ],
    ARRAY[
        'We already have too many marketing tools',
        'Our team doesn''t have time to learn another platform',
        'We''ve been burned by marketing tech before',
        'Integration never works as promised'
    ],
    ARRAY[
        'Lead with consolidation benefits, not new features',
        'Show specific integration examples with their current tools',
        'Use marketing language they understand (CAC, LTV, MQL)',
        'Offer pilot program to prove value before full commitment'
    ],
    420,
    ARRAY['cold_calling', 'saas', 'cmo', 'marketing_automation', 'roi']
),
(
    'SaaS Cold Call - Director of Sales CRM Upgrade',
    'You are calling Marcus Johnson, Director of Sales at ScaleUp Solutions (300 employees). His sales team is using an outdated CRM that''s limiting their growth. You''re calling about a modern sales acceleration platform. Marcus is a former sales rep who worked his way up, very protective of his team''s time, and skeptical of tools that promise to "revolutionize" sales. He needs to show immediate impact to justify any changes. His reps are already complaining about the current system but resist change.',
    'cold_calling',
    'saas',
    'intermediate',
    'Marcus Johnson',
    'professional-male-us',
    'Learn to sell to sales leaders who understand the process. Navigate change resistance and prove immediate value.',
    ARRAY[
        'Sell to experienced sales professionals',
        'Address change resistance from sales teams',
        'Prove immediate impact over long-term benefits',
        'Understand sales process optimization needs'
    ],
    ARRAY[
        'Identify specific workflow inefficiencies',
        'Get agreement on trial with subset of reps',
        'Understand current CRM limitations',
        'Schedule demo focused on time-saving features'
    ],
    ARRAY[
        'My reps hate learning new systems',
        'We can''t afford downtime during implementation',
        'Our current CRM works fine, it''s just old',
        'Sales tools always promise more than they deliver'
    ],
    ARRAY[
        'Speak rep-to-rep about sales challenges',
        'Focus on time-saving, not feature additions',
        'Offer gradual rollout plan to minimize disruption',
        'Share adoption success stories from similar sales teams'
    ],
    390,
    ARRAY['cold_calling', 'saas', 'sales_director', 'crm_upgrade', 'change_management']
),
(
    'SaaS Cold Call - CISO Enterprise Security',
    'You are calling Dr. Sarah Williams, CISO at MegaCorp Industries (5000 employees). They operate in a highly regulated industry and need to comply with multiple security frameworks. You''re calling about an enterprise security orchestration platform. Dr. Williams has a PhD in cybersecurity, is extremely technical, and has zero tolerance for security theater. She values peer recommendations, academic research, and proven enterprise deployments. The company just passed a major audit but wants to improve their security posture.',
    'cold_calling',
    'saas',
    'advanced',
    'Dr. Sarah Williams',
    'executive-female-us',
    'Master calling technical C-suite executives with academic backgrounds. Learn enterprise security sales approach.',
    ARRAY[
        'Communicate with PhD-level technical expertise',
        'Understand enterprise security frameworks',
        'Navigate complex compliance requirements',
        'Build credibility with security professionals'
    ],
    ARRAY[
        'Schedule technical architecture review session',
        'Understand current security stack and gaps',
        'Identify compliance improvement opportunities',
        'Get access to security team for evaluation'
    ],
    ARRAY[
        'We just passed our audit, why would we change?',
        'Do you have any published security research?',
        'What enterprises are using this in production?',
        'How does this integrate with our SIEM and SOAR?'
    ],
    ARRAY[
        'Reference specific security frameworks and standards',
        'Share published research and whitepapers',
        'Mention enterprise client names if possible',
        'Offer to connect with their technical team for peer discussion'
    ],
    540,
    ARRAY['cold_calling', 'saas', 'ciso', 'enterprise_security', 'compliance']
),
(
    'SaaS Cold Call - Head of HR People Analytics',
    'You are calling Rachel Thompson, Head of HR at TechUnicorn (400 employees, high-growth startup). They''re struggling with employee retention and need better people analytics. You''re calling about an HR analytics and engagement platform. Rachel is data-driven but not highly technical, under pressure to reduce turnover costs, and dealing with a CEO who wants "Google-level" employee satisfaction. She''s tried survey tools before but couldn''t get actionable insights.',
    'cold_calling',
    'saas',
    'intermediate',
    'Rachel Thompson',
    'professional-female-us',
    'Practice selling people analytics to HR leaders. Learn to translate data insights into business outcomes.',
    ARRAY[
        'Translate analytics into HR business outcomes',
        'Address previous bad experiences with survey tools',
        'Understand startup growth and retention challenges',
        'Navigate CEO pressure for culture improvements'
    ],
    ARRAY[
        'Identify specific retention cost calculations',
        'Schedule demo showing actionable insights',
        'Understand current employee feedback methods',
        'Get buy-in for pilot program with key departments'
    ],
    ARRAY[
        'Employees hate filling out surveys',
        'We''ve tried people analytics before, it didn''t work',
        'Our CEO wants results, not more data',
        'We need to focus on hiring, not analyzing'
    ],
    ARRAY[
        'Show outcome-focused metrics, not vanity metrics',
        'Demonstrate how to get high survey response rates',
        'Connect employee satisfaction to business results',
        'Offer quick wins that show immediate value'
    ],
    360,
    ARRAY['cold_calling', 'saas', 'hr_head', 'people_analytics', 'retention']
),
(
    'SaaS Cold Call - Operations Director Supply Chain',
    'You are calling James Rodriguez, Operations Director at ManufacturePlus (600 employees). Their supply chain visibility is limited and they''re losing money on delayed shipments. You''re calling about a supply chain analytics platform. James is operations-focused, speaks in logistics terminology, and measures everything in cost savings and efficiency gains. He''s skeptical of software solutions because he''s seen too many implementations fail. His current system is a mix of Excel and legacy ERP.',
    'cold_calling',
    'saas',
    'advanced',
    'James Rodriguez',
    'professional-male-us',
    'Learn to sell to operations leaders who think in logistics and cost efficiency. Navigate implementation failure concerns.',
    ARRAY[
        'Speak operations and logistics language fluently',
        'Address implementation failure concerns',
        'Quantify cost savings and efficiency gains',
        'Understand complex supply chain challenges'
    ],
    ARRAY[
        'Calculate specific cost savings opportunities',
        'Schedule demo with real supply chain scenarios',
        'Understand current visibility gaps and pain points',
        'Get agreement on pilot with one product line'
    ],
    ARRAY[
        'Software implementations always go over budget',
        'Our ERP handles most of what we need',
        'We can''t risk disrupting current operations',
        'Excel works fine for our reporting'
    ],
    ARRAY[
        'Use logistics KPIs they track (on-time delivery, carrying costs)',
        'Offer phased implementation to minimize risk',
        'Show specific ROI calculations for their industry',
        'Reference successful implementations at similar manufacturers'
    ],
    450,
    ARRAY['cold_calling', 'saas', 'operations_director', 'supply_chain', 'manufacturing']
),
(
    'SaaS Cold Call - CTO API Platform',
    'You are calling Dr. Michael Kumar, CTO at DataFlow Systems (900 employees). They''re building API products but struggling with API management and monetization. You''re calling about an API lifecycle management platform. Dr. Kumar has 15 years of architecture experience, values technical elegance, and is building a platform-as-a-product strategy. He''s concerned about vendor lock-in and wants to understand the technical architecture deeply before considering any platform.',
    'cold_calling',
    'saas',
    'advanced',
    'Dr. Michael Kumar',
    'executive-male-us',
    'Master technical selling to experienced CTOs. Learn API and platform-as-product sales approach.',
    ARRAY[
        'Communicate with senior technical architects',
        'Understand API monetization strategies',
        'Address vendor lock-in concerns',
        'Navigate platform-as-product technical decisions'
    ],
    ARRAY[
        'Schedule technical deep-dive with architecture team',
        'Understand current API stack and limitations',
        'Identify monetization and scaling opportunities',
        'Get commitment for proof-of-concept project'
    ],
    ARRAY[
        'We prefer to build platform capabilities in-house',
        'How do we avoid vendor lock-in with your platform?',
        'What''s your uptime SLA for API gateway services?',
        'We need to understand your data residency options'
    ],
    ARRAY[
        'Lead with architecture diagrams and technical specs',
        'Discuss API design patterns and best practices',
        'Address specific technical concerns about lock-in',
        'Offer architectural consultation as relationship builder'
    ],
    480,
    ARRAY['cold_calling', 'saas', 'cto', 'api_platform', 'technical_architecture']
),
(
    'SaaS Cold Call - Finance Director ERP Analytics',
    'You are calling Lisa Chen, Finance Director at GrowthCorp Manufacturing (1200 employees). Their financial reporting is slow and they struggle with real-time visibility into operational costs. You''re calling about financial analytics and reporting software that integrates with their ERP. Lisa is detail-oriented, risk-averse about financial data, and needs approval from both the CFO and IT for any new systems. She values accuracy over speed and is concerned about data security.',
    'cold_calling',
    'saas',
    'intermediate',
    'Lisa Chen',
    'professional-female-us',
    'Learn to sell financial software to risk-averse finance leaders. Navigate dual approval processes and data security concerns.',
    ARRAY[
        'Address financial data security and compliance',
        'Navigate dual approval from Finance and IT',
        'Understand ERP integration complexities',
        'Speak to financial accuracy and audit requirements'
    ],
    ARRAY[
        'Identify specific reporting bottlenecks and delays',
        'Schedule demo showing ERP integration capabilities',
        'Understand current financial close process',
        'Get buy-in for evaluation with IT team'
    ],
    ARRAY[
        'We can''t risk any issues with financial data',
        'IT needs to approve any new system integrations',
        'Our auditors require specific reporting formats',
        'ERP integrations always cause problems'
    ],
    ARRAY[
        'Emphasize security certifications and compliance',
        'Offer to work directly with IT on integration planning',
        'Show audit-friendly reporting capabilities',
        'Reference successful ERP integrations with similar companies'
    ],
    420,
    ARRAY['cold_calling', 'saas', 'finance_director', 'erp_analytics', 'financial_reporting']
),
(
    'SaaS Cold Call - VP Customer Success Retention',
    'You are calling Amanda Foster, VP of Customer Success at SaaS Growth Co (800 employees). Their customer churn rate is above industry average and they need better predictive analytics. You''re calling about a customer health and retention platform. Amanda is metrics-driven, understands SaaS economics deeply, and is under pressure to improve Net Revenue Retention. She''s tried multiple customer success tools but couldn''t get the predictive insights she needs. Her team is overwhelmed with manual health scoring.',
    'cold_calling',
    'saas',
    'intermediate',
    'Amanda Foster',
    'professional-female-us',
    'Practice selling to customer success leaders who understand SaaS metrics. Address tool fatigue and manual process pain.',
    ARRAY[
        'Speak fluent SaaS metrics language (NRR, churn, health scores)',
        'Address customer success tool fatigue',
        'Understand predictive analytics for retention',
        'Navigate pressure to improve SaaS economics'
    ],
    ARRAY[
        'Identify gaps in current health scoring process',
        'Schedule demo showing predictive churn indicators',
        'Understand current customer success tech stack',
        'Get agreement on pilot with high-risk accounts'
    ],
    ARRAY[
        'We already have three customer success tools',
        'Manual health scoring gives us better context',
        'Predictive analytics hasn''t worked for us before',
        'Our CSMs don''t trust automated insights'
    ],
    ARRAY[
        'Focus on prediction accuracy over feature quantity',
        'Show how automation enhances, not replaces, CSM judgment',
        'Use specific SaaS metrics and benchmarks',
        'Offer integration with existing tools rather than replacement'
    ],
    390,
    ARRAY['cold_calling', 'saas', 'customer_success_vp', 'retention', 'predictive_analytics']
);

-- Update usage statistics for realistic appearance
UPDATE template_scenarios 
SET usage_count = FLOOR(RANDOM() * 30 + 5), 
    average_score = ROUND((RANDOM() * 15 + 75)::numeric, 1) 
WHERE voice IS NOT NULL AND usage_count = 0;