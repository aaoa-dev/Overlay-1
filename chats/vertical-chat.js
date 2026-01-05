/**
 * Vertical Chat Display (Refactored)
 * Messages stack vertically from bottom to top
 */

import { TwitchService } from '../src/services/TwitchService.js';
import { MessageHandler } from '../src/handlers/MessageHandler.js';
import { ChatMessage } from '../src/components/ChatMessage.js';
import { EmoteService } from '../src/services/EmoteService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

// Configuration
const CONFIG = {
    maxMessages: 100,
    messageTimeout: 0, // 0 = never disappear
    autoScroll: true,
    filterCommands: true,
    allow3rdPartyEmotes: true,
    allowImageLinks: true
};

class VerticalChatDisplay {
    constructor(container, twitchService, emoteService) {
        this.container = container;
        this.receiptPaper = document.getElementById('receiptPaper');
        this.twitchService = twitchService;
        this.emoteService = emoteService;
        this.messages = [];
        this.lastMessageSenderId = null;
        this.isPrinting = false;
    }

    /**
     * Display a chat message
     */
    displayMessage(tags, message) {
        try {
            // Skip if filtering commands
            if (CONFIG.filterCommands && (message.startsWith('!') || message.startsWith('/'))) {
                return;
            }

            const currentUserId = tags['user-id'];
            const isSameUser = currentUserId && currentUserId === this.lastMessageSenderId;

            // Create message component
            const chatMessage = new ChatMessage(tags, message, {
                showUserInfo: !isSameUser,
                badgeUrlResolver: (type, version) => this.twitchService.getBadgeUrl(type, version),
                emoteService: CONFIG.allow3rdPartyEmotes ? this.emoteService : null,
                allowImageLinks: CONFIG.allowImageLinks
            });

            // Check if should filter
            if (chatMessage.shouldFilter()) {
                return;
            }

            // Render message
            const messageWrapper = this.createMessageWrapper(chatMessage);
            
            // Add message with printer animation
            this.printMessage(messageWrapper);

            // Update last sender
            this.lastMessageSenderId = currentUserId;

            // Add to messages array
            this.messages.push({
                element: messageWrapper,
                timestamp: Date.now(),
                userId: currentUserId
            });

            // Remove old messages
            this.cleanupOldMessages();

            ErrorHandler.debug('Message displayed', {
                username: tags.username,
                length: message.length
            });

        } catch (error) {
            ErrorHandler.handle(error, 'display_message', {
                username: tags.username
            });
        }
    }

    /**
     * Print message with thermal printer animation
     * Slides entire receipt up smoothly
     */
    printMessage(messageWrapper) {
        // Add message to receipt paper
        this.receiptPaper.appendChild(messageWrapper);

        // Force layout calculation
        const messageHeight = messageWrapper.offsetHeight;

        // Start from below (like paper coming out of printer)
        this.receiptPaper.style.transition = 'none';
        this.receiptPaper.style.transform = `translateY(${messageHeight}px)`;

        // Force reflow
        this.receiptPaper.offsetHeight;

        // Animate up smoothly - everything moves together
        requestAnimationFrame(() => {
            this.receiptPaper.style.transition = 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)';
            this.receiptPaper.style.transform = 'translateY(0)';
        });
    }

    /**
     * Create message wrapper with custom structure for vertical layout
     */
    createMessageWrapper(chatMessage) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';

        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';

        // Create header if showing user info
        if (chatMessage.options.showUserInfo) {
            const header = document.createElement('div');
            header.className = 'message-header';

            // Use ChatMessage component to render badges and username
            chatMessage.renderBadges(header);
            chatMessage.renderUsername(header);

            messageElement.appendChild(header);
        }

        // Add message text using ChatMessage component (handles Twitch emotes, 3rd party emotes, and image links)
        chatMessage.renderMessage(messageElement);

        wrapper.appendChild(messageElement);

        return wrapper;
    }

    /**
     * Remove old messages
     */
    cleanupOldMessages() {
        const now = Date.now();

        // Remove messages exceeding max count
        while (this.messages.length > CONFIG.maxMessages) {
            const oldest = this.messages.shift();
            if (oldest && oldest.element) {
                this.removeMessage(oldest.element);
            }
        }

        // Remove timed out messages (only if messageTimeout > 0)
        if (CONFIG.messageTimeout > 0) {
            this.messages = this.messages.filter(msg => {
                if (now - msg.timestamp > CONFIG.messageTimeout) {
                    this.removeMessage(msg.element);
                    return false;
                }
                return true;
            });
        }
    }

    /**
     * Remove a message with fade out animation
     */
    removeMessage(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            if (element.parentNode) {
                element.remove();
            }
        }, 300);
    }

    /**
     * Clear all messages
     */
    clear() {
        this.messages.forEach(msg => {
            this.removeMessage(msg.element);
        });
        this.messages = [];
        this.lastMessageSenderId = null;
        // Reset transform
        this.receiptPaper.style.transform = 'translateY(0)';
    }
}

/**
 * Initialize the vertical chat
 */
