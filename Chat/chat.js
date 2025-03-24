// Import config
import { config } from '../config/config.js';
// Message display settings
const MAX_MESSAGES = 30; // Maximum number of messages to show

// Badge caches
let globalBadgeCache = {};
let channelBadgeCache = {};

// Animation state tracking
let isAnimating = false;
let slideDistance = 0;

// Get auth details from localStorage or fall back to config
const getAuthDetails = () => {
  const storedToken = localStorage.getItem('twitch_oauth_token');
  const storedUsername = localStorage.getItem('twitch_username');
  const storedChannelId = localStorage.getItem('twitch_channel_id');
  
  // Return from localStorage if available
  if (storedToken && storedUsername) {
    return {
      username: storedUsername,
      password: `oauth:${storedToken}`,
      channel: storedUsername, // Use authenticated user's channel by default
      clientId: config.settings.TWITCH.CLIENT_ID,
      channelId: config.settings.TWITCH.CHANNEL_ID
    };
  }
  
  // Fall back to config file
  return {
    username: config.settings.TWITCH.USERNAME,
    password: config.settings.TWITCH.OAUTH_TOKEN,
    channel: config.settings.TWITCH.CHANNEL_NAME,
    clientId: config.settings.TWITCH.CLIENT_ID,
    channelId: config.settings.TWITCH.CHANNEL_ID
  };
};

// Check for authentication
document.addEventListener('DOMContentLoaded', () => {
  const authDetails = getAuthDetails();
  console.log(authDetails);
  // If no auth details are available, show auth prompt
  if (!authDetails.password || !authDetails.password.startsWith('oauth:')) {
    showAuthPrompt();
    return;
  }
  
  // Initialize chat if authenticated
  initializeChat(authDetails);
});

// Show authentication prompt
function showAuthPrompt() {
  const chatContainer = document.getElementById('chatContainer');
  
  // Clear container
  chatContainer.innerHTML = '';
  
  // Create auth prompt element
  const authPrompt = document.createElement('div');
  authPrompt.className = 'auth-prompt';
  authPrompt.innerHTML = `
    <div class="auth-message">
      <h2>Authentication Required</h2>
      <p>Please login with your Twitch account to display chat messages.</p>
      <a href="/auth/oauth.html" class="auth-button">Login with Twitch</a>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .auth-prompt {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      padding: 1rem;
    }
    .auth-message {
      background: rgba(0, 0, 0, 0.75);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      color: white;
      max-width: 400px;
    }
    .auth-button {
      display: inline-block;
      background-color: #9147ff;
      color: white;
      text-decoration: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      margin-top: 1rem;
      font-weight: bold;
    }
    .auth-button:hover {
      background-color: #772ce8;
    }
  `;
  
  document.head.appendChild(style);
  chatContainer.appendChild(authPrompt);
}

// Initialize TMI.js client and connect to chat
function initializeChat(authDetails) {
  // Fetch badge data
  fetchBadges(authDetails);
  
  // Initialize TMI.js client
  const client = new tmi.Client({
    options: { skipUpdatingEmotesets: true },
    identity: {
      username: authDetails.username,
      password: authDetails.password,
    },
    channels: [authDetails.channel]
  });

  // Connect to Twitch
  client.connect().catch(error => {
    console.error('Connection error:', error);
    // If connection fails, show auth prompt
    if (error.includes('authentication failed')) {
      localStorage.removeItem('twitch_oauth_token');
      localStorage.removeItem('twitch_username');
      localStorage.removeItem('twitch_channel_id');
      showAuthPrompt();
    }
  });

  
  // Message container
  const chatContainer = document.getElementById('chatContainer');

  // Handle incoming messages
  client.on('message', (channel, tags, message, self) => {
    // Prevent self-messages and duplicates
    if (self) return;
    
    // Generate unique message ID
    const messageId = `${tags['message-id'] || Date.now()}-${tags['user-id']}`;
    
    // Check if message already exists
    if (!document.querySelector(`[data-message-id="${messageId}"]`)) {
      displayMessage(tags, message, messageId);
    }
  });
}

