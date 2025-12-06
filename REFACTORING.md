# Refactoring Documentation

This document explains the major refactoring changes made to improve code quality, maintainability, and developer experience.

## 🔒 Security Improvements

### Environment Variables
- Created `.gitignore` to prevent committing sensitive data
- Config file with credentials (`config/config.js`) is now gitignored
- Use `config/config.template.js` as a template
- For production, use environment variables

### Setup Instructions
1. Copy `config/config.template.js` to `config/config.js`
2. Fill in your actual credentials
3. Never commit `config/config.js` to version control

## 🏗️ New Architecture

### Services Layer

#### `services/StorageService.js`
Centralized localStorage management with error handling:
```javascript
import { StorageService } from './services/StorageService.js';

// Get/set values
const token = StorageService.get(StorageService.KEYS.OAUTH_TOKEN);
StorageService.set(StorageService.KEYS.USERNAME, 'myusername');

// Auth helpers
const { token, username, channelId } = StorageService.getAuthData();
StorageService.setAuthData(token, username, channelId);
StorageService.clearAuthData();
```

#### `services/TwitchAPI.js`
Handles all Twitch API requests:
```javascript
import { TwitchAPI } from './services/TwitchAPI.js';

const api = new TwitchAPI(clientId, accessToken);

// Fetch data
const user = await api.fetchUserInfo();
const globalBadges = await api.fetchGlobalBadges();
const channelBadges = await api.fetchChannelBadges(channelId);

// Get badge URLs
const badgeUrl = api.getBadgeUrl('subscriber', '12', channelId);
```

#### `services/TwitchService.js`
**Main service** - Centralizes client management and authentication:
```javascript
import { TwitchService } from './services/TwitchService.js';

const twitch = new TwitchService();
await twitch.initialize();

// Use the client
twitch.on('message', (channel, tags, message, self) => {
  // Handle message
});

await twitch.say('Hello chat!');

// Get badge URLs
const badgeUrl = twitch.getBadgeUrl('subscriber', '12');

// Generate OBS URL
const obsUrl = twitch.generateOBSUrl('/Chat/chat.html');
```

**Authentication Priority**: URL params > localStorage > config file

### Utilities

#### `utils/ErrorHandler.js`
Centralized error handling and logging:
```javascript
import { ErrorHandler } from './utils/ErrorHandler.js';

try {
  // Code that might fail
} catch (error) {
  ErrorHandler.handle(error, 'context_name', { metadata });
}

// Logging
ErrorHandler.debug('Debug message', data);
ErrorHandler.info('Info message', data);
ErrorHandler.warn('Warning message', data);
```

### Handlers

#### `handlers/MessageHandler.js`
Coordinates multiple message handlers:
```javascript
import { MessageHandler } from './handlers/MessageHandler.js';

const messageHandler = new MessageHandler(twitchService);

// Register handlers
messageHandler.registerHandler('chatters', (channel, tags, message) => {
  // Handle message
});

// Add filters
messageHandler.registerFilter(MessageHandler.filters.noCommands);

messageHandler.start();
```

### Commands

#### `commands/CommandRegistry.js`
Manages chat commands with permissions and cooldowns:
```javascript
import { CommandRegistry } from './commands/CommandRegistry.js';

const commands = new CommandRegistry(twitchService);

// Register command
commands.register('!hello', async (context) => {
  await context.reply(`Hello ${context.username}!`);
}, {
  cooldown: 5, // seconds
  modOnly: false,
  description: 'Say hello'
});

// Execute commands
messageHandler.registerHandler('commands', (channel, tags, message) => {
  commands.execute(message, tags, channel);
});
```

#### Command Handlers
- `commands/handlers/ChatterTracker.js` - Tracks active chatters
- `commands/handlers/TemperatureConverter.js` - Converts temperatures
- `commands/handlers/RefreshCommand.js` - Refresh overlay command

### Components

#### `components/ChatMessage.js`
Renders chat messages:
```javascript
import { ChatMessage } from './components/ChatMessage.js';

const chatMessage = new ChatMessage(tags, message, {
  showUserInfo: true,
  badgeUrlResolver: (type, version) => twitch.getBadgeUrl(type, version)
});

const element = chatMessage.render();
container.appendChild(element);
```

#### `components/Alert.js`
Displays alerts with queue management:
```javascript
import { Alert, AlertQueue } from './components/Alert.js';

const alertQueue = new AlertQueue();
alertQueue.setContainer(document.getElementById('alertContainer'));

const alert = Alert.create(username, color, visitCount);
alertQueue.add(alert, (alert) => {
  // Optional: trigger confetti for milestones
});
```

