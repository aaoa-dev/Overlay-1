/**
 * Twitch Service
 * Centralized Twitch client management and authentication
 */

import { StorageService } from './StorageService.js';
import { TwitchAPI } from './TwitchAPI.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { config } from '../config.js';

export class TwitchService {
    constructor() {
        this.client = null;
        this.api = null;
        this.authConfig = null;
        this.isConnected = false;
    }

    /**
     * Initialize the Twitch service
     * @param {Object} options - Optional configuration overrides
     * @returns {Promise<tmi.Client>} TMI client instance
     */
    async initialize(options = {}) {
        try {
            // Get authentication configuration
            this.authConfig = this.getAuthConfig(options);
            
            // If no username is provided, we can't do anything
            if (!this.authConfig.username && !this.authConfig.channel) {
                if (window.location.pathname.includes('/auth/')) return null;
                throw new Error('No Twitch channel specified');
            }

            const hasToken = this.authConfig.password && this.authConfig.password !== 'oauth:';

            // Initialize API client (only if we have a token and client ID)
            if (hasToken && this.authConfig.clientId) {
                const token = this.authConfig.password.replace('oauth:', '');
                this.api = new TwitchAPI(this.authConfig.clientId, token);
            }

            // Create TMI client
            const tmiOptions = {
                options: {
                    skipUpdatingEmotesets: true,
                    debug: options.debug || false
                },
                channels: [this.authConfig.channel || this.authConfig.username]
            };

            // Only add identity if we have credentials
            if (hasToken) {
                tmiOptions.identity = {
                    username: this.authConfig.username,
                    password: this.authConfig.password
                };
            }

            // Check for tmi.js (it should be loaded via script tag)
            const tmiClient = window.tmi || (typeof tmi !== 'undefined' ? tmi : null);
            if (!tmiClient) {
                throw new Error('tmi.js not loaded. Please ensure <script src=".../tmi.js"></script> is included in your HTML before initializing TwitchService.');
            }

            this.client = new tmiClient.Client(tmiOptions);

            // Connect to Twitch
            await this.client.connect();
            this.isConnected = true;
            
            ErrorHandler.info(`Twitch service connected to ${tmiOptions.channels[0]} ${hasToken ? '(Authenticated)' : '(Anonymous)'}`);

            return this.client;
        } catch (error) {
            ErrorHandler.handle(error, 'twitch_service_init');
            throw error;
        }
    }

    /**
     * Get authentication configuration from various sources
     * Priority: URL params > options > localStorage > config file
     * @param {Object} options - Optional configuration overrides
     * @returns {Object} Auth configuration
     */
    getAuthConfig(options = {}) {
        // Check URL parameters (highest priority)
        const urlParams = this.getUrlParams();
        
        // Check localStorage
        const storedAuth = StorageService.getAuthData();
        
        // Build configuration with priority
        const authConfig = {
            username: urlParams.username || 
                     options.username || 
                     storedAuth.username || 
                     config.settings.TWITCH.USERNAME ||
                     '',
            
            password: urlParams.token ? `oauth:${urlParams.token}` :
                     options.token ? `oauth:${options.token}` :
                     (storedAuth.token ? (storedAuth.token.startsWith('oauth:') ? storedAuth.token : `oauth:${storedAuth.token}`) : 
                      (config.settings.TWITCH.OAUTH_TOKEN ? (config.settings.TWITCH.OAUTH_TOKEN.startsWith('oauth:') ? config.settings.TWITCH.OAUTH_TOKEN : `oauth:${config.settings.TWITCH.OAUTH_TOKEN}`) : '')),
            
            channel: urlParams.channel || 
                    options.channel || 
                    storedAuth.username || 
                    config.settings.TWITCH.CHANNEL_NAME ||
                    '',
            
            channelId: urlParams.channelId || 
                      options.channelId || 
                      storedAuth.channelId || 
                      config.settings.TWITCH.CHANNEL_ID ||
                      '',
            
            clientId: options.clientId || 
                     config.settings.TWITCH.CLIENT_ID ||
                     'kimne78kx3ncx6brgo4mv6wki5h1ko' // Fallback
        };

        // Add theme and behavior settings from URL if present
        authConfig.theme = {
            color: urlParams.themeColor ? `#${urlParams.themeColor}` : null,
            fontSize: urlParams.fontSize || null
        };
        authConfig.noChat = urlParams.noChat === 'true';

        ErrorHandler.debug('Auth config resolved', {
            username: authConfig.username,
            hasPassword: !!authConfig.password,
            channel: authConfig.channel,
            hasClientId: !!authConfig.clientId
        });

        return authConfig;
    }

