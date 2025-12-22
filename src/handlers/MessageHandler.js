/**
 * Message Handler
 * Coordinates multiple message handlers for different features
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';

export class MessageHandler {
    constructor(twitchService) {
        this.twitchService = twitchService;
        this.handlers = new Map();
        this.filters = [];
    }

    /**
     * Register a message handler
     * @param {string} name - Handler name
     * @param {Function} handler - Handler function (channel, tags, message) => void
     * @param {Object} options - Handler options
     */
    registerHandler(name, handler, options = {}) {
        this.handlers.set(name, {
            handler,
            enabled: options.enabled !== false,
            priority: options.priority || 0
        });
        
        ErrorHandler.debug(`Registered handler: ${name}`, options);
    }

    /**
     * Unregister a handler
     * @param {string} name - Handler name
     */
    unregisterHandler(name) {
        this.handlers.delete(name);
    }

    /**
     * Enable/disable a handler
     * @param {string} name - Handler name
     * @param {boolean} enabled - Enabled state
     */
    setHandlerEnabled(name, enabled) {
        const handler = this.handlers.get(name);
        if (handler) {
            handler.enabled = enabled;
        }
    }

    /**
     * Register a message filter
     * @param {Function} filter - Filter function (channel, tags, message) => boolean
     */
    registerFilter(filter) {
        this.filters.push(filter);
    }

    /**
     * Start listening to messages
     */
    start() {
        if (!this.twitchService.client) {
            throw new Error('Twitch service not initialized');
        }

        this.twitchService.on('message', (channel, tags, message, self) => {
            this.handleMessage(channel, tags, message, self);
        });

        ErrorHandler.info('Message handler started');
    }

    /**
     * Handle incoming message
     * @param {string} channel - Channel name
     * @param {Object} tags - Message tags
     * @param {string} message - Message content
     * @param {boolean} self - Is own message
     */
    async handleMessage(channel, tags, message, self) {
        // Skip own messages
        if (self) return;

        // Apply filters
        for (const filter of this.filters) {
            try {
                if (!filter(channel, tags, message)) {
                    return; // Message filtered out
                }
            } catch (error) {
                ErrorHandler.handle(error, 'message_filter');
            }
        }

        // Execute handlers by priority
        const sortedHandlers = Array.from(this.handlers.entries())
            .filter(([_, config]) => config.enabled)
            .sort((a, b) => b[1].priority - a[1].priority);

        for (const [name, config] of sortedHandlers) {
            try {
                await config.handler(channel, tags, message);
            } catch (error) {
                ErrorHandler.handle(error, `message_handler_${name}`, {
                    channel,
                    username: tags.username,
                    message: message.substring(0, 50)
                });
            }
        }
    }

    /**
     * Common filters
     */
    static filters = {
        // Filter out command messages
        noCommands: (channel, tags, message) => {
            return !message.startsWith('!') && !message.startsWith('/');
        },

        // Filter by user type
        modsOnly: (channel, tags, message) => {
            return tags.mod || tags.badges?.broadcaster;
        },

        subscribersOnly: (channel, tags, message) => {
            return tags.subscriber || tags.badges?.broadcaster;
        },

        // Filter by message length
        minLength: (length) => {
            return (channel, tags, message) => message.length >= length;
        },

        maxLength: (length) => {
            return (channel, tags, message) => message.length <= length;
        }
    };
}

