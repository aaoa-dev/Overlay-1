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
  artist: "https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0c-c9f4d5ad064c/3"
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
  // Connect to Twitch once DOM is loaded
  twitchClient.connect().catch(console.error);
  
  // Listen for Twitch messages
  twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return; // Ignore messages from the bot
    
    // Add platform info to distinguish the source
    tags.platform = 'twitch';
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
        subscriber: '3',
        turbo: '1'
      },
      emotes: {
        '25': ['0-4'], // Example emote (Kappa)
      },
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
  
  // Test multiple messages
  testMultipleBtn.addEventListener('click', () => {
    const messages = [
      { 
        name: 'TwitchUser1', 
        message: 'Hello from Twitch!', 
        color: '#9146FF', 
        badges: { moderator: '1', subscriber: '3' },
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
        badges: { subscriber: '3', turbo: '1', premium: '1' },
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
        badges: { admin: '1', staff: '1' },
        platform: 'twitch'
      }
    ];
    
    messages.forEach((msg) => {
      const testTags = {
        username: msg.name.toLowerCase().replace(/\s+/g, ''),
        'display-name': msg.name,
        color: msg.color,
        badges: msg.badges || {},
        emotes: msg.emotes || null,
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
      
      // Get the right badge URL based on platform
      if (tags.platform === 'youtube') {
        if (YOUTUBE_BADGE_URLS[type]) {
          badgeImg.src = YOUTUBE_BADGE_URLS[type];
          badgeImg.alt = type;
          badgesContainer.appendChild(badgeImg);
        }
      } else {
        // Twitch badges
        if (BADGE_URLS[type]) {
          badgeImg.src = BADGE_URLS[type];
          badgeImg.alt = type;
          badgesContainer.appendChild(badgeImg);
        } else {
          // Fallback to the Twitch API path for badges that aren't in our mapping
          badgeImg.src = `https://static-cdn.jtvnw.net/badges/v1/${type}/${version}/3`;
          badgeImg.alt = type;
          badgeImg.onerror = () => {
            // If badge fails to load, remove it
            badgeImg.remove();
          };
          badgesContainer.appendChild(badgeImg);
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
  
  if (tags.emotes) {
    // Replace emotes in the message
    const emotePositions = [];
    
    // Collect all emote positions
    for (const [id, positions] of Object.entries(tags.emotes)) {
      positions.forEach(position => {
        const [start, end] = position.split('-').map(Number);
        emotePositions.push({ id, start, end });
      });
    }
    
    // Sort positions by start index (ascending)
    emotePositions.sort((a, b) => a.start - b.start);
    
    // Process message with emotes
    let lastIndex = 0;
    
    for (const { id, start, end } of emotePositions) {
      // Add text before the emote
      if (start > lastIndex) {
        const textNode = document.createTextNode(message.substring(lastIndex, start));
        contentSpan.appendChild(textNode);
      }
      
      // Add the emote
      const emoteImg = document.createElement('img');
      emoteImg.className = 'emote';
      
      // Use updated Twitch emote CDN format that supports animated emotes
      emoteImg.src = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
      emoteImg.alt = message.substring(start, end + 1);
      
      contentSpan.appendChild(emoteImg);
      
      lastIndex = end + 1;
    }
    
    // Add any remaining text
    if (lastIndex < message.length) {
      const textNode = document.createTextNode(message.substring(lastIndex));
      contentSpan.appendChild(textNode);
    }
  } else {
    // No emotes, just add the message
    contentSpan.textContent = message;
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
    const shiftAmount = width + 16; // Add standard 16px spacing
    
    // Step 6: Shift the container to accommodate the new message (without animation)
    chatContainer.style.transform = `translateX(${shiftAmount}px)`;
    
    // Step 7: Force reflow to ensure the instant position change takes effect
    void chatContainer.offsetWidth;
    
    // Step 8: Restore the transition for smooth animation
    chatContainer.style.transition = 'transform 0.5s ease-out';
    
    // Step 9: After a brief delay, animate the container back to its original position
    setTimeout(() => {
      chatContainer.style.transform = 'translateX(0)';
      
      // Step 10: After animation completes, release the animation lock
      setTimeout(() => {
        animating = false;
        resolve();
      }, 500); // Match the transition duration
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

// Start everything when the DOM is ready
document.addEventListener('DOMContentLoaded', init); 