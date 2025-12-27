// Import config
import { config } from '../src/config.js';
import tmi from '../src/vendor/tmi.js';

// Default settings
const defaultSettings = {
  font: "Plus Jakarta Sans",
  theme: 'dark',
  size: 32,
  style: 'pill',
  gradient: false,
  spacing: 10,
  consecutiveNames: false,
  autohide: false,
  delay: 15,
  animation: 'slide'
};

// Map of settings to URL parameters for shorter/cleaner URLs
const settingToParam = {
  font: 'font',
  theme: 'theme',
  size: 'sz',
  style: 'st',
  gradient: 'gr',
  spacing: 'sp',
  consecutiveNames: 'cn',
  autohide: 'ah',
  delay: 'dl',
  animation: 'an'
};
const paramToSetting = Object.fromEntries(Object.entries(settingToParam).map(([k, v]) => [v, k]));

// Current settings state
let settings = { ...defaultSettings };

// Track loaded Google Fonts to avoid duplicate links
const loadedFonts = new Set(['Plus Jakarta Sans', 'Inter', 'Roboto', 'Montserrat', 'Poppins', 'Open Sans', 'Bangers', 'Fredoka', 'Bungee', 'Pacifico', 'Lobster', 'Anton', 'Bebas Neue', 'Playfair Display', 'Orbitron', 'Comfortaa', 'Press Start 2P', 'JetBrains Mono', 'Fira Code']);

// Pre-load popular fonts for the dropdown preview
function preLoadFonts() {
  const fontList = Array.from(loadedFonts);
  const families = fontList.map(f => `family=${f.replace(/\s+/g, '+')}:wght@400;700`).join('&');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}

// Font picker data
const fontGroups = [
  {
    label: "Modern Sans",
    fonts: ["Plus Jakarta Sans", "Inter", "Roboto", "Montserrat", "Poppins", "Open Sans"]
  },
  {
    label: "Display & Fun",
    fonts: ["Bangers", "Fredoka", "Bungee", "Pacifico", "Lobster", "Anton", "Bebas Neue"]
  },
  {
    label: "Stylized",
    fonts: ["Playfair Display", "Orbitron", "Comfortaa", "Press Start 2P"]
  },
  {
    label: "Monospace",
    fonts: ["JetBrains Mono", "Fira Code", "monospace"]
  }
];

