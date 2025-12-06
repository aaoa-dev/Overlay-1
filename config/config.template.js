/**
 * Configuration Template
 * 
 * DO NOT put real credentials in this file!
 * 
 * For development:
 * 1. Copy this file to config.js
 * 2. Fill in your actual credentials
 * 3. config.js is gitignored and won't be committed
 * 
 * For production:
 * Use environment variables or secure secret management
 */

export const config = {
    settings: {
        TWITCH: {
            USERNAME: '',
            OAUTH_TOKEN: '', // Format: 'oauth:your_token_here'
            CHANNEL_NAME: '',
            CHANNEL_ID: '',
            CLIENT_ID: '',
            ACCESS_TOKEN: '',
            REFRESH_TOKEN: '',
            EXPIRES_IN: 0,
            SCOPES: ['chat:read', 'chat:edit']
        },
        YOUTUBE: {
            CHANNEL_NAME: ''
        }
    }
};

