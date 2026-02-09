# 🎥 Interactive Live Stream Platform

A web platform for interactive live streams where viewers can pay to control the streamer in real-time. Built with React, Node.js, Express, and Socket.IO.

## 📋 Features

### Core Functionality
- **Real-time Streaming**: Broadcaster creates streams that viewers can join (video placeholder in MVP, WebRTC-ready architecture)
- **Paid Control System**: Viewers purchase time slots to control the broadcaster
- **Queue Management**: Automatic queue system with timer-based control switching
- **Command System**: Whitelist of commands with rate limiting (1 command/second)
- **Live Updates**: Real-time state synchronization via WebSocket for all participants
- **Mock Payment**: Internal coin system (1000 coins initial balance)

### User Roles
1. **Broadcaster**: Creates streams, receives commands, manages control settings
2. **Viewer**: Watches streams, purchases control slots, sends commands when active

## 🏗️ Architecture

```
/workspace
├── server/                 # Backend (Node.js + Express + Socket.IO)
│   ├── index.js           # Main server file with WebSocket handlers
│   ├── routes/
│   │   └── api.js         # REST API endpoints
│   ├── services/
│   │   ├── StreamService.js    # Stream management
│   │   ├── QueueService.js     # Queue and control logic
│   │   └── CommandService.js   # Command validation and logging
│   └── models/
│       ├── Stream.js      # Stream data model
│       └── User.js        # User and balance management
│
└── client/                # Frontend (React)
    ├── src/
    │   ├── pages/
    │   │   ├── Home.js          # Landing page and stream list
    │   │   ├── Broadcaster.js   # Broadcaster view
    │   │   └── Viewer.js        # Viewer view
    │   ├── components/
    │   │   ├── VideoArea.js         # Video placeholder
    │   │   ├── CommandPanel.js      # Command buttons
    │   │   ├── CommandOverlay.js    # Command display for broadcaster
    │   │   ├── QueueDisplay.js      # Queue visualization
    │   │   └── ControlStatus.js     # Viewer control status
    │   └── services/
    │       ├── socket.js    # WebSocket client service
    │       └── api.js       # REST API client
    └── public/
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Modern web browser

### Installation

1. **Clone and navigate to project**
```bash
cd /workspace
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### Running Locally

**Option 1: Run both server and client together (recommended)**
```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 (Server):
```bash
cd server
npm run dev
```

Terminal 2 (Client):
```bash
cd client
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001

## 📖 Usage Guide

### As a Broadcaster

1. Open http://localhost:3000
2. Click **"Create Stream"** in the Broadcaster section
3. Copy the viewer link and share it
4. Wait for viewers to join and purchase control slots
5. See commands as large overlays on screen
6. Manage control with **"Disable Control"** or **"End Stream"** buttons

### As a Viewer

