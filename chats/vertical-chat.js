/**
 * Vertical Chat Display (Refactored)
 * Messages stack vertically from bottom to top
 */

import { TwitchService } from '../src/services/TwitchService.js';
import { MessageHandler } from '../src/handlers/MessageHandler.js';
import { ChatMessage } from '../src/components/ChatMessage.js';
import { EmoteService } from '../src/services/EmoteService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

// Configuration & Default Settings
const defaultSettings = {
    maxMessages: 100,
    messageTimeout: 0, // 0 = never disappear
    autoScroll: true,
    filterCommands: true,
    allow3rdPartyEmotes: true,
    fontSize: 14,
    theme: 'auto', // 'auto', 'light', or 'dark'
    perms: {
        mod: true,
        vip: true,
        t3: false,
        t2: false,
        t1: false
    }
};

let CONFIG = { ...defaultSettings };

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
     * Check if user has special privileges based on current settings
     */
    isPrivilegedCheck(tags) {
        if (!tags) return false;
        const badges = tags.badges || {};
        
        // Broadcaster always has permission
        if (badges.broadcaster === '1') return true;
        
        // Check other permissions based on settings
        if (CONFIG.perms.mod && (tags.mod === true || badges.moderator === '1')) return true;
        if (CONFIG.perms.vip && badges.vip === '1') return true;
        
        // Subscriber tiers - Twitch uses versions like 1000, 2000, 3000 for tiers in some contexts,
        // but often the subscriber badge version is just months.
        // However, we'll check for the common tier indicators.
        if (badges.subscriber) {
            const version = parseInt(badges.subscriber);
            if (CONFIG.perms.t3 && version >= 3000) return true;
            if (CONFIG.perms.t2 && version >= 2000) return true;
            if (CONFIG.perms.t1 && version >= 1000) return true;
            
            // If it's just a regular sub and T1 is allowed, or if they have any sub badge
            if (CONFIG.perms.t1) return true;
        }
        
        return false;
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
                allowImageLinks: true, // We control this via isPrivilegedCheck
                isPrivilegedCheck: (tags) => this.isPrivilegedCheck(tags)
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
 * Settings Management
 */
function loadSettings() {
    // 1. Load from localStorage
    const saved = localStorage.getItem('thermal_chat_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            CONFIG = { ...defaultSettings, ...parsed, perms: { ...defaultSettings.perms, ...parsed.perms } };
        } catch (e) {
            console.error('Failed to parse settings', e);
        }
    }

    // 2. Load from URL params (overrides localStorage)
    const params = new URLSearchParams(window.location.search);
    if (params.has('fontSize')) CONFIG.fontSize = parseInt(params.get('fontSize'));
    if (params.has('theme')) CONFIG.theme = params.get('theme');
    if (params.has('emotes')) CONFIG.allow3rdPartyEmotes = params.get('emotes') === 'true';
    if (params.has('mod')) CONFIG.perms.mod = params.get('mod') === 'true';
    if (params.has('vip')) CONFIG.perms.vip = params.get('vip') === 'true';
    if (params.has('t3')) CONFIG.perms.t3 = params.get('t3') === 'true';
    if (params.has('t2')) CONFIG.perms.t2 = params.get('t2') === 'true';
    if (params.has('t1')) CONFIG.perms.t1 = params.get('t1') === 'true';

    applySettings();
    updateUIFromConfig();
}

function saveSettings() {
    localStorage.setItem('thermal_chat_settings', JSON.stringify(CONFIG));
    syncUrlWithSettings();
}

function applySettings() {
    // Apply theme to body
    document.body.setAttribute('data-theme', CONFIG.theme || 'auto');

    // Update global font size
    let style = document.getElementById('dynamic-thermal-settings');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-thermal-settings';
        document.head.appendChild(style);
    }
    style.textContent = `
        .chat-message { font-size: ${CONFIG.fontSize}px !important; }
        .message-text { font-size: ${CONFIG.fontSize}px !important; }
        .username { font-size: ${CONFIG.fontSize}px !important; }
    `;
}

function syncUrlWithSettings() {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    params.set('fontSize', CONFIG.fontSize);
    params.set('theme', CONFIG.theme);
    params.set('emotes', CONFIG.allow3rdPartyEmotes);
    params.set('mod', CONFIG.perms.mod);
    params.set('vip', CONFIG.perms.vip);
    params.set('t3', CONFIG.perms.t3);
    params.set('t2', CONFIG.perms.t2);
    params.set('t1', CONFIG.perms.t1);

    window.history.replaceState({}, '', url.toString());
}

