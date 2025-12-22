/**
 * Chatter Tracker
 * Tracks active chatters and updates the UI
 * Refactored from check.js and chatters.js
 */

import { StorageService } from '../../services/StorageService.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';

export class ChatterTracker {
    constructor(options = {}) {
        this.chatters = [];
        this.maxChatters = options.maxChatters || 8;
        this.timeoutMs = options.timeoutMs || 60000; // 1 minute
        this.checkIntervalMs = options.checkIntervalMs || 2000; // 2 seconds
        this.containerElement = null;
        
        this.loadFromStorage();
        this.startCleanupTimer();
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
    track(tags) {
        const username = tags.username;
        const existingChatter = this.chatters.find(c => c.user === username);

        if (existingChatter) {
            // Update timestamp
            existingChatter.timestamp = Date.now();
        } else {
            // Add new chatter
            this.chatters.push({
                name: tags['display-name'],
                user: username,
                timestamp: Date.now(),
                color: tags.color || '#ffffff'
            });
        }

        this.sort();
        this.saveToStorage();
        this.updateUI();
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
        element.className = 'opacity-0 transition-all duration-1000 aspect-square h-auto w-0 flex justify-center align-middle items-center bg-[var(--chatter-color)] text-0 font-extrabold text-black rounded-full';
        element.style.setProperty('--chatter-color', chatter.color || '#ffffff');
        element.textContent = chatter.user[0].toUpperCase();

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

