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
    }

    try {
        // Replace hyphens and underscores with spaces
        const processedText = text.replace(/[-_]/g, ' ');
        debug(`Starting animation for: ${processedText}`);
        isAnimating = true;
        signatureMain.innerHTML = '';
        
        // Create a container for the text that will grow from left to right
        const textContainer = document.createElement('div');
        textContainer.style.display = 'flex';
        textContainer.style.flexWrap = 'nowrap';
        textContainer.style.alignItems = 'center';
        textContainer.style.width = 'fit-content';
        textContainer.style.transition = 'opacity 0.5s ease';
        signatureMain.appendChild(textContainer);
        
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
        
        currentTimeout = setTimeout(() => {
            // Fade out the text container
            textContainer.style.opacity = '0';
            
            // Remove the container after fade out completes
            setTimeout(() => {
                signatureMain.innerHTML = '';
                isAnimating = false;
                debug('Animation complete and cleared');
            }, 500); // Wait for fade out transition to complete
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