1. Open a stream link (format: http://localhost:3000/v/{streamId})
2. Purchase a control slot:
   - 10 seconds = 10 coins
   - 60 seconds = 100 coins
   - 2 minutes = 180 coins
   - 5 minutes = 400 coins
3. Wait in queue for your turn
4. When active, use the command panel to send commands
5. Your status updates automatically (watching → queued → controlling)

### Available Commands
- ⬅️ LEFT
- ➡️ RIGHT
- ⬆️ FORWARD
- ⬇️ BACKWARD
- ✋ STOP
- 🔄 TURN_AROUND
- 🔍+ ZOOM_IN
- 🔍- ZOOM_OUT
- 👋 WAVE
- ⬆️ JUMP

## 🔌 API Reference

### REST API

#### Create Stream
```http
POST /api/streams
Content-Type: application/json

{
  "broadcasterId": "user_abc123"
}

Response:
{
  "streamId": "uuid-here",
  "stream": { ... }
}
```

#### Get Active Streams
```http
GET /api/streams

Response:
{
  "streams": [
    {
      "id": "uuid",
      "broadcasterId": "user_abc",
      "status": "active",
      "createdAt": "2026-02-09T...",
      "controlEnabled": true,
      "broadcasterOnline": true
    }
  ]
}
```

#### Get User Balance
```http
GET /api/users/:userId/balance

Response:
{
  "balance": 1000
}
```

#### End Stream
```http
POST /api/streams/:streamId/end
Content-Type: application/json

{
  "broadcasterId": "user_abc123"
}
```

### WebSocket Events

#### Client → Server

**Join Stream**
```javascript
socket.emit('join_stream', {
  streamId: 'uuid',
  role: 'viewer', // or 'broadcaster'
  userId: 'user_abc123'
});
```

**Buy Slot**
```javascript
socket.emit('buy_slot', {
  streamId: 'uuid',
  durationSec: 60 // 10, 60, 120, or 300
});
```

**Send Command**
```javascript
socket.emit('send_command', {
  streamId: 'uuid',
  commandType: 'FORWARD' // see allowed commands
});
```

**Disable Control (broadcaster only)**
```javascript
socket.emit('disable_control', {
  streamId: 'uuid'
});
```

**End Stream (broadcaster only)**
```javascript
socket.emit('end_stream', {
  streamId: 'uuid'
});
```

#### Server → Client

**Control State Update**
```javascript
socket.on('control_state', (data) => {
  // data: {
  //   activeUserId: 'user_xyz' or null,
  //   endsAt: timestamp or null,
  //   queue: [{ userId, position, durationSec }, ...]
  // }
});
```

**Control Granted (to active controller)**
```javascript
socket.on('control_granted', (data) => {
  // data: { endsAt: timestamp }
});
```

**Command Received (to broadcaster)**
```javascript
socket.on('command_received', (data) => {
  // data: {
  //   streamId: 'uuid',
  //   commandType: 'FORWARD',
  //   fromUserId: 'user_xyz',
  //   timestamp: '2026-02-09T...'
  // }
});
```

**Purchase Success**
```javascript
socket.on('purchase_success', (data) => {
  // data: { balance: 900, position: 3 }
});
```

**Purchase Failed**
```javascript
socket.on('purchase_failed', (data) => {
  // data: { error: 'Insufficient balance' }
});
```

**Command Rejected**
```javascript
socket.on('command_rejected', (data) => {
  // data: { reason: 'You are not the active controller' }
});
```

**Stream Ended**
```javascript
socket.on('stream_ended', (data) => {
  // data: {
  //   reason: 'Broadcaster ended stream',
  //   refunds: [{ userId, amount, reason }, ...]
  // }
});
```

**Control Disabled**
```javascript
socket.on('control_disabled', (data) => {
  // data: {
  //   reason: 'Broadcaster disabled control',
  //   refunds: [...]
  // }
});
```

## 💰 Pricing & Refund Rules

### Pricing (MVP - Mock Payment)
- Each user starts with 1000 coins
- Pricing tiers:
  - 10s = 10 coins
  - 60s = 100 coins
  - 120s = 180 coins
  - 300s = 400 coins

### Refund Policy
- **Stream Ends**: Active controller gets refund for unused time, all queued viewers get full refund
- **Control Disabled**: All queued viewers get full refund, active controller continues until time expires
- **Broadcaster Disconnects**: Same as stream end

## 🔒 Security & Rate Limiting

- **Command Whitelist**: Only predefined commands accepted
- **Rate Limiting**: Max 1 command per second per user
- **Authorization**: Only active controller can send commands
- **Input Validation**: All inputs validated on server
- **Command Logs**: All commands logged with timestamp and user

## 🎯 Business Rules

### Queue System (Mode 1)
1. Only one active controller at a time
2. Queue is FIFO (first in, first out)
3. Control slot starts automatically when user reaches position #1
4. Timer managed on server (source of truth)
5. Users can purchase multiple slots (added sequentially)

### Command System
1. Commands only from whitelist
2. Rate limit: 1 command/second enforced server-side
3. Commands accepted only from active controller
4. Broadcaster sees commands as large overlay

### Timer System
1. Server stores `endsAt` timestamp
2. Clients calculate countdown locally
3. Automatic transition to next user when time expires
4. No slot "freezing" if user disconnects

## 🏗️ Future Enhancements

### Phase 2: Video Integration
- Integrate LiveKit or Agora Web SDK for low-latency WebRTC streaming
- Replace video placeholder with real camera feed
- Add video quality controls

### Phase 3: Real Payments
- Integrate Stripe/YooKassa/CloudPayments
- Add coin purchase flow
- Transaction history
- Withdrawal for broadcasters

### Phase 4: Database
- Migrate to PostgreSQL for persistent data
- Redis for queue and real-time state
- User accounts and authentication
- Stream analytics and history

### Phase 5: Advanced Features
- Multiple control modes (auction, highest bidder, etc.)
- Stream categories and discovery
- Chat system
- Broadcaster earnings dashboard
- Mobile apps (React Native)

## 🛠️ Technology Stack

**Backend**
- Node.js
- Express.js
- Socket.IO (WebSocket)
- UUID (ID generation)

**Frontend**
- React 18
- React Router v6
- Socket.IO Client
- Axios

**Styling**
- CSS3 with gradients and animations
- Responsive design
- Mobile-friendly

## 📂 Data Models

### Stream
```javascript
{
  id: String (UUID),
  broadcasterId: String,
  status: 'active' | 'ended',
  controlEnabled: Boolean,
  broadcasterOnline: Boolean,
  createdAt: ISO timestamp,
  endedAt: ISO timestamp (optional)
}
```

### User
```javascript
{
  id: String,
  balanceCoins: Number,
  createdAt: ISO timestamp
}
```

### Queue Item
```javascript
{
  id: String (UUID),
  streamId: String,
  userId: String,
  durationSec: Number,
  createdAt: ISO timestamp,
  status: 'pending'
}
```

### Active Control
```javascript
{
  userId: String,
  endsAt: Number (timestamp),
  durationSec: Number,
  startedAt: Number (timestamp)
}
```

### Command Log
```javascript
{
  streamId: String,
  userId: String,
  commandType: String,
  timestamp: ISO timestamp
}
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### WebSocket Connection Issues
- Check that server is running on port 3001
- Verify CORS settings in server/.env
- Check browser console for connection errors

### Commands Not Working
- Ensure you are the active controller (green status)
- Wait 1 second between commands (rate limit)
- Check console for rejection reasons

## 📝 Development Notes

### In-Memory Storage
Current implementation uses in-memory storage for:
- Streams
- Users and balances
- Queues
- Active controls

**Important**: Data will be lost on server restart. This is intentional for MVP. Production should use PostgreSQL + Redis.

### Mock Payment
Users automatically receive 1000 coins on first visit. This simulates a real payment system without actual financial integration.

### Video Placeholder
The video area is currently a placeholder. Architecture is ready for WebRTC integration via LiveKit or Agora.

## 🚀 Deployment

### Render (Recommended for Backend)

1. Create new Web Service on Render
2. Connect your repository
3. Set build command: `cd server && npm install`
4. Set start command: `cd server && npm start`
5. Add environment variables:
   - `NODE_ENV=production`
   - `CLIENT_URL=https://your-frontend-url.com`

### Vercel (Recommended for Frontend)

1. Install Vercel CLI: `npm i -g vercel`
2. From client directory: `vercel`
3. Set environment variables:
   - `REACT_APP_API_URL=https://your-backend-url.com`
   - `REACT_APP_WS_URL=https://your-backend-url.com`

### Fly.io (Alternative - Full Stack)

1. Install Fly CLI
2. Create `fly.toml` configuration
3. Deploy: `fly deploy`

## 📄 License

MIT

## 👥 Contributing

This is an MVP project. Future contributions welcome for:
- WebRTC video integration
- Real payment integration
- Database migration
- Mobile app development
- Additional control modes

## 📞 Support

For issues or questions, please check:
1. This README
2. Console logs (browser and server)
3. Network tab for API/WebSocket issues

---

**Built with ❤️ for interactive live streaming experiences**
