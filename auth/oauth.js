import { StorageService } from '../src/services/StorageService.js';
import { config } from '../src/config.js';

// DOM elements
const loginButton = document.getElementById('link-btn'); // The purple button
const twitchNameInput = document.getElementById('twitch-name');
const statusDiv = document.getElementById('status');

// FOR LOCAL DEV: This must match exactly what you put in the Twitch Dev Console
const CLIENT_ID = config.settings.TWITCH.CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/auth/callback.html`;

document.addEventListener('DOMContentLoaded', () => {
    // If we're already logged in, redirect to home
    if (StorageService.isAuthenticated()) {
        window.location.href = '/index.html';
    }
});

loginButton.addEventListener('click', () => {
    initiateOAuth();
});

function initiateOAuth() {
    const state = Math.random().toString(36).substring(2, 15);
    StorageService.set(StorageService.KEYS.OAUTH_STATE, state);
    
    const scopes = config.settings.TWITCH.SCOPES.join(' ');
    
    // Build the URL
    const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('force_verify', 'true');
    
    console.log('Redirecting to Twitch:', authUrl.toString());
    window.location.href = authUrl.toString();
}
