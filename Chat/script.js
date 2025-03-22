import { config } from '../config/config.js';

// Elements
const chatContainer = document.getElementById('chatContainer');
const testMessageBtn = document.getElementById('testMessageBtn');
const testMultipleBtn = document.getElementById('testMultipleBtn');

// Badge mappings for testing
const BADGE_URLS = {
  broadcaster: "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3",
  moderator: "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3",
  subscriber: "https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/3",
  premium: "https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/3",
  partner: "https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/3",
  vip: "https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3",
  turbo: "https://static-cdn.jtvnw.net/badges/v1/bd444ec6-8f34-4bf9-91f4-af1e3428d80f/3",
  glitchcon2020: "https://static-cdn.jtvnw.net/badges/v1/1d4b03b9-51ea-42c9-8f29-698e3c85be3d/3",
  staff: "https://static-cdn.jtvnw.net/badges/v1/d97c37bd-a6f5-4c38-8f57-4e4bef88af34/3",
  admin: "https://static-cdn.jtvnw.net/badges/v1/9ef7e029-4cdf-4d4d-a0d5-e2b3fb2583fe/3",
  global_mod: "https://static-cdn.jtvnw.net/badges/v1/9384c43e-4ce7-4e94-b2a1-b93656896eba/3",
  artist: "https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0c-c9f4d5ad064c/3",
  // Add special badges from screenshot
  hype_train: "https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/3",
  moments: "https://static-cdn.jtvnw.net/badges/v1/c540636a-7aaa-11ea-b202-e248fd4628f3/3",
  no_audio: "https://static-cdn.jtvnw.net/badges/v1/aef2cd08-f29b-45a1-8c12-d44d7fd5e6f0/3",
  no_video: "https://static-cdn.jtvnw.net/badges/v1/199a0dba-58f3-494e-a7fc-1fa0a1001fb8/3",
  sub_gifter: "https://static-cdn.jtvnw.net/badges/v1/f1d8486f-eb2e-4553-b44f-4d614617afc1/3",
  founder: "https://static-cdn.jtvnw.net/badges/v1/511b78a9-ab37-472f-9569-457753bbe7d3/3",
  clip_champ: "https://static-cdn.jtvnw.net/badges/v1/f38976e0-ffc0-4a57-b53e-9aa6ec3124c2/3",
  ambassador: "https://static-cdn.jtvnw.net/badges/v1/2cbc339f-34f4-488a-ae51-efdf74f4e323/3",
  bits: "https://static-cdn.jtvnw.net/badges/v1/73b5c3fb-24f9-4a82-a852-2f475b59411c/3",
  bits_leader: "https://static-cdn.jtvnw.net/badges/v1/8bedf8c3-7a6d-4df2-b62f-791b96a5dd31/3",
  twitchcon: "https://static-cdn.jtvnw.net/badges/v1/33cae0e8-c6ab-45b1-8e5c-a5a0c730c2f0/3"
};

// YouTube badge mappings
const YOUTUBE_BADGE_URLS = {
  owner: "https://www.gstatic.com/youtube/img/creator_badges/yt_owner_badge.svg",
  moderator: "https://www.gstatic.com/youtube/img/creator_badges/yt_moderator_badge.svg",
  member: "https://yt3.googleusercontent.com/oBFfC7-qXJA0kxYWZvPpay3f4yyWUwSaKfVkaBwoEFgF-fopVQXtHMzxGwJqvwvLn0swRNfUPg=w48-h48-c-k-nd",
  verified: "https://www.gstatic.com/youtube/img/creator_badges/yt_verified_badge.svg"
};

// Message counter
let messageCounter = 0;

// Queue for pending messages
const messageQueue = [];
let processingQueue = false;
let animating = false;

// Connect to Twitch
const twitchClient = new tmi.Client({
  options: {
    skipUpdatingEmotesets: true,
  },
  identity: {
    username: config.settings.TWITCH.USERNAME,
    password: config.settings.TWITCH.OAUTH_TOKEN,
  },
  channels: [config.settings.TWITCH.CHANNEL_NAME],
});

