# Twitch OAuth Setup

This document explains how to set up OAuth authentication for the Twitch chat overlay.

## Prerequisites

1. A Twitch account
2. A registered Twitch application

## Registering a Twitch Application

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Click "Register Your Application"
3. Fill in the following information:
   - **Name**: Your application name (e.g., "My Chat Overlay")
   - **OAuth Redirect URLs**: Add the following URL:
     ```
     http://localhost:8000/auth/callback.html
     ```
     (Replace with your actual domain if hosting on a server)
   - **Category**: Choose "Website Integration" or "Other"
4. Click "Create"
5. After creation, you'll see your Client ID. Click "New Secret" to generate your Client Secret.

## Setting up the Authentication in Your Code

1. Open the file `config/config.js` and update the Twitch configuration:

```javascript
TWITCH: {
    USERNAME: 'your_username',
    OAUTH_TOKEN: 'oauth:your_token', // For fallback authentication
    CHANNEL_NAME: 'channel_to_join',
    CHANNEL_ID: 'your_channel_id', // Important for channel-specific badges
    CLIENT_ID: 'your_client_id_here',
    SCOPES: ['chat:read', 'chat:edit']
}
```

The application is designed to use this centralized configuration. All OAuth-related components will read the Client ID and other settings from this file.

## OAuth Scopes Used

This application uses the following OAuth scopes:

- `chat:read` - Required to read chat messages
- `chat:edit` - Required to send chat messages (if needed)

## Channel-Specific Badges

The overlay now supports channel-specific badges like custom subscriber badges. 

When a user authenticates:
1. Their Channel ID is automatically saved in localStorage
2. Channel-specific badges are fetched from the Twitch API
3. Both global and channel-specific badges are displayed correctly in chat

This ensures that subscriber badges, bits badges, and other channel-specific badges display correctly in the chat overlay.

## Testing

1. Run your web server (e.g., using a local development server)
2. Navigate to `/auth/oauth.html`
3. Click "Login with Twitch"
4. After successful authorization, you will be redirected to the chat overlay

## Troubleshooting

- If you see "Authentication error" messages, check that your Client ID is correctly configured in `config/config.js`
- If the redirect fails, ensure your redirect URI is correctly registered in the Twitch Developer Console
- Make sure your web server is running on the same port specified in your redirect URI
- If channel-specific badges aren't showing up, check the console for errors related to badge fetching
- You may need to clear localStorage and re-authenticate if you've updated the code 