// Fetch global and channel badges
function fetchBadges(authDetails) {
  const token = authDetails.password.replace('oauth:', '');
  const clientId = authDetails.clientId;
  const channelId = authDetails.channelId;
  
  if (!token || !clientId) {
    console.error('Missing token or client ID for badge fetching');
    return;
  }
  
  // Fetch global badges
  fetch('https://api.twitch.tv/helix/chat/badges/global', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': clientId
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch global badges');
    }
    return response.json();
  })
  .then(data => {
    // Process global badges
    data.data.forEach(badgeSet => {
      globalBadgeCache[badgeSet.set_id] = badgeSet.versions;
    });
    console.log('Global badges loaded:', Object.keys(globalBadgeCache).length);
  })
  .catch(error => {
    console.error('Error fetching global badges:', error);
  });
  
  // Fetch channel badges if available
  if (channelId) {
    fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${channelId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-Id': clientId
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch channel badges');
      }
      return response.json();
    })
    .then(data => {
      // Process channel badges
      data.data.forEach(badgeSet => {
        channelBadgeCache[badgeSet.set_id] = badgeSet.versions;
      });
      console.log('Channel badges loaded:', Object.keys(channelBadgeCache).length);
    })
    .catch(error => {
      console.error('Error fetching channel badges:', error);
    });
  }
}

// Display a chat message
function displayMessage(tags, message, messageId) {
  const chatContainer = document.getElementById('chatContainer');
  
  // Create the message element
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message';
  messageElement.dataset.messageId = messageId;
  
  // Add badges if present
  if (tags.badges || tags['badges-raw']) {
    const badgeContainer = document.createElement('span');
    badgeContainer.className = 'badge-container';
    
    // Parse badges from badges-raw if available, otherwise use badges object
    const badgeData = tags['badges-raw'] ? 
      tags['badges-raw'].split(',').map(badge => {
        const [type, version] = badge.split('/');
        return { type, version };
      }) :
      Object.entries(tags.badges).map(([type, version]) => ({ type, version }));
    
    badgeData.forEach(({ type, version }) => {
      const badgeImg = document.createElement('img');
      badgeImg.className = 'badge';
      badgeImg.src = getBadgeUrl(type, version);
      badgeImg.alt = type;
      badgeContainer.appendChild(badgeImg);
    });
    
    messageElement.appendChild(badgeContainer);
  }

  // Add username
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.style.color = tags.color || '#ffffff';
  usernameSpan.textContent = tags['display-name'] || tags.username;
  messageElement.appendChild(usernameSpan);

  // Add message text with emote support
  const messageText = document.createElement('span');
  messageText.className = 'message-text';
  if (tags.emotes) {
    const emotePositions = [];
    
    // Collect all emote positions
    Object.entries(tags.emotes).forEach(([id, positions]) => {
      positions.forEach(position => {
        const [start, end] = position.split('-').map(Number);
        emotePositions.push({
          start,
          end,
          id
        });
      });
    });

    // Sort positions to process from end to start
    emotePositions.sort((a, b) => b.start - a.start);

    // Replace emotes with images
    let processedMessage = message;
    emotePositions.forEach(({ start, end, id }) => {
      const emoteImg = `<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0" />`;
      processedMessage = processedMessage.slice(0, start) + emoteImg + processedMessage.slice(end + 1);
    });

    messageText.innerHTML = processedMessage;
  } else {
    messageText.textContent = message;
  }
  messageElement.appendChild(messageText);
  
  // Create a wrapper element
  const messageWrapper = document.createElement('div');
  messageWrapper.className = 'message-wrapper';
  messageWrapper.style.display = 'inline-block';
  messageWrapper.style.transformOrigin = 'right';
  messageWrapper.appendChild(messageElement);
  
  // If we're already animating, wait for it to complete
  if (isAnimating) {
    setTimeout(() => displayMessage(tags, message, messageId), 50);
    return;
  }
  
  // Set animating flag
  isAnimating = true;
  
  // First, position the new message wrapper outside the view
  messageWrapper.style.transform = 'translateX(100%)';
  messageWrapper.style.opacity = '0';
  
  // Insert at the beginning (right side visually due to RTL container)
  if (chatContainer.firstChild) {
    chatContainer.insertBefore(messageWrapper, chatContainer.firstChild);
  } else {
    chatContainer.appendChild(messageWrapper);
  }
  
  // Remove old messages if exceeding limit
  while (chatContainer.children.length > MAX_MESSAGES) {
    chatContainer.removeChild(chatContainer.lastChild);
  }
  
  // We need to measure the width of the new message to determine how far to slide
  // Force a reflow to get accurate measurements
  void messageWrapper.offsetWidth;
  
  // Get width of the message wrapper
  const wrapperWidth = messageWrapper.offsetWidth;
  // Add some margin to ensure visibility
  const extraMargin = 10;
  // Calculate slide distance
  slideDistance = wrapperWidth + extraMargin;
  
  // Apply the initial offset to all existing messages
  // (they're not being animated yet, just positioned)
  Array.from(chatContainer.children).forEach(child => {
    if (child !== messageWrapper) {
      child.style.transition = 'none';
      child.style.transform = `translateX(${slideDistance}px)`;
    }
  });
  
  // Force a reflow before setting up the animation
  void chatContainer.offsetWidth;
  
  // Now set up all elements to animate together
  Array.from(chatContainer.children).forEach(child => {
    child.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
    
    if (child === messageWrapper) {
      // New message slides in
      child.style.transform = 'translateX(0)';
      child.style.opacity = '1';
    } else {
      // Existing messages slide back to original position
      child.style.transform = 'translateX(0)';
    }
  });
  
  // Reset animation state after animation completes
  setTimeout(() => {
    isAnimating = false;
  }, 400); // Match the duration of the animation
}