// Initialize Custom Font Picker
function initFontPicker() {
  const trigger = document.getElementById('font-picker-trigger');
  const dropdown = document.getElementById('font-picker-dropdown');
  const currentName = document.getElementById('current-font-name');
  if (!trigger || !dropdown) return;

  // Render font options
  dropdown.innerHTML = fontGroups.map(group => `
    <div class="font-picker-group">
      <div class="font-picker-group-label">${group.label}</div>
      ${group.fonts.map(font => `
        <div class="font-picker-option ${settings.font === font ? 'selected' : ''}" 
             data-font="${font}" 
             style="font-family: '${font}', sans-serif">
          ${font === 'monospace' ? 'System Mono' : font}
        </div>
      `).join('')}
    </div>
  `).join('');

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
      // Revert preview to actual selected font
      applySettings();
    }
  });

  // Toggle dropdown
  trigger.addEventListener('click', () => {
    const isHidden = dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden');
    trigger.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });
  
  // Keyboard navigation for dropdown
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', 'true');
        // Focus first option
        const firstOption = dropdown.querySelector('.font-picker-option');
        if (firstOption) firstOption.focus();
      }
    }
  });

  // Handle hover (preview), click (select), and keyboard navigation
  dropdown.querySelectorAll('.font-picker-option').forEach((option, index) => {
    const font = option.dataset.font;
    
    // Make options focusable
    option.setAttribute('tabindex', '0');
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', settings.font === font ? 'true' : 'false');
    
    // Figma-like hover preview
    option.addEventListener('mouseenter', () => {
      // Temporary override just for preview
      const oldFont = settings.font;
      settings.font = font;
      applySettings();
      settings.font = oldFont; // Reset state but leave UI preview
    });

    // Select on click
    option.addEventListener('click', () => {
      selectFont(font, option, currentName, dropdown);
    });
    
    // Keyboard navigation
    option.addEventListener('keydown', (e) => {
      const options = Array.from(dropdown.querySelectorAll('.font-picker-option'));
      const currentIndex = options.indexOf(option);
      
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < options.length - 1) {
            options[currentIndex + 1].focus();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            options[currentIndex - 1].focus();
          } else {
            trigger.focus();
            dropdown.classList.add('hidden');
            trigger.setAttribute('aria-expanded', 'false');
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          selectFont(font, option, currentName, dropdown);
          trigger.focus();
          break;
        case 'Escape':
          e.preventDefault();
          dropdown.classList.add('hidden');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
          break;
        case 'Home':
          e.preventDefault();
          options[0].focus();
          break;
        case 'End':
          e.preventDefault();
          options[options.length - 1].focus();
          break;
      }
    });
  });
  
  // Helper function to select font
  function selectFont(font, option, currentName, dropdown) {
    settings.font = font;
    if (currentName) currentName.textContent = font === 'monospace' ? 'System Mono' : font;
    dropdown.querySelectorAll('.font-picker-option').forEach(opt => {
      const isSelected = opt.dataset.font === font;
      opt.classList.toggle('selected', isSelected);
      opt.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
    dropdown.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
    saveSettings();
    applySettings();
    updateSettingsUI();
  }
}

// Load Google Font dynamically if not already loaded
function loadGoogleFont(fontName) {
  if (!fontName || loadedFonts.has(fontName)) return;
  
  // Basic system fonts don't need loading
  const systemFonts = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];
  if (systemFonts.includes(fontName.toLowerCase())) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

// Update URL parameters without reloading
function syncUrlWithSettings() {
  const currentUrl = new URL(window.location.href);
  const params = currentUrl.searchParams;

  Object.entries(settingToParam).forEach(([setting, param]) => {
    const value = settings[setting];
    if (value === defaultSettings[setting]) {
      params.delete(param);
    } else {
      params.set(param, value);
    }
  });

  window.history.replaceState({}, '', currentUrl.toString());
}

// Message display settings
const MAX_MESSAGES = 30; // Maximum number of messages to show

// Badge caches
let globalBadgeCache = {};
let channelBadgeCache = {};

// Animation state tracking
let isAnimating = false;
let slideDistance = 0;

// Track the last message sender
let lastMessageSenderId = null;

// Parse URL parameters
function getUrlParams() {
  const params = {};
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  
  // Get auth params
  const token = urlParams.get('token');
  const username = urlParams.get('username');
  const channel = urlParams.get('channel');
  const channelId = urlParams.get('channelId');
  
  if (token) params.token = token;
  if (username) params.username = username;
  if (channel) params.channel = channel;
  if (channelId) params.channelId = channelId;
  
  return params;
}

// Generate OBS URL with auth and all settings
function generateOBSUrl(token, username, channel) {
  if (!token || !username) {
    console.error('Missing required parameters for OBS URL');
    return null;
  }
  
  const currentUrl = new URL(window.location.href);
  const params = new URLSearchParams();
  
  // Auth params
  params.append('token', token);
  params.append('username', username);
  if (channel && channel !== username) {
    params.append('channel', channel);
  }
  
  // Settings params
  Object.entries(settingToParam).forEach(([setting, param]) => {
    const value = settings[setting];
    if (value !== defaultSettings[setting]) {
      params.set(param, value);
    }
  });
  
  currentUrl.search = params.toString();
  return currentUrl.toString();
}

// Export for use in HTML
globalThis.generateOBSUrl = generateOBSUrl;

// Get auth details from URL params, localStorage, or config
const getAuthDetails = () => {
  // First check URL parameters (highest priority for OBS)
  const urlParams = getUrlParams();
  if (urlParams.token && urlParams.username) {
    console.log('Using URL parameters for authentication');
    return {
      username: urlParams.username,
      password: `oauth:${urlParams.token}`,
      channel: urlParams.channel || urlParams.username,
      clientId: config.settings.TWITCH.CLIENT_ID,
      channelId: urlParams.channelId || config.settings.TWITCH.CHANNEL_ID
    };
  }
  
  // Then try localStorage
  const storedToken = localStorage.getItem('twitch_oauth_token');
  const storedUsername = localStorage.getItem('twitch_username');
  const storedChannelId = localStorage.getItem('twitch_channel_id');
  
  if (storedToken && storedUsername) {
    console.log('Using localStorage for authentication');
    return {
      username: storedUsername,
      password: `oauth:${storedToken}`,
      channel: storedUsername, // Use authenticated user's channel by default
      clientId: config.settings.TWITCH.CLIENT_ID,
      channelId: storedChannelId || config.settings.TWITCH.CHANNEL_ID
    };
  }
  
  // Fall back to config file
  console.log('Using config file for authentication');
  return {
    username: config.settings.TWITCH.USERNAME,
    password: config.settings.TWITCH.OAUTH_TOKEN,
    channel: config.settings.TWITCH.CHANNEL_NAME,
    clientId: config.settings.TWITCH.CLIENT_ID,
    channelId: config.settings.TWITCH.CHANNEL_ID
  };
};

// Load settings from URL params or localStorage
function loadSettings() {
  // 1. Start with defaults
  settings = { ...defaultSettings };

  // 2. Override with localStorage
  const savedSettings = localStorage.getItem('chat_settings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      Object.assign(settings, parsed);
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }

  // 3. Override with URL parameters (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  Object.entries(paramToSetting).forEach(([param, setting]) => {
    if (urlParams.has(param)) {
      let value = urlParams.get(param);
      
      // Convert types
      if (typeof defaultSettings[setting] === 'number') value = parseInt(value);
      if (typeof defaultSettings[setting] === 'boolean') value = value === 'true';
      
      settings[setting] = value;
    }
  });

  applySettings();
  updateSettingsUI();
}

