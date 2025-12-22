// Debug helper
function debug(message) {
    console.log(message);
    const debugEl = document.getElementById('debug');
    if (debugEl) debugEl.textContent = message;
}

// Get DOM elements
const modal = document.querySelector('.modal');
const sign = document.querySelector('.signature-main');
const uppercase = document.querySelectorAll('.letter-bank .up');
const lowercase = document.querySelectorAll('.letter-bank .lo');

let currentTimeout = null;
let isAnimating = false;

// Initialize
debug('Initializing...');

// Main draw function (based on original script.js)
function draw(key, animate) {
    if (key == " ") {
        const space = document.createElement("div");
        space.style.minWidth = '12px';
        sign.appendChild(space);
    } else {
        const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));

        for (let i = 0; i < alphabet.length; i++) {
            var item = alphabet[i];

            if (key.toLowerCase() == item) {
                const letter = document.createElement("div");
                if (key == item.toUpperCase()) {
                    letter.innerHTML = uppercase[i].innerHTML;
                    letter.classList.add('up');
                } else {
                    letter.innerHTML = lowercase[i].innerHTML;
                    letter.classList.add('lo');
                }
                letter.classList.add(item);
                
                if (animate) {
                    setTimeout(function() {
                        letter.querySelector('svg path').style.strokeDashoffset = '0';
                    }, 50);
                } else {
                    letter.querySelector('svg path').style.strokeDashoffset = '0';
                }
                sign.appendChild(letter);
            }
        }
    }
}

// Animation function for alerts
async function animateText(text, duration = 5000) {
    if (isAnimating) {
        debug('Animation already running, resetting...');
        if (currentTimeout) clearTimeout(currentTimeout);
    }

    try {
        debug(`Animating: "${text}"`);
        isAnimating = true;

        // Clear previous content
        sign.innerHTML = '';
        
        // Show modal
        modal.classList.add('active');

        // Draw each letter with animation
        const letters = text.split('');
        for (let i = 0; i < letters.length; i++) {
            const char = letters[i];
            draw(char, true);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Hide after duration
        currentTimeout = setTimeout(() => {
            modal.classList.remove('active');
            setTimeout(() => {
                sign.innerHTML = '';
                isAnimating = false;
                debug('Animation complete');
            }, 500);
        }, duration);

    } catch (error) {
        console.error('Animation error:', error);
        debug(`Error: ${error.message}`);
        isAnimating = false;
    }
}

// TEST FUNCTIONS
window.testAnimationFromInput = () => {
    const input = document.querySelector('.test-input');
    if (input && input.value) {
        debug(`Testing: ${input.value}`);
        animateText(input.value);
    }
};

window.testFollow = () => {
    debug('Testing Follow');
    animateText('New Follower');
};

window.testRaid = () => {
    debug('Testing Raid');
    animateText('Incoming Raid');
};

window.testSub = () => {
    debug('Testing Sub');
    animateText('New Subscriber');
};

// TWITCH INTEGRATION
import { TwitchService } from '../src/services/TwitchService.js';

async function init() {
    try {
        debug('Connecting to Twitch...');
        const twitch = new TwitchService();
        await twitch.initialize();
        debug(`Connected to ${twitch.getChannel()}`);

        // Apply theme settings if available
        const theme = twitch.authConfig.theme;
        if (theme) {
            const style = document.createElement('style');
            let css = '';
            
            // Only apply fontSize, keep background black
            if (theme.fontSize) {
                const scale = parseFloat(theme.fontSize) / 16 * 2;
                css += `.scale-container { transform: translateY(-50%) scale(${scale}) !important; }\n`;
            }
            
            if (css) {
                style.textContent = css;
                document.head.appendChild(style);
            }
        }

        // Set up event listeners
        twitch.on('subscription', (channel, username) => {
            animateText(`New Sub ${username}`);
        });
        
        twitch.on('resub', (channel, username, months) => {
            animateText(`${username} ${months} Months`);
        });
        
        twitch.on('subgift', (channel, username, recipient) => {
            animateText(`${username} gifted ${recipient}`);
        });
        
        twitch.on('raided', (channel, username, viewers) => {
            animateText(`Raid ${username} ${viewers}`);
        });

        debug('Twitch events registered');

    } catch (error) {
        debug(`Error: ${error.message}`);
        console.error('Twitch initialization failed:', error);
    }
}

// Initialize on load
window.addEventListener('load', () => {
    if (sign && uppercase.length > 0 && lowercase.length > 0) {
        debug('Elements loaded successfully');
        init();
    } else {
        debug('Failed to load elements');
        console.error('Missing DOM elements:', {
            sign: !!sign,
            uppercase: uppercase.length,
            lowercase: lowercase.length
        });
    }
});
