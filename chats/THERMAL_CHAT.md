# 🧾 Thermal Printer Receipt Chat

A vertical chat overlay styled like a store thermal printer receipt.

## 🎨 Design Features

### **Thermal Printer Aesthetic**
- ✅ **Black & White Only** - Pure monochrome design
- ✅ **Monospace Font** - Courier Prime for authentic receipt look
- ✅ **Dash Dividers** - Dashed lines separating each message (like receipts)
- ✅ **Grayscale Badges** - Twitch badges converted to grayscale
- ✅ **Grayscale Emotes** - All emotes converted to grayscale for cohesion
- ✅ **White Background** - Paper-white message boxes
- ✅ **Black Border** - Bold 2px borders
- ✅ **Hard Shadows** - 2px offset shadows (no blur)
- ✅ **Uppercase Headers** - Username in bold uppercase
- ✅ **Fixed Width** - 400px max width (receipt paper size)

## 📦 Example Layout

```
┌─────────────────────────┐
│ [BADGE] USERNAME        │
│ This is a chat message  │
│ that wraps to multiple  │
│ lines if needed         │
│ - - - - - - - - - - -   │
└─────────────────────────┘
┌─────────────────────────┐
│ Another message follows │
│ - - - - - - - - - - -   │
└─────────────────────────┘
```

## 🚀 Access

**URL:** http://localhost:3000/Chat/vertical-chat.html

## 🎯 Features

### **Message Display**
- Messages stack vertically from bottom to top
- New messages slide up from bottom
- Each message looks like a receipt segment
- Dash divider at bottom of each message
- Auto-removes messages after 30 seconds
- Max 20 messages on screen

### **Smart Headers**
- First message from user: Shows badges + username
- Consecutive messages from same user: No header (cleaner look)
- Different user: Header returns

### **Filters**
- Commands starting with `!` or `/` are hidden
- Perfect for chat overlay without command spam

### **Grayscale Effects**
Applied via CSS filters:
```css
filter: grayscale(100%) contrast(1.2);
```

## 🎬 OBS Setup

### **Add as Browser Source:**

1. **In OBS:** Sources → Add → **Browser**
2. **Name:** "Thermal Receipt Chat"
3. **URL:** `http://localhost:3000/Chat/vertical-chat.html`
4. **Width:** `450` (to accommodate padding + message width)
5. **Height:** `1080` (or your scene height)
6. **Custom CSS:** (optional)
   ```css
   body { background-color: rgba(0,0,0,0); }
   ```
7. **Settings:**
   - ✅ Shutdown source when not visible: **OFF**
   - ✅ Refresh browser when scene becomes active: **OFF**

### **Position:**
- Typically positioned left or right side of screen
- Messages stay within 400px width
- Stacks from bottom up

## 🧪 Testing

### **Built-in Test Buttons:**

Located at bottom-right of page:

1. **TEST MSG** - Single test message
2. **TEST LONG** - Long message to test wrapping
3. **SEQUENCE** - Multiple messages showing header behavior
4. **CLEAR** - Remove all messages

### **Console Commands:**
```javascript
// Test single message
window.testMessage('regular')

// Test long message with wrapping
window.testMessage('long')

// Test message sequence (shows header logic)
window.testMessage('sequence')

// Clear all messages
window.testMessage('clear')

// Access services
window.chatDisplay  // Chat display instance
window.twitchService  // Twitch service instance
```

## 🎨 Customization

### **Change Width:**
```css
#chatContainer {
    max-width: 500px;  /* Change from 400px */
}
```

### **Change Font:**
```css
body, .chat-message {
    font-family: 'JetBrains Mono', monospace;
}
```

### **Change Font Size:**
```css
.chat-message, .message-text {
    font-size: 1rem;  /* Larger text */
}
```

### **Remove Dash Divider:**
```css
.chat-message::after {
    display: none;
}
```

### **Change Divider Style:**
```css
.chat-message::after {
    background: repeating-linear-gradient(
        to right,
        black 0px,
        black 3px,  /* Shorter dashes */
        transparent 3px,
        transparent 6px
    );
}
```

### **Adjust Message Timeout:**
In `vertical-chat.js`:
```javascript
const CONFIG = {
    maxMessages: 20,
    messageTimeout: 60000,  // 60 seconds instead of 30
    // ...
};
```

