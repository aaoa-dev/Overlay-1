/**
 * Chatter Tracker
 * Tracks active chatters and updates the UI
 * Refactored from check.js and chatters.js
 */

import { StorageService } from '../../services/StorageService.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';

export class ChatterTracker {
    constructor(options = {}, api = null) {
        this.chatters = [];
        this.maxChatters = options.maxChatters || 8;
        this.timeoutMs = options.timeoutMs || 60000; // 1 minute
        this.checkIntervalMs = options.checkIntervalMs || 2000; // 2 seconds
        this.containerElement = null;
        this.api = api;
        this.displayMode = StorageService.get(StorageService.KEYS.CHATTER_MODE, 'pic'); // 'pic' or 'letter'
        
        this.loadFromStorage();
        this.startCleanupTimer();
    }

    /**
     * Set display mode
     * @param {string} mode - 'pic' or 'letter'
     */
    setDisplayMode(mode) {
        if (mode !== 'pic' && mode !== 'letter') return;
        this.displayMode = mode;
        StorageService.set(StorageService.KEYS.CHATTER_MODE, mode);
        this.refreshUI();
        ErrorHandler.info(`Chatter display mode changed to: ${mode}`);
    }

    /**
     * Force refresh all chatter elements
     */
    refreshUI() {
        if (!this.containerElement) return;
        
        // Clear container and rebuild based on current chatters and mode
        this.containerElement.innerHTML = '';
        this.chatters.forEach(chatter => {
            this.addChatterElement(chatter);
        });
    }

    /**
     * Load chatters from storage
     */
    loadFromStorage() {
        try {
            const stored = StorageService.get(StorageService.KEYS.CHATTERS, []);
            if (Array.isArray(stored)) {
                this.chatters = stored;
            }
        } catch (error) {
            ErrorHandler.handle(error, 'chatter_tracker_load');
        }
    }

    /**
     * Save chatters to storage
     */
    saveToStorage() {
        try {
            StorageService.set(StorageService.KEYS.CHATTERS, this.chatters);
        } catch (error) {
            ErrorHandler.handle(error, 'chatter_tracker_save');
        }
    }

    /**
     * Set the container element for UI updates
     * @param {HTMLElement} element - Container element
     */
    setContainer(element) {
        this.containerElement = element;
        this.updateUI();
    }

    /**
     * Track a message (add or update chatter)
     * @param {Object} tags - Message tags
     */
    async track(tags) {
        const username = tags.username || tags['display-name']?.toLowerCase();
        if (!username) return;

        let chatter = this.chatters.find(c => c.user === username);

        if (chatter) {
            // Update timestamp
            chatter.timestamp = Date.now();
        } else {
            // Add new chatter
            chatter = {
                name: tags['display-name'],
                user: username,
                timestamp: Date.now(),
                color: tags.color || '#ffffff',
                pfp: null
            };
            this.chatters.push(chatter);
        }

        // Fetch profile picture if missing and API is available
        if (!chatter.pfp && this.api) {
            try {
                // We use a small cache or just rely on the API class if it has one
                const userInfo = await this.api.fetchUserInfo(username);
                if (userInfo && userInfo.profile_image_url) {
                    chatter.pfp = userInfo.profile_image_url;
                    // Update the element if it exists and we are in pic mode
                    const element = document.getElementById(username);
                    if (element && this.displayMode === 'pic') {
                        this.applyProfilePicture(element, chatter.pfp);
                    }
                    this.saveToStorage();
                }
            } catch (error) {
                ErrorHandler.debug('Failed to fetch profile picture', { username, error });
            }
        }

        this.sort();
        this.saveToStorage();
        this.updateUI();
    }

    /**
     * Apply profile picture to an element
     * @param {HTMLElement} element - Chatter element
     * @param {string} pfpUrl - Profile picture URL
     */
    applyProfilePicture(element, pfpUrl) {
        if (!pfpUrl || this.displayMode !== 'pic') return;
        
        // Use background image for the bubble
        element.style.backgroundImage = `url(${pfpUrl})`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.textContent = ''; // Clear the initial
        element.classList.add('border-2', 'border-white/20');
    }

    /**
     * Sort chatters by timestamp and limit to max
     */
    sort() {
        this.chatters.sort((a, b) => b.timestamp - a.timestamp);
        this.chatters = this.chatters.slice(0, this.maxChatters);
    }

    /**
     * Remove inactive chatters
     */
    removeInactive() {
        const now = Date.now();
        const before = this.chatters.length;
        
        this.chatters = this.chatters.filter(
            chatter => now - chatter.timestamp < this.timeoutMs
        );

        if (this.chatters.length !== before) {
            this.saveToStorage();
            this.updateUI();
            ErrorHandler.debug('Removed inactive chatters', {
                removed: before - this.chatters.length
            });
        }
    }

    /**
     * Start cleanup timer
     */
    startCleanupTimer() {
        setInterval(() => {
            this.removeInactive();
        }, this.checkIntervalMs);
    }

    /**
     * Update UI
     */
    updateUI() {
        if (!this.containerElement) return;

        // Remove chatters no longer in list
        Array.from(this.containerElement.children).forEach(child => {
            if (!this.chatters.some(chatter => chatter.user === child.id)) {
                this.removeChatterElement(child);
            }
        });

        // Add new chatters
        this.chatters.forEach(chatter => {
            const exists = Array.from(this.containerElement.children)
                .some(child => child.id === chatter.user);
            
            if (!exists) {
                this.addChatterElement(chatter);
            }
        });
    }

    /**
     * Add chatter element to DOM
     * @param {Object} chatter - Chatter data
     */
    addChatterElement(chatter) {
        if (!this.containerElement) return;

        const element = document.createElement('div');
        element.id = chatter.user;
        element.className = 'opacity-0 transition-all duration-1000 aspect-square h-auto w-0 flex justify-center align-middle items-center bg-[var(--chatter-color)] text-0 font-extrabold text-black rounded-full overflow-hidden';
        element.style.setProperty('--chatter-color', chatter.color || '#ffffff');
        
        if (this.displayMode === 'pic' && chatter.pfp) {
            this.applyProfilePicture(element, chatter.pfp);
        } else {
            element.textContent = (chatter.name || chatter.user)[0].toUpperCase();
            // Reset background in case it was a pic before
            element.style.backgroundImage = 'none';
        }

        this.containerElement.appendChild(element);

        // Trigger animation
        setTimeout(() => {
            element.classList.replace('opacity-0', 'opacity-100');
            element.classList.replace('w-0', 'w-20');
            element.classList.replace('text-0', 'text-5xl');
        }, 0);
    }

    /**
     * Remove chatter element from DOM
     * @param {HTMLElement} element - Element to remove
     */
    removeChatterElement(element) {
        element.classList.replace('opacity-100', 'opacity-0');
        element.classList.replace('w-20', 'w-0');
        element.classList.replace('text-5xl', 'text-0');
        
        setTimeout(() => {
            element.remove();
        }, 420);
    }

    /**
     * Get current chatters
     * @returns {Array} Chatter list
     */
    getChatters() {
        return [...this.chatters];
    }

    /**
     * Clear all chatters
     */
    clear() {
        this.chatters = [];
        this.saveToStorage();
        this.updateUI();
    }
}