// Save settings to localStorage and update URL
function saveSettings() {
  localStorage.setItem('chat_settings', JSON.stringify(settings));
  syncUrlWithSettings();
}

// Update UI elements to match current settings
function updateSettingsUI() {
  const currentFontName = document.getElementById('current-font-name');
  const sizeInput = document.getElementById('setting-size');
  const sizeValue = document.getElementById('size-value');
  const themeDark = document.getElementById('theme-dark');
  const themeLight = document.getElementById('theme-light');
  
  const styleSelect = document.getElementById('setting-style');
  const gradientCheck = document.getElementById('setting-gradient');
  const spacingInput = document.getElementById('setting-spacing');
  const spacingValue = document.getElementById('spacing-value');
  const consecutiveCheck = document.getElementById('setting-consecutive-names');
  const autohideCheck = document.getElementById('setting-autohide');
  const delayInput = document.getElementById('setting-delay');
  const delayValue = document.getElementById('delay-value');
  const animationSelect = document.getElementById('setting-animation');

  if (currentFontName) currentFontName.textContent = settings.font === 'monospace' ? 'System Mono' : settings.font;
  if (sizeInput) sizeInput.value = settings.size;
  if (sizeValue) sizeValue.textContent = `${settings.size}px`;
  
  if (styleSelect) styleSelect.value = settings.style;
  if (gradientCheck) gradientCheck.checked = settings.gradient;
  if (spacingInput) spacingInput.value = settings.spacing;
  if (spacingValue) spacingValue.textContent = `${settings.spacing}px`;
  if (consecutiveCheck) consecutiveCheck.checked = settings.consecutiveNames;
  if (autohideCheck) autohideCheck.checked = settings.autohide;
  if (delayInput) delayInput.value = settings.delay;
  if (delayValue) delayValue.textContent = `${settings.delay}s`;
  if (animationSelect) animationSelect.value = settings.animation;

  // Show/hide dependent options
  const autohideContainer = document.getElementById('autohide-delay-container');
  if (autohideContainer) {
    autohideContainer.classList.toggle('hidden', !settings.autohide);
  }

  if (themeDark && themeLight) {
    if (settings.theme === 'dark') {
      themeDark.classList.add('active');
      themeDark.setAttribute('aria-pressed', 'true');
      themeLight.classList.remove('active');
      themeLight.setAttribute('aria-pressed', 'false');
    } else {
      themeLight.classList.add('active');
      themeLight.setAttribute('aria-pressed', 'true');
      themeDark.classList.remove('active');
      themeDark.setAttribute('aria-pressed', 'false');
    }
  }
}

