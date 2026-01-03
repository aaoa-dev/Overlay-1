/**
 * Centralized localStorage management
 * Handles all persistent storage operations with error handling and validation
 */

export class StorageService {
    static KEYS = {
        OAUTH_TOKEN: 'twitch_oauth_token',
        USERNAME: 'twitch_username',
        CHANNEL_ID: 'twitch_channel_id',
        OAUTH_STATE: 'oauth_state',
        USER_VISITS: 'userVisits',
        CHATTERS: 'chatters',
        CHATTER_MODE: 'chatter_mode',
        STREAM_DATE: 'streamDate',
        STATS_BASELINES: 'stream_stats_baselines',
        SOUND_BOARD_CONFIG: 'sound_board_config'
    };

    /**
     * Get a value from localStorage with JSON parsing
     * @param {string} key - The storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Parsed value or default
     */
    static get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            
            // Try to parse as JSON, return raw string if it fails
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error(`Error reading from localStorage (${key}):`, error);
            return defaultValue;
        }
    }

    /**
     * Set a value in localStorage with JSON stringification
     * @param {string} key - The storage key
     * @param {*} value - Value to store
     * @returns {boolean} Success status
     */
    static set(key, value) {
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, stringValue);
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage (${key}):`, error);
            return false;
        }
    }

    /**
     * Remove a value from localStorage
     * @param {string} key - The storage key
     * @returns {boolean} Success status
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from localStorage (${key}):`, error);
            return false;
        }
    }

    /**
     * Clear all storage or specific keys
     * @param {string[]} keys - Optional array of specific keys to clear
     */
    static clear(keys = null) {
        try {
            if (keys) {
                keys.forEach(key => this.remove(key));
            } else {
                localStorage.clear();
            }
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }

    /**
     * Check if a key exists
     * @param {string} key - The storage key
     * @returns {boolean}
     */
    static has(key) {
        return localStorage.getItem(key) !== null;
    }

    // Auth-specific methods
    static getAuthData() {
        return {
            token: this.get(this.KEYS.OAUTH_TOKEN),
            username: this.get(this.KEYS.USERNAME),
            channelId: this.get(this.KEYS.CHANNEL_ID)
        };
    }

    static setAuthData(token, username, channelId) {
        this.set(this.KEYS.OAUTH_TOKEN, token);
        this.set(this.KEYS.USERNAME, username);
        if (channelId) {
            this.set(this.KEYS.CHANNEL_ID, channelId);
        }
    }

    static clearAuthData() {
        this.remove(this.KEYS.OAUTH_TOKEN);
        this.remove(this.KEYS.USERNAME);
        this.remove(this.KEYS.CHANNEL_ID);
        this.remove(this.KEYS.OAUTH_STATE);
    }

    static isAuthenticated() {
        return this.has(this.KEYS.OAUTH_TOKEN) && this.has(this.KEYS.USERNAME);
    }
}

