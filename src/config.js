/**
 * Centralized Configuration
 */

// Default configuration
const DEFAULT_CONFIG = {
    TWITCH: {
        USERNAME: '',
        CHANNEL_NAME: '',
        CHANNEL_ID: '',
        // Use environment variable if available, otherwise use your app's Client ID
        CLIENT_ID: import.meta.env.VITE_TWITCH_CLIENT_ID || 'bjcukect75zxyty8w63shf7jakiyda', 
        SCOPES: [
            'chat:read', 
            'chat:edit',
            'channel:read:subscriptions'
        ]
    },
    YOUTUBE: {
        CHANNEL_NAME: ''
    },
    SOUND_BOARD: {
        enabled: true,
        volume: 0.5,
        triggers: [
            {
                pattern: "!horn",
                sound: "https://www.myinstants.com/media/sounds/air-horn-club-sample_1.mp3",
                type: "command",
                cooldown: 1000
            }
        ]
    }
};

// Try to load from window.TWITCH_CONFIG (from public/config.js) or localStorage
const savedConfig = JSON.parse(localStorage.getItem('app_config') || '{}');
const windowConfig = window.TWITCH_CONFIG?.settings || {};

export const config = {
    settings: {
        TWITCH: {
            ...DEFAULT_CONFIG.TWITCH,
            ...windowConfig.TWITCH,
            ...savedConfig.TWITCH
        },
        YOUTUBE: {
            ...DEFAULT_CONFIG.YOUTUBE,
            ...windowConfig.YOUTUBE,
            ...savedConfig.YOUTUBE
        },
        SOUND_BOARD: {
            ...DEFAULT_CONFIG.SOUND_BOARD,
            ...windowConfig.SOUND_BOARD,
            ...savedConfig.SOUND_BOARD
        }
    }
};

/**
 * Save configuration to localStorage
 * @param {Object} newConfig - New configuration object
 */
export const saveConfig = (newConfig) => {
    const updatedConfig = {
        TWITCH: { ...config.settings.TWITCH, ...newConfig.TWITCH },
        YOUTUBE: { ...config.settings.YOUTUBE, ...newConfig.YOUTUBE },
        SOUND_BOARD: { ...config.settings.SOUND_BOARD, ...newConfig.SOUND_BOARD }
    };
    localStorage.setItem('app_config', JSON.stringify(updatedConfig));
    Object.assign(config.settings, updatedConfig);
};