// Map badge types to their correct IDs
function getBadgeId(type, version) {
  // First check channel-specific badges
  if (channelBadgeCache[type]) {
    const badgeVersion = channelBadgeCache[type].find(v => v.id === version);
    if (badgeVersion) {
      return badgeVersion.image_url_4x.split('/')[5]; // Extract badge ID from URL
    }
  }
  
  // Then check global badges
  if (globalBadgeCache[type]) {
    const badgeVersion = globalBadgeCache[type].find(v => v.id === version);
    if (badgeVersion) {
      return badgeVersion.image_url_4x.split('/')[5]; // Extract badge ID from URL
    }
  }
  
  // Fall back to old mapping method if cache is not available
  const badgeMap = {
    'broadcaster': 'broadcaster/1',
    'moderator': 'moderator/1',
    'subscriber': `subscriber/${version}`,
    'premium': 'premium/1',
    'turbo': 'turbo/1',
    'glhf-pledge': 'glhf-pledge/1',
    'sub-gifter': `sub-gifter/${version}`,
    'bits': `bits/${version}`,
    'vip': 'vip/1'
  };
  return badgeMap[type] || type + '/' + version;
}

// Get badge URL directly from cache
function getBadgeUrl(type, version) {
  // First check channel-specific badges
  if (channelBadgeCache[type]) {
    const badgeVersion = channelBadgeCache[type].find(v => v.id === version);
    if (badgeVersion) {
      return badgeVersion.image_url_4x; // Use high-res version
    }
  }
  
  // Then check global badges
  if (globalBadgeCache[type]) {
    const badgeVersion = globalBadgeCache[type].find(v => v.id === version);
    if (badgeVersion) {
      return badgeVersion.image_url_4x; // Use high-res version
    }
  }
  
  // Fall back to the old URL format
  const badgeId = getBadgeId(type, version);
  return `https://static-cdn.jtvnw.net/badges/v2/${badgeId}/3`;
}

// Test message function for development
globalThis.testMessage = () => {
  const testTags = {
    'display-name': 'TestUser',
    color: '#FF0000',
    badges: {
      subscriber: '1'
    }
  };

  displayMessage(testTags, 'This is a test message with a pill shape design! 👋 How does it look?', Date.now());
};