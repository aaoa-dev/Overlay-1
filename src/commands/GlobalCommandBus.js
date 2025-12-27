/**
 * Global Command Bus
 * Centralized command system that broadcasts to all registered listeners
 * Uses BroadcastChannel API for cross-widget communication
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';

export class GlobalCommandBus {
    constructor(twitchService) {
        this.twitchService = twitchService;
        this.commands = new Map();
        this.listeners = new Map(); // Command -> Set of callbacks
        this.cooldowns = new Map();
        this.instanceId = Math.random().toString(36).substring(2, 15);
        
        // BroadcastChannel for cross-widget communication
        this.channel = new BroadcastChannel('overlay-commands');
        this.setupCrossWidgetListener();
    }

    /**
     * Register a command with handler
     * @param {string|string[]} triggers - Command trigger(s)
     * @param {Function} handler - Main command handler
     * @param {Object} options - Command options
     */
    register(triggers, handler, options = {}) {
        const triggerArray = Array.isArray(triggers) ? triggers : [triggers];
        
        const commandConfig = {
            handler,
            modOnly: options.modOnly || false,
            broadcasterOnly: options.broadcasterOnly || false,
            subscriberOnly: options.subscriberOnly || false,
            cooldown: options.cooldown || 0,
            description: options.description || '',
            enabled: options.enabled !== false,
            broadcast: options.broadcast !== false // Default to broadcasting
        };

        triggerArray.forEach(trigger => {
            this.commands.set(trigger.toLowerCase(), commandConfig);
            ErrorHandler.debug(`Registered command: ${trigger}`, options);
        });
    }

    /**
     * Subscribe to a command event (for widgets to listen)
     * @param {string} trigger - Command to listen for
     * @param {Function} callback - Callback(context) when command fires
     */
    subscribe(trigger, callback) {
        const key = trigger.toLowerCase();
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        ErrorHandler.debug(`Subscribed to command: ${trigger}`);
    }

    /**
     * Unsubscribe from a command event
     * @param {string} trigger 
     * @param {Function} callback 
     */
    unsubscribe(trigger, callback) {
        const key = trigger.toLowerCase();
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(callback);
        }
    }

    /**
     * Setup listener for commands from other widgets
     */
    setupCrossWidgetListener() {
        this.channel.onmessage = (event) => {
            // Ignore messages from self to prevent double execution
            if (event.data.senderId === this.instanceId) return;

            if (event.data.type === 'command') {
                this.notifyListeners(event.data.trigger, event.data.context);
            }
        };
    }

    /**
     * Notify all listeners of a command
     * @param {string} trigger 
     * @param {Object} context 
     */
    async notifyListeners(trigger, context) {
        const listeners = this.listeners.get(trigger.toLowerCase());
        if (!listeners || listeners.size === 0) return;

        for (const callback of listeners) {
            try {
                await callback(context);
            } catch (error) {
                ErrorHandler.handle(error, `command_listener_${trigger}`, {
                    username: context.username
                });
            }
        }
    }

    /**
     * Execute a command
     * @param {string} message - Full message
     * @param {Object} tags - Message tags
     * @param {string} channel - Channel name
     * @returns {Promise<boolean>} True if command was executed
     */
    async execute(message, tags, channel) {
        const parts = message.trim().split(' ');
        const trigger = parts[0].toLowerCase();
        const args = parts.slice(1);

        const command = this.commands.get(trigger);
        if (!command) return false;
        if (!command.enabled) return false;

        // Build context
        const context = {
            channel,
            tags,
            message,
            trigger,
            args,
            username: tags['display-name'] || tags.username,
            userId: tags['user-id'],
            isMod: tags.mod || false,
            isBroadcaster: !!tags.badges?.broadcaster,
            isSubscriber: tags.subscriber || false,
            twitchService: this.twitchService,
            reply: (msg) => {
                if (!this.twitchService.authConfig.noChat) {
                    return this.twitchService.say(msg);
                }
                return Promise.resolve();
            }
        };

        // Check permissions
        if (command.broadcasterOnly && !context.isBroadcaster) {
            ErrorHandler.warn(`User ${context.username} tried broadcaster-only: ${trigger}`);
            return false;
        }

        if (command.modOnly && !context.isMod && !context.isBroadcaster) {
            ErrorHandler.warn(`User ${context.username} tried mod-only: ${trigger}`);
            return false;
        }

        if (command.subscriberOnly && !context.isSubscriber && !context.isBroadcaster) {
            return false;
        }

        // Check cooldown
        if (command.cooldown > 0) {
            const cooldownKey = `${trigger}:${context.userId}`;
            const lastUsed = this.cooldowns.get(cooldownKey);
            const now = Date.now();

            if (lastUsed && (now - lastUsed) < command.cooldown * 1000) {
                const remaining = Math.ceil((command.cooldown * 1000 - (now - lastUsed)) / 1000);
                ErrorHandler.debug(`Command ${trigger} on cooldown (${remaining}s remaining)`);
                return false;
            }

            this.cooldowns.set(cooldownKey, now);
        }

        // Execute main handler
        try {
            await command.handler(context);
            ErrorHandler.debug(`Executed command: ${trigger}`, { username: context.username, args });

            // Broadcast to other widgets/listeners
            if (command.broadcast) {
                this.channel.postMessage({
                    type: 'command',
                    trigger,
                    senderId: this.instanceId,
                    context: {
                        trigger,
                        username: context.username,
                        args,
                        isMod: context.isMod,
                        isBroadcaster: context.isBroadcaster
                    }
                });

                // Notify local listeners
                await this.notifyListeners(trigger, context);
            }

            return true;
        } catch (error) {
            ErrorHandler.handle(error, `command_${trigger}`, {
                username: context.username,
                args,
                message
            });
            return false;
        }
    }

    /**
     * Enable/disable a command
     */
    setEnabled(trigger, enabled) {
        const command = this.commands.get(trigger.toLowerCase());
        if (command) {
            command.enabled = enabled;
        }
    }

    /**
     * Unregister a command
     */
    unregister(trigger) {
        this.commands.delete(trigger.toLowerCase());
        this.listeners.delete(trigger.toLowerCase());
    }

    /**
     * List all registered commands
     */
    list() {
        return Array.from(this.commands.entries()).map(([trigger, config]) => ({
            trigger,
            ...config
        }));
    }

    /**
     * Clear all cooldowns
     */
    clearCooldowns() {
        this.cooldowns.clear();
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.channel.close();
    }
}
