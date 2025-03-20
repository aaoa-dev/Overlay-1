# Twitch Stream Overlay Project

This project contains various overlays for Twitch streams.

## Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Copy `config.example.js` to `config.js` and add your Twitch credentials
4. Run `npm run dev` to start the Tailwind CSS compiler

## Available Overlays

### 1. Chatter Display (Root Directory)
Shows active chatters in a circular display at the bottom of the screen.

**Usage:**
Open `index.html` in your browser or add as a browser source in OBS.

### 2. Alerts
Displays various alerts for stream events (follows, subs, etc.).

**Usage:**
Open `alerts.html` in your browser or add as a browser source in OBS.

### 3. Horizontal Chat (Chat Directory)
Displays chat messages horizontally with emote support.

**Features:**
- Shows Twitch badges
- Displays emotes inline
- Alternating message background colors
- Auto-removal of old messages
- Test button for previewing

**Usage:**
Open `Chat/index.html` in your browser or add as a browser source in OBS.

## Development

To modify the styles, edit the relevant CSS files and run:

```
npm run dev
```

This will watch for changes and compile the Tailwind CSS.

## Configuration

Update the `config.js` file with your Twitch credentials:

```javascript
export const config = {
    settings: {
        TWITCH: {
            USERNAME: 'your_username',
            OAUTH_TOKEN: 'oauth:your_token',
            CHANNEL_NAME: 'your_channel'
        },
    },
}
```

You can get an OAuth token from [Twitch Token Generator](https://twitchapps.com/tmi/). 