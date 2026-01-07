# Project Documentation: Overlay-1

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
