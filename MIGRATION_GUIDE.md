# Migration Guide

This guide will help you update your existing files to use the new refactored architecture.

## Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Configuration

```bash
# Copy the template
cp config/config.template.js config/config.js

# Edit config/config.js with your credentials
```

### Step 3: Run Development Server

```bash
npm run dev
```

## File-by-File Migration

### Example: Migrating a Chat Display File

#### Before (Old `chat.js`):

```javascript
// Multiple imports, scattered logic
import { config } from '../config/config.js';

const client = new tmi.Client({
  options: { skipUpdatingEmotesets: true },
  identity: {
    username: config.settings.TWITCH.USERNAME,
    password: config.settings.TWITCH.OAUTH_TOKEN
  },
  channels: [config.settings.TWITCH.CHANNEL_NAME]
});

// Badge fetching scattered
fetch('https://api.twitch.tv/helix/chat/badges/global', {...})
  .then(...)
  .catch(...);

client.connect().catch(console.error);

client.on('message', (channel, tags, message, self) => {
  // Manual message handling
  if (self) return;
  if (message.startsWith('!') || message.startsWith('/')) return;
  
  // Display message manually
  const messageElement = document.createElement('div');
  // ... lots of DOM manipulation
});
```

#### After (New Pattern):

```javascript
import { TwitchService } from '../services/TwitchService.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { ChatMessage } from '../components/ChatMessage.js';

// Initialize service
const twitch = new TwitchService();
await twitch.initialize();

// Fetch badges automatically
await twitch.fetchBadges();

// Set up message handler
const messageHandler = new MessageHandler(twitch);

// Add filter
messageHandler.registerFilter(MessageHandler.filters.noCommands);

// Register display handler
messageHandler.registerHandler('display', (channel, tags, message) => {
  const chatMessage = new ChatMessage(tags, message, {
    badgeUrlResolver: (type, version) => twitch.getBadgeUrl(type, version)
  });
  
  const element = chatMessage.render();
  container.appendChild(element);
});

messageHandler.start();
```

## Common Migration Patterns

### Pattern 1: Replace TMI Client Initialization

**Old:**
```javascript
const client = new tmi.Client({...});
client.connect();
```

**New:**
```javascript
import { TwitchService } from './services/TwitchService.js';
const twitch = new TwitchService();
await twitch.initialize();
```

### Pattern 2: Replace Badge Fetching

**Old:**
```javascript
fetch('https://api.twitch.tv/helix/chat/badges/global', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Client-Id': clientId
  }
}).then(response => response.json())
  .then(data => {
    // Process badges
  });
```

**New:**
```javascript
await twitch.fetchBadges();
const badgeUrl = twitch.getBadgeUrl('subscriber', '12');
```

### Pattern 3: Replace localStorage Operations

**Old:**
```javascript
localStorage.setItem('twitch_oauth_token', token);
const token = localStorage.getItem('twitch_oauth_token');
localStorage.removeItem('twitch_oauth_token');
```

**New:**
```javascript
import { StorageService } from './services/StorageService.js';

StorageService.set(StorageService.KEYS.OAUTH_TOKEN, token);
const token = StorageService.get(StorageService.KEYS.OAUTH_TOKEN);
StorageService.remove(StorageService.KEYS.OAUTH_TOKEN);

// Or use auth helpers
StorageService.setAuthData(token, username, channelId);
const { token, username, channelId } = StorageService.getAuthData();
StorageService.clearAuthData();
```

### Pattern 4: Replace Error Handling

**Old:**
```javascript
try {
  // code
} catch (error) {
  console.error('Error:', error);
}
```

**New:**
```javascript
import { ErrorHandler } from './utils/ErrorHandler.js';

try {
  // code
} catch (error) {
  ErrorHandler.handle(error, 'context_name', { metadata });
}
```

### Pattern 5: Replace Message Display

**Old:**
```javascript
client.on('message', (channel, tags, message, self) => {
  if (self) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message';
  
  // Add badges
  if (tags.badges) {
    Object.entries(tags.badges).forEach(([type, version]) => {
      const badge = document.createElement('img');
      badge.src = `https://static-cdn.jtvnw.net/badges/v2/${type}/${version}/3`;
      messageElement.appendChild(badge);
    });
  }
  
  // Add username
  const username = document.createElement('span');
  username.textContent = tags['display-name'];
  username.style.color = tags.color;
  messageElement.appendChild(username);
  
  // Add message text
  const text = document.createElement('span');
  text.textContent = message;
  messageElement.appendChild(text);
  
  container.appendChild(messageElement);
});
```

**New:**
```javascript
import { ChatMessage } from './components/ChatMessage.js';

