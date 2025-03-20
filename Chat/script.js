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
  vip: "https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3"
};

// Message counter for alternating styles
let messageCounter = 0;

// Queue for pending messages
const messageQueue = [];
let processingQueue = false;
let animating = false;

// Connect to Twitch
const client = new tmi.Client({
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
  client.connect().catch(console.error);
  
  // Listen for messages
  client.on('message', (channel, tags, message, self) => {
    if (self) return; // Ignore messages from the bot
    
    queueMessage(tags, message);
  });
  
  // Test button
  testMessageBtn.addEventListener('click', () => {
    const testTags = {
      username: 'testUser',
      'display-name': 'TestUser',
      color: '#FF7F50',
      badges: {
        broadcaster: '1',
        subscriber: '3'
      },
      emotes: {
        '25': ['0-4'], // Example emote (Kappa)
      }
    };
    
    queueMessage(testTags, 'Kappa Hello from the test message! 👋');
  });
  
  // Test multiple messages
  testMultipleBtn.addEventListener('click', () => {
    const messages = [
      { name: 'UserOne', message: 'Hello everyone!', color: '#FF4500', badges: { moderator: '1' } },
      { name: 'UserTwo', message: 'Great stream today!', color: '#00CED1', badges: { subscriber: '3' } },
      { name: 'UserThree', message: 'Kappa This is amazing!', color: '#9ACD32', badges: { vip: '1' }, emotes: { '25': ['0-4'] } },
      { name: 'UserFour', message: 'Looking forward to the next stream!', color: '#BA55D3', badges: { premium: '1' } }
    ];
    
    messages.forEach((msg, index) => {
      const testTags = {
        username: `user${index + 1}`,
        'display-name': msg.name,
        color: msg.color,
        badges: msg.badges || {},
        emotes: msg.emotes || null
      };
      
      queueMessage(testTags, msg.message);
    });
  });
  
  // Set up an interval to check for messages that have moved off-screen
  setInterval(cleanupOffscreenMessages, 1000);
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
  messageElement.className = `chat-message ${messageCounter % 2 === 0 ? '' : 'alt'}`;
  messageCounter++;
  
  // Badge container
  const badgesContainer = document.createElement('span');
  badgesContainer.className = 'badges';
  
  // Add badges if available
  if (tags.badges) {
    Object.entries(tags.badges).forEach(([type, version]) => {
      const badgeImg = document.createElement('img');
      badgeImg.className = 'badge';
      
      // Use our predefined badge URLs for testing
      if (BADGE_URLS[type]) {
        badgeImg.src = BADGE_URLS[type];
      } else {
        // Fallback to the Twitch API path
        badgeImg.src = `https://static-cdn.jtvnw.net/badges/v1/${type}/${version}/3`;
      }
      
      badgeImg.alt = type;
      badgesContainer.appendChild(badgeImg);
    });
  }
  
  messageElement.appendChild(badgesContainer);
  
  // Username with color
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.textContent = tags['display-name'] || tags.username;
  usernameSpan.style.color = tags.color || getRandomColor(tags.username);
  messageElement.appendChild(usernameSpan);
  
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
      emoteImg.src = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`;
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
  
  messageElement.appendChild(contentSpan);
  
  return messageElement;
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
    const shiftAmount = width + 8; // Add a small gap
    
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