# Counter Display Pages

Simple, centered counter displays for stream overlays.

## 📊 Pages

### **Followers Counter**
- **URL:** `http://localhost:3000/followers.html`
- **Displays:** Follower count from StreamStatsService
- **Updates:** Every second, with pulse animation on change

### **Subscribers Counter**
- **URL:** `http://localhost:3000/subscribers.html`
- **Displays:** Subscriber count from StreamStatsService
- **Updates:** Every second, with pulse animation on change

## 🎨 Design

Both pages feature:
- ✅ **Perfect centering** - Horizontal AND vertical using flexbox
- ✅ **Monospace font** - Courier New for clean display
- ✅ **Responsive sizing** - Adapts to any window size using `vw` units
- ✅ **Transparent background** - Perfect for OBS overlays
- ✅ **Pulse animation** - Number pulses when count changes
- ✅ **Text shadow** - Readable on any background
- ✅ **Auto-sync** - Listens for changes across tabs

## 🎯 OBS Setup

### **Add as Browser Source:**

1. In OBS, click **+** → **Browser**
2. Name it "Follower Count" (or "Sub Count")
3. Set URL:
   - Followers: `http://localhost:3000/followers.html`
   - Subs: `http://localhost:3000/subscribers.html`
4. Set dimensions (example):
   - Width: **400**
   - Height: **200**
   - (Adjust as needed for your layout)
5. Check **"Shutdown source when not visible"** = OFF
6. Click **OK**

### **Position in Scene:**
- Drag and resize to fit your layout
- The number stays perfectly centered regardless of size

## 🔧 Updating Counts

### **Method 1: Alerts Page**
Visit `http://localhost:3000/alerts-refactored.html` and use:
- "+1 Follower" button
- "+1 Sub" button

### **Method 2: Console**
Open browser console (F12) on the counter page:
```javascript
// Increment follower count
window.streamStats.incrementFollowers()

// Increment sub count
window.streamStats.incrementSubs()

// Set specific count
window.streamStats.setFollowerCount(50)
window.streamStats.setSubCount(10)

// Reset to 0
window.streamStats.reset()
```

### **Method 3: Chat Command**
In Twitch chat (as mod):
```
!reset    // Resets both counters to 0
```

### **Method 4: Automatic**
Subscriber count auto-increments when:
- Someone subscribes
- Someone resubs
- Someone gifts a sub

(Run `alerts-refactored.html` for auto-detection)

## 📱 Responsive Sizing

The font size automatically adapts:

| Screen Size | Font Size |
|------------|-----------|
| Mobile (< 600px) | 15vw |
| Tablet/Desktop | 10vw |
| Large (> 1200px) | 8rem (fixed) |

## 🎨 Customization

### **Change Font Size:**
Edit the CSS in the HTML file:
```css
#followerCount {
    font-size: 10vw;  /* Change this value */
}
```

### **Change Color:**
```css
#followerCount {
    color: #ffffff;  /* Change to any color */
}
```

### **Change Font:**
```css
#followerCount {
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}
```

### **Remove Animation:**
Delete or comment out the `.pulse` class and animation code.

### **Add Prefix/Suffix:**
In the JavaScript, modify:
```javascript
followerCountElement.textContent = `Followers: ${currentCount}`;
```

## 🔄 Sync Across Pages

The counters automatically sync if you:
1. Open `followers.html` in OBS
2. Open `alerts-refactored.html` in browser
3. Click "+1 Follower" in alerts page
4. OBS display updates in real-time! ✨

This works through localStorage change events.

## 🐛 Troubleshooting

### Counter shows 0
- Counter resets daily (by design)
- Use alerts page to increment
- Or use console: `window.streamStats.incrementFollowers()`

### Not updating
- Check browser console for errors
- Verify StreamStatsService is working: `window.streamStats.getStats()`
- Try refreshing the page

### Wrong count
- Use console to set: `window.streamStats.setFollowerCount(10)`
- Or reset and start over: `window.streamStats.reset()`

## 📊 Example Layout

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│              42                 │  ← Perfectly centered
│                                 │     Auto-scales to window
│                                 │
└─────────────────────────────────┘
```

## 🎬 Production Use

### **For Streaming:**
1. Run dev server: `npm run dev`
2. Add browser sources in OBS
3. Use alerts page to manage counts
4. Profit! 🎉

### **For Production Server:**
1. Build: `npm run build`
2. Serve the `dist/` folder
3. Update URLs in OBS to your domain
4. Same functionality!

## 💡 Tips

- **Multiple scenes?** Each browser source updates independently
- **Clean look?** Keep background transparent
- **Need both?** Open both pages in separate browser sources
- **Testing?** Open in regular browser first to verify

## 📝 Files

- `followers.html` - Follower count display
- `subscribers.html` - Subscriber count display
- `services/StreamStatsService.js` - Data source
- `alerts-refactored.html` - Control panel for counts

---

**Perfect for:** Goal tracking, stream milestones, viewer engagement!

