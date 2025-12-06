/**
 * Alert Component
 * Displays animated alerts for user visits
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';

export class Alert {
    /**
     * @param {string} username - Username
     * @param {string} color - User color
     * @param {number} visitCount - Visit count
     * @param {Object} options - Alert options
     */
    constructor(username, color, visitCount, options = {}) {
        this.username = username;
        this.color = color || '#ffffff';
        this.visitCount = visitCount;
        this.options = {
            duration: options.duration || 4000,
            slideInDuration: options.slideInDuration || 700,
            slideOutDuration: options.slideOutDuration || 700,
            ...options
        };
    }

    /**
     * Show the alert
     * @param {HTMLElement} container - Container element
     * @returns {Promise} Resolves when alert is complete
     */
    async show(container) {
        return new Promise((resolve) => {
            const alert = this.create();
            container.appendChild(alert);

            // Slide in
            setTimeout(() => {
                alert.style.top = '20px';
            }, 100);

            // Slide out and remove
            setTimeout(() => {
                alert.style.top = '-5rem';
                
                setTimeout(() => {
                    alert.remove();
                    resolve();
                }, this.options.slideOutDuration);
            }, this.options.duration);
        });
    }

    /**
     * Create alert element
     * @returns {HTMLElement} Alert element
     */
    create() {
        const alert = document.createElement('div');
        alert.className = 'alert-content fixed left-1/2 -translate-x-1/2 -top-20 transition-all duration-700';
        
        const message = this.getMessage();
        
        alert.innerHTML = `
            <div class="flex items-center rounded-full p-2 text-white shadow-lg bg-black h-16">
                <div class="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" style="background-color: ${this.color}">
                    <span class="text-2xl font-bold text-white">
                        ${this.username[0].toUpperCase()}
                    </span>
                </div>
                <div class="flex flex-col px-4 min-w-0">
                    <span class="font-bold truncate">${this.username}</span>
                    <span class="text-sm opacity-90 truncate">${message}</span>
                </div>
            </div>
        `;

        return alert;
    }

    /**
     * Get message based on visit count
     * @returns {string} Alert message
     */
    getMessage() {
        if (this.visitCount === 1) {
            return 'Welcome to the channel!';
        }

        return `has been here ${this.visitCount} times`;
    }

    /**
     * Check if milestone reached
     * @returns {number|null} Milestone value or null
     */
    getMilestone() {
        const milestones = [10, 50, 100];
        return milestones.includes(this.visitCount) ? this.visitCount : null;
    }

    /**
     * Static factory method for creating alerts
     * @param {string} username - Username
     * @param {string} color - User color
     * @param {number} visitCount - Visit count
     * @param {Object} options - Options
     * @returns {Alert} Alert instance
     */
    static create(username, color, visitCount, options = {}) {
        return new Alert(username, color, visitCount, options);
    }
}

/**
 * Alert Queue
 * Manages alert display queue to prevent overlaps
 */
export class AlertQueue {
    constructor() {
        this.queue = [];
        this.isPlaying = false;
        this.container = null;
    }

    /**
     * Set container element
     * @param {HTMLElement} container - Container element
     */
    setContainer(container) {
        this.container = container;
    }

    /**
     * Add alert to queue
     * @param {Alert} alert - Alert instance
     * @param {Function} onShow - Callback when alert shows
     */
    add(alert, onShow = null) {
        this.queue.push({ alert, onShow });
        this.process();
    }

    /**
     * Process queue
     */
    async process() {
        if (this.isPlaying || this.queue.length === 0) return;
        if (!this.container) {
            ErrorHandler.warn('Alert queue container not set');
            return;
        }

        this.isPlaying = true;
        const { alert, onShow } = this.queue.shift();

        try {
            if (onShow) {
                onShow(alert);
            }

            await alert.show(this.container);
        } catch (error) {
            ErrorHandler.handle(error, 'alert_display', {
                username: alert.username,
                visitCount: alert.visitCount
            });
        } finally {
            this.isPlaying = false;
            this.process(); // Process next
        }
    }

    /**
     * Clear queue
     */
    clear() {
        this.queue = [];
    }

    /**
     * Get queue length
     * @returns {number} Queue length
     */
    getLength() {
        return this.queue.length;
    }
}

