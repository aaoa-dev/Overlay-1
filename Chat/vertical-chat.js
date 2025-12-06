/**
 * Vertical Chat Display (Refactored)
 * Messages stack vertically from bottom to top
 */

import { TwitchService } from '../services/TwitchService.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { ChatMessage } from '../components/ChatMessage.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

// Configuration
const CONFIG = {
    maxMessages: 20,
    messageTimeout: 30000, // 30 seconds before old messages fade
    autoScroll: true,
    filterCommands: true
};

class VerticalChatDisplay {
    constructor(container, twitchService) {
        this.container = container;
        this.receiptPaper = document.getElementById('receiptPaper');
        this.twitchService = twitchService;
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
                badgeUrlResolver: (type, version) => this.twitchService.getBadgeUrl(type, version)
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

            // Add badges
            const badges = chatMessage.parseBadges();
            if (badges.length > 0) {
                const badgeContainer = document.createElement('span');
                badgeContainer.className = 'badge-container';

                badges.forEach(({ type, version }) => {
                    const badgeImg = document.createElement('img');
                    badgeImg.className = 'badge';
                    badgeImg.src = chatMessage.options.badgeUrlResolver(type, version);
                    badgeImg.alt = type;
                    badgeImg.onerror = () => {
                        ErrorHandler.warn('Badge failed to load', { type, version });
                    };
                    badgeContainer.appendChild(badgeImg);
                });

                header.appendChild(badgeContainer);
            }

            // Add username
            const username = document.createElement('span');
            username.className = 'username';
            username.style.color = chatMessage.tags.color || '#ffffff';
            username.textContent = chatMessage.tags['display-name'] || chatMessage.tags.username;
            header.appendChild(username);

            messageElement.appendChild(header);
        }

        // Add message text
        const messageText = document.createElement('div');
        messageText.className = 'message-text';

        if (chatMessage.tags.emotes && Object.keys(chatMessage.tags.emotes).length > 0) {
            messageText.innerHTML = chatMessage.processEmotes();
        } else {
            messageText.textContent = chatMessage.message;
        }

        messageElement.appendChild(messageText);
        wrapper.appendChild(messageElement);

        return wrapper;
    }

    /**
     * Remove old messages
     */
    cleanupOldMessages() {
        const now = Date.now();

        // Remove messages older than timeout or exceeding max count
        while (this.messages.length > CONFIG.maxMessages) {
            const oldest = this.messages.shift();
            this.removeMessage(oldest.element);
        }

        // Remove timed out messages
        this.messages = this.messages.filter(msg => {
            if (now - msg.timestamp > CONFIG.messageTimeout) {
                this.removeMessage(msg.element);
                return false;
            }
            return true;
        });
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

        // Fetch badges
        await twitchService.fetchBadges();

        // Initialize chat display
        const chatContainer = document.getElementById('chatContainer');
        const receiptPaper = document.getElementById('receiptPaper');
        const chatDisplay = new VerticalChatDisplay(chatContainer, twitchService);

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

        // Test button functionality
        window.testMessage = (type = 'regular') => {
            const testTags = {
                'display-name': 'TestUser',
                'user-id': '123456',
                'message-id': Date.now().toString(),
                color: '#FF6B6B',
                badges: { subscriber: '1' },
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