async function init() {
    try {
        ErrorHandler.info('Initializing vertical chat...');

        // Initialize Twitch Service
        const twitchService = new TwitchService();
        await twitchService.initialize();

        ErrorHandler.info('Twitch service initialized', {
            channel: twitchService.getChannel(),
            username: twitchService.getUsername()
        });

        // Initialize Emote Service (7TV, BTTV, FFZ)
        const emoteService = new EmoteService();
        const authConfig = twitchService.getAuthConfig();
        await emoteService.initialize(authConfig.channelId);

        // Fetch badges
        await twitchService.fetchBadges();

        // Apply theme settings if available
        const theme = twitchService.authConfig.theme;
        if (theme && (theme.color || theme.fontSize)) {
            const style = document.createElement('style');
            let css = '';
            if (theme.color) {
                css += `.chat-message::after { background: repeating-linear-gradient(to right, ${theme.color} 0px, ${theme.color} 5px, transparent 5px, transparent 10px) !important; }\n`;
                css += `.username { color: ${theme.color} !important; }\n`;
            }
            if (theme.fontSize) {
                css += `body { font-size: ${theme.fontSize}px !important; }\n`;
            }
            style.textContent = css;
            document.head.appendChild(style);
        }

        // Initialize chat display
        const chatContainer = document.getElementById('chatContainer');
        const receiptPaper = document.getElementById('receiptPaper');
        const chatDisplay = new VerticalChatDisplay(chatContainer, twitchService, emoteService);

        // Set up message handler
        const messageHandler = new MessageHandler(twitchService);

        // Register chat display handler
        messageHandler.registerHandler('display', (channel, tags, message) => {
            chatDisplay.displayMessage(tags, message);
        });

        // Start message handling
        messageHandler.start();

        // Make available globally for debugging
        window.chatDisplay = chatDisplay;
        window.twitchService = twitchService;

        ErrorHandler.info('Vertical chat initialized successfully');

        // Connect UI toggles
        const emoteToggle = document.getElementById('toggle-emotes');
        const imageToggle = document.getElementById('toggle-images');

        if (emoteToggle) {
            emoteToggle.addEventListener('change', (e) => {
                CONFIG.allow3rdPartyEmotes = e.target.checked;
                ErrorHandler.info(`3rd party emotes ${CONFIG.allow3rdPartyEmotes ? 'enabled' : 'disabled'}`);
            });
        }

        if (imageToggle) {
            imageToggle.addEventListener('change', (e) => {
                CONFIG.allowImageLinks = e.target.checked;
                ErrorHandler.info(`Image links ${CONFIG.allowImageLinks ? 'enabled' : 'disabled'}`);
            });
        }

        // Test button functionality
        window.testMessage = (type = 'regular') => {
            const testTags = {
                'display-name': 'TestUser',
                'user-id': '123456',
                'message-id': Date.now().toString(),
                color: '#FF6B6B',
                badges: { broadcaster: '1' }, // Added broadcaster badge for testing image links
                username: 'testuser'
            };

            const secondUserTags = {
                'display-name': 'AnotherUser',
                'user-id': '789012',
                'message-id': (Date.now() + 1).toString(),
                color: '#4ECDC4',
                badges: { moderator: '1' },
                username: 'anotheruser'
            };

            if (type === 'regular') {
                chatDisplay.displayMessage(testTags, 'This is a test message in vertical chat! 👋');
            } else if (type === 'long') {
                chatDisplay.displayMessage(testTags, 'This is a much longer message to test word wrapping and how the vertical chat handles messages that span multiple lines. It should wrap nicely and remain readable! 🎉');
            } else if (type === 'image') {
                chatDisplay.displayMessage(testTags, 'Check out this cool image: https://placehold.co/400x200.png');
            } else if (type === 'emotes') {
                // Using DanSexy (FFZ Global) and SourPls (BTTV Global) for guaranteed tests
                chatDisplay.displayMessage(testTags, 'Testing 3rd party emotes: EZ Clapped DanSexy SourPls');
            } else if (type === 'sequence') {
                chatDisplay.displayMessage(testTags, 'First message from TestUser');
                
                setTimeout(() => {
                    chatDisplay.displayMessage(testTags, 'Second message from same user (no header)');
                }, 1000);
                
                setTimeout(() => {
                    chatDisplay.displayMessage(secondUserTags, 'Message from different user (has header)');
                }, 2000);
                
                setTimeout(() => {
                    chatDisplay.displayMessage(testTags, 'Back to TestUser (header returns)');
                }, 3000);
            } else if (type === 'clear') {
                chatDisplay.clear();
            }
        };

    } catch (error) {
        ErrorHandler.handle(error, 'vertical_chat_init');
        
        // Show error in UI
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.innerHTML = `
            <div style="color: white; background: rgba(239, 68, 68, 0.9); padding: 1rem; border-radius: 0.5rem; margin: 1rem;">
                <strong>Error:</strong> ${error.message}<br>
                <small>Check console for details</small>
            </div>
        `;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { VerticalChatDisplay };

