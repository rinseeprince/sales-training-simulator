// Test script for enhanced coaching system
const sampleTranscript = [
  { speaker: 'rep', message: 'Hi Sarah, thanks for taking the time to meet with me today. How are you doing?' },
  { speaker: 'ai', message: 'Hi John, I\'m doing well, thanks. I have about 20 minutes. What did you want to discuss?' },
  { speaker: 'rep', message: 'Great, I know your time is valuable. I understand you\'re the VP of Sales at TechCorp. Can you tell me a bit about your current sales process?' },
  { speaker: 'ai', message: 'Sure, we have a pretty traditional process. Our reps do cold outreach, qualify leads, and then move them through our pipeline. But honestly, we\'re struggling with conversion rates.' },
  { speaker: 'rep', message: 'That\'s interesting. What do you think is causing the low conversion rates?' },
  { speaker: 'ai', message: 'Well, I think our reps aren\'t asking the right questions. They jump straight into product features instead of understanding the prospect\'s needs.' },
  { speaker: 'rep', message: 'That sounds frustrating. How is this impacting your revenue targets?' },
  { speaker: 'ai', message: 'It\'s a real problem. We\'re about 30% behind our quarterly target, which means we might miss our annual goal by $2 million.' },
  { speaker: 'rep', message: 'Wow, that\'s significant. Have you tried any solutions to address this?' },
  { speaker: 'ai', message: 'We\'ve done some basic sales training, but nothing has really stuck. The problem is we don\'t have a way to practice and get feedback.' },
  { speaker: 'rep', message: 'That makes sense. What would an ideal solution look like for you?' },
  { speaker: 'ai', message: 'Ideally, we\'d have a way for our reps to practice with realistic scenarios and get immediate feedback on their performance.' },
  { speaker: 'rep', message: 'That\'s exactly what our platform does. We provide AI-powered sales simulation with detailed coaching feedback. Would you like to see a demo?' },
  { speaker: 'ai', message: 'That sounds interesting, but I\'d need to see some ROI data. How much does it cost?' },
  { speaker: 'rep', message: 'I understand the ROI concern. Our customers typically see a 25% improvement in conversion rates within 3 months. As for pricing, it depends on your team size. How many sales reps do you have?' },
  { speaker: 'ai', message: 'We have about 50 reps. But honestly, budget is tight right now.' },
  { speaker: 'rep', message: 'I hear you on the budget constraints. But think about it this way - if we can help you close that $2 million gap, wouldn\'t that more than pay for the investment?' },
  { speaker: 'ai', message: 'That\'s a good point. What would be the next step?' },
  { speaker: 'rep', message: 'How about we schedule a pilot program with 10 of your reps for 30 days? That way you can see the results before making a larger commitment. Does that sound reasonable?' },
  { speaker: 'ai', message: 'Yes, that could work. Let me check with my team and get back to you next week.' }
];

async function testEnhancedCoaching() {
  try {
    console.log('🧪 Testing Enhanced Coaching API...');
    
    const response = await fetch('http://localhost:3000/api/enhanced-coaching', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: sampleTranscript,
        scenarioContext: {
          industry: 'Technology',
          productType: 'SaaS Platform',
          dealSize: 'Enterprise',
          salesStage: 'Discovery',
          competitiveContext: ['Traditional Training', 'Internal Solutions']
        },
        repProfile: {
          experience: 'mid',
          strengths: ['Rapport Building', 'Questioning'],
          developmentAreas: ['Objection Handling', 'Closing']
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Enhanced Coaching API Response:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  testEnhancedCoaching();
}

module.exports = { testEnhancedCoaching, sampleTranscript };