    /**
     * Parse URL parameters for authentication
     * @returns {Object} URL parameters
     */
    getUrlParams() {
        const params = {};
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        
        const token = urlParams.get('token');
        const username = urlParams.get('username');
        const channel = urlParams.get('channel');
        const channelId = urlParams.get('channelId');
        const themeColor = urlParams.get('themeColor');
        const fontSize = urlParams.get('fontSize');
        const noChat = urlParams.get('noChat');
        
        if (token) params.token = token;
        if (username) params.username = username;
        if (channel) params.channel = channel;
        if (channelId) params.channelId = channelId;
        if (themeColor) params.themeColor = themeColor;
        if (fontSize) params.fontSize = fontSize;
        if (noChat) params.noChat = noChat;
        
        return params;
    }

    /**
     * Fetch and cache badges
     * @returns {Promise<Object>} Badge data
     */
    async fetchBadges() {
        if (!this.api) {
            throw new Error('API client not initialized');
        }

        try {
            const [globalBadges, channelBadges] = await Promise.all([
                this.api.fetchGlobalBadges(),
                this.authConfig.channelId ? 
                    this.api.fetchChannelBadges(this.authConfig.channelId) : 
                    Promise.resolve({})
            ]);

            return { globalBadges, channelBadges };
        } catch (error) {
            ErrorHandler.handle(error, 'fetch_badges');
            throw error;
        }
    }

    /**
     * Get badge URL
     * @param {string} type - Badge type
     * @param {string} version - Badge version
     * @returns {string} Badge URL
     */
    getBadgeUrl(type, version) {
        if (!this.api) {
            return `https://static-cdn.jtvnw.net/badges/v2/${type}/${version}/3`;
        }
        return this.api.getBadgeUrl(type, version, this.authConfig.channelId);
    }

    /**
     * Register an event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    on(event, handler) {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        this.client.on(event, handler);
    }

    /**
     * Send a message to the channel
     * @param {string} message - Message to send
     * @returns {Promise}
     */
    async say(message) {
        if (!this.client || !this.isConnected) {
            throw new Error('Client not connected');
        }
        
        try {
            return await this.client.say(this.authConfig.channel, message);
        } catch (error) {
            ErrorHandler.handle(error, 'send_message', { message });
            throw error;
        }
    }

    /**
     * Disconnect from Twitch
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.disconnect();
            this.isConnected = false;
            ErrorHandler.info('Twitch service disconnected');
        }
    }

    /**
     * Logout (clear stored credentials and disconnect)
     */
    async logout() {
        if (this.api) {
            await this.api.revokeToken();
        }
        
        StorageService.clearAuthData();
        await this.disconnect();
        
        ErrorHandler.info('User logged out');
    }

    /**
     * Check if authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!(this.authConfig && this.authConfig.password);
    }

    /**
     * Get current channel
     * @returns {string}
     */
    getChannel() {
        return this.authConfig ? this.authConfig.channel : null;
    }

    /**
     * Get current username
     * @returns {string}
     */
    getUsername() {
        return this.authConfig ? this.authConfig.username : null;
    }

    /**
     * Generate OBS URL with authentication parameters
     * @param {string} targetPage - Target page path (e.g., '/Chat/chat.html')
     * @returns {string} Complete URL for OBS
     */
    generateOBSUrl(targetPage = '/Chat/chat.html') {
        if (!this.authConfig || !this.authConfig.password) {
            ErrorHandler.warn('Cannot generate OBS URL without authentication');
            return null;
        }

        const url = new URL(targetPage, window.location.origin);
        const token = this.authConfig.password.replace('oauth:', '');
        
        url.searchParams.append('token', token);
        url.searchParams.append('username', this.authConfig.username);
        
        if (this.authConfig.channel !== this.authConfig.username) {
            url.searchParams.append('channel', this.authConfig.channel);
        }
        
        if (this.authConfig.channelId) {
            url.searchParams.append('channelId', this.authConfig.channelId);
        }

        return url.toString();
    }
}

