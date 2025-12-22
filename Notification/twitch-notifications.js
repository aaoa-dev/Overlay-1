// Debug helper
function debug(message) {
    console.log(message);
    const debugEl = document.getElementById('debug');
    if (debugEl) debugEl.textContent = message;
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
backgroundElement.id = 'backgroundElement';
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

if (signatureMain) {
    signatureMain.style.position = 'relative';
    signatureMain.insertBefore(backgroundElement, signatureMain.firstChild);
}

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

function calculateTextWidth(text) {
    let totalWidth = 0;
    const spaceWidth = 12;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === ' ') { totalWidth += spaceWidth; continue; }
        const charInfo = characterWidths[char];
        if (charInfo) {
            totalWidth += charInfo.width + charInfo.margins.left + charInfo.margins.right;
            if (i < text.length - 1) totalWidth += 2;
        }
    }
    return totalWidth;
}

function leetToText(text) {
    const leetMap = { '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'p', '@': 'a', '$': 's', '_': ' ' };
    return text.split('').map(char => leetMap[char] || char).join('');
}

function initializeElements() {
    if (!signature || !signatureMain || !letterBank) {
        debug(`Missing elements: signature=${!!signature}, main=${!!signatureMain}, bank=${!!letterBank}`);
        return false;
    }
    return true;
}

async function animateText(text, duration = 5000) {
    if (!initializeElements()) return;
    if (isAnimating) {
        if (currentTimeout) clearTimeout(currentTimeout);
        signatureMain.innerHTML = '';
        signatureMain.insertBefore(backgroundElement, signatureMain.firstChild);
    }

    try {
        const translatedText = leetToText(text);
        const processedText = translatedText.replace(/[^a-zA-Z ]/g, ' ');
        const textWidth = calculateTextWidth(processedText) * 1.4;
        const totalWidth = textWidth + (HORIZONTAL_PADDING * 2);
        
        signatureMain.style.width = `${textWidth}px`;
        isAnimating = true;
        backgroundElement.style.width = `${totalWidth}px`;
        backgroundElement.style.opacity = '1';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const textContainer = document.createElement('div');
        textContainer.style.display = 'flex';
        textContainer.style.flexWrap = 'nowrap';
        textContainer.style.alignItems = 'center';
        textContainer.style.width = '100%';
        textContainer.style.transition = 'opacity 0.5s ease';
        textContainer.style.position = 'relative';
        textContainer.style.zIndex = '2';
        textContainer.style.marginLeft = `${HORIZONTAL_PADDING}px`;
        signatureMain.appendChild(textContainer);
        
        for (const char of processedText) {
            if (char === ' ') {
                const space = document.createElement('div');
                space.style.minWidth = '12px';
                textContainer.appendChild(space);
                await new Promise(resolve => setTimeout(resolve, 50));
                continue;
            }
            if (!/[a-zA-Z]/.test(char)) continue;

            const isUpperCase = char === char.toUpperCase();
            const letterClass = isUpperCase ? 'up' : 'lo';
            const letterChar = char.toLowerCase();
            const letter = letterBank.querySelector(`.${letterChar}.${letterClass}`);
            if (!letter) {
                console.warn(`Letter not found in bank: ${letterChar}.${letterClass}`);
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
                const length = path.getTotalLength();
                path.style.strokeDasharray = `${length}`;
                path.style.strokeDashoffset = `${length}`;
                textContainer.appendChild(clone);
                requestAnimationFrame(() => {
                    clone.style.opacity = '1';
                    path.style.strokeDashoffset = '0';
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        currentTimeout = setTimeout(async () => {
            textContainer.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 500));
            backgroundElement.style.opacity = '0';
            backgroundElement.style.width = '0';
            setTimeout(() => {
                signatureMain.innerHTML = '';
                signatureMain.insertBefore(backgroundElement, signatureMain.firstChild);
                isAnimating = false;
            }, 500);
        }, duration);

    } catch (error) {
        console.error(error);
        isAnimating = false;
    }
}

// TEST FUNCTIONS
window.testAnimationFromInput = () => {
    const input = document.querySelector('.test-input');
    if (input) animateText(input.value);
};
window.testFollow = () => animateText('New Follower');
window.testRaid = () => animateText('Incoming Raid');
window.testSub = () => animateText('New Subscriber');

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
        if (theme && (theme.color || theme.fontSize)) {
            const style = document.createElement('style');
            let css = '';
            if (theme.color) {
                css += `.signature-main svg path { stroke: ${theme.color} !important; }\n`;
                css += `#backgroundElement { background: ${theme.color} !important; }\n`;
            }
            if (theme.fontSize) {
                css += `.scale-container { transform: translate(-50%, -50%) scale(${parseFloat(theme.fontSize)/16 * 2}) !important; }\n`;
            }
            style.textContent = css;
            document.head.appendChild(style);
        }

        twitch.on('subscription', (channel, username) => animateText(`New Sub ${username}`));
        twitch.on('resub', (channel, username, months) => animateText(`Resub ${username} ${months}`));
        twitch.on('subgift', (channel, username, recipient) => animateText(`${username} gifted ${recipient}`));
        twitch.on('raided', (channel, username, viewers) => animateText(`Raid ${username} ${viewers}`));

    } catch (error) {
        debug(`Error: ${error.message}`);
        console.error('Twitch initialization failed:', error);
    }
}

window.addEventListener('load', () => {
    if (initializeElements()) {
        init();
    } else {
        debug('Failed to initialize elements');
    }
});
