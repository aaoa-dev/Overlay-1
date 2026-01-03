// Public configuration file (not bundled)
// This file is copied as-is to the build output
window.TWITCH_CONFIG = {
    settings: {
        TWITCH: {
            USERNAME: '',
            OAUTH_TOKEN: '',
            CHANNEL_NAME: '',
            CHANNEL_ID: '',
            CLIENT_ID: 'kimne78kx3ncx6brgo4mv6wki5h1ko', // Public Twitch CLI client ID
            ACCESS_TOKEN: '',
            REFRESH_TOKEN: '',
            EXPIRES_IN: 0,
            SCOPES: ['chat:read', 'chat:edit']
        },
        YOUTUBE: {
            CHANNEL_NAME: 'aaoa_streams'
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
    }
};


