async function testAIResponse() {
  try {
    console.log('Testing AI response...');
    
    const testData = {
      transcript: "What does your company do?",
      scenarioPrompt: "You are a manager at a mid-size tech company. Answer discovery questions naturally.",
      persona: "Manager",
      voiceSettings: {
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        stability: 0.5,
        similarityBoost: 0.5,
        style: 0.0,
        useSpeakerBoost: true
      },
      conversationHistory: []
    };

    console.log('Sending test data:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:3000/api/stream-gpt-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    console.log('Reading response...');
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Response complete');
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log('Received:', data);
            
            if (data.type === 'text_chunk') {
              console.log('AI Response Chunk:', data.content);
            }
            
            if (data.type === 'completion') {
              console.log('FULL AI RESPONSE:', data.fullResponse);
            }
          } catch (parseError) {
            console.error('Parse error:', parseError);
          }
        }
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAIResponse(); 