// Apply settings to the document
function applySettings() {
  const bodyClass = `m-0 p-0 h-screen w-screen overflow-hidden bg-transparent theme-${settings.theme} style-${settings.style} ${settings.gradient ? 'has-gradient' : ''}`;
  document.body.className = bodyClass;
  
  // Load font if it's a Google Font
  loadGoogleFont(settings.font);

  // Remove existing settings style if any
  const oldStyle = document.getElementById('dynamic-chat-settings');
  if (oldStyle) oldStyle.remove();

  const style = document.createElement('style');
  style.id = 'dynamic-chat-settings';
  style.textContent = `
    body { 
      font-family: '${settings.font}', sans-serif !important;
      font-size: ${settings.size}px !important;
    }
    .chat-message {
      font-size: ${settings.size}px !important;
    }
    .message-wrapper {
      margin-left: ${settings.spacing}px !important;
    }
    .badge-container {
      height: ${settings.size}px !important;
    }
    .badge {
      min-width: ${settings.size}px !important;
    }
  `;
  document.head.appendChild(style);
}

// Initialize settings panel event listeners
function initSettingsPanel() {
  const toggleBtn = document.getElementById('toggle-settings');
  const resetBtn = document.getElementById('reset-settings');
  const panel = document.getElementById('settings-panel');
  
  const inputs = {
    font: 'setting-font',
    size: 'setting-size',
    style: 'setting-style',
    gradient: 'setting-gradient',
    spacing: 'setting-spacing',
    consecutiveNames: 'setting-consecutive-names',
    autohide: 'setting-autohide',
    delay: 'setting-delay',
    animation: 'setting-animation'
  };

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = panel.classList.contains('hidden');
      panel.classList.toggle('hidden');
      toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
    
    // Close panel with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
        panel.classList.add('hidden');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.focus();
      }
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      // Check if panel is visible and click is outside both panel and toggle button
      if (!panel.classList.contains('hidden') && 
          !panel.contains(e.target) && 
          !toggleBtn.contains(e.target)) {
        panel.classList.add('hidden');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all chat settings to defaults?')) {
        settings = { ...defaultSettings };
        saveSettings();
        applySettings();
        updateSettingsUI();
      }
    });
  }

  // Generic change listener for all standard inputs
  Object.entries(inputs).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;

    const eventType = el.type === 'range' ? 'input' : 'change';
    el.addEventListener(eventType, (e) => {
      let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (e.target.type === 'range') {
        value = parseInt(value);
        // Update ARIA attributes for range inputs
        e.target.setAttribute('aria-valuenow', value);
        
        // Update aria-valuetext with appropriate units
        if (id === 'setting-size' || id === 'setting-spacing') {
          e.target.setAttribute('aria-valuetext', `${value} pixels`);
        } else if (id === 'setting-delay') {
          e.target.setAttribute('aria-valuetext', `${value} seconds`);
        }
      }
      
      settings[key] = value;
      saveSettings();
      applySettings();
      updateSettingsUI();
    });
  });

  const themeDark = document.getElementById('theme-dark');
  const themeLight = document.getElementById('theme-light');

  if (themeDark) {
    themeDark.addEventListener('click', () => {
      settings.theme = 'dark';
      themeDark.setAttribute('aria-pressed', 'true');
      themeDark.classList.add('active');
      themeLight.setAttribute('aria-pressed', 'false');
      themeLight.classList.remove('active');
      saveSettings();
      applySettings();
      updateSettingsUI();
    });
  }

  if (themeLight) {
    themeLight.addEventListener('click', () => {
      settings.theme = 'light';
      themeLight.setAttribute('aria-pressed', 'true');
      themeLight.classList.add('active');
      themeDark.setAttribute('aria-pressed', 'false');
      themeDark.classList.remove('active');
      saveSettings();
      applySettings();
      updateSettingsUI();
    });
  }
}

