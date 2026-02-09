// WebSocket integration test
const io = require('socket.io-client');

const WS_URL = 'http://localhost:3001';

// Test stream ID (use the one we created earlier or create new one)
const STREAM_ID = '06beee4a-1592-4ac0-9b90-bc719452e565';
const BROADCASTER_ID = 'test_broadcaster_123';
const VIEWER1_ID = 'test_viewer_1';
const VIEWER2_ID = 'test_viewer_2';

console.log('🧪 Starting WebSocket Integration Test\n');

// Create sockets
const broadcasterSocket = io(WS_URL, { transports: ['websocket'] });
const viewer1Socket = io(WS_URL, { transports: ['websocket'] });
const viewer2Socket = io(WS_URL, { transports: ['websocket'] });

let testsPassed = 0;
let testsFailed = 0;

function testResult(name, passed, message) {
  if (passed) {
    console.log(`✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}: ${message}`);
    testsFailed++;
  }
}

// Test 1: Broadcaster joins stream
broadcasterSocket.on('connect', () => {
  console.log('📡 Broadcaster connected');
  broadcasterSocket.emit('join_stream', {
    streamId: STREAM_ID,
    role: 'broadcaster',
    userId: BROADCASTER_ID
  });
});

// Test 2: Viewers join stream
viewer1Socket.on('connect', () => {
  console.log('📡 Viewer 1 connected');
  viewer1Socket.emit('join_stream', {
    streamId: STREAM_ID,
    role: 'viewer',
    userId: VIEWER1_ID
  });
  
  // Request allowed commands
  viewer1Socket.emit('get_commands');
});

viewer2Socket.on('connect', () => {
  console.log('📡 Viewer 2 connected');
  viewer2Socket.emit('join_stream', {
    streamId: STREAM_ID,
    role: 'viewer',
    userId: VIEWER2_ID
  });
});

// Test 3: Control state received
let controlStateReceived = false;
viewer1Socket.on('control_state', (state) => {
  if (!controlStateReceived) {
    controlStateReceived = true;
    testResult(
      'Control state received', 
      state.hasOwnProperty('activeUserId') && state.hasOwnProperty('queue'),
      'Missing required fields'
    );
    console.log('📊 Initial control state:', JSON.stringify(state, null, 2));
    
    // Test 4: Viewer 1 buys slot
    console.log('\n🛒 Viewer 1 buying 10-second slot...');
    viewer1Socket.emit('buy_slot', {
      streamId: STREAM_ID,
      durationSec: 10
    });
  }
});

// Test 5: Purchase success
viewer1Socket.on('purchase_success', (data) => {
  testResult(
    'Viewer 1 purchase successful',
    data.balance === 990 && data.position === 1,
    `Unexpected balance or position: ${JSON.stringify(data)}`
  );
  console.log('💰 Purchase success:', data);
  
  // Test 6: Viewer 2 buys slot
  setTimeout(() => {
    console.log('\n🛒 Viewer 2 buying 60-second slot...');
    viewer2Socket.emit('buy_slot', {
      streamId: STREAM_ID,
      durationSec: 60
    });
  }, 500);
});

viewer2Socket.on('purchase_success', (data) => {
  testResult(
    'Viewer 2 purchase successful',
    data.balance === 900 && data.position === 2,
    `Unexpected balance or position: ${JSON.stringify(data)}`
  );
  console.log('💰 Purchase success:', data);
});

// Test 7: Control granted to Viewer 1
viewer1Socket.on('control_granted', (data) => {
  testResult(
    'Control granted to Viewer 1',
    data.endsAt > Date.now(),
    'endsAt timestamp should be in the future'
  );
  console.log('🎮 Control granted to Viewer 1:', data);
  
  // Test 8: Send command
  setTimeout(() => {
    console.log('\n🎮 Viewer 1 sending FORWARD command...');
    viewer1Socket.emit('send_command', {
      streamId: STREAM_ID,
      commandType: 'FORWARD'
    });
  }, 500);
});

// Test 9: Command sent confirmation
viewer1Socket.on('command_sent', (data) => {
  testResult(
    'Command sent successfully',
    data.commandType === 'FORWARD',
    'Unexpected command type'
  );
  console.log('✅ Command sent:', data);
  
  // Test 10: Send another command immediately (should trigger rate limit)
  setTimeout(() => {
    console.log('\n🎮 Viewer 1 sending STOP command (testing rate limit)...');
    viewer1Socket.emit('send_command', {
      streamId: STREAM_ID,
      commandType: 'STOP'
    });
  }, 100);
});

// Test 11: Command received by broadcaster
let commandsReceived = 0;
broadcasterSocket.on('command_received', (data) => {
  commandsReceived++;
  testResult(
    `Broadcaster received command #${commandsReceived}`,
    data.commandType && data.fromUserId === VIEWER1_ID,
    'Missing command data'
  );
  console.log('📨 Broadcaster received command:', data);
});

// Test 12: Command rejected due to rate limit
viewer1Socket.on('command_rejected', (data) => {
  testResult(
    'Command rejected (rate limit)',
    data.reason.includes('Rate limit'),
    `Unexpected rejection reason: ${data.reason}`
  );
  console.log('⏱️ Command rejected:', data.reason);
});

// Test 13: Allowed commands received
viewer1Socket.on('allowed_commands', (data) => {
  testResult(
    'Allowed commands received',
    Array.isArray(data.commands) && data.commands.length > 0,
    'Commands array is empty or invalid'
  );
  console.log('📋 Allowed commands:', data.commands);
});

// Test 14: Queue state updated
let queueUpdates = 0;
viewer2Socket.on('control_state', (state) => {
  queueUpdates++;
  if (queueUpdates === 2) { // After viewer 2 joins queue
    testResult(
      'Queue has 2 viewers',
      state.queue.length === 1 && state.activeUserId === VIEWER1_ID,
      `Unexpected queue state: ${JSON.stringify(state)}`
    );
    console.log('📊 Updated control state:', JSON.stringify(state, null, 2));
  }
});

// Summary after 15 seconds
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log('='.repeat(50));
  
  // Cleanup
  broadcasterSocket.disconnect();
  viewer1Socket.disconnect();
  viewer2Socket.disconnect();
  
  process.exit(testsFailed === 0 ? 0 : 1);
}, 15000);

// Error handlers
broadcasterSocket.on('error', (error) => {
  console.error('❌ Broadcaster socket error:', error);
});

viewer1Socket.on('error', (error) => {
  console.error('❌ Viewer 1 socket error:', error);
});

viewer2Socket.on('error', (error) => {
  console.error('❌ Viewer 2 socket error:', error);
});
