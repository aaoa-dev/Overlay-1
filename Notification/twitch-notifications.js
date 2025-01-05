// Debug helper
function debug(message) {
    console.log(message);
    updateDebug(message);
}

// Animation state
let isAnimating = false;
let currentTimeout = null;

// Initialize signature elements
const signature = document.querySelector('.signature');
const signatureMain = document.querySelector('.signature-main');
const letterBank = document.querySelector('.letter-bank');

// Create background element
const HORIZONTAL_PADDING = 32; // 32px padding on each side
const backgroundElement = document.createElement('div');
backgroundElement.style.position = 'absolute';
backgroundElement.style.left = `-${HORIZONTAL_PADDING}px`; // Offset left to account for padding
backgroundElement.style.top = '0';
backgroundElement.style.height = '100%';
backgroundElement.style.background = '#000';
backgroundElement.style.transition = 'all 0.5s ease';
backgroundElement.style.opacity = '0';
backgroundElement.style.width = '0';
backgroundElement.style.zIndex = '1';

// Update SVG styling
const svgStyle = document.createElement('style');
svgStyle.textContent = `
    .signature-main svg {
        width: auto;
        height: 51px;
        display: block;
    }
    .signature-main svg path {
        stroke: #fff;
        stroke-width: 1;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
        transition: stroke-dashoffset 0.5s ease;
    }
`;
document.head.appendChild(svgStyle);

signatureMain.style.position = 'relative';
signatureMain.insertBefore(backgroundElement, signatureMain.firstChild);

// Character width mappings (based on SVG viewBox and margins)
const characterWidths = {
    'A': { width: 46, margins: { left: -7, right: -10 } },
    'B': { width: 47, margins: { left: -13, right: -5 } },
    'C': { width: 37, margins: { left: -6, right: -5 } },
    'D': { width: 45, margins: { left: -6, right: -6 } },
    'E': { width: 46, margins: { left: -8, right: -10 } },
    'F': { width: 60, margins: { left: -5, right: -13 } },
    'G': { width: 40, margins: { left: -6, right: 0 } },
    'H': { width: 54, margins: { left: -6, right: -8 } },
    'I': { width: 49, margins: { left: -16, right: -25 } },
    'J': { width: 53, margins: { left: -6, right: -24 } },
    'K': { width: 59, margins: { left: -3, right: -23 } },
    'L': { width: 30, margins: { left: -5, right: -7 } },
    'M': { width: 49, margins: { left: -10, right: -7 } },
    'N': { width: 45, margins: { left: -10, right: -4 } },
    'O': { width: 34, margins: { left: -1, right: -1 } },
    'P': { width: 52, margins: { left: -3, right: -12 } },
    'Q': { width: 41, margins: { left: -3, right: -3 } },
    'R': { width: 58, margins: { left: -4, right: -8 } },
    'S': { width: 46, margins: { left: -2, right: -14 } },
    'T': { width: 62, margins: { left: -17, right: -29 } },
    'U': { width: 44, margins: { left: -1, right: -10 } },
    'V': { width: 41, margins: { left: -6, right: -15 } },
    'W': { width: 57, margins: { left: -6, right: -8 } },
    'X': { width: 41, margins: { left: -13, right: -11 } },
    'Y': { width: 35, margins: { left: 2, right: -12 } },
    'Z': { width: 55, margins: { left: -8, right: -9 } },
    'a': { width: 13, margins: { left: 0, right: -4 } },
    'b': { width: 17, margins: { left: -1.5, right: -6 } },
    'c': { width: 11, margins: { left: 0, right: -4 } },
    'd': { width: 20, margins: { left: 0, right: -11.3 } },
    'e': { width: 11, margins: { left: 0, right: -4 } },
    'f': { width: 19, margins: { left: -6, right: -6 } },
    'g': { width: 23, margins: { left: -10, right: -4 } },
    'h': { width: 18, margins: { left: -1, right: -4 } },
    'i': { width: 9, margins: { left: 0, right: -3.5 } },
    'j': { width: 23, margins: { left: -14, right: -5 } },
    'k': { width: 17, margins: { left: 0, right: -6.5 } },
    'l': { width: 19, margins: { left: -4, right: -12 } },
    'm': { width: 19, margins: { left: 0, right: -5 } },
    'n': { width: 15, margins: { left: 0, right: -5 } },
    'o': { width: 7, margins: { left: 0, right: -2.5 } },
    'p': { width: 20, margins: { left: -10, right: -2.5 } },
    'q': { width: 16, margins: { left: -6, right: -2 } },
    'r': { width: 13, margins: { left: -1, right: -3 } },
    's': { width: 14, margins: { left: -4, right: -4 } },
    't': { width: 24, margins: { left: -3.5, right: -12.5 } },
    'u': { width: 13, margins: { left: 0, right: -4.5 } },
    'v': { width: 9, margins: { left: 0, right: -4.5 } },
    'w': { width: 12, margins: { left: 0, right: -4 } },
    'x': { width: 10, margins: { left: 0, right: -4 } },
    'y': { width: 21, margins: { left: -9, right: -4 } },
    'z': { width: 24, margins: { left: -10, right: -4 } }
};

