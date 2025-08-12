import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';
import { AIProspectEngine } from '@/lib/ai-engine/core/prospect-engine';
import { CallScoringEngine } from '@/lib/ai-engine/core/scoring-engine';
import { BusinessModelParser } from '@/lib/ai-engine/core/business-model-parser';
import { ConversationManager } from '@/lib/ai-engine/core/conversation-manager';
import { TranscriptAnalyzer } from '@/lib/ai-engine/utils/transcript-analyzer';
import { PersonaLevel, CallType, DifficultyLevel } from '@/lib/ai-engine/types/prospect-types';
import { CallTranscript } from '@/lib/types';

// Test scenarios for validation
const TEST_SCENARIOS = {
  basic: {
    prompt: "You are the IT Director at TechCorp, a 500-person software company. You're currently using Salesforce but experiencing performance issues.",
    personaLevel: 'director' as PersonaLevel,
    callType: 'discovery-inbound' as CallType,
    difficulty: 3 as DifficultyLevel
  },
  complex: {
    prompt: "You are the CFO at Global Manufacturing Inc, a 10,000-person enterprise. Budget is tight, you're evaluating multiple vendors, and need board approval for any purchase over $100K.",
    personaLevel: 'c-level' as PersonaLevel,
    callType: 'discovery-outbound' as CallType,
    difficulty: 5 as DifficultyLevel
  },
  objection: {
    prompt: "You are a Sales Manager at RetailChain, managing a team of 20. You're happy with your current CRM but your boss asked you to explore alternatives.",
    personaLevel: 'manager' as PersonaLevel,
    callType: 'objection-handling' as CallType,
    difficulty: 4 as DifficultyLevel
  }
};

// Sample transcripts for testing
const SAMPLE_TRANSCRIPTS: Record<string, CallTranscript[]> = {
  good: [
    { speaker: 'rep', message: "Hi Sarah, thanks for taking my call. I understand you're the IT Director at TechCorp. How are things going with your current sales systems?" },
    { speaker: 'ai', message: "Things are okay, but we've been having some performance issues with Salesforce lately." },
    { speaker: 'rep', message: "I hear that a lot. Can you tell me more about these performance issues? How are they impacting your team?" },
    { speaker: 'ai', message: "Well, it's really slowing down our sales team. Reports take forever to generate, and the system crashes during peak hours." },
    { speaker: 'rep', message: "That sounds frustrating. How much time would you estimate your team loses each day due to these issues?" },
    { speaker: 'ai', message: "Probably 2-3 hours per rep, which adds up quickly across our 50-person sales team." },
    { speaker: 'rep', message: "So that's potentially 100-150 hours of lost productivity daily. What would it mean for your business if you could get that time back?" },
    { speaker: 'ai', message: "It would be huge. We could probably increase our sales by 20-30%." },
    { speaker: 'rep', message: "That's significant. Our platform is built for performance at scale. Would you be interested in seeing how we handle large data volumes without any slowdowns?" },
    { speaker: 'ai', message: "Yes, I'd like to see that. But I need to know about pricing first." },
    { speaker: 'rep', message: "I understand. Our pricing is based on your team size and usage. For a 50-person sales team, you're looking at roughly $5,000 per month. But let me ask - what's your current investment in Salesforce?" },
    { speaker: 'ai', message: "We're paying about $7,500 per month currently." },
    { speaker: 'rep', message: "So you'd actually save money while getting better performance. How does next Tuesday at 2 PM work for a demo where I can show you the platform and we can build out a specific ROI calculation for TechCorp?" },
    { speaker: 'ai', message: "Tuesday at 2 PM works. Please send me a calendar invite with the agenda." }
  ],
  poor: [
    { speaker: 'rep', message: "Hi, is this the person in charge of buying software?" },
    { speaker: 'ai', message: "I'm the IT Director, yes. What is this about?" },
    { speaker: 'rep', message: "We have the best CRM in the market. Do you want to buy it?" },
    { speaker: 'ai', message: "We already have a CRM system." },
    { speaker: 'rep', message: "Ours is better. It has all the features." },
    { speaker: 'ai', message: "What features specifically?" },
    { speaker: 'rep', message: "Um, like, you know, reports and stuff. And it's in the cloud." },
    { speaker: 'ai', message: "That's not very specific. What makes it better than Salesforce?" },
    { speaker: 'rep', message: "It just is. Everyone says so. Do you have budget?" },
    { speaker: 'ai', message: "I'm not discussing budget until I understand the value." },
    { speaker: 'rep', message: "Okay well it's really good value. Can we set up a meeting?" },
    { speaker: 'ai', message: "No, I don't think this is a good fit. Thanks for calling." }
  ]
};

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Parse request body
    const body = await req.json();
    const { testType, scenario, input, options = {} } = body;

    let result: any = {};

    switch (testType) {
      case 'prospect-response':
        result = await testProspectResponse(scenario, input, options);
        break;
      
      case 'scoring':
        result = await testScoring(input, options);
        break;
      
      case 'business-parser':
        result = await testBusinessParser(input);
        break;
      
      case 'conversation-flow':
        result = await testConversationFlow(scenario, input);
        break;
      
      case 'transcript-analysis':
        result = await testTranscriptAnalysis(input);
        break;
      
      case 'full-simulation':
        result = await testFullSimulation(scenario, options);
        break;
      
      default:
        return errorResponse('Invalid test type', 400);
    }

    return successResponse({
      testType,
      result,
      timestamp: new Date().toISOString()
    }, 200, corsHeaders);

  } catch (error) {
    console.error('AI Engine test error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Test failed',
      500
    );
  }
}

