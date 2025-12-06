# Quick Start Guide

Get up and running with the refactored codebase in 5 minutes.

## Step 1: Install Dependencies (1 minute)

```bash
npm install
```

## Step 2: Configure Credentials (2 minutes)

```bash
# Copy the template
cp config/config.template.js config/config.js
```

Edit `config/config.js` with your credentials:

```javascript
export const config = {
    settings: {
        TWITCH: {
            USERNAME: 'your_twitch_username',
            OAUTH_TOKEN: 'oauth:your_token_here',  // Get from https://twitchapps.com/tmi/
            CHANNEL_NAME: 'channel_to_join',
            CHANNEL_ID: 'your_channel_id',         // Get from Twitch API
            CLIENT_ID: 'your_client_id',           // From https://dev.twitch.tv/console/apps
            // ... rest stays default
        }
    }
};
```

## Step 3: Start Development Server (30 seconds)

```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the chatters display!

## Step 4: Try the Refactored Code (1 minute)

Update `index.html` to use the new refactored script:

```html
<!-- Old -->
<script type="module" src="script.js" defer></script>

<!-- New -->
<script type="module" src="script-refactored.js" defer></script>
```

Refresh the page - it now uses the new services!

## What's Different?

### Old Way:
```javascript
// Scattered throughout code
const client = new tmi.Client({...});
client.connect();

// Manual badge fetching
fetch('https://api.twitch.tv/helix/chat/badges/global', {...})

// Manual localStorage
localStorage.setItem('key', value);
```

### New Way:
```javascript
import { TwitchService } from './services/TwitchService.js';
import { StorageService } from './services/StorageService.js';

// One service does it all
const twitch = new TwitchService();
await twitch.initialize();

// Badges cached automatically
await twitch.fetchBadges();
const badgeUrl = twitch.getBadgeUrl('subscriber', '12');

// Clean storage API
StorageService.set(StorageService.KEYS.OAUTH_TOKEN, token);
```

## Common Tasks

### Display Chat Messages
```javascript
import { TwitchService } from './services/TwitchService.js';
import { MessageHandler } from './handlers/MessageHandler.js';
import { ChatMessage } from './components/ChatMessage.js';

const twitch = new TwitchService();
await twitch.initialize();
await twitch.fetchBadges();

const messageHandler = new MessageHandler(twitch);
messageHandler.registerFilter(MessageHandler.filters.noCommands);

messageHandler.registerHandler('display', (channel, tags, message) => {
  const chatMessage = new ChatMessage(tags, message, {
    badgeUrlResolver: (type, version) => twitch.getBadgeUrl(type, version)
  });
  
  container.appendChild(chatMessage.render());
});

messageHandler.start();
```

### Add a Command
```javascript
import { CommandRegistry } from './commands/CommandRegistry.js';

const commands = new CommandRegistry(twitch);

commands.register('!hello', async (context) => {
  await context.reply(`Hello ${context.username}!`);
}, {
  cooldown: 5,      // 5 second cooldown
  modOnly: false,   // Anyone can use it
  description: 'Say hello'
});

// Hook it up to message handler
messageHandler.registerHandler('commands', (channel, tags, message) => {
  if (message.startsWith('!')) {
    commands.execute(message, tags, channel);
  }
});
```

### Track Chatters
```javascript
import { ChatterTracker } from './commands/handlers/ChatterTracker.js';

const tracker = new ChatterTracker({
  maxChatters: 8,
  timeoutMs: 60000  // 1 minute
});

tracker.setContainer(document.getElementById('chattersContainer'));

messageHandler.registerHandler('track', (channel, tags, message) => {
  tracker.track(tags);
});
```

## Testing in OBS

1. Authenticate in browser at `http://localhost:3000`
2. Click "Copy OBS URL" (if available)
3. In OBS: Add Browser Source → Paste URL
4. Set width/height to match canvas
5. Check "Shutdown source when not visible" = OFF

## Need More Help?

- **Architecture:** Read `REFACTORING.md`
- **Migration:** Read `MIGRATION_GUIDE.md`
- **Detailed Changes:** Read `REFACTORING_SUMMARY.md`
- **Full Example:** Check `script-refactored.js`

## Next Steps

1. ✅ Try the refactored code with `script-refactored.js`
2. ✅ Create your own features using the new services
3. ✅ Update other files (chat, alerts, etc.) to use new services
4. ✅ Build for production: `npm run build`

## Troubleshooting

### Cannot find module
Add `.js` extension to imports:
```javascript
import { TwitchService } from './services/TwitchService.js'; // ✓
```

### Authentication fails
Check `config/config.js`:
- OAuth token needs `oauth:` prefix
- Username should be lowercase
- Client ID from Twitch Developer Console

### Badges don't load
```javascript
await twitch.fetchBadges(); // Must fetch before using
```

## Support

Open an issue or check the documentation files for more help!

