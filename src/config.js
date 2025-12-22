/**
 * Centralized Configuration
 */

// Default configuration
const DEFAULT_CONFIG = {
    TWITCH: {
        USERNAME: '',
        CHANNEL_NAME: '',
        CHANNEL_ID: '',
        // Use environment variable if available, otherwise use a placeholder
        CLIENT_ID: import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5', 
        SCOPES: [
            'chat:read', 
            'chat:edit',
            'channel:read:subscriptions'
        ]
    },
    YOUTUBE: {
        CHANNEL_NAME: ''
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
        YOUTUBE: { ...config.settings.YOUTUBE, ...newConfig.YOUTUBE }
    };
    localStorage.setItem('app_config', JSON.stringify(updatedConfig));
    Object.assign(config.settings, updatedConfig);
};
