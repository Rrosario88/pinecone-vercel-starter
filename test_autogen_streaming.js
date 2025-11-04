// Test script to verify AutoGen streaming works end-to-end
const fetch = require('node-fetch');

async function testAutoGenStreaming() {
  console.log('🧪 Testing AutoGen Streaming End-to-End');
  console.log('==========================================\n');

  // Test 1: AutoGen streaming endpoint
  console.log('📡 Testing AutoGen streaming endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/autogen-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'What is the difference between containers and virtual machines?' }
        ],
        use_multi_agent: true,
        agent_config: {
          use_researcher: true,
          use_critic: true,
          use_summarizer: false,
          context_strategy: 'comprehensive'
        },
        stream: true
      })
    });

    if (response.ok) {
      console.log('✅ AutoGen streaming endpoint responded');
      
      // Check if it's a streaming response
      const contentType = response.headers.get('content-type');
      console.log(`📄 Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('text/plain')) {
        console.log('🌊 Streaming response detected');
        
        // Read some chunks
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let chunkCount = 0;
        
        while (chunkCount < 5) { // Read first 5 chunks
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          console.log(`📦 Chunk ${chunkCount + 1}:`, chunk.substring(0, 100) + '...');
          chunkCount++;
        }
        
        reader.releaseLock();
        console.log('✅ Streaming test successful');
      } else {
        console.log('⚠️  Non-streaming response received');
        const text = await response.text();
        console.log('Response preview:', text.substring(0, 200) + '...');
      }
    } else {
      console.log(`❌ AutoGen streaming failed: ${response.status}`);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.log('❌ AutoGen streaming error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Regular chat endpoint with AutoGen
  console.log('📡 Testing regular chat endpoint with AutoGen...');
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'What is microservices architecture?' }
        ],
        use_autogen: true,
        agent_config: {
          use_researcher: true,
          use_critic: true,
          use_summarizer: false,
          context_strategy: 'comprehensive'
        }
      })
    });

    if (response.ok) {
      console.log('✅ Chat endpoint with AutoGen responded');
      
      const contentType = response.headers.get('content-type');
      console.log(`📄 Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('text/plain')) {
        console.log('🌊 Streaming response detected');
        
        // Read some chunks
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let chunkCount = 0;
        
        while (chunkCount < 3) { // Read first 3 chunks
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          console.log(`📦 Chunk ${chunkCount + 1}:`, chunk.substring(0, 100) + '...');
          chunkCount++;
        }
        
        reader.releaseLock();
        console.log('✅ Chat streaming test successful');
      } else {
        console.log('⚠️  Non-streaming response received');
        const text = await response.text();
        console.log('Response preview:', text.substring(0, 200) + '...');
      }
    } else {
      console.log(`❌ Chat endpoint failed: ${response.status}`);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.log('❌ Chat endpoint error:', error.message);
  }

  console.log('\n🎉 AutoGen streaming test completed!');
}

// Run the test
testAutoGenStreaming().catch(console.error);
