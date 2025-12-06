/**
 * Chatters Display (Refactored)
 * 
 * This is the refactored version of script.js showing how to use the new services
 * 
 * To use this file, replace the script tag in index.html:
 * <script type="module" src="script-refactored.js" defer></script>
 */

import { TwitchService } from './services/TwitchService.js';
import { MessageHandler } from './handlers/MessageHandler.js';
import { ChatterTracker } from './commands/handlers/ChatterTracker.js';
import { TemperatureConverter } from './commands/handlers/TemperatureConverter.js';
import { CommandRegistry } from './commands/CommandRegistry.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

// Configuration
const CHATTER_CONFIG = {
    maxChatters: 8,
    timeoutMs: 60000, // 1 minute
    checkIntervalMs: 2000 // 2 seconds
};

/**
 * Initialize the application
 */
async function init() {
    try {
        ErrorHandler.info('Initializing chatters display...');

        // 1. Initialize Twitch Service
        const twitch = new TwitchService();
        await twitch.initialize({
            debug: false,
            validateToken: false
        });

        ErrorHandler.info('Twitch service initialized', {
            channel: twitch.getChannel(),
            username: twitch.getUsername()
        });

        // 2. Set up Chatter Tracker
        const chattersContainer = document.getElementById('chattersContainer');
        const chatterTracker = new ChatterTracker(CHATTER_CONFIG);
        chatterTracker.setContainer(chattersContainer);

        // 3. Set up Message Handler
        const messageHandler = new MessageHandler(twitch);

        // Register chatter tracking
        messageHandler.registerHandler('track_chatters', (channel, tags, message) => {
            chatterTracker.track(tags);
        });

        // Register temperature converter
        messageHandler.registerHandler('temperature', (channel, tags, message) => {
            TemperatureConverter.handleMessage(message, (msg) => twitch.say(msg));
        });

        // 4. Set up Command Registry
        const commands = new CommandRegistry(twitch);

        // Register refresh command
        commands.register('!refresh', async (context) => {
            ErrorHandler.info('Refresh triggered', { username: context.username });
            window.location.reload();
        }, {
            modOnly: true,
            description: 'Refresh the overlay (mods only)'
        });

        // Register command handler
        messageHandler.registerHandler('commands', (channel, tags, message) => {
            if (message.startsWith('!')) {
                commands.execute(message, tags, channel);
            }
        });

        // 5. Start message handling
        messageHandler.start();

        ErrorHandler.info('Application initialized successfully');

        // Display initialization message (optional)
        showStatus('Connected', 'success');

    } catch (error) {
        ErrorHandler.handle(error, 'init');
        showStatus('Failed to connect', 'error');
    }
}

/**
 * Show status message
 * @param {string} message - Status message
 * @param {string} type - Message type (success, error, info)
 */
function showStatus(message, type = 'info') {
    // You can implement a toast notification here if desired
    console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Handle page visibility changes
 * Useful for pausing/resuming when tab is hidden
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        ErrorHandler.debug('Page hidden');
    } else {
        ErrorHandler.debug('Page visible');
    }
});

/**
 * Handle errors globally
 */
window.addEventListener('error', (event) => {
    ErrorHandler.handle(event.error, 'global_error');
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.handle(event.reason, 'unhandled_rejection');
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

