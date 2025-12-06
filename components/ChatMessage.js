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

        if (this.tags.emotes && Object.keys(this.tags.emotes).length > 0) {
            messageText.innerHTML = this.processEmotes();
        } else {
            messageText.textContent = this.message;
        }

        parent.appendChild(messageText);
    }

    /**
     * Process emotes in message
     * @returns {string} HTML with emote images
     */
    processEmotes() {
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

        let processedMessage = this.message;
        emotePositions.forEach(({ start, end, id }) => {
            const emoteImg = `<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0" />`;
            processedMessage = processedMessage.slice(0, start) + emoteImg + processedMessage.slice(end + 1);
        });

        return processedMessage;
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

