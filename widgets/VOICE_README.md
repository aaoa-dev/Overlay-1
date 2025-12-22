# Voice Recognition Feature

Speech recognition monitor that listens for specific words and sends Twitch chat commands.

## ✅ Fixed Issues

The Voice feature has been refactored to work with the new architecture:

### What Was Broken:
- ❌ Invalid import: `import { tmi } from './tmi.js'` (file didn't exist)
- ❌ Dynamic script loading from external CDN
- ❌ Not using refactored services
- ❌ Poor error handling
- ❌ No UI controls

### What's Fixed:
- ✅ Uses `TwitchService` from refactored architecture
- ✅ Proper error handling with `ErrorHandler`
- ✅ Better UI with start/stop controls
- ✅ Status messages with color coding
- ✅ Automatic reconnection on errors
- ✅ Microphone permission handling
- ✅ Browser compatibility checks

## 🚀 Usage

### In Browser:
Visit: `http://localhost:3000/Voice/index.html`

### In OBS:
Add Browser Source with URL: `http://localhost:3000/Voice/index.html`

**Browser Source Settings:**
- Width: 600
- Height: 400
- Custom CSS: Add `body { background: transparent !important; }` if needed

## 🎤 How It Works

1. Continuously listens to your microphone
2. Detects specific words in your speech
3. Sends corresponding commands to Twitch chat

### Monitored Words:
- `technically` → `!technically`
- `fuck` → `!fuck`
- `shit` → `!shit`
- `bitch` → `!bitch`
- `f*ck` → `!fuck` (censored version)
- `sh*t` → `!shit` (censored version)
- `b*tch` → `!bitch` (censored version)

## ⚙️ Configuration

Edit `speech-recognition-refactored.js` to customize:

```javascript
const CONFIG = {
    badWords: ['fuck', 'shit', 'bitch', 'technically'],
    language: 'en-US',
    continuous: true,
    reconnectDelay: 2000,
    showStatus: true
};
```

### Add More Words:
```javascript
badWords: ['fuck', 'shit', 'bitch', 'technically', 'your_word_here']
```

### Change Commands:
```javascript
const CENSORED_MAP = {
    'f*ck': '!fuck',
    'sh*t': '!shit',
    'your*word': '!yourcommand'
};
```

## 🔧 Requirements

- **Browser:** Chrome or Edge (Firefox doesn't support continuous speech recognition)
- **Microphone:** Working microphone with permission granted
- **Credentials:** Configured `config/config.js` with Twitch credentials
- **TMI.js:** Loaded via script tag in HTML (already included)

## 🐛 Troubleshooting

### "Network error" (Most Common)
**This is normal!** The Web Speech API uses Google's servers and occasionally needs to reconnect.

**What happens:**
- The tool automatically retries with exponential backoff (2s → 3s → 4.5s → up to 30s)
- Error counter resets when speech is successfully recognized
- After 5 consecutive errors, it stops and asks you to click Start

**What to do:**
- ✅ **Nothing!** Let it retry automatically
- ✅ If it stops after 5 errors, just click "Start Listening" again
- ✅ Check your internet connection if errors persist

**Why it happens:**
- Google's speech service rate limiting
- Temporary connection issues
- Service maintenance
- Browser switching tabs (pauses the service)

### "Speech recognition is not supported"
- Use Chrome or Edge browser
- Firefox has limited support

### "Microphone permission denied"
- Click the microphone icon in the browser address bar
- Grant permission and reload the page

### "Failed to connect to Twitch"
- Check your `config/config.js` credentials
- Ensure OAuth token is valid
- Check console for specific errors

### No commands being sent
- Check the status display for detected words
- Verify your microphone is working
- Check console for errors
- Make sure you're connected to Twitch (status should say "Connected")
- Speak clearly and at normal volume

## 📝 Console Debugging

Open browser console (F12) and check:

```javascript
// Check if monitor is running
window.speechMonitor

// View errors
ErrorHandler.getErrors()

// Enable debug logging
ErrorHandler.logLevel = 'debug'
```

## 🎯 Features

- ✅ Continuous listening
- ✅ Automatic reconnection
- ✅ Visual status indicators
- ✅ Start/Stop controls
- ✅ Confidence scores
- ✅ Error recovery
- ✅ Browser compatibility checks
- ✅ OBS-ready

## 📄 Files

- `index.html` - Main UI (refactored)
- `speech-recognition-refactored.js` - New implementation
- `Speech Recognition.js` - Old implementation (backup)
- `index-refactored.html` - Alternative UI (backup)

## 🔄 Migration

The old files are kept as backups:
- `Speech Recognition.js` - Original (broken) version
- Use `speech-recognition-refactored.js` - New working version

## 🎨 Customization

### Change Status Display:
```javascript
// In speech-recognition-refactored.js
const CONFIG = {
    showStatus: false  // Hide status messages
};
```

### Modify UI:
Edit `index.html` styles or structure as needed. The refactored version includes a clean, modern UI.

### Add Custom Actions:
Extend the `handleBadWord` method in `SpeechRecognitionMonitor` class to add custom behavior.

---

**Status:** ✅ Working with refactored architecture