// Initialize
function init() {
  // Load saved config from localStorage if it exists
  const savedConfig = JSON.parse(localStorage.getItem('chatConfig') || '{}');
  if (savedConfig.settings) {
    // Merge saved settings with default config
    if (savedConfig.settings.TWITCH) {
      config.settings.TWITCH = {
        ...config.settings.TWITCH,
        ...savedConfig.settings.TWITCH
      };
    }
    
    if (savedConfig.settings.YOUTUBE) {
      config.settings.YOUTUBE = {
        ...config.settings.YOUTUBE,
        ...savedConfig.settings.YOUTUBE
      };
    }
  }
  
  // Connect to Twitch once DOM is loaded
  twitchClient.connect().catch(console.error);
  
  // Listen for Twitch messages
  twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return; // Ignore messages from the bot
    
    // Add platform info to distinguish the source
    tags.platform = 'twitch';
    
    // Debug subscription info
    if (tags.badges && tags.badges.subscriber) {
      // Add direct badgeUrl for debugging
      const badgeUrl = `https://static-cdn.jtvnw.net/badges/v1/${tags.badges.subscriber}/3`;
      tags.badgeUrl = badgeUrl; // Store the URL directly in tags for use in createMessageElement
      
      console.log('Subscriber badge info:', {
        subscriber: tags.badges.subscriber,
        badgeInfo: tags['badge-info'],
        username: tags.username,
        channel: channel,
        roomId: tags['room-id'],
        badgeUrl: badgeUrl
      });
    }
    
    // If this is the first message, store the room-id for badge handling
    if (tags['room-id'] && !config.settings.TWITCH.CHANNEL_ID) {
      config.settings.TWITCH.CHANNEL_ID = tags['room-id'];
      console.log('Stored channel ID:', tags['room-id']);
      
      // Save to local storage
      const savedConfig = JSON.parse(localStorage.getItem('chatConfig') || '{}');
      if (!savedConfig.settings) savedConfig.settings = {};
      if (!savedConfig.settings.TWITCH) savedConfig.settings.TWITCH = {};
      savedConfig.settings.TWITCH.CHANNEL_ID = tags['room-id'];
      localStorage.setItem('chatConfig', JSON.stringify(savedConfig));
    }
    
    queueMessage(tags, message);
  });
  
  // Check if YouTube integration is enabled
  setupYouTubeIntegration();
  
  // Test button - Twitch message
  testMessageBtn.addEventListener('click', () => {
    const testTags = {
      username: 'testUser',
      'display-name': 'TestUser',
      color: '#FF7F50',
      badges: {
        broadcaster: '1',
        subscriber: '3048', // Use a long numeric ID like seen in console
        premium: '1',
        moments: '1',
        'hype-train': '1'
      },
      'badge-info': {
        subscriber: '24' // 24 months subscriber
      },
      badgeUrl: "https://static-cdn.jtvnw.net/badges/v1/3048/3", // Direct badge URL
      emotes: {
        '25': ['0-4'], // Example emote (Kappa)
      },
      'room-id': config.settings.TWITCH.CHANNEL_NAME ? config.settings.TWITCH.CHANNEL_ID || '1234567' : null,
      platform: 'twitch'
    };
    
    queueMessage(testTags, 'Kappa Hello from the test message! 👋');
  });
  
  // Test button - Add YouTube test
  const testYouTubeBtn = document.createElement('button');
  testYouTubeBtn.textContent = 'Test YouTube';
  testYouTubeBtn.className = 'bg-red-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-600 transition-colors';
  testYouTubeBtn.addEventListener('click', () => {
    const testYouTubeTags = {
      username: 'youtubeUser',
      'display-name': 'YouTube User',
      color: '#FF0000', // YouTube red
      badges: {
        owner: '1',
        member: '1'
      },
      platform: 'youtube'
    };
    
    queueMessage(testYouTubeTags, 'Hello from YouTube chat! 🔴');
  });
  
  // Add YouTube Config button 
  const configYouTubeBtn = document.createElement('button');
  configYouTubeBtn.textContent = 'Connect YouTube';
  configYouTubeBtn.className = 'bg-red-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-700 transition-colors';
  configYouTubeBtn.addEventListener('click', showYouTubeConnectDialog);
  
  // Add the buttons after the existing buttons
  const buttonsContainer = testMultipleBtn.parentElement;
  buttonsContainer.appendChild(testYouTubeBtn);
  buttonsContainer.appendChild(configYouTubeBtn);
  
  // Specific test for subscriber badges - debugging focused
  const testSubBadgeBtn = document.createElement('button');
  testSubBadgeBtn.textContent = 'Test Sub Badge';
  testSubBadgeBtn.className = 'bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors';
  testSubBadgeBtn.addEventListener('click', () => {
    const testTags = {
      username: 'subTestUser',
      'display-name': 'SubTestUser',
      color: '#FF7F50',
      badges: {
        // Using the exact badges from console log
        subscriber: '3048'
      },
      'badge-info': {
        subscriber: '50'
      },
      'room-id': '123859191', // Exact room-id from console
      platform: 'twitch'
    };
    
    console.log('Testing subscriber badge with:', testTags);
    queueMessage(testTags, 'Testing subscriber badge display');
  });
  
  buttonsContainer.appendChild(testSubBadgeBtn);
  
  // Test multiple messages
  testMultipleBtn.addEventListener('click', () => {
    const messages = [
      { 
        name: 'TwitchUser1', 
        message: 'Hello from Twitch!', 
        color: '#9146FF', 
        badges: { 
          moderator: '1', 
          subscriber: '3048', // Use ID from your console log
          bits: '100',
          sub_gifter: '5'
        },
        badgeInfo: { 
          subscriber: '3' // 3 months subscriber
        },
        badgeUrl: "https://static-cdn.jtvnw.net/badges/v1/3048/3", // Direct badge URL
        platform: 'twitch'
      },
      { 
        name: 'YouTubeUser1', 
        message: 'Hello from YouTube!', 
        color: '#FF0000', 
        badges: { member: '1', moderator: '1' },
        platform: 'youtube'
      },
      { 
        name: 'TwitchUser2', 
        message: 'Twitch chat is the best!', 
        color: '#00CED1', 
        badges: { 
          subscriber: '2113', // Another subscriber badge ID
          turbo: '1', 
          premium: '1',
          founder: '0',
          ambassador: '1'
        },
        badgeInfo: { 
          subscriber: '12' // 12 months subscriber
        },
        badgeUrl: "https://static-cdn.jtvnw.net/badges/v1/2113/3", // Direct badge URL
        platform: 'twitch'
      },
      { 
        name: 'YouTubeUser2', 
        message: 'YouTube chat says hi!', 
        color: '#FF0000', 
        badges: { owner: '1', verified: '1' },
        platform: 'youtube'
      },
      { 
        name: 'TwitchAdmin', 
        message: 'Twitch admin checking in!', 
        color: '#FF4500', 
        badges: { 
          admin: '1', 
          staff: '1',
          partner: '1',
          clip_champ: '1',
          moments: '1'
        },
        platform: 'twitch'
      }
    ];
    
    messages.forEach((msg) => {
      const testTags = {
        username: msg.name.toLowerCase().replace(/\s+/g, ''),
        'display-name': msg.name,
        color: msg.color,
        badges: msg.badges || {},
        'badge-info': msg.badgeInfo || {},
        badgeUrl: msg.badgeUrl || null,
        emotes: msg.emotes || null,
        'room-id': config.settings.TWITCH.CHANNEL_ID || '1234567',
        platform: msg.platform
      };
      
      queueMessage(testTags, msg.message);
    });
  });
  
  // Set up an interval to check for messages that have moved off-screen
  setInterval(cleanupOffscreenMessages, 1000);
}

