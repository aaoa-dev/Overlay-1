# Twitch Chat Overlay

A browser-based Twitch chat overlay designed for use with OBS Studio and other streaming software.

## Features

- Real-time Twitch chat messages with badges and emotes
- Animated message display with synchronized slide-in animations
- Command filtering (messages starting with ! or / are hidden)
- Authentication via Twitch OAuth
- Easy OBS Browser Source integration

## Setup Instructions

### Regular Browser Usage

1. Open the chat overlay in your browser
2. Click "Connect with Twitch" to authenticate
3. Once authenticated, you can view chat messages in real-time

### OBS Browser Source Setup

1. **Regular Authentication Method (Recommended)**:
   - First authenticate in a regular browser window
   - Click the "Copy OBS URL" button
   - In OBS, add a Browser Source and paste the copied URL

2. **Manual URL Parameter Method**:
   - Get your Twitch OAuth token from [Twitch Token Generator](https://twitchapps.com/tmi/)
   - Create a URL with the following format:
     ```
     https://your-site.com/Chat/chat.html?token=YOUR_TOKEN&username=YOUR_USERNAME&channel=CHANNEL_TO_WATCH
     ```
   - Add this URL to your OBS Browser Source

## Browser Source Settings in OBS

For best results, use these settings in your OBS Browser Source:

- Width: 800 (or match your screen width)
- Height: 600 (adjust based on how much chat history you want to see)
- Custom CSS: (leave empty to use overlay's built-in styles)
- Shutdown source when not visible: Unchecked
- Refresh browser when scene becomes active: Optional

## Troubleshooting

- **No messages appear**: Verify your authentication is working correctly
- **Missing badges**: Ensure your OBS browser cache is cleared
- **Animation issues**: Try refreshing the browser source

## Development

This project uses:
- TMI.js for Twitch chat connectivity
- Modern JavaScript with CSS animations
- Tailwind CSS for styling components

## License

MIT License - Feel free to use and modify for your own streams! 