async function testProspectResponse(
  scenarioKey: string,
  repMessage: string,
  options: any
): Promise<any> {
  const scenario = TEST_SCENARIOS[scenarioKey as keyof typeof TEST_SCENARIOS] || TEST_SCENARIOS.basic;
  
  // Parse the scenario
  const parser = new BusinessModelParser();
  const parsedScenario = await parser.parseScenario(scenario.prompt);
  
  // Build scenario context
  const scenarioContext = parser.buildScenarioContext(
    parsedScenario,
    {
      level: scenario.personaLevel,
      personalityTraits: options.traits || ['analytical', 'time-conscious']
    },
    scenario.callType,
    scenario.difficulty
  );
  
  // Create AI prospect
  const prospectEngine = new AIProspectEngine({
    scenarioContext,
    voiceSettings: options.voiceSettings
  });
  
  // Generate response
  const response = await prospectEngine.generateResponse(repMessage);
  
  return {
    scenario: scenario.prompt,
    repMessage,
    prospectResponse: response,
    conversationState: prospectEngine.getConversationState(),
    memory: prospectEngine.getMemory()
  };
}

async function testScoring(
  transcriptKey: string,
  options: any
): Promise<any> {
  const transcript = SAMPLE_TRANSCRIPTS[transcriptKey as keyof typeof SAMPLE_TRANSCRIPTS] || SAMPLE_TRANSCRIPTS.good;
  const callType = options.callType || 'discovery-inbound';
  
  // Create scoring engine
  const scoringEngine = new CallScoringEngine(transcript, callType);
  
  // Get full scoring
  const score = await scoringEngine.scoreCall();
  
  // Also test manual analysis methods
  const manualAnalysis = {
    talkRatio: scoringEngine.analyzeTalkRatio(),
    discovery: scoringEngine.analyzeDiscoveryQuality(),
    objections: scoringEngine.analyzeObjectionHandling()
  };
  
  return {
    transcriptLength: transcript.length,
    callType,
    score,
    manualAnalysis
  };
}

async function testBusinessParser(scenarioPrompt: string): Promise<any> {
  const parser = new BusinessModelParser();
  
  // Parse the scenario
  const parsed = await parser.parseScenario(scenarioPrompt);
  
  // Extract persona hints
  const personaHints = parser.extractPersonaHints(scenarioPrompt);
  
  // Build full context
  const context = parser.buildScenarioContext(
    parsed,
    {
      level: personaHints.level || 'manager',
      ...personaHints
    },
    'discovery-outbound',
    3
  );
  
  return {
    originalPrompt: scenarioPrompt,
    parsedScenario: parsed,
    personaHints,
    fullContext: context
  };
}

