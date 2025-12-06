# Twitch Chat Overlay v2.0

A modern, refactored browser-based Twitch chat overlay system designed for OBS Studio and other streaming software. This version features improved architecture, better error handling, and enhanced developer experience.

## ✨ Features

- **Real-time Chat Display** - Twitch chat with badges, emotes, and animations
- **Welcome Alerts** - Customizable alerts for new and returning viewers
- **Animated Notifications** - Signature-style animated notifications for subs, raids, and more
- **Active Chatters** - Visual display of recently active chatters
- **Voice Recognition** - Speech-based command triggers
- **OAuth Authentication** - Secure Twitch authentication flow
- **OBS Integration** - Browser source ready with transparent backgrounds

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- A Twitch account
- Twitch Developer Application ([Create one here](https://dev.twitch.tv/console/apps))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Overlay-1

# Install dependencies
npm install

# Set up configuration
cp config/config.template.js config/config.js
# Edit config/config.js with your Twitch credentials

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 📚 Documentation

- **[REFACTORING.md](./REFACTORING.md)** - Detailed architecture documentation
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - How to migrate from v1.0
- **[auth/README.md](./auth/README.md)** - OAuth setup instructions

## 🏗️ Architecture

### New Structure (v2.0)

```
Overlay-1/
├── services/           # Core services
│   ├── TwitchService.js       # Main Twitch client
│   ├── TwitchAPI.js           # API client
│   └── StorageService.js      # LocalStorage wrapper
├── handlers/           # Event handlers
│   └── MessageHandler.js      # Message coordination
├── commands/           # Command system
│   ├── CommandRegistry.js     # Command management
│   └── handlers/              # Command handlers
│       ├── ChatterTracker.js
│       ├── TemperatureConverter.js
│       └── RefreshCommand.js
├── components/         # UI components
│   ├── ChatMessage.js         # Chat message renderer
│   └── Alert.js               # Alert component
├── utils/              # Utilities
│   └── ErrorHandler.js        # Error handling
├── styles/             # Organized CSS
│   ├── base/
│   ├── components/
│   └── main.css
└── types/              # Type definitions
    └── index.js               # JSDoc types
```

## 🎯 Key Improvements

### 1. Centralized Services
No more scattered TMI client initialization. One service handles everything:

```javascript
import { TwitchService } from './services/TwitchService.js';

const twitch = new TwitchService();
await twitch.initialize();
// Ready to use!
```

### 2. Powerful Command System
Register commands with permissions and cooldowns:

```javascript
import { CommandRegistry } from './commands/CommandRegistry.js';

const commands = new CommandRegistry(twitch);

commands.register('!hello', async (context) => {
  await context.reply(`Hello ${context.username}!`);
}, {
  cooldown: 5,
  modOnly: false
});
```

### 3. Component-Based UI
Reusable components for consistent rendering:

```javascript
import { ChatMessage } from './components/ChatMessage.js';

const message = new ChatMessage(tags, messageText, {
  badgeUrlResolver: (type, version) => twitch.getBadgeUrl(type, version)
});

container.appendChild(message.render());
```

### 4. Robust Error Handling
Centralized error management with context:

```javascript
import { ErrorHandler } from './utils/ErrorHandler.js';

try {
  // Your code
} catch (error) {
  ErrorHandler.handle(error, 'context', { metadata });
}
```

## 🔧 Development

### Available Commands

```bash
npm run dev          # Start development server with HMR
npm run build        # Build for production
npm run preview      # Preview production build
npm run css:watch    # Watch Tailwind CSS changes
npm run css:build    # Build minified CSS
```

### Using the Refactored Code

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed examples or check out:
- `script-refactored.js` - Example refactored implementation
- Individual service files for usage patterns

## 🎨 Customization

### Chat Display
Modify `styles/components/chat-message.css` for appearance changes.

### Alerts
Customize `components/Alert.js` for different alert styles.

### Commands
Add new commands in your initialization file:

```javascript
commands.register('!mycommand', async (context) => {
  // Your command logic
}, {
  modOnly: false,
  cooldown: 10,
  description: 'My custom command'
});
```

## 📡 OBS Integration

### Method 1: Authenticate First (Recommended)

1. Open overlay in browser
2. Click "Connect with Twitch"
3. Click "Copy OBS URL"
4. Add Browser Source in OBS with copied URL

### Method 2: Direct URL

```
http://localhost:3000/Chat/chat.html?token=YOUR_TOKEN&username=YOUR_USERNAME&channel=CHANNEL_NAME
```

### Browser Source Settings

- **Width:** 1920 (or your canvas width)
- **Height:** 1080 (or your canvas height)
- **FPS:** 30
- **Custom CSS:** (leave empty)
- **Shutdown source when not visible:** Unchecked

## 🔒 Security

- Config files with credentials are gitignored
- OAuth tokens never committed
- Use `config/config.template.js` for sharing
- Environment variables supported

## 🐛 Troubleshooting

### "Module not found" errors
Ensure all imports include `.js` extension:
```javascript
import { TwitchService } from './services/TwitchService.js'; // ✓
import { TwitchService } from './services/TwitchService';    // ✗
```

### Authentication fails
Check your `config/config.js`:
- OAuth token should start with `oauth:`
- Client ID should be from your Twitch app
- Channel name should be lowercase

### Badges not loading
Make sure to fetch badges before use:
```javascript
await twitch.fetchBadges();
```

### View error logs
```javascript
import { ErrorHandler } from './utils/ErrorHandler.js';
console.log(ErrorHandler.getErrors());
```

## 📝 License

MIT License - Feel free to use and modify for your own streams!

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📧 Support

- Check documentation files for detailed information
- Review error messages in browser console
- Open an issue for bugs or feature requests

## 🙏 Acknowledgments

- [TMI.js](https://github.com/tmijs/tmi.js) - Twitch chat client
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Vite](https://vitejs.dev/) - Build tool
- [Canvas Confetti](https://github.com/catdad/canvas-confetti) - Confetti effects

---

**Version 2.0** - Complete refactoring with modern architecture and improved developer experience.

