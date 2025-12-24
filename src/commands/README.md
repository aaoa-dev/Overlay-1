# Command System Documentation

## Overview

The Overlay-1 project uses a **centralized command system** with cross-widget communication via `GlobalCommandBus`. This ensures commands work consistently across all overlays and widgets.

## Architecture

### GlobalCommandBus

The `GlobalCommandBus` provides:
- **Centralized command registration** with permissions and cooldowns
- **Cross-widget communication** via BroadcastChannel API
- **Pub/sub pattern** for widgets to react to commands
- **Automatic broadcasting** of commands to all open widgets/overlays

### How It Works

```
User types !reset in chat
         ↓
alerts.js receives message
         ↓
GlobalCommandBus executes !reset handler
         ↓
BroadcastChannel sends event to all widgets
         ↓
cursor-welcome.js, chatters.js, etc. all receive the event
         ↓
Each widget runs its own reset logic
```

## Usage

### 1. Registering Commands (Main Handler)

In your main overlay (e.g., `alerts.js`), register commands that should execute:

```javascript
import { GlobalCommandBus } from '../src/commands/GlobalCommandBus.js';

const commands = new GlobalCommandBus(twitchService);

// Register a command with broadcasting
commands.register('!reset', async (context) => {
    // Your main logic here
    alertsManager.reset();
    await context.reply('Reset complete!');
}, {
    modOnly: true,
    description: 'Reset all systems',
    broadcast: true // This will notify all other widgets
});

// Connect to message handler
messageHandler.registerHandler('commands', async (channel, tags, message) => {
    if (message.startsWith('!')) {
        await commands.execute(message, tags, channel);
    }
});
```

### 2. Subscribing to Commands (Other Widgets)

In other widgets/overlays, subscribe to command events:

```javascript
import { GlobalCommandBus } from '../src/commands/GlobalCommandBus.js';

const commandBus = new GlobalCommandBus(twitchService);

// Subscribe to !reset command
commandBus.subscribe('!reset', (context) => {
    // React to the command
    myWidget.reset();
    console.log(`Reset triggered by ${context.username}`);
});
```

### 3. Command Context

Every command handler receives a context object:

```javascript
{
    channel: string,          // Channel name
    tags: object,             // Full Twitch tags
    message: string,          // Full message
    trigger: string,          // Command trigger (e.g., '!reset')
    args: string[],           // Arguments after command
    username: string,         // Display name
    userId: string,           // Twitch user ID
    isMod: boolean,           // Is moderator
    isBroadcaster: boolean,   // Is broadcaster
    isSubscriber: boolean,    // Is subscriber
    twitchService: object,    // TwitchService instance
    reply: (msg) => Promise   // Send a chat reply
}
```

## Command Options

```javascript
commands.register(trigger, handler, {
    modOnly: false,           // Require moderator
    broadcasterOnly: false,   // Require broadcaster
    subscriberOnly: false,    // Require subscriber
    cooldown: 0,              // Cooldown in seconds
    description: '',          // Command description
    enabled: true,            // Enable/disable command
    broadcast: true           // Broadcast to other widgets
});
```

## Built-in Commands

### !reset
- **Permission:** Mod-only
- **Broadcasts:** Yes
- **Purpose:** Resets all user states and stream stats across all widgets
- **Listeners:** alerts.js, cursor-welcome.js, chatters.js

### !refresh
- **Permission:** Mod-only
- **Broadcasts:** Yes
- **Purpose:** Refreshes all overlay pages
- **Listeners:** chatters.js (and any widget that subscribes)

### !stats / !streamstats
- **Permission:** Public
- **Cooldown:** 30 seconds
- **Purpose:** Shows current stream statistics
- **Listeners:** alerts.js

### !welcome / !in / !checkin / !here
- **Permission:** Public
- **Cooldown:** 24 hours per user
- **Purpose:** Manually trigger welcome message
- **Listeners:** alerts.js

## Cross-Widget Communication

The `BroadcastChannel` API allows widgets to communicate even if they're in different browser windows/tabs:

```javascript
// Widget A registers and executes
commands.register('!test', async (context) => {
    console.log('Widget A: Command executed');
}, { broadcast: true });

// Widget B subscribes
commands.subscribe('!test', (context) => {
    console.log('Widget B: Command received');
});

// When user types !test:
// → Widget A: Command executed
// → Widget B: Command received
```

## Migration from CommandRegistry

If you have existing code using `CommandRegistry`:

**Before:**
```javascript
import { CommandRegistry } from '../src/commands/CommandRegistry.js';
const commands = new CommandRegistry(twitchService);
```

**After:**
```javascript
import { GlobalCommandBus } from '../src/commands/GlobalCommandBus.js';
const commands = new GlobalCommandBus(twitchService);
```

The API is identical, but now commands broadcast automatically!

## Best Practices

1. **Main handler in one place:** Register command execution in your primary overlay (e.g., `alerts.js`)
2. **Subscribe everywhere else:** Other widgets should subscribe to command events
3. **Use broadcast: true** for commands that affect multiple systems
4. **Use broadcast: false** for widget-specific commands
5. **Always check permissions** in the main handler
6. **Log command execution** for debugging

## Example: Adding a New Global Command

1. **Register in alerts.js:**
```javascript
commands.register('!pause', async (context) => {
    alertsManager.pause();
    await context.reply('Alerts paused!');
}, {
    modOnly: true,
    broadcast: true
});
```

2. **Subscribe in cursor-welcome.js:**
```javascript
commandBus.subscribe('!pause', (context) => {
    cursorManager.pause();
});
```

3. **Subscribe in chatters.js:**
```javascript
commandBus.subscribe('!pause', (context) => {
    chatterTracker.pause();
});
```

Now typing `!pause` in chat affects all three systems simultaneously!

## Debugging

Enable debug logging in ErrorHandler to see command execution:

```javascript
// In console
localStorage.setItem('debug', 'true');
```

You'll see:
- Command registration
- Command execution
- Permission checks
- Cooldown status
- Broadcast events

