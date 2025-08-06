const ElevenLabs = require('elevenlabs-node');

async function testElevenLabs() {
  try {
    console.log('Testing ElevenLabs Node.js client...');
    
    const apiKey = 'sk_f8e5124e899b860fbf5c8b911e2cf4e1e944c960bec28b76';
    console.log('API Key:', apiKey.substring(0, 10) + '...');
    
    const elevenlabs = new ElevenLabs({
      apiKey: apiKey,
      voiceId: '21m00Tcm4TlvDq8ikWAM'
    });
    console.log('ElevenLabs client created successfully');
    
    const text = "Hello, this is a test of the ElevenLabs Node.js client.";
    console.log('Text to speech:', text);
    
    const audio = await elevenlabs.textToSpeech({
      fileName: 'test_audio.mp3',
      textInput: text,
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      stability: 0.5,
      similarityBoost: 0.5,
    });
    
    console.log('Audio generated successfully!');
    console.log('Audio type:', typeof audio);
    console.log('Audio constructor:', audio?.constructor?.name);
    console.log('Audio keys:', audio ? Object.keys(audio) : 'null/undefined');
    console.log('Audio:', audio);
    
    if (audio && audio.data) {
      console.log('Audio.data type:', typeof audio.data);
      console.log('Audio.data constructor:', audio.data?.constructor?.name);
      console.log('Audio.data length:', audio.data?.length);
      
      const fs = require('fs');
      fs.writeFileSync('test_node_audio.mp3', audio.data);
      console.log('Audio saved to test_node_audio.mp3');
    } else if (audio && audio.buffer) {
      console.log('Audio.buffer type:', typeof audio.buffer);
      console.log('Audio.buffer constructor:', audio.buffer?.constructor?.name);
      console.log('Audio.buffer length:', audio.buffer?.length);
      
      const fs = require('fs');
      fs.writeFileSync('test_node_audio.mp3', audio.buffer);
      console.log('Audio saved to test_node_audio.mp3');
    } else {
      console.log('No audio data found in response');
    }
    
  } catch (error) {
    console.error('ElevenLabs test failed:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testElevenLabs(); 