// Setup YouTube integration - simplified user approach
function setupYouTubeIntegration() {
  // Check if user has set a YouTube channel name
  if (config.settings.YOUTUBE && config.settings.YOUTUBE.CHANNEL_NAME) {
    // Create hidden elements for YouTube message parsing
    setupYouTubeMessageListener();
  }
}

// Show YouTube connect dialog
function showYouTubeConnectDialog() {
  // Create the dialog
  const dialogContainer = document.createElement('div');
  dialogContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  const dialog = document.createElement('div');
  dialog.className = 'bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full';
  
  // Dialog title
  const title = document.createElement('h2');
  title.className = 'text-xl font-bold text-white mb-4';
  title.textContent = 'Connect to YouTube Chat';
  
  // Dialog content
  const content = document.createElement('div');
  content.className = 'mb-4';
  content.innerHTML = `
    <p class="text-white mb-4">To connect YouTube chat:</p>
    <ol class="text-white list-decimal pl-5 mb-4 space-y-2">
      <li>Enter your YouTube channel name (as it appears in your channel URL)</li>
      <li>When you're live, your YouTube chat will automatically appear alongside Twitch chat</li>
    </ol>
    <div class="mb-4">
      <label class="block text-white mb-2" for="youtubeChannel">YouTube Channel Name:</label>
      <input type="text" id="youtubeChannel" class="w-full px-3 py-2 bg-gray-700 text-white rounded" 
        placeholder="e.g. YourChannel" 
        value="${config.settings.YOUTUBE?.CHANNEL_NAME || ''}">
    </div>
    <p class="text-gray-400 text-sm italic">Note: This service uses a browser-based integration with no API keys required.</p>
  `;
  
  // Dialog actions
  const actions = document.createElement('div');
  actions.className = 'flex justify-end space-x-3';
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700';
  cancelButton.textContent = 'Cancel';
  cancelButton.onclick = () => {
    document.body.removeChild(dialogContainer);
  };
  
  const saveButton = document.createElement('button');
  saveButton.className = 'px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700';
  saveButton.textContent = 'Save';
  saveButton.onclick = () => {
    // Get the channel name
    const channelInput = document.getElementById('youtubeChannel');
    const channelName = channelInput.value.trim();
    
    // Save to local storage
    const savedConfig = JSON.parse(localStorage.getItem('chatConfig') || '{}');
    if (!savedConfig.settings) savedConfig.settings = {};
    if (!savedConfig.settings.YOUTUBE) savedConfig.settings.YOUTUBE = {};
    
    savedConfig.settings.YOUTUBE.CHANNEL_NAME = channelName;
    localStorage.setItem('chatConfig', JSON.stringify(savedConfig));
    
    // Update config in memory
    if (!config.settings.YOUTUBE) config.settings.YOUTUBE = {};
    config.settings.YOUTUBE.CHANNEL_NAME = channelName;
    
    // Set up the YouTube integration
    setupYouTubeMessageListener();
    
    // Close the dialog
    document.body.removeChild(dialogContainer);
  };
  
  // Assemble the dialog
  actions.appendChild(cancelButton);
  actions.appendChild(saveButton);
  
  dialog.appendChild(title);
  dialog.appendChild(content);
  dialog.appendChild(actions);
  
  dialogContainer.appendChild(dialog);
  document.body.appendChild(dialogContainer);
}

