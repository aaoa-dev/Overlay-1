/**
 * Twitch API Client
 * Handles all Twitch API requests with proper error handling and retry logic
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';

export class TwitchAPI {
    /**
     * @param {string} clientId - Twitch Client ID
     * @param {string} accessToken - OAuth access token
     */
    constructor(clientId, accessToken) {
        this.clientId = clientId;
        this.accessToken = accessToken;
        this.baseURL = 'https://api.twitch.tv/helix';
        this.badgeCache = {
            global: null,
            channels: {}
        };
    }

    /**
     * Make a request to Twitch API
     * @param {string} endpoint - API endpoint (e.g., '/users')
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} API response
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Client-Id': this.clientId,
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `Twitch API Error: ${response.status} - ${errorData.message || response.statusText}`
                );
            }

            return await response.json();
        } catch (error) {
            ErrorHandler.handle(error, 'twitch_api_request', { endpoint, url });
            throw error;
        }
    }

    /**
     * Fetch user information
     * @param {string} login - Username (optional, defaults to authenticated user)
     * @returns {Promise<Object>} User data
     */
    async fetchUserInfo(login = null) {
        try {
            const params = login ? `?login=${login}` : '';
            const data = await this.request(`/users${params}`);
            return data.data[0];
        } catch (error) {
            ErrorHandler.handle(error, 'fetch_user_info', { login });
            throw error;
        }
    }

    /**
     * Fetch global chat badges
     * @param {boolean} useCache - Use cached data if available
     * @returns {Promise<Object>} Badge data
     */
    async fetchGlobalBadges(useCache = true) {
        if (useCache && this.badgeCache.global) {
            return this.badgeCache.global;
        }

        try {
            const data = await this.request('/chat/badges/global');
            const badges = {};
            
            data.data.forEach(badgeSet => {
                badges[badgeSet.set_id] = badgeSet.versions;
            });
            
            this.badgeCache.global = badges;
            ErrorHandler.info('Global badges loaded', { count: Object.keys(badges).length });
            
            return badges;
        } catch (error) {
            ErrorHandler.handle(error, 'fetch_global_badges');
            return {};
        }
    }

    /**
     * Fetch channel-specific chat badges
     * @param {string} channelId - Channel ID
     * @param {boolean} useCache - Use cached data if available
     * @returns {Promise<Object>} Badge data
     */
    async fetchChannelBadges(channelId, useCache = true) {
        if (!channelId) {
            ErrorHandler.warn('No channel ID provided for badge fetch');
            return {};
        }

        if (useCache && this.badgeCache.channels[channelId]) {
            return this.badgeCache.channels[channelId];
        }

        try {
            const data = await this.request(`/chat/badges?broadcaster_id=${channelId}`);
            const badges = {};
            
            data.data.forEach(badgeSet => {
                badges[badgeSet.set_id] = badgeSet.versions;
            });
            
            this.badgeCache.channels[channelId] = badges;
            ErrorHandler.info('Channel badges loaded', { channelId, count: Object.keys(badges).length });
            
            return badges;
        } catch (error) {
            ErrorHandler.handle(error, 'fetch_channel_badges', { channelId });
            return {};
        }
    }

    /**
     * Get badge URL from cache
     * @param {string} type - Badge type
     * @param {string} version - Badge version
     * @param {string} channelId - Optional channel ID for channel-specific badges
     * @returns {string|null} Badge URL
     */
    getBadgeUrl(type, version, channelId = null) {
        // Check channel badges first
        if (channelId && this.badgeCache.channels[channelId]) {
            const channelBadge = this.badgeCache.channels[channelId][type];
            if (channelBadge) {
                const badgeVersion = channelBadge.find(v => v.id === version);
                if (badgeVersion) {
                    return badgeVersion.image_url_4x;
                }
            }
        }

        // Check global badges
        if (this.badgeCache.global && this.badgeCache.global[type]) {
            const badgeVersion = this.badgeCache.global[type].find(v => v.id === version);
            if (badgeVersion) {
                return badgeVersion.image_url_4x;
            }
        }

        // Fallback to static CDN URL
        const badgeId = `${type}/${version}`;
        return `https://static-cdn.jtvnw.net/badges/v2/${badgeId}/3`;
    }

    /**
     * Validate access token
     * @returns {Promise<boolean>} Token validity
     */
    async validateToken() {
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                ErrorHandler.info('Token validated', { expiresIn: data.expires_in });
                return true;
            }
            
            return false;
        } catch (error) {
            ErrorHandler.handle(error, 'validate_token');
            return false;
        }
    }

    /**
     * Revoke access token
     * @returns {Promise<boolean>} Success status
     */
    async revokeToken() {
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/revoke', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `client_id=${this.clientId}&token=${this.accessToken}`
            });

            return response.ok;
        } catch (error) {
            ErrorHandler.handle(error, 'revoke_token');
            return false;
        }
    }

    /**
     * Fetch total follower count
     * @param {string} channelId - Channel ID
     * @returns {Promise<number>} Total followers
     */
    async fetchFollowerCount(channelId) {
        try {
            const data = await this.request(`/channels/followers?broadcaster_id=${channelId}`);
            return data.total || 0;
        } catch (error) {
            // If it fails (e.g. missing scope), return 0 but log it
            ErrorHandler.handle(error, 'fetch_follower_count', { channelId });
            return 0;
        }
    }

    /**
     * Fetch total subscriber count (requires channel:read:subscriptions)
     * @param {string} channelId - Channel ID
     * @returns {Promise<number>} Total subscribers
     */
    async fetchSubscriberCount(channelId) {
        try {
            const data = await this.request(`/subscriptions?broadcaster_id=${channelId}`);
            return data.total || 0;
        } catch (error) {
            ErrorHandler.handle(error, 'fetch_subscriber_count', { channelId });
            return 0;
        }
    }
}

