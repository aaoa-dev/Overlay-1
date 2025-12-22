# 🛠️ Development Guide

This document covers the technical architecture and development patterns used in Overlay-1.

## 🏗️ Architecture Overview

The project follows a **Service-Based Architecture** to ensure reliability and maintainability.

### 1. Core Services (`/src/services`)
- **`TwitchService.js`**: The primary entry point. Manages the TMI.js client, handles authentication priority (URL params > LocalStorage > Config), and provides unified event listeners.
- **`TwitchAPI.js`**: Handles all raw Helix API requests (badges, follower counts, etc.) with built-in caching.
- **`StorageService.js`**: Centralized wrapper for `localStorage` with consistent keys and error handling.

### 2. Message Coordination (`/src/handlers`)
- **`MessageHandler.js`**: Coordinates multiple features listening to the same chat stream. It allows registering filters (e.g., "no commands") and multiple independent handlers.

### 3. Command System (`/src/commands`)
- **`CommandRegistry.js`**: A declarative system for registering chat commands with built-in support for:
  - Cooldowns (per-command)
  - Permissions (Mod-only, Broadcaster-only)
  - Parameter parsing

### 4. Shared Components (`/src/components`)
- **`ChatMessage.js`**: A reusable class for rendering Twitch messages with badges and emotes.
- **`Alert.js`**: Manages the alert queue to prevent notifications from overlapping.

## 🎨 Theme System

All overlays support global theme injection via URL parameters:
- `themeColor`: A hex code (without #) that updates borders, accents, and user colors.
- `fontSize`: A base pixel value for all text elements.

The Dashboard (`index.html`) automatically appends these when you use the "Copy OBS URL" or "Open Overlay" buttons.

## 🔧 Workflow

### Adding a New Overlay
1. Create your HTML/JS/CSS in the appropriate folder (`chats/`, `alerts/`, or `widgets/`).
2. Add the overlay metadata to the `OVERLAYS` array in `index.html`.
3. Use the shared services in `src/` to handle Twitch connectivity.

### Building for Production
```bash
npm run build
```
This will generate an optimized `dist/` folder ready for static hosting.

## 🐛 Debugging
- All services use the **`ErrorHandler.js`** utility.
- Check the browser console for detailed logs categorized by service.
- You can set `localStorage.setItem('debug_level', 'debug')` to see verbose internal logs.