// Set up a hidden iframe based YouTube message listener
function setupYouTubeMessageListener() {
  // Remove any existing iframe
  const existingIframe = document.getElementById('youtube-chat-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }
  
  if (!config.settings.YOUTUBE?.CHANNEL_NAME) {
    console.log('No YouTube channel configured');
    return;
  }
  
  // Create a hidden iframe for YouTube chat
  const iframe = document.createElement('iframe');
  iframe.id = 'youtube-chat-iframe';
  iframe.style.display = 'none';
  
  // Set the source to our message receiver page
  iframe.src = `youtube-chat-bridge.html?channel=${encodeURIComponent(config.settings.YOUTUBE.CHANNEL_NAME)}`;
  
  // Add a message listener to receive YouTube chat messages
  window.addEventListener('message', (event) => {
    // Security check - only accept messages from our iframe
    // In a real-world setting, you'd check the event.origin
    
    if (event.data.type === 'youtube-chat-message') {
      const message = event.data.message;
      
      // Create tags similar to Twitch format
      const tags = {
        username: message.author.toLowerCase().replace(/\s+/g, '-'),
        'display-name': message.author,
        color: message.isOwner ? '#FF0000' : getRandomColor(message.author),
        badges: {},
        platform: 'youtube'
      };
      
      // Add badges based on author role
      if (message.isOwner) {
        tags.badges.owner = '1';
      }
      
      if (message.isModerator) {
        tags.badges.moderator = '1';
      }
      
      if (message.isMember) {
        tags.badges.member = '1';
      }
      
      if (message.isVerified) {
        tags.badges.verified = '1';
      }
      
      // Skip empty messages
      if (!message.text || message.text.trim() === '') {
        return;
      }
      
      // Add the message to the queue
      queueMessage(tags, message.text);
    }
  });
  
  // Add the iframe to the page
  document.body.appendChild(iframe);
  
  console.log(`Connected to YouTube channel: ${config.settings.YOUTUBE.CHANNEL_NAME}`);
}

// Queue a message for processing
function queueMessage(tags, message) {
  messageQueue.push({ tags, message });
  
  if (!processingQueue) {
    processQueue();
  }
}

// Process the queue of messages
async function processQueue() {
  if (messageQueue.length === 0) {
    processingQueue = false;
    return;
  }
  
  processingQueue = true;
  const { tags, message } = messageQueue.shift();
  
  // Create and add the message
  await addChatMessage(tags, message);
  
  // Wait a bit before processing the next message
  setTimeout(processQueue, 700);
}

// Check if any messages have moved off the screen and should be removed
function cleanupOffscreenMessages() {
  const containerRect = chatContainer.parentElement.getBoundingClientRect();
  const messages = Array.from(chatContainer.children);
  
  messages.forEach(msg => {
    const msgRect = msg.getBoundingClientRect();
    
    // If the message has moved completely off the left edge of the container
    // Note: since we're using flex-direction: row-reverse, we check the right edge
    if (msgRect.left > containerRect.right + msgRect.width) {
      chatContainer.removeChild(msg);
    }
  });
}

// Create a message element
function createMessageElement(tags, message) {
  // Debug output - log what we're working with
  if (tags.badges && tags.badges.subscriber) {
    console.log('Creating message with subscriber badge:', { 
      subscriber: tags.badges.subscriber,
      badgeInfo: tags['badge-info'],
      username: tags.username
    });
  }

  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${tags.platform || 'twitch'}`;
  messageCounter++;
  
  // Platform indicator dot
  const platformIndicator = document.createElement('span');
  platformIndicator.className = 'platform-indicator';
  
  // Color the dot based on platform (purple for Twitch, red for YouTube)
  platformIndicator.style.backgroundColor = tags.platform === 'youtube' ? '#FF0000' : '#9146FF';
  
  messageElement.appendChild(platformIndicator);
  
  // Badge container
  const badgesContainer = document.createElement('span');
  badgesContainer.className = 'badges';
  
  // Add badges if available
  if (tags.badges) {
    Object.entries(tags.badges).forEach(([type, version]) => {
      const badgeImg = document.createElement('img');
      badgeImg.className = 'badge';
      
      // Check for specific badge info (like sub months)
      let badgeInfo = null;
      if (tags['badge-info'] && tags['badge-info'][type]) {
        badgeInfo = tags['badge-info'][type];
      }
      
      // Get the right badge URL based on platform
      if (tags.platform === 'youtube') {
        if (YOUTUBE_BADGE_URLS[type]) {
          badgeImg.src = YOUTUBE_BADGE_URLS[type];
          badgeImg.alt = type;
          badgesContainer.appendChild(badgeImg);
        }
      } else {
        // Special handling for Twitch badges
        try {
          // Handle known badge types first
          if (BADGE_URLS[type]) {
            badgeImg.src = BADGE_URLS[type];
          } 
          // Handle bits badges (they have tiered versions)
          else if (type === 'bits') {
            // Get appropriate bits badge based on version number
            let bitsLevel;
            if (version >= 100000) bitsLevel = '100000';
            else if (version >= 50000) bitsLevel = '50000';
            else if (version >= 25000) bitsLevel = '25000';
            else if (version >= 10000) bitsLevel = '10000';
            else if (version >= 5000) bitsLevel = '5000';
            else if (version >= 1000) bitsLevel = '1000';
            else if (version >= 100) bitsLevel = '100';
            else bitsLevel = '1';
            
            badgeImg.src = `https://static-cdn.jtvnw.net/badges/v1/bits/${bitsLevel}/3`;
          }
          // Handle hype-train badges
          else if (type === 'hype-train') {
            let level = parseInt(version) || 1; 
            level = Math.min(Math.max(level, 1), 5); // Ensure level is between 1-5
            badgeImg.src = `https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/${level}/3`;
          }
          // Special handling for subscriber badges
          else if (type === 'subscriber') {
            // First approach - ALWAYS prefer direct URL path when available
            // This is a critical fix - don't overthink it, just use the URL directly
            const directBadgeUrl = `https://static-cdn.jtvnw.net/badges/v1/${version}/3`;
            badgeImg.src = directBadgeUrl;
            
            // Get subscriber months if available 
            const months = badgeInfo ? parseInt(badgeInfo) : 0;
            badgeImg.title = `Subscriber${months ? ` (${months} months)` : ''}`;
            
            // Set alt text for accessibility
            badgeImg.alt = 'Subscriber';
            
            // Don't add any onerror handlers initially - let's see if the image loads
            
            // Log what we're doing for debugging
            console.log('Loading subscriber badge:', {
              directUrl: directBadgeUrl,
              version: version,
              badgeInfo: badgeInfo
            });
            
            // Immediately add the badge to the container - don't wait for any processing
            badgesContainer.appendChild(badgeImg);
            
            // Now add an error handler AFTER the badge is added to the DOM
            badgeImg.onerror = () => {
              console.log('Badge failed to load, trying fallback');
              badgeImg.src = BADGE_URLS.subscriber;
            };
            
            // Skip the rest of the badge handling - we've already added the badge
            return;
          }
          // Handle special badge ID formats (like ffz, seventv, etc.)
          else if (type.includes('/')) {
            // Format for special badges that use provider/id format
            const [provider, id] = type.split('/');
            if (provider === 'ffz') {
              badgeImg.src = `https://cdn.frankerfacez.com/badge/${id}/4`;
            } else if (provider === '7tv') {
              badgeImg.src = `https://cdn.7tv.app/badge/${id}/4x`;
            } else {
              // Generic service badge handler
              badgeImg.src = `https://static-cdn.jtvnw.net/badges/v1/${type}/${version}/3`;
            }
          }
          // For all other Twitch badges, use the standard API path
          else {
            badgeImg.src = `https://static-cdn.jtvnw.net/badges/v1/${type}/${version}/3`;
          }
          
          badgeImg.alt = type;
          
          // Error handling
          badgeImg.onerror = () => {
            // Try one more format for older badges
            if (!badgeImg.retried) {
              badgeImg.retried = true;
              console.log(`Retrying badge: ${type}`);
              // Try alternate format
              badgeImg.src = `https://static-cdn.jtvnw.net/badges/v1/${type}/3`;
            }
            // We won't remove the badge even if it fails - this might be causing the issue
            // Just leave a transparent badge rather than removing it
          };
          
          badgesContainer.appendChild(badgeImg);
        } catch (e) {
          console.log(`Error loading badge: ${type}`, e);
        }
      }
    });
  }
  
  messageElement.appendChild(badgesContainer);
  
  // Username with color
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.textContent = tags['display-name'] || tags.username;
  usernameSpan.style.color = tags.color || getRandomColor(tags.username);
  messageElement.appendChild(usernameSpan);
  
  // Add colon
  const colonSpan = document.createElement('span');
  colonSpan.className = 'colon';
  colonSpan.textContent = ':';
  messageElement.appendChild(colonSpan);
  
  // Add message content
  addMessageContent(messageElement, tags, message);
  
  return messageElement;
}

