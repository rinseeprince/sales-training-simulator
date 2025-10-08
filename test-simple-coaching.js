// Simple test for the streamlined coaching API
const sampleTranscript = [
  { speaker: 'rep', message: 'Hi Sarah, thanks for taking time today. How are things going at TechCorp?' },
  { speaker: 'ai', message: 'Good, thanks. I have about 15 minutes. What did you want to discuss?' },
  { speaker: 'rep', message: 'I understand you\'re looking at ways to improve your sales team\'s performance. What challenges are you facing right now?' },
  { speaker: 'ai', message: 'Our biggest issue is that our reps aren\'t hitting their quotas. Only about 40% are meeting targets.' },
  { speaker: 'rep', message: 'That sounds tough. What do you think is causing that?' },
  { speaker: 'ai', message: 'Honestly, I think they need better training. They struggle with objection handling especially.' },
  { speaker: 'rep', message: 'How much revenue is this costing you?' },
  { speaker: 'ai', message: 'We\'re probably missing out on about $500K per quarter.' },
  { speaker: 'rep', message: 'That\'s significant. Have you tried any training programs?' },
  { speaker: 'ai', message: 'We did some generic sales training last year but it didn\'t really stick.' },
  { speaker: 'rep', message: 'What would ideal training look like for your team?' },
  { speaker: 'ai', message: 'Something hands-on where they can practice real scenarios and get immediate feedback.' },
  { speaker: 'rep', message: 'That\'s exactly what our platform does. Would you be interested in seeing it in action?' },
  { speaker: 'ai', message: 'Maybe, but I\'d need to see ROI first. What does something like this cost?' },
  { speaker: 'rep', message: 'Given you\'re losing $500K per quarter, even a 10% improvement would be $50K. Our solution pays for itself quickly. Can we set up a demo next week?' },
  { speaker: 'ai', message: 'Let me think about it and get back to you.' }
];

async function testSimpleCoaching() {
  try {
    console.log('🧪 Testing Simple Coaching API...');
    
    const response = await fetch('http://localhost:3000/api/simple-coaching', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: sampleTranscript
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Simple Coaching API Response:');
    console.log('=====================================');
    console.log(result.feedback);
    console.log('=====================================');
    console.log(`Model: ${result.model}`);
    console.log(`Timestamp: ${result.timestamp}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  testSimpleCoaching();
}

module.exports = { testSimpleCoaching, sampleTranscript };