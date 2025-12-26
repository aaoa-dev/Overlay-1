# Project Status & Refactoring Decisions (Dec 22, 2025)

## Overview
The project has undergone a significant refactor to improve organization, centralize authentication, and eliminate redundancy. The codebase was previously scattered with duplicate files and inconsistent logic.

## Key Decisions & Changes

### 1. Unified Directory Structure
- **Decision**: Move all core logic into a `src/` directory.
- **Reasoning**: To separate business logic and components from static assets and configuration. This follows modern web development best practices and makes the project much easier to navigate.
- **Action**: Consolidated `services/`, `components/`, `utils/`, `handlers/`, `commands/`, and `types/` into `src/`.

### 2. Centralized Authentication
- **Decision**: Use `StorageService` and `TwitchAPI` for all authentication tasks.
- **Reasoning**: Auth logic was previously scattered across multiple HTML and JS files, using different storage keys and manual `fetch` calls. This led to bugs and inconsistent state.
- **Action**: 
    - Rewrote `auth/oauth.js` and `auth/callback.html` as modules using shared services.
    - Standardized storage keys (e.g., `twitch_oauth_token`).
    - Consolidated multiple auth entry points (`connect.html`, `simple-auth.html`) into a single, polished `auth/oauth.html`.

### 3. Configuration Management
- **Decision**: Create a centralized `src/config.js`.
- **Reasoning**: The app lacked a clear source of truth for configuration (Client ID, default username, etc.).
- **Action**: Created `src/config.js` which merges default values, `window.TWITCH_CONFIG` (for static build config), and `localStorage` (for user-saved config).

### 4. Code Cleanup & Deduplication
- **Decision**: Remove experimental versions and duplicate folders.
- **Reasoning**: Files like `alerts-refactored.js` and `public/services/` (duplicates of root `services/`) made it unclear which code was actually running.
- **Action**:
    - Replaced main scripts (`alerts.js`, `script.js`) with their refactored, service-based versions.
    - Deleted all redundant folders in `public/`.
    - Moved `tmi.js` to `src/vendor/tmi.js`.

### 5. Standardized Imports
- **Decision**: Use relative paths from `src/` for all ESM imports.
- **Reasoning**: Ensures all modules can find their dependencies regardless of where they are in the directory tree.
- **Action**: Updated all `import` statements across the project.

### 6. OBS Compatibility Fix
- **Decision**: Prioritize URL parameters for authentication in all overlays.
- **Reasoning**: OBS Browser Sources cannot easily handle interactive logins. Providing a URL with the token already attached is the industry standard for stream overlays.
- **Action**: 
    - Updated `TwitchService` to prioritize query parameters (`?token=...&username=...`).
    - Added "Copy OBS URL" buttons to the Dashboard (`index.html`) which generate these authenticated links automatically.
    - Updated `followers.html` and `subscribers.html` to live-fetch data from Twitch using the provided token.

### 7. Feature-Based Organization
- **Decision**: Organize overlays by feature type into `chats/`, `alerts/`, and `widgets/`.
- **Reasoning**: Previous structure was inconsistent, mixing top-level files with folder-based components. Categorizing them makes the codebase easier to navigate.
- **Action**:
    - **Chats**: Consolidated `Chat/` content into `chats/`.
    - **Alerts**: Created `alerts/` folder. Moved `alerts.*`, `Notification/*` (signature alerts), and welcome logic there.
    - **Widgets**: Created `widgets/` folder. Moved `followers.html`, `subscribers.html`, `chatters.html`, and `Voice/` (voice monitor) there.
    - **Path Resolution**: Updated all relative paths (HTML/JS) and the Dashboard links to reflect the new structure.

### 8. Documentation Consolidation
- **Decision**: Consolidate scattered `.md` files into a unified structure.
- **Reasoning**: There were 15+ separate documentation files, many of which were redundant or purely historical.
- **Action**:
    - Created a modern, feature-rich **`README.md`** as the main entry point.
    - Created **`DEVELOPMENT.md`** to house technical architecture and development guides.
    - Simplified **`DEPLOYMENT_GUIDE.md`** to focus on static hosting best practices.
    - Deleted redundant files: `README-NEW.md`, `QUICKSTART.md`, `ALERTS_README.md`, `COUNTER_DISPLAYS.md`, `MIGRATION_GUIDE.md`, `REFACTORING.md`, `REFACTORING_SUMMARY.md`, `info.md`, `PUSH_NOW.md`, and `GITHUB_PAGES_SETUP.md`.

## Future Recommendations
- **Refactor `Chat/chat.js`**: While structurally cleaner, `chat.js` still contains a lot of manual DOM manipulation and badge fetching logic that could be moved into `ChatMessage.js` and `TwitchService.js`.
- **Vite Integration**: Further optimize `vite.config.js` to handle all entry points more elegantly now that the structure is consolidated.
- **Tailwind Cleanup**: Ensure `output.css` is being generated correctly from the new `src/` locations.

