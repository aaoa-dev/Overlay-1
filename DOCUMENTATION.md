# Project Documentation: Overlay-1

## Session: January 16, 2026

### Changes Made

#### Consolidated Goal Widgets with Multiple Visual Styles
- **Decision:** Consolidate goal tracking functionality into a shared backend (`widgets/shared/GoalWidget.js`) with three distinct visual presentations.
- **Reasoning:** Streamers are visual creators who browse by aesthetics first. Rather than burying different styles in settings, we provide separate widgets in the gallery for visual discovery while keeping the codebase DRY through a shared backend.
- **Implementation:**
    - **Shared Backend** (`widgets/shared/GoalWidget.js`):
        - Centralized goal tracking logic for followers/subscribers
        - Integrates with `TwitchService` and `StreamStatsService`
        - Supports multiple time ranges (all-time, today, this month, this session)
        - Configurable via URL parameters and localStorage
        - Milestone detection with animation callbacks
        - One-click OBS URL generation with auth
    - **Four Visual Styles:**
        1. **Minimal Goal** (`goal-minimal.html/js`):
            - Compact number display: "25/100"
            - Customizable font size (1-30vw)
            - Theme options (default, minimal, bold, glow)
            - Optional label display
            - Replaces old "Follower Goal", "Sub Counter", and "Custom Goal" widgets
        2. **Progress Goal** (`goal-progress.html/js`):
            - Full progress bar with current/target display
            - Large numbers with green gradient progress bar
            - Percentage display below bar
            - Custom label support
            - Renamed from original "Goal Tracker"
        3. **Percentage Goal** (`goal-percentage.html/js`):
            - Circular progress indicator
            - Large percentage-focused display
            - Mini progress bar at bottom
            - Perfect for "at-a-glance" goal status
        4. **Circular Goal** (`goal-circular.html/js`):
            - Minimalist circular badge design
            - Single centered number (current value)
            - SVG circular text around the edge
            - Customizable gradient backgrounds (6 presets)
            - Perfect 1:1 aspect ratio
            - Configurable circle size (200-800px)
            - Text follows true circular path using SVG textPath
    - **Code Benefits:**
        - Single source of truth for goal logic
        - Easy to add new visual styles
        - Consistent settings across all styles
        - Reduced maintenance burden
    - **UX Benefits:**
        - Visual browsing in widget gallery
        - Each style gets its own preview image
        - No hidden options - what you see is what you get
        - Users can choose based on aesthetics

#### Individual Engagement Widgets
- **Decision:** Create three separate engagement widgets: Hype Train, Chat Engagement (retained from above).
- **Reasoning:** These engagement metrics are functionally different enough to warrant separate widgets rather than consolidation.
- **Implementation:**
    1. **Hype Train** (`widgets/hype-train.html/js`):
        - **Migrated to Official Twitch EventSub V2 API** (January 16, 2026)
        - Uses real Twitch Hype Train data via WebSocket EventSub connection
        - Displays actual Twitch contribution values:
            - Tier 1 Sub: 500 points
            - Tier 2 Sub: 1,000 points  
            - Tier 3 Sub: 2,500 points
            - Bits: 1 bit = 1 point
        - Real-time level progression and progress tracking
        - 5-minute countdown timer per level
        - Supports V2 features: train type (regular/golden_kappa/treasure), shared trains
        - Auto-show when train starts, auto-hide when ended (configurable)
        - Purple-to-pink gradient progress bar with animations
        - **Requirements:**
            - OAuth scope: `channel:read:hype_train`
            - Channel ID must be provided
            - EventSub WebSocket connection
        - **Technical Implementation:**
            - Created `TwitchEventSub.js` service for WebSocket EventSub connections
            - Handles session management, keepalive, reconnection logic
            - Subscribes to `channel.hype_train.begin`, `progress`, `end` (V2)
            - Replaces old arbitrary point system with official Twitch values
        - **References:**
            - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
            - https://dev.twitch.tv/docs/eventsub/eventsub-reference/
    2. **Chat Engagement** (`widgets/chat-engagement.html/js`):
        - Tracks total message count and unique chatters
        - Real-time activity indicator (Quiet/Slow/Active/Very Active)
        - Color-coded pulsing dot based on messages per minute
        - Configurable activity threshold
        - Manual counter reset option
        - Sliding window calculation (last 60 seconds)
- **Technical Details:**
    - All widgets follow existing architectural patterns
    - Settings persist to localStorage using `StorageService`
    - URL parameter support for OBS embeds
    - Integration with `TwitchService` for real-time events
    - "Copy OBS URL" functionality with authentication included
