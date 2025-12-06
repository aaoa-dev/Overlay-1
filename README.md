# Twitch Stream Overlay System

A comprehensive browser-based Twitch overlay system designed for use with OBS Studio and other streaming software.

## 📦 Available Overlays

### **🔐 Authentication**
- **Simple Auth** 🆕 (`/auth/simple-auth.html`) - Easy token-based auth (recommended for hosted deployments)
- **OAuth Flow** (`/auth/oauth.html`) - Traditional OAuth (for local development)

### **Chat Overlays**
- **Horizontal Chat** (`/Chat/chat.html`) - Traditional horizontal chat display
- **Vertical Chat** 🧾 (`/Chat/vertical-chat.html`) - Thermal printer receipt style

### **Counter Displays**
- **Follower Counter** (`/followers.html`) - Real-time follower count display
- **Subscriber Counter** (`/subscribers.html`) - Real-time subscriber count display

### **Alerts System**
- **Welcome Alerts** (`/alerts-refactored.html`) - User visit tracking & milestone celebrations
- Tracks first-time chatters, returning users, and milestones (10, 50, 100+ visits)
- Follower & subscriber count tracking with admin reset command

### **Notifications**
- **Custom Notifications** (`/Notification/notifications.html`) - Signature-style text animations
- **Twitch Notifications** (`/Notification/twitch-notifications.html`) - SVG letter animations

### **Voice Recognition**
- **Voice Commands** (`/Voice/index.html`) - Web Speech API integration for voice monitoring

## ✨ Features

- Real-time Twitch chat messages with badges and emotes
- Animated message display with synchronized slide-in animations
- Command filtering (messages starting with ! or / are hidden)
- Authentication via Twitch OAuth
- Easy OBS Browser Source integration
- Stream statistics tracking (followers, subscribers, visit counts)
- Thermal printer receipt aesthetic option
- Centralized services architecture for reliability

## Setup Instructions

### Regular Browser Usage

1. Open the chat overlay in your browser
2. Click "Connect with Twitch" to authenticate
3. Once authenticated, you can view chat messages in real-time

### OBS Browser Source Setup

1. **Regular Authentication Method (Recommended)**:
   - First authenticate in a regular browser window
   - Click the "Copy OBS URL" button
   - In OBS, add a Browser Source and paste the copied URL

2. **Manual URL Parameter Method**:
   - Get your Twitch OAuth token from [Twitch Token Generator](https://twitchapps.com/tmi/)
   - Create a URL with the following format:
     ```
     https://your-site.com/Chat/chat.html?token=YOUR_TOKEN&username=YOUR_USERNAME&channel=CHANNEL_TO_WATCH
     ```
   - Add this URL to your OBS Browser Source

## Browser Source Settings in OBS

For best results, use these settings in your OBS Browser Source:

- Width: 800 (or match your screen width)
- Height: 600 (adjust based on how much chat history you want to see)
- Custom CSS: (leave empty to use overlay's built-in styles)
- Shutdown source when not visible: Unchecked
- Refresh browser when scene becomes active: Optional

## Troubleshooting

- **No messages appear**: Verify your authentication is working correctly
- **Missing badges**: Ensure your OBS browser cache is cleared
- **Animation issues**: Try refreshing the browser source

## 🎨 Quick Start

### **Development Server**
```bash
npm run dev
```

Access overlays at:
- **Simple Auth:** http://localhost:3000/auth/simple-auth.html ⭐ Start here!
- Horizontal Chat: http://localhost:3000/Chat/chat.html
- **Thermal Receipt Chat:** http://localhost:3000/Chat/vertical-chat.html
- Follower Counter: http://localhost:3000/followers.html
- Subscriber Counter: http://localhost:3000/subscribers.html
- Alerts System: http://localhost:3000/alerts-refactored.html

### **Production Build**
```bash
npm run build
```

## 📚 Documentation

Detailed documentation for each overlay:
- **Deployment Guide**: `/DEPLOYMENT_GUIDE.md` ⭐ Deploy to Cloudflare/GitHub Pages
- **Thermal Chat**: `/Chat/THERMAL_CHAT.md`
- **Counter Displays**: `/COUNTER_DISPLAYS.md`
- **Alerts System**: `/ALERTS_README.md`
- **Refactoring Guide**: `/REFACTORING_PLAN.md`
- **Migration Guide**: `/MIGRATION_GUIDE.md`

## 🚀 Deployment

Want to host your overlays online? Check out the **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**!

Works with:
- ✅ Cloudflare Pages (recommended)
- ✅ GitHub Pages
- ✅ Netlify
- ✅ Vercel
- ✅ Any static hosting

## 🛠️ Development

This project uses:
- **TMI.js** for Twitch chat connectivity
- **Vite** for fast development and bundling
- **Modern JavaScript** (ES6+ modules)
- **Tailwind CSS** for styling components
- **Service-based architecture** for maintainability
- **Component-based UI** for reusability

## License

MIT License - Feel free to use and modify for your own streams! 