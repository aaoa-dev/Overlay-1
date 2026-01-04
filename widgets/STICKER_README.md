# Sticker Overlay

An interactive sticker overlay that responds to Twitch chat messages and commands with a realistic peel effect.

## Features

- **Chat Integration**: Trigger stickers via chat commands or specific messages
- **Realistic Peel Effect**: Automatic peel animation that "slaps" onto screen, teases a peel, then peels off
- **Customizable Images**: Use single images or randomize from a collection
- **File Upload Support**: Upload images from disk or use URLs
- **Automatic Animation**: Stickers animate themselves - perfect for OBS overlays
- **Auto-Removal**: Stickers automatically peel off after a set duration
- **Settings Panel**: Easy-to-use sidebar for configuration

## Setup

1. **Add to OBS**:
   - Add a Browser Source in OBS
   - Set URL to: `http://localhost:5173/widgets/sticker.html` (or your deployed URL)
   - Recommended size: 1920x1080
   - Check "Shutdown source when not visible" for better performance

2. **Configure Settings**:
   - Click the settings gear icon in the top-right corner
   - Configure your trigger (command or message)
   - Add your images (URL or upload from disk)
   - Adjust animation settings
   - Click "Save Settings"

## Settings Options

### Trigger Settings
- **Trigger Type**: Choose between Command, Chat Message, or Both
- **Command/Message**: The text that triggers the sticker
  - For commands: Include the `!` prefix (e.g., `!sticker`)
  - For messages: Enter the exact text to match

### Image Settings
- **Use Random Images**: Toggle to enable multiple images
- **Single Image Mode**:
  - Choose between URL or file upload
  - Preview your image before saving
- **Multiple Images Mode**:
  - Add unlimited images to the pool
  - Each trigger randomly selects one image
  - Mix URLs and uploaded files

### Animation Settings
- **Display Duration**: How long stickers stay on screen (1-60 seconds)
- **Sticker Size**: Size in pixels (50-500px)
- **Max Simultaneous Stickers**: Limit concurrent stickers (1-20)

## Usage

### Basic Command
```
!sticker
```
This will spawn a sticker at a random position on screen.

### Custom Message Trigger
Set the trigger to "hype" and trigger type to "message", then any chat message containing "hype" will spawn a sticker.

### Testing
Use the "Test Sticker" button in the settings panel to preview your configuration without needing to send a chat message.

## Animation Sequence

1. **Peel On (1.2s)**: Sticker appears from above in a peeled state, then gets pressed down onto the screen
   - Starts lifted and rotated (-45deg)
   - Corner is peeled back (80%)
   - Smoothly presses down and sticks
   
2. **Peel Tease (1.5s, starts at 1.5s)**: After sticking, the corner playfully peels up slightly
   - Corner lifts to ~25%
   - Shows the flipped underside (flap effect)
   - Peels back down and sticks firmly
   
3. **Display**: Sticker remains on screen for the configured duration

4. **Peel Off (1.2s)**: Reverse of the peel-on animation
   - Corner peels up to 80%
   - Entire sticker lifts off screen
   - Rotates and moves up as it disappears

All animations are automatic - no user interaction required. Perfect for OBS browser sources!

## Technical Details

### Files
- `sticker.html` - Main HTML structure with SVG filters
- `sticker.css` - Styling and animations
- `sticker.js` - Logic and Twitch integration

### Dependencies
- TwitchService - For chat connection
- MessageHandler - For message processing
- StorageService - For settings persistence

### Performance
- Images are preloaded for smooth spawning
- Maximum sticker limit prevents performance issues
- Hardware-accelerated CSS animations
- Optimized for OBS browser sources

## Customization

### Adjust Peel Effect
Edit CSS variables in `sticker.css`:
```css
--sticker-rotate: 20deg;           /* Initial rotation */
--sticker-peelback-hover: 30%;     /* Hover peel amount */
--sticker-peelback-active: 60%;    /* Click peel amount */
```

### Change Animation Timing
Edit animation durations in `sticker.css`:
```css
@keyframes stickerPeelOn { ... }      /* Entry animation: 1.2s */
@keyframes stickerPeelTease { ... }   /* Peel tease: 1.5s (starts at 1.5s) */
@keyframes stickerPeelOff { ... }     /* Exit animation: 1.2s (reverse of peel-on) */
```

The peel-on and peel-off animations are perfectly mirrored for a satisfying effect.

### Modify SVG Effects
Adjust SVG filters in `sticker.html`:
- `pointLight` - Main sticker lighting
- `pointLightFlipped` - Flap lighting  
- `dropShadow` - Shadow effect
- `outerStroke` - Border/outline

## Troubleshooting

### Stickers Not Appearing
1. Check that Twitch is connected (check browser console)
2. Verify trigger command/message is correct
3. Ensure at least one image is configured
4. Test using the "Test Sticker" button

### Images Not Loading
1. Verify image URLs are accessible
2. Check CORS settings for external images
3. Try uploading the image instead of using a URL
4. Check browser console for errors

### Performance Issues
1. Reduce max simultaneous stickers
2. Use smaller image sizes
3. Reduce sticker size setting
4. Clear old stickers before spawning new ones

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may have minor filter differences)
- OBS Browser: Full support

## Credits

Original sticker effect by Balint Ferenczy
Adapted for Twitch overlay integration

