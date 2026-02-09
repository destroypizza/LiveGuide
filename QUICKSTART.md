# 🚀 Quick Start Guide

Get the Interactive Live Stream Platform running in 3 simple steps!

## Prerequisites

- Node.js 16+ installed
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation & Setup

### Step 1: Install Dependencies

```bash
# From the project root
cd /workspace

# Install all dependencies
npm run install-all

# Or install manually:
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Step 2: Start the Application

**Option A: Start Everything Together (Recommended)**

```bash
npm run dev
```

This will start both the backend server and frontend client.

**Option B: Start Separately**

Terminal 1 - Start Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Start Frontend:
```bash
cd client
npm start
```

### Step 3: Open and Test

1. Open your browser to **http://localhost:3000**
2. Click **"Create Stream"** to become a broadcaster
3. Copy the viewer link
4. Open the viewer link in a new incognito/private window
5. Buy a control slot (you start with 1000 coins)
6. Send commands when you become the active controller!

## 🎯 Testing the Complete Flow

### As Broadcaster:

1. Navigate to http://localhost:3000
2. Click **"Create Stream"** button
3. You'll be redirected to `/b/{streamId}`
4. Click **"Copy Viewer Link"** button
5. Share the link or open it yourself in another browser/window
6. Wait for viewers to join and purchase control
7. When a viewer sends commands, you'll see them as large overlays

### As Viewer:

1. Open the viewer link you received (format: `http://localhost:3000/v/{streamId}`)
2. Check your balance (starts at 1000 coins)
3. Click one of the pricing buttons:
   - **10 seconds** = 10 coins
   - **60 seconds** = 100 coins
   - **2 minutes** = 180 coins
   - **5 minutes** = 400 coins
4. Wait in queue (you'll see your position)
5. When it's your turn, the control panel becomes active
6. Click command buttons to send commands to the broadcaster
7. Watch your remaining time count down

## 🧪 Running Tests

### API Tests:

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Create a stream
curl -X POST http://localhost:3001/api/streams \
  -H "Content-Type: application/json" \
  -d '{"broadcasterId":"test_user_123"}'

# List active streams
curl http://localhost:3001/api/streams

# Check user balance
curl http://localhost:3001/api/users/test_user_123/balance
```

### WebSocket Integration Tests:

```bash
cd server
node test-websocket.js
```

This will test:
- ✅ WebSocket connections
- ✅ Joining streams
- ✅ Buying control slots
- ✅ Queue management
- ✅ Command sending
- ✅ Rate limiting
- ✅ Control switching

## 📱 Multi-User Testing

To test the full experience with multiple users:

1. **Broadcaster Window**: Regular browser window
   - Go to http://localhost:3000
   - Create stream
   - Copy viewer link

2. **Viewer 1**: Incognito/Private window
   - Paste viewer link
   - Buy 10-second slot
   - Watch yourself become active controller
   - Send commands

3. **Viewer 2**: Different browser (e.g., if using Chrome, open Firefox)
   - Paste viewer link
   - Buy 60-second slot
   - See yourself in position #2
   - Wait for Viewer 1's time to expire
   - Then you become active controller

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3001 (server)
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000 (client)
lsof -ti:3000 | xargs kill -9
```

### Dependencies Not Installing

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules server/node_modules client/node_modules
npm run install-all
```

### WebSocket Not Connecting

1. Make sure the server is running on port 3001
2. Check browser console for errors
3. Verify no firewall/proxy blocking WebSocket connections
4. Try refreshing the page

### Commands Not Working

- ✅ Ensure you're the active controller (status shows "You are in control!")
- ✅ Wait 1 second between commands (rate limit)
- ✅ Check browser console for rejection messages

## 🎮 Available Commands

When you're the active controller, you can send these commands:

| Command | Icon | Description |
|---------|------|-------------|
| LEFT | ⬅️ | Move left |
| RIGHT | ➡️ | Move right |
| FORWARD | ⬆️ | Move forward |
| BACKWARD | ⬇️ | Move backward |
| STOP | ✋ | Stop movement |
| TURN_AROUND | 🔄 | Turn 180 degrees |
| ZOOM_IN | 🔍+ | Zoom camera in |
| ZOOM_OUT | 🔍- | Zoom camera out |
| WAVE | 👋 | Wave at camera |
| JUMP | ⬆️ | Jump |

## 📊 Current Limitations (MVP)

- **Video**: Placeholder only (WebRTC integration coming in Phase 2)
- **Storage**: In-memory (data lost on server restart)
- **Payment**: Mock system (real payment integration coming in Phase 3)
- **Persistence**: No database yet (coming in Phase 4)

## 🚀 Next Steps

Once you've verified everything works:

1. Read the full [README.md](README.md) for architecture details
2. Explore the code structure
3. Consider deploying to Render/Vercel (see README deployment section)
4. Start implementing Phase 2 features (WebRTC video)

## 💡 Tips

- **Best Experience**: Use Chrome or Firefox for best WebSocket performance
- **Mobile Testing**: The UI is responsive and works on mobile browsers
- **Multiple Streams**: You can create multiple streams simultaneously
- **Queue Testing**: Have 3+ viewers buy slots to see the queue system in action
- **Timer Accuracy**: Timer is managed server-side, so it's accurate even if client tabs are backgrounded

## 📞 Need Help?

- Check the [README.md](README.md) for detailed documentation
- Review server logs in the terminal
- Check browser console for client-side errors
- Look at Network tab for WebSocket messages

---

**Enjoy building your interactive streaming experience! 🎉**