// Add message content with emote handling
function addMessageContent(messageElement, tags, message) {
  // Message content with emotes
  const contentSpan = document.createElement('span');
  contentSpan.className = 'message-content';
  
  // Limit message length to prevent multi-line issues
  let processedMessage = message;
  if (message.length > 100) {
    processedMessage = message.substring(0, 97) + '...';
  }
  
  if (tags.emotes) {
    // Replace emotes in the message
    const emotePositions = [];
    
    // Collect all emote positions
    for (const [id, positions] of Object.entries(tags.emotes)) {
      positions.forEach(position => {
        const [start, end] = position.split('-').map(Number);
        // Only process emotes that are within our truncated message
        if (start < processedMessage.length) {
          emotePositions.push({ id, start, end: Math.min(end, processedMessage.length - 1) });
        }
      });
    }
    
    // Sort positions by start index (ascending)
    emotePositions.sort((a, b) => a.start - b.start);
    
    // Process message with emotes
    let lastIndex = 0;
    
    for (const { id, start, end } of emotePositions) {
      // Add text before the emote
      if (start > lastIndex) {
        const textNode = document.createTextNode(processedMessage.substring(lastIndex, start));
        contentSpan.appendChild(textNode);
      }
      
      // Add the emote
      const emoteImg = document.createElement('img');
      emoteImg.className = 'emote';
      
      // Use updated Twitch emote CDN format that supports animated emotes
      emoteImg.src = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
      emoteImg.alt = processedMessage.substring(start, end + 1);
      
      contentSpan.appendChild(emoteImg);
      
      lastIndex = end + 1;
    }
    
    // Add any remaining text
    if (lastIndex < processedMessage.length) {
      const textNode = document.createTextNode(processedMessage.substring(lastIndex));
      contentSpan.appendChild(textNode);
    }
  } else {
    // No emotes, just add the message
    contentSpan.textContent = processedMessage;
  }
  
  // Add content to message element
  messageElement.appendChild(contentSpan);
}