- **Implementation:**
    - **Widget Structure:** Created `widgets/engagement-suite.html` and `widgets/engagement-suite.js` following the existing architectural pattern used by `timer.html` and `counter.html`.
    - **Three Independent Modules:**
        1. **Hype Train Module:**
            - Tracks engagement points from subscriptions, resubs, gift subs, and bits
            - Displays current level and progress bar with percentage
            - Configurable points per event (subs, bits)
            - Optional decay system that reduces points after inactivity
            - Visual: Progress bar with gradient (purple to pink), level indicator
        2. **Goal Tracking Module:**
            - Displays current vs. target for followers or subscribers
            - Supports multiple time ranges (all time, today, this month, this session)
            - Progress bar with percentage display
            - Integrates with `StreamStatsService` for accurate relative counts
            - Visual: Large current/target display with green progress bar
        3. **Chat Engagement Module:**
            - Tracks total message count and unique chatters
            - Real-time activity indicator with status levels (Quiet, Slow, Active, Very Active)
            - Configurable activity threshold (messages per minute)
            - Color-coded activity dot (red, orange, yellow, green)
            - Visual: Grid layout with stats and pulsing activity indicator
    - **Module Toggles:** Each module can be independently enabled or disabled via settings
    - **Layout Options:**
        - Vertical (default): Modules stack vertically
        - Horizontal: Modules arranged side-by-side
        - Compact mode: Reduced padding and font sizes for tighter layouts
    - **Configuration System:**
        - All settings exposed via comprehensive settings panel
        - Settings persist to `localStorage` using `StorageService`
        - URL parameters support for OBS embeds
        - One-click "Copy OBS URL" generates complete configuration URL with auth
    - **Integration with Existing Services:**
        - Uses `TwitchService` for real-time event listening and chat messages
        - Uses `StreamStatsService` for follower/subscriber tracking and baselines
        - Uses `StorageService` for settings persistence
        - Uses `ErrorHandler` for error logging and debugging
        - Follows same authentication pattern as other widgets (URL params, localStorage, config file)
    - **Event Handlers:**
        - Listens for `message`, `subscription`, `resub`, `subgift`, and `cheer` events
        - Real-time updates without polling for chat metrics
        - Periodic polling (30s) for follower/subscriber counts via Twitch API
    - **Visual Design:**
        - Glassmorphic dark cards with backdrop blur
        - Smooth animations for progress bars and indicators
        - Gradient progress bars matching brand colors
        - Responsive layout adapts to content visibility
        - Scale and opacity controls for overlay integration
    - **File Changes:**
        - Created `widgets/engagement-suite.html` - Widget page with three module sections and settings panel
        - Created `widgets/engagement-suite.js` - Widget logic with state management and Twitch integration
        - Modified `index.html` - Added Engagement Suite to OVERLAYS array for landing page discovery
        - Created `previews/engagement-suite.svg` - Preview placeholder following project convention
- **Technical Details:**
    - Widget follows zero-configuration principle: works immediately with default settings when URL is opened
    - Settings panel hidden in OBS but visible in browser for configuration
    - Hype Train decay system runs on 1-second interval when enabled
    - Chat activity calculation uses sliding window (last 60 seconds of messages)
    - Goal tracking supports all StreamStatsService ranges for flexible milestone tracking
    - All three modules update independently without blocking each other
    - Modular design allows easy addition of future engagement metrics
- **User Experience:**
    - Single URL to copy-paste into OBS
    - No external dependencies beyond existing shared services
    - Instant visual feedback for all engagement events
    - Customizable appearance matches stream branding
    - Modules can be toggled on/off without recreating URL

## Session: January 14, 2026

### Changes Made

#### System Theme Support for Thermal Chat
- **Decision:** Add automatic system theme detection and support for dark/light mode in the Thermal Receipt chat.
- **Reasoning:** Users wanted the thermal chat to react to their system theme settings, especially when viewed through OBS Browser sources, which support the CSS `prefers-color-scheme` media query.
- **Implementation:**
    - **CSS Variables:** Introduced CSS custom properties (`--receipt-bg`, `--receipt-text`, `--receipt-border`, `--receipt-divider`, `--receipt-shadow`) to centralize theme colors.
    - **Theme Modes:** Added three theme options:
        - `auto` - Follows system preference using `prefers-color-scheme` media query
        - `light` - Forces light theme (white background, black text)
        - `dark` - Forces dark theme (dark gray background, light text)
    - **Dark Mode Colors:** 
        - Background: `#1a1a1a` (dark gray)
        - Text: `#e0e0e0` (light gray)
        - Maintains thermal printer aesthetic with inverted colors
    - **Settings Integration:** Added theme selector dropdown in the settings panel
    - **Persistence:** Theme preference is saved to `localStorage` and synchronized with URL parameters
    - **Dynamic Updates:** Theme changes apply instantly without page reload
    - **File Changes:**
        - `chats/vertical-chat.html` - Added CSS variables, theme system, and theme selector UI
        - `chats/vertical-chat.js` - Added theme configuration, persistence, and event handlers
- **Technical Details:**
    - Used `data-theme` attribute on `<body>` element to control active theme
    - SVG icon filters automatically adjust for theme (invert on dark mode)
    - Test buttons inherit theme colors for consistency
    - All thermal printer UI elements (auth buttons, settings panel, test controls) respect theme