## Summary of Fixed Issues (Dec 22, 2025)
- **Purple Background in Alerts**: Removed a JavaScript override in `alerts/alerts.js` that was forcing a purple background on alert content, restoring the intended design.
- **Greeting Spam / Multiple Greetings**: 
    - Resolved a logic conflict in `alerts/alerts.js` where welcome commands (like `!welcome`) triggered two separate greetings.
    - Introduced a `noChat` behavior flag in `TwitchService` to allow silencing chat-writing features.
    - Added `?noChat=true` to all dashboard previews in `index.html`, preventing the dashboard from acting as an active bot and sending duplicate messages from your preview iframes.
- **ReferenceError: tmi is not defined**: Fixed by adding missing `<script src="./src/vendor/tmi.js"></script>` to `followers.html` and `subscribers.html`.
- **Robustness in TwitchService**: Added explicit checks for `window.tmi` in `TwitchService.js` to provide better error messages if the library is missing.
- **Speech Recognition Blocking**: Added `allow="microphone"` to the Speech Recognition iframe in `index.html` to prevent browser security blocks.
- **Legacy Links**: Updated legacy `auth/connect.html` links to the new `auth/oauth.html` in `vertical-chat.html`.
- **Global Theme Support**: Ensured all 8 widgets (including new ones like Active Chatters and Signature Alerts) correctly inherit global theme color and font size from the dashboard.

## Session Log: CursorWelcome Alert (Dec 24, 2025)

### 1. New Alert Type: CursorWelcome
- **Decision**: Created a new automated alert type that mimics a Figma cursor.
- **Reasoning**: To provide a modern, playful way to welcome viewers that fits the "workspace" aesthetic of the stream.
- **Implementation**:
    - **Files**: `alerts/cursor-welcome.html`, `alerts/cursor-welcome.js`, `alerts/cursor-welcome.css`.
    - **Logic**: Uses `TwitchService` to listen for chat and `StorageService` for visit counts.
    - **Automated Flow**: The cursor slides in, automatically reveals a user card, then the cursor itself slides out while the card remains for a few seconds before fading away.

### 2. Randomization & Animation
- **Decision**: Implemented random entry sides (Top, Bottom, Left, Right) and random destination coordinates.
- **Reasoning**: To keep the overlay dynamic and unpredictable, matching the "cursor" theme where viewers appear to be "joining" the workspace.
- **Action**: Used JS-driven position calculations combined with CSS cubic-bezier transitions for a high-quality feel.

### 3. Integrated Preview System
- **Decision**: Added a dedicated preview panel to `cursor-welcome.html`.
- **Reasoning**: Allows the user to easily test the alert's behavior (New, Returning, Milestone) and reset visit states without needing a live Twitch event.
- **Action**: Included buttons that trigger global `testCursorAlert` and `resetVisitStates` functions.

## Session Log: Unified Design & Modernization (Dec 26, 2025)

### 1. Unified Visual Language (Shadcn-like)
- **Decision**: Redesign the entire dashboard and auth flow with a "friendly" and modern aesthetic.
- **Reasoning**: The previous UI was inconsistent, mixing sharp and slightly rounded corners, with fragmented custom CSS.
- **Implementation**:
    - **Rounding**: Adopted large border radii (`rounded-4xl` for cards, `rounded-5xl` for main containers) across all main pages.
    - **Glassmorphism**: Standardized background styles using translucent `zinc-900/50` with `backdrop-blur-xl` and subtle borders.
    - **Palette**: Unified around Twitch Purple (`#9147ff`), deep dark backgrounds, and Zinc-based grays.

### 2. Infrastructure & Typography
- **Decision**: Standardize on **Plus Jakarta Sans** and **Lucide Icons**.
- **Reasoning**: To provide a professional, cohesive look and feel that matches modern web development standards (Tailwind/Shadcn).
- **Action**:
    - Updated `tailwind.config.js` to include the new font family and extended border-radius utilities.
    - Integrated Lucide Icons via CDN, replacing various manual SVGs.
    - Refactored `index.html`, `auth/oauth.html`, and `auth/callback.html` to use these new standards.

### 3. Tailwind CSS Refactor
- **Decision**: Move away from custom CSS blocks in favor of Tailwind utility classes.
- **Reasoning**: Increases maintainability and ensures style consistency.
- **Action**:
    - Completely rewrote the `index.html` structure and associated styles using Tailwind, then ran a full `css:build` to update `output.css`.
    - **Card Padding Optimization**: Applied negative margins (`-mx-6 -mt-6`) to widget previews and enabled `overflow-hidden` on parent cards to create a flush, edge-to-edge preview effect.

### 4. Interactive Feedback
- **Decision**: Add smooth transitions and state-based feedback (Copy/Success).
- **Reasoning**: Improves the user experience by providing clear confirmation of actions.
- **Action**: Added hover lift effects to cards and "success" states for copy buttons that change color and icon when clicked.

## Summary of Deleted Files
- `public/services/*` (duplicates)
- `public/components/*` (duplicates)
- `public/utils/*` (duplicates)
- `public/tmi.js` (duplicate)
- `auth/connect.html` (consolidated)
- `auth/simple-auth.html` (consolidated)
- `auth/server.js` (unused/legacy)
- `alerts-refactored.js` (promoted to main)
- `script-refactored.js` (promoted to main)
- `Voice/*-refactored.*` (promoted to main)
- `Chat/` (renamed to `chats/`)
- `Notification/` (consolidated into `alerts/`)
- `Voice/` (consolidated into `widgets/`)
