# Alerts System with Stream Stats

## ✨ New Features

The refactored alerts system now includes:

### 📊 **Stream Stats Tracking**
- **Follower Count** - Tracks number of new followers during stream
- **Subscription Count** - Tracks number of subs/resubs during stream
- **Auto-reset** - Stats automatically reset each day

### 🎮 **Admin Commands**
- **`!reset`** - (Mods only) Resets all user visit states AND stream stats (followers + subs to 0)
- **`!stats` or `!streamstats`** - Shows current follower and sub counts

### 🎉 **Welcome System**
- Tracks user visits
- Celebrates milestones (10, 50, 100 visits)
- Confetti effects for milestones
- Manual welcome commands: `!in`, `!welcome`, `!checkin`, `!here`

## 🚀 Usage

### **View the Refactored Version:**
Visit: `http://localhost:3000/alerts-refactored.html`

### **In Browser:**
- See live stats display in top-left corner
- Test alerts with the buttons
- Manually increment stats with +1 Follower / +1 Sub buttons

### **In Chat:**
```
!reset          // Reset everything (mods only)
!stats          // Show current stats
!in             // Trigger welcome (24hr cooldown)
```

## 📦 New Services

### **StreamStatsService**
Manages follower and subscription counts:

```javascript
import { StreamStatsService } from './services/StreamStatsService.js';

const stats = new StreamStatsService();

// Increment counts
stats.incrementFollowers(); // +1 follower
stats.incrementSubs();      // +1 sub

// Get counts
const followers = stats.getFollowerCount();
const subs = stats.getSubCount();

// Reset
stats.reset(); // Both back to 0

// Get formatted string
console.log(stats.formatStats());
// Output: "📊 Stream Stats: 5 followers, 3 subs today"
```

### **AlertsManager**
Handles welcome alerts and user tracking:

```javascript
// Automatically tracks:
- First-time chatters
- Returning chatters
- Visit milestones
- Welcome commands
```

## 🎯 How It Works

### **Automatic Tracking:**
1. **New Follower** - TMI.js doesn't support this (requires EventSub)
2. **New Sub** - Automatically detected and counted
3. **Resub** - Automatically detected and counted
4. **Gift Sub** - Automatically detected and counted

### **Manual Tracking:**
Use the UI buttons to manually increment:
- Click "+1 Follower" when you get a follower
- Click "+1 Sub" when you get a sub (if auto-detection doesn't work)

### **Reset Behavior:**
When a mod uses `!reset`:
- ✅ All user visit counts reset
- ✅ Follower count → 0
- ✅ Sub count → 0
- ✅ Chat confirmation message sent

## 🗂️ Storage

Data is stored in localStorage:

```javascript
// User visits
localStorage.getItem('userVisits')

// Stream stats
localStorage.getItem('stream_follower_count')
localStorage.getItem('stream_sub_count')
localStorage.getItem('stream_stats_date')
```

## 🎨 Customization

### **Change Milestones:**
Edit `alerts-refactored.js`:
```javascript
const CONFIG = {
    milestones: [10, 50, 100, 500], // Add more!
    // ...
};
```

### **Change Confetti Colors:**
```javascript
confettiColors: {
    10: ['#4ade80', '#22c55e', '#16a34a'],
    50: ['#C0C0C0', '#E5E4E2', '#FFFFFF'],
    100: ['#FFD700', '#FFA500', '#FFE4B5'],
    500: ['#FF0000', '#FF6600', '#FFFF00'] // Add custom colors
}
```

### **Change Welcome Commands:**
```javascript
welcomeCommands: ['!in', '!welcome', '!checkin', '!here', '!hello']
```

## 📊 Stats Display

The stats display shows in top-left:
```
📊 Today's Stats:
Followers: 5 | Subs: 3
```

Auto-updates every 5 seconds.

## 🧪 Testing

### **Test Alerts:**
1. Open `http://localhost:3000/alerts-refactored.html`
2. Click test buttons:
   - "Test New User" - 1st time visitor
   - "Test Returning" - Regular visitor
   - "Test 10+ Visits" - Milestone with confetti
   - "Test 50+ Visits" - Silver confetti
   - "Test 100+ Visits" - Gold confetti

### **Test Stats:**
1. Click "+1 Follower" button
2. Click "+1 Sub" button
3. Watch the display update
4. In chat, type: `!stats`
5. In chat (as mod), type: `!reset`

## 🔧 Console Commands

Access in browser console (F12):

```javascript
// Check stats
window.streamStats.getStats()

// Manual increment
window.streamStats.incrementFollowers()
window.streamStats.incrementSubs()

// Check alerts manager
window.alertsManager.userData

// Reset everything
window.alertsManager.reset()
```

## 🐛 Known Limitations

### **Follower Detection:**
- **Not automatically tracked** - Twitch's TMI.js doesn't provide follower events
- **Manual increment required** - Use the "+1 Follower" button
- **Alternative:** Set up Twitch EventSub webhooks (advanced)

### **Sub Detection:**
- **Works automatically** for most subs
- **May miss some** if bot restarts during sub
- **Use manual button** as backup

## 🔄 Migration from Old Version

The old `alerts.js` is kept as backup. The new refactored version:

✅ Uses TwitchService (centralized)
✅ Uses StorageService (safer localStorage)
✅ Uses ErrorHandler (better debugging)
✅ Adds stream stats tracking
✅ Better command system
✅ Cleaner code structure

To use the old version, change `alerts-refactored.html` back to `alerts.html`.

## 📝 Files

- `alerts-refactored.js` - New implementation
- `alerts-refactored.html` - New UI with stats
- `services/StreamStatsService.js` - Stats tracking service
- `alerts.js` - Old implementation (backup)
- `alerts.html` - Old UI (backup)

## 🎯 Next Steps

1. ✅ Test the refactored version
2. ✅ Customize milestones and messages
3. ✅ Add to OBS as browser source
4. ✅ Use in your stream!
5. ⭐ Consider setting up EventSub for automatic follower detection

---

**Status:** ✅ Fully functional with follower & sub tracking!

