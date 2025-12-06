/**
 * Type Definitions (JSDoc)
 * 
 * This file contains all type definitions for better IDE support and documentation
 * Import these types in your files using JSDoc @typedef tags
 */

/**
 * @typedef {Object} TwitchConfig
 * @property {string} USERNAME - Twitch username
 * @property {string} OAUTH_TOKEN - OAuth token (with 'oauth:' prefix)
 * @property {string} CHANNEL_NAME - Channel name to join
 * @property {string} CHANNEL_ID - Channel ID for badges
 * @property {string} CLIENT_ID - Twitch application client ID
 * @property {string} ACCESS_TOKEN - Access token (without 'oauth:' prefix)
 * @property {string} REFRESH_TOKEN - Refresh token
 * @property {number} EXPIRES_IN - Token expiration time
 * @property {string[]} SCOPES - OAuth scopes
 */

/**
 * @typedef {Object} MessageTags
 * @property {Object} badges - User badges
 * @property {string} color - User color
 * @property {string} display-name - Display name
 * @property {Object} emotes - Emote data
 * @property {boolean} first-msg - First message flag
 * @property {string} id - Message ID
 * @property {boolean} mod - Moderator flag
 * @property {string} room-id - Room ID
 * @property {boolean} subscriber - Subscriber flag
 * @property {string} tmi-sent-ts - Timestamp
 * @property {string} user-id - User ID
 * @property {string} username - Username
 * @property {string} message-type - Message type
 */

/**
 * @typedef {Object} CommandContext
 * @property {string} channel - Channel name
 * @property {MessageTags} tags - Message tags
 * @property {string} message - Full message
 * @property {string} trigger - Command trigger
 * @property {string[]} args - Command arguments
 * @property {string} username - Username
 * @property {string} userId - User ID
 * @property {boolean} isMod - Is moderator
 * @property {boolean} isBroadcaster - Is broadcaster
 * @property {boolean} isSubscriber - Is subscriber
 * @property {TwitchService} twitchService - Twitch service instance
 * @property {Function} reply - Reply function
 */

/**
 * @typedef {Object} Chatter
 * @property {string} name - Display name
 * @property {string} user - Username
 * @property {number} timestamp - Last message timestamp
 * @property {string} color - User color
 */

/**
 * @typedef {Object} Badge
 * @property {string} type - Badge type
 * @property {string} version - Badge version
 */

/**
 * @typedef {Object} BadgeVersion
 * @property {string} id - Version ID
 * @property {string} image_url_1x - 1x image URL
 * @property {string} image_url_2x - 2x image URL
 * @property {string} image_url_4x - 4x image URL
 * @property {string} title - Badge title
 * @property {string} description - Badge description
 */

/**
 * @typedef {Object} AuthConfig
 * @property {string} username - Username
 * @property {string} password - OAuth password
 * @property {string} channel - Channel to join
 * @property {string} channelId - Channel ID
 * @property {string} clientId - Client ID
 */

/**
 * @typedef {Object} CommandOptions
 * @property {boolean} modOnly - Mod only command
 * @property {boolean} broadcasterOnly - Broadcaster only command
 * @property {boolean} subscriberOnly - Subscriber only command
 * @property {number} cooldown - Cooldown in seconds
 * @property {string} description - Command description
 * @property {boolean} enabled - Command enabled state
 */

/**
 * @typedef {Object} MessageHandlerOptions
 * @property {boolean} enabled - Handler enabled
 * @property {number} priority - Handler priority (higher = earlier)
 */

/**
 * @typedef {Object} AlertOptions
 * @property {number} duration - Display duration in ms
 * @property {number} slideInDuration - Slide in duration in ms
 * @property {number} slideOutDuration - Slide out duration in ms
 */

/**
 * @typedef {Object} ChatterTrackerOptions
 * @property {number} maxChatters - Maximum chatters to track
 * @property {number} timeoutMs - Timeout before removing inactive chatter
 * @property {number} checkIntervalMs - Check interval for cleanup
 */

/**
 * @typedef {Object} ChatMessageOptions
 * @property {boolean} showUserInfo - Show badges and username
 * @property {Function} badgeUrlResolver - Badge URL resolver function
 */

export {};