## 📦 Build System

### Vite Configuration
Added Vite for modern development experience:

```bash
# Development
npm run dev          # Start dev server with HMR

# Build
npm run build        # Build for production
npm run preview      # Preview production build

# CSS
npm run css:watch    # Watch Tailwind CSS
npm run css:build    # Build minified CSS
```

### Benefits
- Hot Module Replacement (HMR)
- Fast builds with esbuild
- Automatic code splitting
- Environment variable support
- Modern JavaScript features

## 🔄 Migration Guide

### Updating Existing Files

#### Before (Old Way):
```javascript
// Scattered throughout multiple files
const client = new tmi.Client({
  identity: {
    username: config.settings.TWITCH.USERNAME,
    password: config.settings.TWITCH.OAUTH_TOKEN
  },
  channels: [config.settings.TWITCH.CHANNEL_NAME]
});
client.connect();
```

#### After (New Way):
```javascript
import { TwitchService } from './services/TwitchService.js';

const twitch = new TwitchService();
await twitch.initialize();
// Client is ready, authentication is handled automatically
```

### Example: Refactored Chat Overlay

```javascript
import { TwitchService } from '../services/TwitchService.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { ChatMessage } from '../components/ChatMessage.js';

// Initialize service
const twitch = new TwitchService();
await twitch.initialize();

// Fetch badges
await twitch.fetchBadges();

// Set up message handler
const messageHandler = new MessageHandler(twitch);

// Register chat message display
messageHandler.registerHandler('display', (channel, tags, message) => {
  const chatMessage = new ChatMessage(tags, message, {
    badgeUrlResolver: (type, version) => twitch.getBadgeUrl(type, version)
  });
  
  if (!chatMessage.shouldFilter()) {
    const element = chatMessage.render();
    chatContainer.appendChild(element);
  }
});

// Add command filter
messageHandler.registerFilter(MessageHandler.filters.noCommands);

// Start
messageHandler.start();
```

## 📝 Key Improvements

### 1. **Single Source of Truth**
- Authentication logic in one place
- No more duplicate TMI client initialization
- Consistent badge fetching across all pages

### 2. **Error Handling**
- Centralized error logging
- User-friendly error messages
- Error tracking integration ready (Sentry)

### 3. **Type Safety**
- JSDoc comments for IntelliSense
- Clear interfaces and contracts
- Better IDE autocomplete

### 4. **Testability**
- Separated concerns
- Dependency injection
- Pure functions where possible

### 5. **Performance**
- Badge caching
- Optimized builds
- Code splitting

### 6. **Developer Experience**
- HMR for instant feedback
- Better error messages
- Consistent patterns

## 🚀 Next Steps

### Recommended Development Flow

1. **Start Development Server**
   ```bash
   npm install  # Install dependencies
   npm run dev  # Start Vite dev server
   ```

2. **Configure Credentials**
   - Copy `config/config.template.js` to `config/config.js`
   - Add your Twitch credentials

3. **Test in Browser**
   - Open `http://localhost:3000`
   - Hot reload will update as you code

4. **Build for Production**
   ```bash
   npm run build  # Creates optimized dist/ folder
   ```

### OBS Integration

For OBS, you can still use the authentication URL method:
```
http://localhost:3000/Chat/chat.html?token=YOUR_TOKEN&username=YOUR_USERNAME
```

Or authenticate once in browser and copy the URL.

## 📚 Additional Resources

- [Twitch API Documentation](https://dev.twitch.tv/docs/api/)
- [TMI.js Documentation](https://github.com/tmijs/tmi.js)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## ⚠️ Breaking Changes

1. **Config file is now gitignored** - Use template instead
2. **Module imports required** - All imports must use `.js` extension
3. **Type: "module" in package.json** - CommonJS won't work
4. **New file structure** - Services, handlers, components separated

## 🐛 Troubleshooting

### "Cannot find module" errors
- Make sure to use `.js` extension in imports
- Check file paths are correct

### Authentication not working
- Verify `config/config.js` exists and has credentials
- Check browser console for errors
- Try clearing localStorage

### Vite not starting
- Run `npm install` to install dependencies
- Check port 3000 is not in use
- Look for errors in terminal

### OBS not showing overlay
- Ensure transparent background is set
- Check browser source URL is correct
- Try refreshing the browser source

