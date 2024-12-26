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
async function animateText(text, duration = 3000) {
    if (!initializeElements()) return;
    if (isAnimating) {
        debug('Animation already in progress, clearing...');
        if (currentTimeout) clearTimeout(currentTimeout);
        signatureMain.innerHTML = '';
    }

    try {
        debug(`Starting animation for: ${text}`);
        isAnimating = true;
        signatureMain.innerHTML = '';
        
        for (const char of text) {
            // Handle spaces
            if (char === ' ') {
                const space = document.createElement('div');
                space.style.minWidth = '12px';
                signatureMain.appendChild(space);
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
            
            const path = clone.querySelector('path');
            if (path) {
                // Set initial state
                const length = path.getTotalLength();
                path.style.strokeDasharray = `${length}`;
                path.style.strokeDashoffset = `${length}`;
                
                // Add to DOM
                signatureMain.appendChild(clone);
                
                // Trigger animation
                requestAnimationFrame(() => {
                    path.style.strokeDashoffset = '0';
                });
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        debug('Animation sequence complete, waiting for display duration...');
        
        currentTimeout = setTimeout(() => {
            signatureMain.innerHTML = '';
            isAnimating = false;
            debug('Animation complete and cleared');
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

// Initialize on load
window.addEventListener('load', () => {
    debug('Page loaded, initializing...');
    if (initializeElements()) {
        debug('Ready to animate! Try the test buttons below.');
    }
}); 