function updateUIFromConfig() {
    const sizeInput = document.getElementById('setting-size');
    const sizeValue = document.getElementById('size-value');
    const themeSelect = document.getElementById('setting-theme');
    const emoteToggle = document.getElementById('setting-emotes');
    const modPerm = document.getElementById('perm-mod');
    const vipPerm = document.getElementById('perm-vip');
    const t3Perm = document.getElementById('perm-t3');
    const t2Perm = document.getElementById('perm-t2');
    const t1Perm = document.getElementById('perm-t1');

    if (sizeInput) sizeInput.value = CONFIG.fontSize;
    if (sizeValue) sizeValue.textContent = `${CONFIG.fontSize}px`;
    if (themeSelect) themeSelect.value = CONFIG.theme;
    if (emoteToggle) emoteToggle.checked = CONFIG.allow3rdPartyEmotes;
    if (modPerm) modPerm.checked = CONFIG.perms.mod;
    if (vipPerm) vipPerm.checked = CONFIG.perms.vip;
    if (t3Perm) t3Perm.checked = CONFIG.perms.t3;
    if (t2Perm) t2Perm.checked = CONFIG.perms.t2;
    if (t1Perm) t1Perm.checked = CONFIG.perms.t1;
}

function copyOBSUrl(twitchService) {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    
    // Ensure auth data is included
    const auth = twitchService.getAuthConfig();
    if (auth.token) params.set('token', auth.token);
    if (auth.username) params.set('username', auth.username);
    if (auth.channelId) params.set('channelId', auth.channelId);

    const copyBtn = document.getElementById('copy-obs-url');
    navigator.clipboard.writeText(url.toString()).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = 'COPIED!';
        copyBtn.style.background = '#22c55e';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = 'black';
        }, 2000);
    });
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

        // Load settings before creating display
        loadSettings();

        // Initialize Emote Service
        const emoteService = new EmoteService();
        const authConfig = twitchService.getAuthConfig();
        await emoteService.initialize(authConfig.channelId);

        // Fetch badges
        await twitchService.fetchBadges();

        // Initialize chat display
        const chatContainer = document.getElementById('chatContainer');
        const chatDisplay = new VerticalChatDisplay(chatContainer, twitchService, emoteService);

        // Set up message handler
        const messageHandler = new MessageHandler(twitchService);

        // Register chat display handler
        messageHandler.registerHandler('display', (channel, tags, message) => {
            chatDisplay.displayMessage(tags, message);
        });

        // Start message handling
        messageHandler.start();

        // UI Event Listeners
        const toggleBtn = document.getElementById('toggle-settings');
        const panel = document.getElementById('settings-panel');
        const resetBtn = document.getElementById('reset-settings');
        const copyBtn = document.getElementById('copy-obs-url');

        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('hidden');
                toggleBtn.setAttribute('aria-expanded', !panel.classList.contains('hidden'));
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!panel.classList.contains('hidden') && !panel.contains(e.target) && !toggleBtn.contains(e.target)) {
                    panel.classList.add('hidden');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                CONFIG = { ...defaultSettings, perms: { ...defaultSettings.perms } };
                saveSettings();
                applySettings();
                updateUIFromConfig();
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyOBSUrl(twitchService));
        }

        // Input listeners
        document.getElementById('setting-size')?.addEventListener('input', (e) => {
            CONFIG.fontSize = parseInt(e.target.value);
            document.getElementById('size-value').textContent = `${CONFIG.fontSize}px`;
            applySettings();
            saveSettings();
        });

        document.getElementById('setting-theme')?.addEventListener('change', (e) => {
            CONFIG.theme = e.target.value;
            applySettings();
            saveSettings();
        });

        document.getElementById('setting-emotes')?.addEventListener('change', (e) => {
            CONFIG.allow3rdPartyEmotes = e.target.checked;
            saveSettings();
        });

        ['mod', 'vip', 't3', 't2', 't1'].forEach(id => {
            document.getElementById(`perm-${id}`)?.addEventListener('change', (e) => {
                CONFIG.perms[id] = e.target.checked;
                saveSettings();
            });
        });

        // Make available globally for debugging
        window.chatDisplay = chatDisplay;
        window.twitchService = twitchService;

        // Test button functionality
        window.testMessage = (type = 'regular') => {
            const testTags = {
                'display-name': 'TestUser',
                'user-id': '123456',
                'message-id': Date.now().toString(),
                color: '#FF6B6B',
                badges: { broadcaster: '1' },
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

            const subTags = {
                'display-name': 'Subscriber',
                'user-id': '555555',
                'message-id': (Date.now() + 2).toString(),
                color: '#9147ff',
                badges: { subscriber: '3000' },
                username: 'subscriber'
            };

            if (type === 'regular') {
                chatDisplay.displayMessage(testTags, 'This is a test message in vertical chat! 👋');
            } else if (type === 'long') {
                chatDisplay.displayMessage(testTags, 'This is a much longer message to test word wrapping and how the vertical chat handles messages that span multiple lines.');
            } else if (type === 'image') {
                chatDisplay.displayMessage(subTags, 'Test image: https://placehold.co/400x200.png');
            } else if (type === 'emotes') {
                chatDisplay.displayMessage(testTags, 'Testing 3rd party emotes: EZ Clapped DanSexy SourPls');
            } else if (type === 'sequence') {
                chatDisplay.displayMessage(testTags, 'First message from TestUser');
                setTimeout(() => chatDisplay.displayMessage(testTags, 'Second message from same user'), 1000);
            } else if (type === 'clear') {
                chatDisplay.clear();
            }
        };

        ErrorHandler.info('Vertical chat initialized successfully');

    } catch (error) {
        ErrorHandler.handle(error, 'vertical_chat_init');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { VerticalChatDisplay };