// Function to calculate text width
function calculateTextWidth(text) {
    let totalWidth = 0;
    const spaceWidth = 12; // Width of space character

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === ' ') {
            totalWidth += spaceWidth;
            continue;
        }

        const charInfo = characterWidths[char];
        if (charInfo) {
            // Add the base width
            totalWidth += charInfo.width;
            
            // Add the margins
            totalWidth += charInfo.margins.left + charInfo.margins.right;
            
            // Add a small gap between characters (if not the last character)
            if (i < text.length - 1) {
                totalWidth += 2; // Default gap between characters
            }
        }
    }

    return totalWidth;
}

// Error handling helper
function handleError(error, context) {
    console.error(`Error in ${context}:`, error);
    debug(`Error in ${context}: ${error.message}`);
}

// Initialize elements and check for errors
function initializeElements() {
    try {
        if (!signature) throw new Error('Signature element not found');
        if (!signatureMain) throw new Error('Signature main element not found');
        if (!letterBank) throw new Error('Letter bank not found');
        debug('Elements initialized successfully');
        return true;
    } catch (error) {
        handleError(error, 'initialization');
        return false;
    }
}

// Animation function
async function animateText(text, duration = 5000) {
    if (!initializeElements()) return;
    if (isAnimating) {
        debug('Animation already in progress, clearing...');
        if (currentTimeout) clearTimeout(currentTimeout);
        signatureMain.innerHTML = '';
        // Re-create background element since innerHTML cleared it
        signatureMain.insertBefore(backgroundElement, signatureMain.firstChild);
    }

    try {
        // Replace hyphens and underscores with spaces
        const processedText = text.replace(/[-_]/g, ' ');
        const textWidth = calculateTextWidth(processedText) * 1.4;
        const totalWidth = textWidth + (HORIZONTAL_PADDING * 2); // Add padding to total width
        debug(`Starting animation for: ${processedText} (Calculated width: ${textWidth}px, Total width with padding: ${totalWidth}px)`);
        
        // Set the container width to match text width exactly
        signatureMain.style.width = `${textWidth}px`;
        
        isAnimating = true;
        
        // First, animate the background with padding
        backgroundElement.style.width = `${totalWidth}px`;
        backgroundElement.style.opacity = '1';
        
        // Wait for background animation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create a container for the text that will grow from left to right
        const textContainer = document.createElement('div');
        textContainer.style.display = 'flex';
        textContainer.style.flexWrap = 'nowrap';
        textContainer.style.alignItems = 'center';
        textContainer.style.width = '100%';
        textContainer.style.transition = 'opacity 0.5s ease';
        textContainer.style.position = 'relative';
        textContainer.style.zIndex = '2';
        textContainer.style.marginLeft = `${HORIZONTAL_PADDING}px`; // Add left margin to text container
        signatureMain.appendChild(textContainer);
        
        // Animate each character
        for (const char of processedText) {
            // Handle spaces
            if (char === ' ') {
                const space = document.createElement('div');
                space.style.minWidth = '12px';
                textContainer.appendChild(space);
                await new Promise(resolve => setTimeout(resolve, 50));
                continue;
            }

            // Skip if not a letter (a-z or A-Z)
            if (!/[a-zA-Z]/.test(char)) {
                debug(`Skipping unsupported character: ${char}`);
                continue;
            }

            // Determine if uppercase or lowercase
            const isUpperCase = char === char.toUpperCase();
            const letterClass = isUpperCase ? 'up' : 'lo';
            const letterChar = char.toLowerCase();

            const letter = letterBank.querySelector(`.${letterChar}.${letterClass}`);
            if (!letter) {
                debug(`Letter not found in bank: ${char} (${letterClass})`);
                continue;
            }
            
            const clone = letter.cloneNode(true);
            clone.style.visibility = 'visible';
            clone.style.position = 'relative';
            clone.style.display = 'block';
            clone.style.opacity = '0';
            clone.style.transition = 'opacity 0.3s ease';
            
            const path = clone.querySelector('path');
            if (path) {
                // Set initial state
                const length = path.getTotalLength();
                path.style.strokeDasharray = `${length}`;
                path.style.strokeDashoffset = `${length}`;
                
                // Add to DOM
                textContainer.appendChild(clone);
                
                // Trigger animation
                requestAnimationFrame(() => {
                    clone.style.opacity = '1';
                    path.style.strokeDashoffset = '0';
                });
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        debug('Animation sequence complete, waiting for display duration...');
        
        // Wait for the specified duration before fading out
        currentTimeout = setTimeout(async () => {
            // Fade out the text container first
            textContainer.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Then fade out the background
            backgroundElement.style.opacity = '0';
            backgroundElement.style.width = '0';
            
            // Wait for fade out transitions to complete
            setTimeout(() => {
                signatureMain.innerHTML = '';
                // Re-create background element
                signatureMain.insertBefore(backgroundElement, signatureMain.firstChild);
                isAnimating = false;
                debug('Animation complete and cleared');
            }, 500);
        }, duration);

    } catch (error) {
        handleError(error, 'animation');
        isAnimating = false;
    }
}

// Test functions
function testAnimationFromInput() {
    const input = document.querySelector('.test-input');
    if (!input) {
        debug('Test input element not found');
        return;
    }
    animateText(input.value);
}

function testFollow() {
    animateText('New Follower!');
}

function testRaid() {
    animateText('Incoming Raid!');
}

function testSub() {
    animateText('New Subscriber!');
}

// Initialize Twitch client
let client = null;

// Initialize Twitch connection
async function initTwitchClient() {
    try {
        // Import config
        const { config } = await import('../config/config.js');
        
        // Create client
        client = new tmi.Client({
            options: { debug: true },
            identity: {
                username: config.settings.TWITCH.USERNAME,
                password: config.settings.TWITCH.OAUTH_TOKEN
            },
            channels: [config.settings.TWITCH.CHANNEL_NAME]
        });

        // Connect to Twitch
        await client.connect();
        debug('Connected to Twitch chat!');

        // Set up event handlers
        setupTwitchEvents();
    } catch (error) {
        handleError(error, 'Twitch initialization');
    }
}

// Set up Twitch event handlers
function setupTwitchEvents() {
    if (!client) return;

    // Chat messages
    client.on('chat', (channel, userstate, message, self) => {
        if (self) return; // Skip messages from the bot
        
        // Optional: Handle chat commands or special messages
        if (message.startsWith('!')) {
            // Handle commands here if needed
            return;
        }
    });

    // New subscription
    client.on('subscription', (channel, username, methods, message, userstate) => {
        debug(`New subscription from ${username}!`);
        animateText(`Brand new sub for ${username}`);
    });

    // Resubscription
    client.on('resub', (channel, username, streakMonths, message, userstate, methods) => {
        debug(`Resub from ${username} for ${streakMonths} months!`);
        animateText(`Brand new sub for ${username}`);
    });

    // Gifted subscription
    client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
        debug(`${username} gifted a sub to ${recipient}!`);
        animateText(`Brand new sub for ${recipient}`);
    });

    // Bits/Cheers
    client.on('cheer', (channel, userstate, message) => {
        const bits = userstate.bits;
        debug(`${userstate.username} cheered ${bits} bits!`);
        animateText(`${userstate.username} keep sending me money`);
    });

    // Raid
    client.on('raided', (channel, username, viewers, userstate) => {
        debug(`${username} raided with ${viewers} viewers!`);
        animateText(`${username} just raided`);
    });

    // Channel points redemption
    client.on('redeem', (channel, username, rewardType, tags, message) => {
        debug(`${username} redeemed ${rewardType}!`);
        animateText(`${username} redeemed ${rewardType}`);
    });

    // Anonymous gift sub
    client.on('anonsubgift', (channel, streakMonths, recipient, methods, userstate) => {
        debug(`Anonymous gifted a sub to ${recipient}!`);
        animateText(`Brand new sub for ${recipient}`);
    });

    // Mystery gift subs
    client.on('submysterygift', (channel, username, giftSubCount, methods, userstate) => {
        debug(`${username} gifted ${giftSubCount} subs!`);
        animateText(`${username} keep sending me money`);
    });
}

// Initialize on load
window.addEventListener('load', async () => {
    debug('Page loaded, initializing...');
    if (initializeElements()) {
        debug('Elements initialized successfully');
        await initTwitchClient();
        debug('Ready to animate! Try the test buttons below.');
    }
}); 