## Session: January 7, 2026

### Changes Made

#### Thermal Chat Settings Panel
- **Decision:** Implement a comprehensive settings panel for the Thermal Receipt chat.
- **Reasoning:** Users need the ability to customize font size, behavior, and permissions (especially for image links) without manual code changes or complex URL editing.
- **Implementation:**
    - **UI:** Added a settings button next to the Twitch auth button in the top-right corner.
    - **Panel:** Created a fly-out panel with controls for:
        - Font size (8px to 40px range).
        - 3rd Party Emotes toggle.
        - Granular image permissions for Moderators, VIPs, and all three subscriber tiers (T1, T2, T3).
    - **Styling:** Applied a "Thermal Printer" aesthetic to the settings UI (black borders, white background, Courier font, shadow offsets) to maintain visual consistency.
    - **Persistence:** Settings are automatically saved to `localStorage` and synchronized with URL parameters for easy sharing or permanent OBS links.
    - **Copy OBS URL:** Added a one-click button to generate and copy a fully configured URL including authentication tokens and all UI preferences.

#### Customizable Image Permissions
- **Decision:** Allow streamers to define exactly who can share images in the thermal chat.
- **Reasoning:** streamers wanted more control over image sharing beyond just "Broadcaster/Mod/VIP".
- **Implementation:**
    - Modified `src/components/ChatMessage.js` to accept a custom `isPrivilegedCheck` callback.
    - Updated `chats/vertical-chat.js` to implement this callback using the new permission settings.
    - Added logic to check for specific subscriber tier indicators (1000, 2000, 3000) in the Twitch badges.

## Session: January 5, 2026

### Changes Made

#### Thermal Chat Message Persistence
- **Decision:** Prevent messages in the Thermal Receipt chat from disappearing automatically.
- **Reasoning:** The user requested that messages in the "thermal chat" (Thermal Receipt widget) should not disappear. This enhances the "receipt" aesthetic where messages are printed and stay on the paper until it grows too long.
- **Implementation:**
    - Modified `chats/vertical-chat.js`.
    - Increased `CONFIG.maxMessages` from `20` to `100` to allow for a longer receipt history.
    - Set `CONFIG.messageTimeout` to `0` (disabled) to prevent messages from fading out after 30 seconds.
    - Updated `cleanupOldMessages` logic to respect the disabled timeout and handle `maxMessages` removal gracefully.

#### 3rd Party Emotes and Image Support
- **Decision:** Add support for 7TV, BTTV, and FFZ emotes, and allow direct image links to be rendered as images for privileged users.
- **Reasoning:** To enhance the chat experience and support community-standard emotes and media sharing within the thermal aesthetic.
- **Implementation:**
    - Created `src/services/EmoteService.js` to fetch and cache emotes from 7TV, BTTV, and FFZ APIs.
    - Updated `src/components/ChatMessage.js` with:
        - `escapeHtml` for security before rendering user content.
        - `processTwitchEmotes` to handle native emotes on escaped text.
        - `processImageLinks` using regex to detect image URLs and replace them with `<img>` tags.
        - `isPrivileged` check to restrict image rendering to Broadcaster, Mods, and VIPs.
    - Updated `chats/vertical-chat.js` to integrate `EmoteService` and configure `ChatMessage` options.
    - Added CSS to `chats/vertical-chat.html` for `.chat-image` to fit the thermal printer style (grayscaled and slightly pixelated).
    - Added UI toggles to the test panel in `vertical-chat.html` for real-time control of these features.

#### Cursor Welcome Scaling
- **Decision:** Double the size of the Cursor Welcome overlay elements.
- **Reasoning:** The user requested to increase the visibility of the cursor and its associated bubble.
- **Implementation:**
    - Modified `alerts/cursor-welcome.css`.
    - Doubled the `width` and `height` of `.cursor-svg` (from 24px to 48px).
    - Doubled the `left` and `top` offsets for `.cursor-bubble` (from 12px to 24px).
    - Doubled the `padding`, `border-radius`, `font-size` (0.875rem to 1.75rem), `height` (28px to 56px), and `max-width` (80px to 160px for compact, 350px to 700px for typing) of `.cursor-bubble`.

### Session Status: Complete
All requested features (message persistence, 3rd party emotes, and image links) are fully implemented and tested.

### Decisions & Architecture
- **Widget Configuration:** Widgets use a `CONFIG` object for easy adjustment of behavioral parameters.
- **Animations:** Thermal printer style uses a smooth sliding animation for the entire "receipt paper" unit to simulate a continuous printout.
- **Message Management:** Old messages are removed from the DOM when the maximum limit is reached to prevent performance issues and memory leaks, while maintaining a smooth transition.
- **Extensible Components:** `ChatMessage` is now more flexible, allowing individual widgets to inject their own privilege logic without duplicating the complex rendering and sanitization code.
