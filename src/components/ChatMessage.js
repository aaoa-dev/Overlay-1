/**
 * Chat Message Component
 * Renders chat messages with badges, emotes, and animations
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';

export class ChatMessage {
    /**
     * @param {Object} tags - Message tags from TMI
     * @param {string} message - Message content
     * @param {Object} options - Rendering options
     */
    constructor(tags, message, options = {}) {
        this.tags = tags;
        this.message = message;
        this.messageId = `${tags['message-id'] || Date.now()}-${tags['user-id']}`;
        this.options = {
            showUserInfo: options.showUserInfo !== false,
            badgeUrlResolver: options.badgeUrlResolver || this.defaultBadgeUrl,
            ...options
        };
    }

    /**
     * Render the message element
     * @returns {HTMLElement} Message element
     */
    render() {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'message-wrapper';
        messageWrapper.style.display = 'inline-block';
        messageWrapper.style.transformOrigin = 'right';

        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.dataset.messageId = this.messageId;

        // Add user info (badges + username) if needed
        if (this.options.showUserInfo) {
            this.renderBadges(messageElement);
            this.renderUsername(messageElement);
        }

        // Add message text
        this.renderMessage(messageElement);

        messageWrapper.appendChild(messageElement);
        return messageWrapper;
    }

    /**
     * Render badges
     * @param {HTMLElement} parent - Parent element
     */
    renderBadges(parent) {
        if (!this.tags.badges && !this.tags['badges-raw']) return;

        const badgeContainer = document.createElement('span');
        badgeContainer.className = 'badge-container';

        const badgeData = this.parseBadges();

        badgeData.forEach(({ type, version }) => {
            const badgeImg = document.createElement('img');
            badgeImg.className = 'badge';
            badgeImg.src = this.options.badgeUrlResolver(type, version);
            badgeImg.alt = type;
            badgeImg.onerror = () => {
                ErrorHandler.warn('Badge failed to load', { type, version });
            };
            badgeContainer.appendChild(badgeImg);
        });

        parent.appendChild(badgeContainer);
    }

    /**
     * Parse badges from tags
     * @returns {Array} Badge data
     */
    parseBadges() {
        if (this.tags['badges-raw']) {
            return this.tags['badges-raw'].split(',').map(badge => {
                const [type, version] = badge.split('/');
                return { type, version };
            });
        }

        if (this.tags.badges) {
            return Object.entries(this.tags.badges).map(([type, version]) => ({
                type,
                version
            }));
        }

        return [];
    }

    /**
     * Render username
     * @param {HTMLElement} parent - Parent element
     */
    renderUsername(parent) {
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.style.color = this.tags.color || '#ffffff';
        usernameSpan.textContent = this.tags['display-name'] || this.tags.username;
        parent.appendChild(usernameSpan);
    }

    /**
     * Render message text with emotes
     * @param {HTMLElement} parent - Parent element
     */
    renderMessage(parent) {
        const messageText = document.createElement('span');
        messageText.className = 'message-text';

        // 1. Process 3rd Party Emotes first on raw text (before escaping)
        // to avoid issues with escaped characters in emote codes
        let processedMessage = this.message;
        
        // 2. Escape HTML for security
        processedMessage = this.escapeHtml(processedMessage);

        // 3. Process Twitch Emotes
        // Twitch emotes use offsets, so we process them on the original text 
        // but insert into the HTML-escaped text.
        if (this.tags.emotes && Object.keys(this.tags.emotes).length > 0) {
            processedMessage = this.processTwitchEmotes(processedMessage);
        }

        // 4. Process 3rd Party Emotes (after Twitch emotes, avoiding HTML tags)
        if (this.options.emoteService) {
            processedMessage = this.process3rdPartyEmotes(processedMessage);
        }

        // 5. Process Image Links (Broadcaster, Mod, VIP only)
        if (this.options.allowImageLinks && this.isPrivileged()) {
            processedMessage = this.processImageLinks(processedMessage);
        }

        messageText.innerHTML = processedMessage;
        parent.appendChild(messageText);
    }

    /**
     * Process 3rd party emotes safely
     */
    process3rdPartyEmotes(html) {
        // Split by HTML tags to only replace text outside of tags
        const parts = html.split(/(<[^>]*>)/g);
        return parts.map(part => {
            if (part.startsWith('<')) return part;
            return this.options.emoteService.processText(part);
        }).join('');
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Process Twitch emotes in message
     */
    processTwitchEmotes(escapedMessage) {
        const emotePositions = [];

        // Collect all emote positions
        Object.entries(this.tags.emotes).forEach(([id, positions]) => {
            positions.forEach(position => {
                const [start, end] = position.split('-').map(Number);
                emotePositions.push({ start, end, id });
            });
        });

        // Sort by start position (descending) to replace from end to start
        emotePositions.sort((a, b) => b.start - a.start);

        let processed = this.message; // Start with raw message for correct offsets
        
        // Replace emotes with placeholders
        emotePositions.forEach(({ start, end, id }) => {
            const emoteImg = `__EMOTE_${id}__`;
            processed = this.replaceRange(processed, start, end + 1, emoteImg);
        });

        // Escape the message with placeholders
        processed = this.escapeHtml(processed);

        // Replace placeholders with actual <img> tags
        emotePositions.forEach(({ id }) => {
            const placeholder = this.escapeHtml(`__EMOTE_${id}__`);
            const emoteImg = `<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0" alt="twitch emote" />`;
            processed = processed.split(placeholder).join(emoteImg);
        });

        return processed;
    }

    /**
     * Replace a range in a string
     */
    replaceRange(s, start, end, substitute) {
        return s.substring(0, start) + substitute + s.substring(end);
    }

    /**
     * Process image links
     */
    processImageLinks(text) {
        // Only match URLs outside of HTML attributes
        const imageRegex = /(^|\s)(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?\S+)?)/gi;
        return text.replace(imageRegex, (match, space, url) => {
            return `${space}<img class="chat-image" src="${url}" alt="user image" onerror="this.style.display='none'" />`;
        });
    }

    /**
     * Check if user has special privileges
     */
    isPrivileged() {
        // Use custom check if provided
        if (typeof this.options.isPrivilegedCheck === 'function') {
            return this.options.isPrivilegedCheck(this.tags);
        }

        if (!this.tags) return false;
        
        // Handle test tags or raw tags
        const badges = this.tags.badges || {};
        
        const isBroadcaster = badges.broadcaster === '1';
        const isMod = this.tags.mod === true || badges.moderator === '1';
        const isVip = badges.vip === '1';

        return isBroadcaster || isMod || isVip;
    }

    /**
     * Process emotes in message (Legacy/Internal)
     * @returns {string} HTML with emote images
     */
    processEmotes() {
        return this.processTwitchEmotes(this.escapeHtml(this.message));
    }

    /**
     * Default badge URL resolver
     * @param {string} type - Badge type
     * @param {string} version - Badge version
     * @returns {string} Badge URL
     */
    defaultBadgeUrl(type, version) {
        return `https://static-cdn.jtvnw.net/badges/v2/${type}/${version}/3`;
    }

    /**
     * Check if message should be filtered
     * @returns {boolean} True if should be filtered
     */
    shouldFilter() {
        // Filter commands
        if (this.message.startsWith('!') || this.message.startsWith('/')) {
            return true;
        }

        return false;
    }

    /**
     * Get message ID
     * @returns {string} Unique message ID
     */
    getMessageId() {
        return this.messageId;
    }

    /**
     * Get user ID
     * @returns {string} User ID
     */
    getUserId() {
        return this.tags['user-id'];
    }

    /**
     * Get username
     * @returns {string} Username
     */
    getUsername() {
        return this.tags.username;
    }
}

