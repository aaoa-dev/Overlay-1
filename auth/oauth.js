// Import config
import { config } from '../config/config.js';

// Twitch OAuth Configuration
const TWITCH_CLIENT_ID = config.settings.TWITCH.CLIENT_ID; 
const REDIRECT_URI = window.location.origin + '/auth/callback.html';
const SCOPES = config.settings.TWITCH.SCOPES || ['chat:read', 'chat:edit'];

// DOM elements
const loginButton = document.getElementById('login-button');
const statusDiv = document.getElementById('status');

// Check if we already have an auth token in localStorage
document.addEventListener('DOMContentLoaded', () => {
  const storedToken = localStorage.getItem('twitch_oauth_token');
  const storedUsername = localStorage.getItem('twitch_username');
  
  if (storedToken && storedUsername) {
    displayAuthStatus(true, storedUsername);
  }
});

// Add click event for login button
loginButton.addEventListener('click', () => {
  if (!TWITCH_CLIENT_ID) {
    displayAuthStatus(false, null, 'Error: Client ID not configured. Please set up your Twitch Developer application.');
    return;
  }
  
  initiateOAuth();
});

// Start OAuth flow
function initiateOAuth() {
  // Generate a random state value for security
  const state = generateRandomString(16);
  localStorage.setItem('oauth_state', state);
  
  // Build the authorization URL
  const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
  authUrl.searchParams.append('client_id', TWITCH_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'token');
  authUrl.searchParams.append('scope', SCOPES.join(' '));
  authUrl.searchParams.append('state', state);
  
  // Redirect to Twitch authorization page
  window.location.href = authUrl.toString();
}

// Helper function to generate random string for state parameter
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Display authentication status
function displayAuthStatus(isAuthenticated, username, errorMessage = null) {
  statusDiv.style.display = 'block';
  
  if (isAuthenticated) {
    loginButton.textContent = 'Logout';
    loginButton.removeEventListener('click', initiateOAuth);
    loginButton.addEventListener('click', logout);
    
    statusDiv.textContent = `Authenticated as: ${username}`;
    statusDiv.style.backgroundColor = '#1a472a'; // Green background
  } else {
    if (errorMessage) {
      statusDiv.textContent = errorMessage;
      statusDiv.style.backgroundColor = '#5c1a1a'; // Red background
    } else {
      statusDiv.textContent = 'Not authenticated. Please login with Twitch.';
      statusDiv.style.backgroundColor = '#2c2c2e'; // Default dark background
    }
  }
}

// Logout function
function logout() {
  localStorage.removeItem('twitch_oauth_token');
  localStorage.removeItem('twitch_username');
  localStorage.removeItem('oauth_state');
  
  loginButton.textContent = 'Login with Twitch';
  loginButton.removeEventListener('click', logout);
  loginButton.addEventListener('click', initiateOAuth);
  
  displayAuthStatus(false);
  
  // Revoke token on Twitch side (optional but recommended)
  const token = localStorage.getItem('twitch_oauth_token');
  if (token) {
    fetch(`https://id.twitch.tv/oauth2/revoke?client_id=${TWITCH_CLIENT_ID}&token=${token}`, {
      method: 'POST'
    });
  }
} 