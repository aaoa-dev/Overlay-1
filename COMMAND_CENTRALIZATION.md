# Command Centralization - Implementation Summary

## Problem Statement

Previously, each widget/overlay had its own isolated command system:
- `alerts/alerts.js` → CommandRegistry for !reset, !stats, !welcome
- `alerts/cursor-welcome.js` → Manual message handler for !reset
- `widgets/chatters.js` → CommandRegistry for !refresh, !check

**Issues:**
1. ❌ Duplicate command handling logic
2. ❌ Commands only worked in specific widgets
3. ❌ No coordination between systems (e.g., !reset in alerts didn't reset cursor-welcome)
4. ❌ Hard to maintain and extend

## Solution: GlobalCommandBus

Created a centralized command system with cross-widget communication using the **BroadcastChannel API**.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GlobalCommandBus                          │
│  - Command Registration                                      │
│  - Permission Checking                                       │
│  - Cooldown Management                                       │
│  - BroadcastChannel Communication                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ BroadcastChannel
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│  alerts.js   │      │ cursor-      │     │ chatters.js  │
│              │      │ welcome.js   │     │              │
│ Registers    │      │              │     │              │
│ commands     │      │ Subscribes   │     │ Subscribes   │
│              │      │ to commands  │     │ to commands  │
└──────────────┘      └──────────────┘     └──────────────┘
```

## Changes Made

### 1. Created GlobalCommandBus (`src/commands/GlobalCommandBus.js`)

**Features:**
- Command registration with permissions and cooldowns
- BroadcastChannel API for cross-widget/tab communication
- Pub/sub pattern for widgets to subscribe to command events
- Automatic broadcasting of commands to all listeners
- Full backward compatibility with CommandRegistry API

### 2. Updated alerts.js

**Before:**
```javascript
import { CommandRegistry } from '../src/commands/CommandRegistry.js';
const commands = new CommandRegistry(twitchService);

commands.register('!reset', async (context) => {
    alertsManager.reset();
    await context.reply('Reset complete!');
}, { modOnly: true });
```

**After:**
```javascript
import { GlobalCommandBus } from '../src/commands/GlobalCommandBus.js';
const commands = new GlobalCommandBus(twitchService);

commands.register('!reset', async (context) => {
    alertsManager.reset();
    streamStats.reset();
    await context.reply('Reset complete!');
}, { 
    modOnly: true,
    broadcast: true  // ← Notifies all widgets
});
```

### 3. Updated cursor-welcome.js

**Before:**
```javascript
// Manual message handler checking for !reset
messageHandler.registerHandler('cursor-welcome-reset', async (channel, tags, message) => {
    if (!message.toLowerCase().startsWith('!reset')) return;
    const isMod = tags.mod || tags.badges?.broadcaster === '1';
    if (!isMod) return;
    manager.reset();
});
```

**After:**
```javascript
import { GlobalCommandBus } from '../src/commands/GlobalCommandBus.js';
const commandBus = new GlobalCommandBus(twitchService);

// Subscribe to !reset broadcasts
commandBus.subscribe('!reset', (context) => {
    manager.reset();
    ErrorHandler.info('CursorWelcome: Reset triggered via command bus');
});
```

### 4. Updated chatters.js

**Before:**
```javascript
import { CommandRegistry } from '../src/commands/CommandRegistry.js';
const commands = new CommandRegistry(twitch);

commands.register('!refresh', async (context) => {
    window.location.reload();
}, { modOnly: true });
```

**After:**
```javascript
import { GlobalCommandBus } from '../src/commands/GlobalCommandBus.js';
const commands = new GlobalCommandBus(twitch);

commands.register('!refresh', async (context) => {
    window.location.reload();
}, { 
    modOnly: true,
    broadcast: true  // ← Refreshes all widgets
});

// Subscribe to !reset from other widgets
commands.subscribe('!reset', (context) => {
    chatterTracker.clear();
});
```

### 5. Created Documentation

- **`src/commands/README.md`** - Complete command system documentation
- **Updated `DEVELOPMENT.md`** - References new GlobalCommandBus
- **This file** - Implementation summary

## Benefits

### ✅ Centralized Command Logic
- Single source of truth for command registration
- Consistent permission checking
- Unified cooldown management

### ✅ Cross-Widget Communication
- Commands work across all widgets simultaneously
- BroadcastChannel API works even across browser tabs
- No need for manual message passing

### ✅ Better Maintainability
- Add a command once, works everywhere
- Easy to see all available commands
- Simple pub/sub pattern for new widgets

### ✅ Backward Compatible
- Same API as CommandRegistry
- Existing code works with minimal changes
- Can migrate gradually

## Command Flow Example

**User types `!reset` in chat:**

1. **alerts.js** receives the message
2. **GlobalCommandBus** checks permissions (mod-only ✓)
3. **GlobalCommandBus** executes main handler:
   - `alertsManager.reset()`
   - `streamStats.reset()`
   - Sends chat reply
4. **GlobalCommandBus** broadcasts event via BroadcastChannel
5. **cursor-welcome.js** receives broadcast → `manager.reset()`
6. **chatters.js** receives broadcast → `chatterTracker.clear()`

**Result:** All three systems reset simultaneously! 🎉

## Available Commands

| Command | Permission | Cooldown | Broadcasts | Listeners |
|---------|-----------|----------|------------|-----------|
| `!reset` | Mod | None | Yes | alerts, cursor-welcome, chatters |
| `!refresh` | Mod | None | Yes | chatters (+ any subscriber) |
| `!stats` | Public | 30s | No | alerts |
| `!welcome` | Public | 24h/user | No | alerts |

## Adding New Commands

### Step 1: Register in Main Handler (alerts.js)

```javascript
commands.register('!pause', async (context) => {
    alertsManager.pause();
    await context.reply('Alerts paused!');
}, {
    modOnly: true,
    broadcast: true
});
```

### Step 2: Subscribe in Other Widgets

```javascript
// cursor-welcome.js
commandBus.subscribe('!pause', (context) => {
    cursorManager.pause();
});

// chatters.js
commandBus.subscribe('!pause', (context) => {
    chatterTracker.pause();
});
```

### Step 3: Done!

Now `!pause` works across all systems automatically.

## Migration Guide

For existing widgets using `CommandRegistry`:

1. Change import:
   ```javascript
   // Old
   import { CommandRegistry } from '../src/commands/CommandRegistry.js';
   
   // New
   import { GlobalCommandBus } from '../src/commands/GlobalCommandBus.js';
   ```

2. Update instantiation:
   ```javascript
   // Old
   const commands = new CommandRegistry(twitchService);
   
   // New
   const commands = new GlobalCommandBus(twitchService);
   ```

3. Add `broadcast: true` to commands that should notify other widgets:
   ```javascript
   commands.register('!mycommand', handler, {
       modOnly: true,
       broadcast: true  // ← Add this
   });
   ```

4. Subscribe to commands from other widgets:
   ```javascript
   commands.subscribe('!reset', (context) => {
       // React to reset command
   });
   ```

## Technical Details

### BroadcastChannel API

- **Browser Support:** All modern browsers (Chrome 54+, Firefox 38+, Safari 15.4+)
- **Scope:** Same origin (protocol + domain + port)
- **Works across:** Tabs, windows, iframes, workers
- **Fallback:** Commands still work locally if BroadcastChannel unavailable

### Performance

- **Zero overhead** for widgets that don't subscribe
- **Async execution** prevents blocking
- **Efficient broadcasting** (native browser API)
- **Memory safe** (automatic cleanup on destroy)

## Testing

### Test Command Broadcasting

1. Open `alerts/alerts.html` in one tab
2. Open `alerts/cursor-welcome.html` in another tab
3. Type `!reset` in chat
4. Both tabs should reset simultaneously
5. Check console logs to verify

### Test Permissions

```javascript
// Should work (mod)
!reset

// Should fail (non-mod)
!reset  // No response

// Should work (public with cooldown)
!stats
!stats  // Cooldown prevents immediate re-use
```

## Future Enhancements

Potential additions to the command system:

1. **Command aliases** - Multiple triggers for same command
2. **Dynamic command registration** - Add commands at runtime
3. **Command history** - Track usage statistics
4. **Rate limiting** - Global rate limits across all users
5. **Command help** - Auto-generated help messages
6. **Argument validation** - Type checking for command args

## Conclusion

The GlobalCommandBus provides a robust, scalable foundation for chat commands across the entire overlay system. It eliminates duplication, improves maintainability, and enables powerful cross-widget coordination with minimal code changes.

**Key Takeaway:** Register commands once, they work everywhere! 🚀