// Calculate the width needed for the new message
function getMeasurements(element) {
  // Create a temporary clone for measuring
  const clone = element.cloneNode(true);
  clone.className += ' offscreen';
  document.body.appendChild(clone);
  
  const width = clone.offsetWidth;
  const height = clone.offsetHeight;
  
  document.body.removeChild(clone);
  
  return { width, height };
}

// Add a chat message to the container
async function addChatMessage(tags, message) {
  return new Promise(resolve => {
    // Wait if animation is in progress
    if (animating) {
      setTimeout(() => {
        queueMessage(tags, message);
        resolve();
      }, 100);
      return;
    }
    
    animating = true;
    
    // Step 1: Create the message element
    const messageElement = createMessageElement(tags, message);
    
    // Step 2: Measure the message without adding it to the container
    const { width } = getMeasurements(messageElement);
    
    // Step 3: First remove the transition to instantly move the container
    chatContainer.style.transition = 'none';
    
    // Step 4: Add the new message to the container at the start (right side)
    chatContainer.prepend(messageElement);
    
    // Step 5: Calculate how much to shift the container
    const shiftAmount = width + 24; // Increased from 16px to 24px for more spacing
    
    // Step 6: Shift the container to accommodate the new message (without animation)
    chatContainer.style.transform = `translateX(${shiftAmount}px)`;
    
    // Step 7: Force reflow to ensure the instant position change takes effect
    void chatContainer.offsetWidth;
    
    // Step 8: Restore the transition for smooth animation
    chatContainer.style.transition = 'transform 0.6s ease-out'; // Increased from 0.5s to 0.6s
    
    // Step 9: After a brief delay, animate the container back to its original position
    setTimeout(() => {
      chatContainer.style.transform = 'translateX(0)';
      
      // Step 10: After animation completes, release the animation lock
      setTimeout(() => {
        animating = false;
        resolve();
      }, 600); // Match the transition duration
    }, 50); // Small delay to ensure transition is applied
  });
}

// Generate a consistent color for usernames without a color
function getRandomColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

// Helper function to get the appropriate month range for badge display
function getMonthRangeForBadge(months) {
  if (months >= 60) return '60-month';
  if (months >= 36) return '36-month';
  if (months >= 24) return '24-month';
  if (months >= 12) return '12-month';
  if (months >= 9) return '9-month';
  if (months >= 6) return '6-month';
  if (months >= 3) return '3-month';
  return '0-month';
}

// Start everything when the DOM is ready
document.addEventListener('DOMContentLoaded', init); 