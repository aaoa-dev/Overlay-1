# 🎮 Overlay-1 | Pro Streaming Widgets

Beautiful, lightweight, and high-performance overlays for Twitch. Level up your stream in one click with zero complex setup.

## ✨ Features

- **🚀 Instant Dashboard** - Manage all your overlays from a single central hub.
- **💬 Modern Chat** - Clean, pill-shaped design with smooth slide-in animations.
- **🧾 Thermal Receipt Chat** - A unique retro-style scrolling receipt aesthetic.
- **🔔 Smart Alerts** - Automated welcome messages for new and returning viewers.
- **📈 Live Counters** - Real-time follower and subscriber goals.
- **🎤 Voice Monitor** - AI-powered speech monitoring for your stream.
- **🎨 Global Customization** - Unified theme color and font size settings across all widgets.
- **🔐 Secure Auth** - Simple Twitch integration that prioritizes privacy.

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- A Twitch account

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd Overlay-1

# Install dependencies
npm install
```

### 3. Configuration
Copy the template and add your Twitch credentials:
```bash
cp config/config.template.js config/config.js
```
*Note: `config.js` is gitignored to keep your tokens safe.*

### 4. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` to access your Dashboard.

## 📡 OBS Integration

1. Open the **Dashboard** in your regular browser.
2. Click **"Connect with Twitch"** and log in.
3. Use the **Global Settings** to customize your theme.
4. Click **"Copy OBS URL"** for the widget you want.
5. In OBS, add a **Browser Source**, paste the URL, and set the dimensions:
   - **Modern Chat**: 800x600 (adjust as needed)
   - **Thermal Receipt Chat**: 450x1080
   - **Live Counters**: 400x200
6. **Important**: Uncheck "Shutdown source when not visible" to ensure widgets stay synced.

## 🏗️ Project Structure

- `/chats` - Chat-related overlays (Modern & Thermal).
- `/alerts` - Welcome systems and signature animations.
- `/widgets` - Live counters, chatters display, and voice monitor.
- `/src` - Core logic, services, and shared components.
- `/auth` - Twitch OAuth and authentication flows.

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - How to host your overlays on Cloudflare or GitHub Pages.
- **[Project Status](PROJECT_STATUS.md)** - Latest updates and architectural decisions.
- **[Development Guide](DEVELOPMENT.md)** - Technical details on the service-based architecture.

## 🛠️ Built With

- **TMI.js** - Twitch chat connectivity.
- **Vite** - Lightning-fast build tool and dev server.
- **Tailwind CSS** - Modern utility-first styling.
- **Canvas Confetti** - Celebration effects.

## 📝 License

MIT License - Feel free to use and modify for your own streams!