messageHandler.registerHandler('display', (channel, tags, message) => {
  const chatMessage = new ChatMessage(tags, message, {
    badgeUrlResolver: (type, version) => twitch.getBadgeUrl(type, version)
  });
  
  if (!chatMessage.shouldFilter()) {
    container.appendChild(chatMessage.render());
  }
});
```

### Pattern 6: Replace Command Handling

**Old:**
```javascript
client.on('message', (channel, tags, message, self) => {
  if (message === '!hello') {
    if (tags.mod || tags.badges?.broadcaster) {
      client.say(channel, 'Hello!');
    }
  }
});
```

**New:**
```javascript
import { CommandRegistry } from './commands/CommandRegistry.js';

const commands = new CommandRegistry(twitch);

commands.register('!hello', async (context) => {
  await context.reply('Hello!');
}, {
  modOnly: true,
  cooldown: 5,
  description: 'Say hello'
});

messageHandler.registerHandler('commands', (channel, tags, message) => {
  if (message.startsWith('!')) {
    commands.execute(message, tags, channel);
  }
});
```

### Pattern 7: Replace Chatter Tracking

**Old:**
```javascript
let chatters = [];

client.on('message', (channel, tags, message, self) => {
  const existing = chatters.find(c => c.user === tags.username);
  if (existing) {
    existing.timestamp = Date.now();
  } else {
    chatters.push({
      user: tags.username,
      name: tags['display-name'],
      timestamp: Date.now(),
      color: tags.color
    });
  }
  
  // Update UI manually
  updateUI();
});
```

**New:**
```javascript
import { ChatterTracker } from './commands/handlers/ChatterTracker.js';

const chatterTracker = new ChatterTracker({
  maxChatters: 8,
  timeoutMs: 60000
});

chatterTracker.setContainer(document.getElementById('chattersContainer'));

messageHandler.registerHandler('track', (channel, tags, message) => {
  chatterTracker.track(tags);
});
```

## Updating HTML Files

### Before:
```html
<script src="../config/config.js" type="module"></script>
<script src="../tmi.js"></script>
<script type="module" src="chat.js"></script>
```

### After (Development):
```html
<script type="module" src="chat-refactored.js"></script>
```

### After (Production with Vite):
```html
<!-- Vite will bundle everything automatically -->
<script type="module" src="/src/chat.js"></script>
```

## Testing Your Migration

### 1. Check Console for Errors
```javascript
// Set log level to debug
ErrorHandler.logLevel = 'debug';
```

### 2. Verify Authentication
```javascript
const twitch = new TwitchService();
await twitch.initialize();
console.log('Authenticated:', twitch.isAuthenticated());
console.log('Channel:', twitch.getChannel());
```

### 3. Test Badge Loading
```javascript
await twitch.fetchBadges();
const badgeUrl = twitch.getBadgeUrl('subscriber', '12');
console.log('Badge URL:', badgeUrl);
```

### 4. Test Message Handling
```javascript
// Enable debug logging
ErrorHandler.logLevel = 'debug';

// Messages will be logged as they're processed
```

## Common Issues & Solutions

### Issue: Module not found

**Problem:** `Cannot find module './services/TwitchService.js'`

**Solution:** Make sure to include `.js` extension in all imports:
```javascript
// Wrong
import { TwitchService } from './services/TwitchService';

// Correct
import { TwitchService } from './services/TwitchService.js';
```

### Issue: TypeError: Cannot read property of undefined

**Problem:** Service not initialized before use

**Solution:** Ensure you await initialization:
```javascript
const twitch = new TwitchService();
await twitch.initialize(); // Don't forget await!
```

### Issue: Authentication fails

**Problem:** Invalid or missing credentials

**Solution:** Check your `config/config.js`:
```javascript
// Make sure OAuth token has 'oauth:' prefix
OAUTH_TOKEN: 'oauth:your_token_here',

// Not just:
OAUTH_TOKEN: 'your_token_here',
```

### Issue: Badges not loading

**Problem:** Badges don't display or return 404

**Solution:** Ensure badges are fetched before use:
```javascript
await twitch.fetchBadges(); // Fetch first

// Then use
const badgeUrl = twitch.getBadgeUrl('subscriber', '12');
```

## Rollback Plan

If you need to rollback to the old code:

1. Keep your old files with `.old` extension:
   ```bash
   cp chat.js chat.js.refactored
   cp chat.js.old chat.js
   ```

2. Or use git to revert:
   ```bash
   git stash  # Stash new changes
   git checkout <old-commit>  # Go back to old version
   ```

## Need Help?

- Check `REFACTORING.md` for detailed documentation
- Look at `script-refactored.js` for a complete example
- Review error messages in browser console
- Use `ErrorHandler.getErrors()` to see recent errors

## Next Steps

After migration:
1. Test all functionality thoroughly
2. Remove old files once confident
3. Update OBS browser sources if needed
4. Consider adding more features using the new architecture

