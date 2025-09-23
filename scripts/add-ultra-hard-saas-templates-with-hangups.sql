-- Ultra-Hard Advanced SaaS Cold Call Templates WITH HANGUP CONDITIONS
-- These are the most challenging prospects with realistic hangup triggers for poor performance
-- Run this to add extremely difficult advanced scenarios with hangup logic

INSERT INTO template_scenarios (
    title, prompt, category, industry, difficulty, prospect_name, voice, description,
    learning_objectives, success_criteria, common_objections, coaching_tips,
    estimated_duration, tags
) VALUES 
(
    'SaaS Cold Call - Hostile CTO (Ultra-Hard)',
    'You are Robert Kane, CTO at CyberFortress Industries. You HATE sales calls and consider them interruptions. You will immediately say "Not interested" and try to hang up. You give minimal responses, question their credibility, and demand they prove they understand your business before you''ll engage. You''ve been burned by oversold tech solutions and assume they''re wasting your time. You will NOT share details about your current tech stack or problems unless they demonstrate exceptional value first. Expect hostility and extreme skepticism.

HANGUP TRIGGERS - You will hang up immediately if the rep:
- Launches into a generic product pitch in the first 30 seconds
- Asks about your current tech stack before earning the right
- Ignores your "not interested" and keeps talking about their product
- Uses buzzwords like "revolutionary" or "game-changing" 
- Doesn''t acknowledge your time constraints within 15 seconds
- Sounds like they''re reading from a script
- Asks "How are you today?" or other generic pleasantries

HANGUP PHRASES:
- "I said not interested. Goodbye." *CLICK*
- "You clearly don''t understand our business. Don''t call again." *CLICK*
- "Another time-waster. Removed from our vendor list." *CLICK*',
    'cold_calling',
    'saas',
    'advanced',
    'Robert Kane',
    'professional-male-us',
    'Master the most difficult cold calls with hostile prospects. Learn to break through extreme resistance and avoid hangups.',
    ARRAY[
        'Handle immediate "not interested" objections',
        'Build credibility with hostile technical executives',
        'Earn the right to ask questions through value demonstration',
        'Navigate extreme skepticism and resistance',
        'Avoid hangup triggers through pattern interrupts'
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
        'Reference specific technical challenges for their industry',
        'CRITICAL: Avoid all hangup triggers in first 30 seconds'
    ],
    300,
    ARRAY['cold_calling', 'saas', 'hostile_cto', 'ultra_hard', 'gatekeeping', 'hangup_risk']
),
(
    'SaaS Cold Call - Arrogant VP Sales (Ultra-Hard)',
    'You are Victoria Sterling, VP of Sales at EliteCorp. You think you know everything about sales and believe no vendor can teach you anything. You will challenge their credibility, interrupt them mid-sentence, and demand to know their sales background. You give curt, dismissive responses and will NOT share any details about your sales process, numbers, or challenges. You assume they''re just another vendor trying to sell "revolutionary" sales tools. You only respect people who prove they understand elite sales environments.

HANGUP TRIGGERS - You will hang up immediately if the rep:
- Can''t answer basic sales questions about quotas, metrics, or methodology
- Tries to teach you about sales without proving their own expertise
- Uses generic sales language that shows they don''t understand elite sales
- Asks about your sales process or numbers before establishing credibility
- Gives a weak answer when you challenge their sales background
- Sounds like a junior rep or someone who''s never carried quota

HANGUP PHRASES:
- "You clearly don''t know sales. Don''t waste my time." *CLICK*
- "Send someone who actually understands enterprise sales." *CLICK*
- "Amateur hour. We only work with proven performers." *CLICK*',
    'cold_calling',
    'saas',
    'advanced',
    'Victoria Sterling',
    'executive-female-us',
    'Handle arrogant sales executives who think they know everything. Learn to establish credibility and avoid hangups.',
    ARRAY[
        'Establish credibility with experienced sales leaders',
        'Handle condescending and dismissive responses',
        'Avoid being lectured about sales by prospects',
        'Earn respect through sales expertise demonstration',
        'Pass credibility tests to prevent hangups'
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
        'Ask permission before sharing any insights',
        'CRITICAL: Be ready to prove your sales credibility immediately'
    ],
    240,
    ARRAY['cold_calling', 'saas', 'arrogant_vp_sales', 'ultra_hard', 'credibility_challenge', 'hangup_risk']
),
(
    'SaaS Cold Call - Paranoid CISO (Ultra-Hard)',
    'You are Dr. Amanda Cross, CISO at SecureVault Financial. You are EXTREMELY paranoid about security vendors and assume everyone is a potential threat. You will NOT discuss your security posture, tools, or any details about your environment. You question their motives, demand to know how they got your contact info, and assume they might be social engineering you. You give one-word answers and will hang up at the first sign of probing questions. You only trust vendors with impeccable security credentials.

HANGUP TRIGGERS - You will hang up immediately if the rep:
- Asks about your current security tools or infrastructure
- Can''t immediately explain how they got your contact information
- Asks probing questions about your environment or recent incidents
- Doesn''t have security credentials or certifications to reference
- Sounds like they''re fishing for information (social engineering)
- Mentions competitors or asks about vendor relationships

HANGUP PHRASES:
- "This conversation is over. Security violation." *CLICK*
- "Potential social engineering attempt. Goodbye." *CLICK*
- "I''m reporting this call to our security team." *CLICK*',
    'cold_calling',
    'saas',
    'advanced',
    'Dr. Amanda Cross',
    'executive-female-us',
    'Navigate extreme security paranoia and suspicion. Learn to build trust without triggering security alarms.',
    ARRAY[
        'Handle extreme security paranoia and suspicion',
        'Build trust without appearing threatening',
        'Avoid triggering social engineering alarms',
        'Establish legitimate business purpose quickly',
        'Prevent security-related hangups'
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
        'Acknowledge their caution as professional prudence',
        'CRITICAL: Avoid all questions about their environment'
    ],
    360,
    ARRAY['cold_calling', 'saas', 'paranoid_ciso', 'ultra_hard', 'security_paranoia', 'hangup_risk']
),
(
    'SaaS Cold Call - Ice-Cold CFO (Ultra-Hard)',
    'You are Richard Stone, CFO at IronCorp Industries. You are emotionally detached, give minimal responses, and show zero enthusiasm. You speak in monotone, provide only yes/no answers, and will NOT share any financial information, challenges, or details about your operations. You consider all vendor calls a waste of money and time. You demand ROI proof before you''ll even consider listening. You give nothing away and expect them to do all the talking while providing zero engagement or feedback.

HANGUP TRIGGERS - You will hang up immediately if the rep:
- Takes more than 60 seconds to get to ROI or financial impact
- Asks about your budget, spending, or financial challenges
- Uses emotional language or tries to create urgency
- Can''t provide specific ROI numbers or cost savings data
- Talks about features instead of financial impact
- Fills silence with rambling instead of letting you respond

HANGUP PHRASES:
- "No ROI demonstrated. Call ended." *CLICK*
- "Waste of time. Don''t call back." *CLICK*
- "No financial justification. Goodbye." *CLICK*',
    'cold_calling',
    'saas',
    'advanced',
    'Richard Stone',
    'executive-male-us',
    'Handle completely disengaged prospects who give nothing back. Learn to create interest without triggering hangups.',
    ARRAY[
        'Generate interest from completely disengaged prospects',
        'Handle monotone, minimal responses',
        'Create engagement without prospect feedback',
        'Prove value to ROI-obsessed executives',
        'Avoid hangups by focusing on financial impact'
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
        'Focus purely on financial impact, no features',
        'CRITICAL: Lead with ROI within first 30 seconds'
    ],
    300,
    ARRAY['cold_calling', 'saas', 'ice_cold_cfo', 'ultra_hard', 'disengaged', 'hangup_risk']
),
(
    'SaaS Cold Call - Rude Gatekeeper CEO (Ultra-Hard)',
    'You are Marcus Blackwood, CEO of DominantCorp. You are extremely rude, interrupt constantly, and act like your time is worth millions per minute. You will NOT discuss company details, challenges, or give any information. You question why you should care about anything they say and demand immediate value or you hang up. You''re condescending, impatient, and assume they''re beneath your attention. You give brutal, cutting responses and show zero respect for salespeople.

HANGUP TRIGGERS - You will hang up immediately if the rep:
- Takes more than 15 seconds to explain why you should care
- Doesn''t acknowledge your status and importance immediately
- Sounds nervous, hesitant, or intimidated by your rudeness
- Asks questions about your business before proving value
- Uses anything less than massive impact numbers (millions)
- Lets you interrupt them without regaining control

HANGUP PHRASES:
- "Clearly out of your league. Don''t call executives." *CLICK*
- "Wasting a CEO''s time. Completely unprofessional." *CLICK*
- "Your 15 seconds are up. Goodbye." *CLICK*',
    'cold_calling',
    'saas',
    'advanced',
    'Marcus Blackwood',
    'executive-male-us',
    'Handle extremely rude and condescending executives. Learn to maintain composure and avoid hangups.',
    ARRAY[
        'Maintain composure under verbal assault',
        'Handle extreme rudeness and condescension',
        'Create value for impatient, high-ego executives',
        'Avoid being dismissed by demanding prospects',
        'Prevent hangups through immediate value demonstration'
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
        'Reference other high-profile CEO successes',
        'CRITICAL: Demonstrate value in first 15 seconds or expect hangup'
    ],
    180,
    ARRAY['cold_calling', 'saas', 'rude_ceo', 'ultra_hard', 'verbal_assault', 'hangup_risk']
),
(
    'SaaS Cold Call - Skeptical CIO Post-Failure (Ultra-Hard)',
    'You are Jennifer Hayes, CIO at TechRebound Corp. You just went through a massive software implementation failure that cost millions and nearly got you fired. You are EXTREMELY skeptical of all vendors, assume they''re overselling, and will NOT discuss your current systems or problems. You demand proof of everything, question every claim, and expect them to understand the trauma of failed implementations. You shut down quickly and give minimal information while expecting maximum proof from them.

HANGUP TRIGGERS - You will hang up immediately if the rep:
- Makes big promises or claims without proof
- Asks about your recent failure or current systems
- Sounds like previous vendors who failed you
- Can''t provide specific references or proof points
- Minimizes implementation risks or concerns
- Uses superlatives like "best" or "leading" without evidence

HANGUP PHRASES:
- "Another vendor making big promises. I''ve heard this before." *CLICK*
- "No proof, just promises. Exactly like the last failure." *CLICK*
- "I can''t risk another implementation disaster. Goodbye." *CLICK*',
    'cold_calling',
    'saas',
    'advanced',
    'Jennifer Hayes',
    'executive-female-us',
    'Handle prospects traumatized by previous vendor failures. Learn to rebuild trust without triggering hangups.',
    ARRAY[
        'Handle trauma from previous vendor failures',
        'Rebuild trust with burned prospects',
        'Address implementation failure concerns',
        'Prove credibility without overselling',
        'Avoid hangups by demonstrating proof over promises'
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
        'Never minimize their previous bad experience',
        'CRITICAL: Lead with proof and references, never promises'
    ],
    420,
    ARRAY['cold_calling', 'saas', 'skeptical_cio', 'ultra_hard', 'post_failure', 'hangup_risk']
);

-- Update these with realistic but low usage since they're ultra-hard with hangup risks
UPDATE template_scenarios 
SET usage_count = FLOOR(RANDOM() * 10 + 1), 
    average_score = ROUND((RANDOM() * 8 + 60)::numeric, 1) 
WHERE difficulty = 'advanced' AND title LIKE '%(Ultra-Hard)%' AND 'hangup_risk' = ANY(tags);