// Check for authentication
document.addEventListener('DOMContentLoaded', () => {
  const authDetails = getAuthDetails();
  
  // Pre-load popular fonts for dropdown
  preLoadFonts();
  
  // Load and apply settings (handles URL params + localStorage)
  loadSettings();
  initSettingsPanel();
  initFontPicker();

  console.log('Auth details (sensitive data redacted):', {
    username: authDetails.username,
    hasPassword: !!authDetails.password,
    channel: authDetails.channel,
    hasClientId: !!authDetails.clientId
  });
  
  // If no auth details are available, show auth prompt
  if (!authDetails.password || !authDetails.password.startsWith('oauth:')) {
    showAuthPrompt();
    return;
  }
  
  // Initialize chat if authenticated
  initializeChat(authDetails);
});

// Show authentication prompt with OBS instructions
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
      <a href="../auth/oauth.html" class="auth-button">Login with Twitch</a>
      
      <div class="obs-instructions">
        <h3>Using in OBS?</h3>
        <p>After logging in, copy the URL from the address bar and add it to your Browser Source in OBS.</p>
        <p>Or use this format: <code>${window.location.origin}${window.location.pathname}?token=YOUR_TOKEN&username=YOUR_USERNAME&channel=CHANNEL_TO_WATCH</code></p>
      </div>
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
      max-width: 500px;
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
    .obs-instructions {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      text-align: left;
    }
    .obs-instructions h3 {
      margin-bottom: 0.5rem;
    }
    .obs-instructions code {
      display: block;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
      overflow-x: auto;
      font-size: 0.8rem;
      word-break: break-all;
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
    
    // Skip messages that start with ! or / (command messages)
    if (message.startsWith('!') || message.startsWith('/')) return;
    
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
  // Skip command messages (double-check)
  if (message.startsWith('!') || message.startsWith('/')) return;
  
  const chatContainer = document.getElementById('chatContainer');
  const currentUserId = tags['user-id'];
  
  // Logic for consecutive messages from the same user
  const isSameUser = currentUserId && currentUserId === lastMessageSenderId;
  const showUserInfo = !isSameUser || settings.consecutiveNames;
  
  // Create the message element
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message';
  messageElement.dataset.messageId = messageId;
  
  // Only add badges and username if required
  if (showUserInfo) {
    // Add badges if present
    if (tags.badges || tags['badges-raw']) {
      const badgeContainer = document.createElement('span');
      badgeContainer.className = 'badge-container';
      
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
  }

  // Add message text with emote and image support
  const messageText = document.createElement('span');
  messageText.className = 'message-text';
  
  let processedMessage = message;

  // 1. Handle Emotes
  if (tags.emotes) {
    const emotePositions = [];
    Object.entries(tags.emotes).forEach(([id, positions]) => {
      positions.forEach(position => {
        const [start, end] = position.split('-').map(Number);
        emotePositions.push({ start, end, id });
      });
    });

    emotePositions.sort((a, b) => b.start - a.start);
    emotePositions.forEach(({ start, end, id }) => {
      const emoteImg = `<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0" />`;
      processedMessage = processedMessage.slice(0, start) + emoteImg + processedMessage.slice(end + 1);
    });
  }

  if (tags.emotes) {
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
  
  // Handle Auto-hide
  if (settings.autohide) {
    setTimeout(() => {
      messageWrapper.style.opacity = '0';
      messageWrapper.style.transform = 'scale(0.9)';
      setTimeout(() => {
        if (messageWrapper.parentElement) {
          messageWrapper.remove();
        }
      }, 400);
    }, settings.delay * 1000);
  }

  // Animation logic
  if (isAnimating && settings.animation !== 'none') {
    setTimeout(() => displayMessage(tags, message, messageId), 50);
    return;
  }
  
  lastMessageSenderId = currentUserId;
  isAnimating = true;
  
  // Initial state based on animation setting
  if (settings.animation === 'slide') {
    messageWrapper.style.transform = 'translateX(100%)';
  } else if (settings.animation === 'bounce') {
    messageWrapper.style.transform = 'scale(0) translateY(50px)';
  }
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
  slideDistance = wrapperWidth + settings.spacing;
  
  // Apply the initial offset to all existing messages
  if (settings.animation === 'slide' || settings.animation === 'bounce') {
    Array.from(chatContainer.children).forEach(child => {
      if (child !== messageWrapper) {
        child.style.transition = 'none';
        child.style.transform = `translateX(${slideDistance}px)`;
      }
    });
  }
  
  // Force a reflow before setting up the animation
  void chatContainer.offsetWidth;
  
  // Now set up all elements to animate together
  Array.from(chatContainer.children).forEach(child => {
    const duration = settings.animation === 'bounce' ? '0.6s' : '0.4s';
    const timing = settings.animation === 'bounce' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out';
    child.style.transition = `transform ${duration} ${timing}, opacity ${duration} ${timing}`;
    
    if (child === messageWrapper) {
      // New message slides in
      child.style.transform = 'translateX(0) scale(1)';
      child.style.opacity = '1';
    } else {
      // Existing messages slide back to original position
      child.style.transform = 'translateX(0)';
    }
  });
  
  // Reset animation state after animation completes
  setTimeout(() => {
    isAnimating = false;
  }, settings.animation === 'bounce' ? 600 : 400);
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
globalThis.testMessage = (type = 'regular') => {
  const testTags = {
    'display-name': 'TestUser',
    'user-id': '123456',
    color: '#FF0000',
    mod: true, // Allow images for testing
    badges: {
      subscriber: '1',
      moderator: '1'
    }
  };
  
  const secondUserTags = {
    'display-name': 'AnotherUser',
    'user-id': '789012',
    color: '#00FF00',
    badges: {
      moderator: '1'
    }
  };

  if (type === 'regular') {
    displayMessage(testTags, 'This is a test message with a pill shape design! 👋 How does it look?', Date.now());
  } else if (type === 'command') {
    displayMessage(testTags, '!command This should be filtered out', Date.now());
  } else if (type === 'slash') {
    displayMessage(testTags, '/whisper This should also be filtered out', Date.now());
  } else if (type === 'sequence') {
    // First message from TestUser
    displayMessage(testTags, 'First message from TestUser', Date.now());
    
    // Second message from same user (should not show badges/username)
    setTimeout(() => {
      displayMessage(testTags, 'Second message from TestUser without badges/username', Date.now() + 1);
    }, 1000);
    
    // Message from different user (should show badges/username)
    setTimeout(() => {
      displayMessage(secondUserTags, 'Message from AnotherUser with badges/username', Date.now() + 2);
    }, 2000);
    
    // Another message from first user (should show badges/username again)
    setTimeout(() => {
      displayMessage(testTags, 'Back to TestUser with badges/username', Date.now() + 3);
    }, 3000);
  }
};