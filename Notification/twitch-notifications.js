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

// Initialize on load
window.addEventListener('load', () => {
    debug('Page loaded, initializing...');
    if (initializeElements()) {
        debug('Ready to animate! Try the test buttons below.');
    }
}); 