async function testConversationFlow(
  scenarioKey: string,
  messages: Array<{ speaker: 'rep' | 'prospect'; message: string }>
): Promise<any> {
  const scenario = TEST_SCENARIOS[scenarioKey as keyof typeof TEST_SCENARIOS] || TEST_SCENARIOS.basic;
  
  // Create conversation manager
  const conversationManager = new ConversationManager(scenario.prompt);
  
  // Add all messages
  messages.forEach(({ speaker, message }) => {
    conversationManager.addTurn(speaker, message);
  });
  
  // Get analytics
  const analytics = conversationManager.getAnalytics();
  const context = conversationManager.getContext();
  const state = conversationManager.getState();
  
  return {
    scenario: scenario.prompt,
    messageCount: messages.length,
    context,
    state,
    analytics
  };
}

async function testTranscriptAnalysis(
  transcriptKey: string
): Promise<any> {
  const transcript = SAMPLE_TRANSCRIPTS[transcriptKey as keyof typeof SAMPLE_TRANSCRIPTS] || SAMPLE_TRANSCRIPTS.good;
  
  // Create analyzer
  const analyzer = new TranscriptAnalyzer(transcript);
  
  // Run all analysis methods
  const analysis = {
    summary: analyzer.generateSummary(),
    questions: analyzer.extractQuestions(),
    categorizedQuestions: analyzer.categorizeQuestions(),
    objections: analyzer.findObjections(),
    confidence: analyzer.analyzeConfidence(),
    valueProps: analyzer.findValuePropositions(),
    callFlow: analyzer.analyzeCallFlow()
  };
  
  return {
    transcriptLength: transcript.length,
    analysis
  };
}

async function testFullSimulation(
  scenarioKey: string,
  options: any
): Promise<any> {
  const scenario = TEST_SCENARIOS[scenarioKey as keyof typeof TEST_SCENARIOS] || TEST_SCENARIOS.basic;
  const maxTurns = options.maxTurns || 10;
  
  // Initialize components
  const parser = new BusinessModelParser();
  const parsedScenario = await parser.parseScenario(scenario.prompt);
  const scenarioContext = parser.buildScenarioContext(
    parsedScenario,
    { level: scenario.personaLevel },
    scenario.callType,
    scenario.difficulty
  );
  
  const prospectEngine = new AIProspectEngine({ scenarioContext });
  const conversationManager = new ConversationManager(scenario.prompt);
  
  // Simulate conversation
  const conversation: CallTranscript[] = [];
  const repMessages = [
    "Hi, thanks for taking my call. I understand you're evaluating solutions in this space?",
    "Can you tell me about your current challenges?",
    "How is that impacting your business?",
    "What would an ideal solution look like for you?",
    "We've helped similar companies achieve great results. Would you like to see how?",
    "Based on what you've shared, I think we could really help. Can we schedule a deeper dive next week?"
  ];
  
  for (let i = 0; i < Math.min(maxTurns, repMessages.length); i++) {
    // Rep message
    const repMsg = repMessages[i];
    conversation.push({ speaker: 'rep', message: repMsg });
    conversationManager.addTurn('rep', repMsg);
    
    // Prospect response
    const response = await prospectEngine.generateResponse(repMsg);
    conversation.push({ speaker: 'ai', message: response.message });
    conversationManager.addTurn('prospect', response.message, {
      sentiment: response.sentiment
    });
    
    // Stop if conversation reached a natural end
    if (response.message.toLowerCase().includes('goodbye') || 
        response.message.toLowerCase().includes('not interested')) {
      break;
    }
  }
  
  // Score the conversation
  const scoringEngine = new CallScoringEngine(conversation, scenario.callType);
  const score = await scoringEngine.scoreCall();
  
  return {
    scenario: scenario.prompt,
    conversation,
    turns: conversation.length,
    finalState: prospectEngine.getConversationState(),
    analytics: conversationManager.getAnalytics(),
    score: {
      overall: score.overallScore,
      breakdown: Object.entries(score.breakdown).map(([key, value]) => ({
        metric: key,
        score: value.score
      }))
    }
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}