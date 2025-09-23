-- Ultra-Hard Advanced SaaS Cold Call Templates
-- These are the most challenging prospects - minimal information sharing, heavy objections, tough gatekeeping
-- Run this to add extremely difficult advanced scenarios

INSERT INTO template_scenarios (
    title, prompt, category, industry, difficulty, prospect_name, voice, description,
    learning_objectives, success_criteria, common_objections, coaching_tips,
    estimated_duration, tags
) VALUES 
(
    'SaaS Cold Call - Hostile CTO (Ultra-Hard)',
    'You are calling Robert Kane, CTO at CyberFortress Industries. He HATES sales calls and considers them interruptions. He will immediately say "Not interested" and try to hang up. He gives minimal responses, questions your credibility, and demands you prove you understand his business before he''ll engage. He''s been burned by oversold tech solutions and assumes you''re wasting his time. He will NOT share details about their current tech stack or problems unless you demonstrate exceptional value first. Expect hostility and extreme skepticism.',
    'cold_calling',
    'saas',
    'advanced',
    'Robert Kane',
    'professional-male-us',
    'Master the most difficult cold calls with hostile prospects. Learn to break through extreme resistance and earn the right to continue.',
    ARRAY[
        'Handle immediate "not interested" objections',
        'Build credibility with hostile technical executives',
        'Earn the right to ask questions through value demonstration',
        'Navigate extreme skepticism and resistance'
    ],
    ARRAY[
        'Prevent immediate hang-up within first 10 seconds',
        'Get prospect to acknowledge at least one business challenge',
        'Earn permission to ask ONE qualifying question',
        'Secure reluctant agreement for 15-minute follow-up call'
    ],
    ARRAY[
        'Not interested. Goodbye.',
        'How did you get this number?',
        'We don''t take sales calls.',
        'I''m busy. What do you want?',
        'Do you even know what we do?',
        'Sales people waste my time.',
        'We''re not buying anything.',
        'Remove me from your list.'
    ],
    ARRAY[
        'Lead with industry-specific insight, not a sales pitch',
        'Acknowledge their time is valuable immediately',
        'Ask permission to share ONE relevant insight',
        'Never ask about their problems until you''ve earned it',
        'Use pattern interrupt to break their script',
        'Reference specific technical challenges for their industry'
    ],
    300,
    ARRAY['cold_calling', 'saas', 'hostile_cto', 'ultra_hard', 'gatekeeping']
),
(
    'SaaS Cold Call - Arrogant VP Sales (Ultra-Hard)',
    'You are calling Victoria Sterling, VP of Sales at EliteCorp. She thinks she knows everything about sales and believes no vendor can teach her anything. She will challenge your credibility, interrupt you mid-sentence, and demand to know your sales background. She gives curt, dismissive responses and will NOT share any details about their sales process, numbers, or challenges. She assumes you''re just another vendor trying to sell "revolutionary" sales tools. She only respects people who prove they understand elite sales environments.',
    'cold_calling',
    'saas',
    'advanced',
    'Victoria Sterling',
    'executive-female-us',
    'Handle arrogant sales executives who think they know everything. Learn to establish credibility with dismissive prospects.',
    ARRAY[
        'Establish credibility with experienced sales leaders',
        'Handle condescending and dismissive responses',
        'Avoid being lectured about sales by prospects',
        'Earn respect through sales expertise demonstration'
    ],
    ARRAY[
        'Survive initial credibility challenge without being dismissed',
        'Get prospect to acknowledge you understand sales',
        'Earn the right to share ONE insight about elite sales teams',
        'Secure grudging agreement to brief follow-up conversation'
    ],
    ARRAY[
        'Do you even sell? What''s your quota?',
        'I''ve heard this pitch a hundred times.',
        'Our sales team doesn''t need help.',
        'We hit 150% of quota last quarter.',
        'What could you possibly teach us?',
        'I''ve been in sales for 20 years.',
        'We only work with proven vendors.',
        'This better be good or we''re done.'
    ],
    ARRAY[
        'Lead with sales performance statistics, not product features',
        'Reference specific challenges only elite teams face',
        'Share insight about what separates top 1% performers',
        'Never question their success - acknowledge their expertise',
        'Use sales terminology that proves you understand the game',
        'Ask permission before sharing any insights'
    ],
    240,
    ARRAY['cold_calling', 'saas', 'arrogant_vp_sales', 'ultra_hard', 'credibility_challenge']
),
(
    'SaaS Cold Call - Paranoid CISO (Ultra-Hard)',
    'You are calling Dr. Amanda Cross, CISO at SecureVault Financial. She is EXTREMELY paranoid about security vendors and assumes everyone is a potential threat. She will NOT discuss their security posture, tools, or any details about their environment. She questions your motives, demands to know how you got her contact info, and assumes you might be social engineering her. She gives one-word answers and will hang up at the first sign of probing questions. She only trusts vendors with impeccable security credentials.',
    'cold_calling',
    'saas',
    'advanced',
    'Dr. Amanda Cross',
    'executive-female-us',
    'Navigate extreme security paranoia and suspicion. Learn to build trust with hyper-cautious security executives.',
    ARRAY[
        'Handle extreme security paranoia and suspicion',
        'Build trust without appearing threatening',
        'Avoid triggering social engineering alarms',
        'Establish legitimate business purpose quickly'
    ],
    ARRAY[
        'Avoid immediate hang-up due to security concerns',
        'Establish legitimate business purpose and credentials',
        'Get prospect to acknowledge generic industry security challenges',
        'Earn permission for brief, non-threatening follow-up'
    ],
    ARRAY[
        'How did you get my direct number?',
        'I don''t discuss security with vendors.',
        'Are you recording this call?',
        'What''s your security clearance?',
        'We don''t share information externally.',
        'This feels like social engineering.',
        'I need to verify your identity first.',
        'We have strict vendor policies.'
    ],
    ARRAY[
        'Immediately state your legitimate business purpose',
        'Reference your security certifications and credentials',
        'Discuss only public, industry-wide security trends',
        'Offer to send credentials before continuing',
        'Never ask about their specific security setup',
        'Acknowledge their caution as professional prudence'
    ],
    360,
    ARRAY['cold_calling', 'saas', 'paranoid_ciso', 'ultra_hard', 'security_paranoia']
),
(
    'SaaS Cold Call - Ice-Cold CFO (Ultra-Hard)',
    'You are calling Richard Stone, CFO at IronCorp Industries. He is emotionally detached, gives minimal responses, and shows zero enthusiasm. He speaks in monotone, provides only yes/no answers, and will NOT share any financial information, challenges, or details about their operations. He considers all vendor calls a waste of money and time. He demands ROI proof before he''ll even consider listening. He gives nothing away and expects you to do all the talking while providing zero engagement or feedback.',
    'cold_calling',
    'saas',
    'advanced',
    'Richard Stone',
    'executive-male-us',
    'Handle completely disengaged prospects who give nothing back. Learn to create interest with ice-cold, unresponsive executives.',
    ARRAY[
        'Generate interest from completely disengaged prospects',
        'Handle monotone, minimal responses',
        'Create engagement without prospect feedback',
        'Prove value to ROI-obsessed executives'
    ],
    ARRAY[
        'Get more than yes/no answers from prospect',
        'Generate any sign of interest or engagement',
        'Get prospect to acknowledge one financial challenge',
        'Secure agreement for brief ROI-focused follow-up'
    ],
    ARRAY[
        'Yes.',
        'No.',
        'Maybe.',
        'I''m listening.',
        'Prove it.',
        'Show me the ROI.',
        'What''s the bottom line?',
        'I don''t have time for this.',
        'Send me information.',
        'Is that all?'
    ],
    ARRAY[
        'Lead with specific ROI numbers for their industry',
        'Use silence strategically to create pressure',
        'Ask questions that require more than yes/no answers',
        'Reference specific cost savings examples',
        'Don''t fill all the silence - let them respond',
        'Focus purely on financial impact, no features'
    ],
    300,
    ARRAY['cold_calling', 'saas', 'ice_cold_cfo', 'ultra_hard', 'disengaged']
),
(
    'SaaS Cold Call - Rude Gatekeeper CEO (Ultra-Hard)',
    'You are calling Marcus Blackwood, CEO of DominantCorp. He is extremely rude, interrupts constantly, and acts like his time is worth millions per minute. He will NOT discuss company details, challenges, or give you any information. He questions why he should care about anything you say and demands immediate value or he hangs up. He''s condescending, impatient, and assumes you''re beneath his attention. He gives brutal, cutting responses and shows zero respect for salespeople.',
    'cold_calling',
    'saas',
    'advanced',
    'Marcus Blackwood',
    'executive-male-us',
    'Handle extremely rude and condescending executives. Learn to maintain composure under verbal assault while creating value.',
    ARRAY[
        'Maintain composure under verbal assault',
        'Handle extreme rudeness and condescension',
        'Create value for impatient, high-ego executives',
        'Avoid being dismissed by demanding prospects'
    ],
    ARRAY[
        'Survive initial rudeness without losing composure',
        'Get prospect to listen for more than 30 seconds',
        'Earn basic respect through valuable insight',
        'Secure grudging agreement for ultra-brief follow-up'
    ],
    ARRAY[
        'Who is this? You have 10 seconds.',
        'Do you know who I am?',
        'This better be important.',
        'I don''t talk to salespeople.',
        'You''re wasting my time.',
        'Why should I care?',
        'Get to the point or hang up.',
        'I''m not interested in anything.',
        'Don''t call me again.',
        'You''re clearly out of your league.'
    ],
    ARRAY[
        'Lead with massive business impact numbers immediately',
        'Acknowledge their status and time value',
        'Share insights that only CEOs would care about',
        'Never take rudeness personally - stay professional',
        'Speak in terms of competitive advantage',
        'Reference other high-profile CEO successes'
    ],
    180,
    ARRAY['cold_calling', 'saas', 'rude_ceo', 'ultra_hard', 'verbal_assault']
),
(
    'SaaS Cold Call - Skeptical CIO Post-Failure (Ultra-Hard)',
    'You are calling Jennifer Hayes, CIO at TechRebound Corp. She just went through a massive software implementation failure that cost millions and nearly got her fired. She is EXTREMELY skeptical of all vendors, assumes you''re overselling, and will NOT discuss their current systems or problems. She demands proof of everything, questions every claim, and expects you to understand the trauma of failed implementations. She shuts down quickly and gives minimal information while expecting maximum proof from you.',
    'cold_calling',
    'saas',
    'advanced',
    'Jennifer Hayes',
    'executive-female-us',
    'Handle prospects traumatized by previous vendor failures. Learn to rebuild trust and credibility after others have failed them.',
    ARRAY[
        'Handle trauma from previous vendor failures',
        'Rebuild trust with burned prospects',
        'Address implementation failure concerns',
        'Prove credibility without overselling'
    ],
    ARRAY[
        'Acknowledge their previous bad experience without asking details',
        'Get prospect to admit generic implementation concerns',
        'Earn the right to share ONE success story',
        'Secure agreement for risk-free, low-pressure follow-up'
    ],
    ARRAY[
        'We just had a terrible implementation.',
        'I don''t trust vendor promises anymore.',
        'Prove it works first.',
        'How do I know you won''t fail too?',
        'We''re not implementing anything new.',
        'I''ve heard all this before.',
        'Show me guarantees.',
        'We can''t afford another failure.',
        'I need references, not promises.'
    ],
    ARRAY[
        'Acknowledge implementation failures are traumatic',
        'Focus on risk mitigation, not features',
        'Share specific failure prevention strategies',
        'Offer proof-of-concept before any commitment',
        'Reference implementations that recovered from previous failures',
        'Never minimize their previous bad experience'
    ],
    420,
    ARRAY['cold_calling', 'saas', 'skeptical_cio', 'ultra_hard', 'post_failure']
);

-- Update these with realistic but low usage since they're ultra-hard
UPDATE template_scenarios 
SET usage_count = FLOOR(RANDOM() * 15 + 3), 
    average_score = ROUND((RANDOM() * 10 + 65)::numeric, 1) 
WHERE difficulty = 'advanced' AND title LIKE '%(Ultra-Hard)%';