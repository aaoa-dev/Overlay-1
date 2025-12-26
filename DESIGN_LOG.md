# Design Decisions & Updates - Dec 26, 2025

## Goal: Design Unification & Modernization
The project was suffering from design inconsistency (sharp vs. rounded corners, fragmented styles). The objective was to unify the aesthetic into a friendly, professional, and cohesive "Shadcn-like" design using Tailwind CSS.

## Key Decisions

### 1. Unified Visual Language
- **Rounding Strategy**: Adopted a "friendly" design language with large border radii (`rounded-3xl`, `rounded-4xl`, and `rounded-5xl`). This creates a softer, more modern interface compared to the previous mix of sharp and slightly rounded corners.
- **Glassmorphism**: Used translucent backgrounds (`bg-zinc-900/50`) with backdrop blurs (`backdrop-blur-xl`) and subtle white borders (`border-white/5` or `border-white/10`) to create a "glass" effect that works well with dark themes.
- **Color Palette**: Focused on a core palette of Twitch Purple (`#9147ff`), deep backgrounds (`#0e0e10`), and Zinc-based grays for text and secondary elements.

### 2. Typography & Iconography
- **Font**: Unified the project under **Plus Jakarta Sans**, a modern geometric sans-serif that provides great readability and a friendly tone.
- **Icons**: Integrated **Lucide Icons** via CDN. This replaced fragmented manual SVGs with a consistent, high-quality icon set that matches the professional aesthetic of modern web apps.

### 3. Tailwind CSS Refactoring
- **Config Update**: Enhanced `tailwind.config.js` with custom `twitch` colors, expanded `borderRadius` (up to `5xl`), and prioritized the new font family.
- **Utility First**: Removed most custom CSS blocks in favor of Tailwind utility classes. This makes the code easier to maintain and ensures visual consistency across all pages.
- **Build Process**: Re-minified `output.css` to include the new utility classes used in the redesigned `index.html` and auth pages.

### 4. Component Redesign
- **Dashboard Cards**: Redesigned as cohesive units with consistent padding, internal spacing, and hover effects (lifting up on hover).
- **Edge-to-Edge Previews**: Applied negative margins (`-mx-6 -mt-6`) to the preview containers and `overflow-hidden` to the cards. This makes the live previews sit flush against the top and sides of the card, creating a more immersive and professional "gallery" look while preserving the 24px internal padding for descriptive text and action buttons.
- **Removed Global Customizer**: Eliminated the "Global Appearance" sidebar. Since widgets like "Thermal Receipt" and "Modern Chat" have fundamentally different design goals, a shared global theme was counter-productive. This simplifies the dashboard and ensures each widget's unique design remains intact.
- **Auth Flow**: The `oauth.html` and `callback.html` pages were completely redesigned to match the home page, providing a seamless transition for users when connecting their accounts.

### 5. Active Chatter / Bubble Overlay Enhancements
- **Dynamic Profile Pictures**: Integrated the Twitch Helix API to fetch and display actual user profile pictures in the chatter bubbles.
- **Display Modes**: Implemented a toggleable display mode system allowing users to switch between profile pictures and name initials.
- **Chat Commands**: Added moderator commands `!chatterPic` and `!chatterLetter` to control the display mode directly from Twitch chat.
- **Fallback Mechanism**: Maintained the initial-based bubbles as a fallback while the API fetches the image, or if the API connection is not available.
- **Persistence**: Both chatter data (including profile URLs) and the preferred display mode are cached in local storage.
- **Visual Refinement**: Added a subtle border and optimized background sizing (`cover/center`) for the profile images to maintain the "bubble" aesthetic while improving personalization.

### 6. Dynamic Stream Goals & Counters
- **Multi-Range Tracking**: Refactored `StreamStatsService` to use a baseline system. This allows counters to display growth over specific periods: `day` (today), `month`, `session`, or `all-time`.
- **Baseline Logic**: The system captures the absolute total from Twitch API and sets it as a baseline when a new period is detected (e.g., first stream of the day). Relative counts are then calculated as `Current Total - Baseline`.
- **Goal Support**: Added a `target` parameter to follower and subscriber widgets. If provided, the widget transforms from a simple counter to a goal display (e.g., `10/100`).
- **URL Configuration**: Ranges and targets are configurable via URL parameters, making it easy to set up multiple instances of the same widget for different goals (e.g., one for "Daily Follows" and one for "Monthly Sub Goal").

## Technical Improvements
- **Iframe Previews**: Improved the scaling and centering of widget previews within the cards.
- **Responsiveness**: Used Tailwind's responsive utilities (`md:`, `lg:`) to ensure the grid and hero sections look great on all devices.
- **Interactive States**: Added smooth transitions, active-scale effects on buttons, and color changes on success/copy actions to provide better user feedback.
- **Asynchronous Data Fetching**: Updated the `ChatterTracker` to handle asynchronous API calls for user metadata, ensuring the UI remains responsive and updates smoothly as data arrives.
- **Shared State via LocalStorage**: Utilized `localStorage` to synchronize baselines and last known totals across multiple widget instances and the alerts system, ensuring data consistency.

