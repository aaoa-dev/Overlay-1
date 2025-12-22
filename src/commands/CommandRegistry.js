/**
 * Command Registry
 * Manages chat commands with permissions and cooldowns
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';

export class CommandRegistry {
    constructor(twitchService) {
        this.twitchService = twitchService;
        this.commands = new Map();
        this.cooldowns = new Map();
    }

    /**
     * Register a command
     * @param {string|string[]} triggers - Command trigger(s) (e.g., '!help' or ['!temp', '!temperature'])
     * @param {Function} handler - Command handler (context) => void
     * @param {Object} options - Command options
     */
    register(triggers, handler, options = {}) {
        const triggerArray = Array.isArray(triggers) ? triggers : [triggers];
        
        const commandConfig = {
            handler,
            modOnly: options.modOnly || false,
            broadcasterOnly: options.broadcasterOnly || false,
            subscriberOnly: options.subscriberOnly || false,
            cooldown: options.cooldown || 0, // seconds
            description: options.description || '',
            enabled: options.enabled !== false
        };

        triggerArray.forEach(trigger => {
            this.commands.set(trigger.toLowerCase(), commandConfig);
        });

        ErrorHandler.debug(`Registered command: ${triggerArray.join(', ')}`, options);
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
            ErrorHandler.warn(`User ${context.username} tried to use broadcaster-only command: ${trigger}`);
            return false;
        }

        if (command.modOnly && !context.isMod && !context.isBroadcaster) {
            ErrorHandler.warn(`User ${context.username} tried to use mod-only command: ${trigger}`);
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
                ErrorHandler.debug(`Command ${trigger} on cooldown for ${context.username} (${remaining}s remaining)`);
                return false;
            }

            this.cooldowns.set(cooldownKey, now);
        }

        // Execute command
        try {
            await command.handler(context);
            ErrorHandler.debug(`Executed command: ${trigger}`, { username: context.username, args });
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
     * @param {string} trigger - Command trigger
     * @param {boolean} enabled - Enabled state
     */
    setEnabled(trigger, enabled) {
        const command = this.commands.get(trigger.toLowerCase());
        if (command) {
            command.enabled = enabled;
        }
    }

    /**
     * Unregister a command
     * @param {string} trigger - Command trigger
     */
    unregister(trigger) {
        this.commands.delete(trigger.toLowerCase());
    }

    /**
     * Get all registered commands
     * @returns {Array} Command list
     */
    list() {
        return Array.from(this.commands.entries()).map(([trigger, config]) => ({
            trigger,
            ...config
        }));
    }

    /**
     * Clear cooldowns (useful for testing or reset)
     */
    clearCooldowns() {
        this.cooldowns.clear();
    }
}