### **Change Max Messages:**
```javascript
const CONFIG = {
    maxMessages: 30,  // Show more messages
    // ...
};
```

### **Disable Grayscale:**
```css
.badge, .emote {
    filter: none;  /* Remove grayscale */
}
```

## 📊 Configuration

Current settings in `vertical-chat.js`:

```javascript
const CONFIG = {
    maxMessages: 20,           // Max messages on screen
    messageTimeout: 30000,     // Remove after 30 seconds
    autoScroll: true,          // Auto-scroll (always true for bottom-up)
    filterCommands: true       // Hide ! and / commands
};
```

## 🎭 Styling Details

### **Message Box:**
- Background: `white`
- Border: `2px solid black`
- Padding: `0.75rem`
- Font: `Courier Prime, Courier New, monospace`
- Font Size: `0.875rem` (14px)
- Line Height: `1.4`
- Shadow: `2px 2px 0 rgba(0,0,0,0.3)` (hard shadow, no blur)

### **Username:**
- Font Weight: `700` (Bold)
- Text Transform: `UPPERCASE`
- Color: `black`
- Size: `0.875rem`

### **Badges:**
- Height: `1rem`
- Filter: `grayscale(100%) contrast(1.2)`

### **Emotes:**
- Height: `1.25rem`
- Filter: `grayscale(100%) contrast(1.2)`

### **Divider:**
```css
repeating-linear-gradient(
    to right,
    black 0px,
    black 5px,
    transparent 5px,
    transparent 10px
)
```

## 🔄 Auto-Sync

The chat automatically:
- Connects to Twitch using stored OAuth token
- Fetches channel badges
- Listens for new messages
- Converts badges/emotes to grayscale
- Applies receipt styling
- Removes old messages

## 🐛 Troubleshooting

### **Messages not appearing:**
- Check if authenticated (top-right button)
- Check browser console for errors
- Verify Twitch connection: `window.twitchService`

### **No grayscale effect:**
- Some browsers have different filter support
- Try refreshing the page
- Check if images loaded: Open DevTools → Network tab

### **Badges not showing:**
- Badges are fetched asynchronously
- May take a few seconds after page load
- Check: `window.twitchService.badges`

### **Layout issues in OBS:**
- Ensure browser source width is at least 450px
- Try disabling "Refresh browser when scene becomes active"
- Check if chat container is visible: Inspect element in OBS

### **Font not loading:**
- Google Fonts may be blocked
- Check network tab in browser console
- Fallback fonts: Courier New, monospace

## 💡 Use Cases

Perfect for:
- ✅ Retro/nostalgic streams
- ✅ Lo-fi aesthetic streams
- ✅ Minimalist overlays
- ✅ Shop/store themed streams
- ✅ Receipt/transaction roleplay
- ✅ POS system themed content

## 🎬 Animation

Messages animate in with:
- **Slide up:** `translateY(10px)` → `translateY(0)`
- **Fade in:** `opacity: 0` → `opacity: 1`
- **Duration:** `0.2s`
- **Easing:** `ease-out`

Messages animate out with:
- **Slide up:** `translateY(0)` → `translateY(-20px)`
- **Fade out:** `opacity: 1` → `opacity: 0`
- **Duration:** `0.3s`

## 📝 Files

- `vertical-chat.html` - Main HTML with thermal printer styling
- `vertical-chat.js` - Chat display logic using refactored services
- `THERMAL_CHAT.md` - This documentation

## 🔗 Dependencies

- `TwitchService` - Twitch connection & authentication
- `MessageHandler` - Message processing
- `ChatMessage` - Message parsing & emote handling
- `ErrorHandler` - Error logging
- `tmi.js` - Twitch chat client

## 🎯 Key Features vs Regular Chat

| Feature | Regular Chat | Thermal Chat |
|---------|--------------|--------------|
| **Style** | Modern, colorful | Monochrome receipt |
| **Background** | Transparent/Dark | White paper |
| **Badges** | Full color | Grayscale |
| **Emotes** | Full color | Grayscale |
| **Font** | Inter (sans-serif) | Courier (monospace) |
| **Dividers** | None | Dashed lines |
| **Width** | Flexible | Fixed 400px |
| **Aesthetic** | Modern/Clean | Retro/Vintage |

---

**Perfect for streams that want a unique, vintage receipt aesthetic!** 🧾✨

Access at: http://localhost:3000/Chat/vertical-chat.html

