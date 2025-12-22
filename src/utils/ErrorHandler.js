/**
 * Centralized error handling and logging
 */

export class ErrorHandler {
    static logLevel = 'error'; // 'debug', 'info', 'warn', 'error'
    
    /**
     * Handle an error with context
     * @param {Error} error - The error object
     * @param {string} context - Context where error occurred
     * @param {Object} metadata - Additional metadata
     */
    static handle(error, context, metadata = {}) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        // Log to console
        console.error(`[${context}]`, error);
        
        // Send to error tracking service if available
        if (typeof window !== 'undefined' && window.Sentry) {
            window.Sentry.captureException(error, {
                tags: { context },
                extra: metadata
            });
        }

        // Store recent errors for debugging
        this.storeError(errorInfo);
    }

    /**
     * Log debug information
     * @param {string} message - Debug message
     * @param {*} data - Additional data
     */
    static debug(message, data = null) {
        if (this.logLevel === 'debug') {
            console.debug(`[DEBUG] ${message}`, data);
        }
    }

    /**
     * Log info
     * @param {string} message - Info message
     * @param {*} data - Additional data
     */
    static info(message, data = null) {
        if (['debug', 'info'].includes(this.logLevel)) {
            console.info(`[INFO] ${message}`, data);
        }
    }

    /**
     * Log warning
     * @param {string} message - Warning message
     * @param {*} data - Additional data
     */
    static warn(message, data = null) {
        if (['debug', 'info', 'warn'].includes(this.logLevel)) {
            console.warn(`[WARN] ${message}`, data);
        }
    }

    /**
     * Store error for debugging
     * @param {Object} errorInfo - Error information
     */
    static storeError(errorInfo) {
        try {
            const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
            errors.push(errorInfo);
            
            // Keep only last 50 errors
            if (errors.length > 50) {
                errors.shift();
            }
            
            localStorage.setItem('app_errors', JSON.stringify(errors));
        } catch (e) {
            // Fail silently if can't store
        }
    }

    /**
     * Get stored errors
     * @returns {Array} Array of error objects
     */
    static getErrors() {
        try {
            return JSON.parse(localStorage.getItem('app_errors') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Clear stored errors
     */
    static clearErrors() {
        localStorage.removeItem('app_errors');
    }

    /**
     * Create a user-friendly error message
     * @param {string} context - Error context
     * @returns {string} User-friendly message
     */
    static getUserMessage(context) {
        const messages = {
            'twitch_connection': 'Unable to connect to Twitch. Please check your internet connection.',
            'authentication': 'Authentication failed. Please try logging in again.',
            'api_request': 'Failed to communicate with Twitch API. Please try again later.',
            'badge_fetch': 'Unable to load chat badges. They may not display correctly.',
            'storage': 'Unable to save data. Please check your browser settings.',
            'default': 'An unexpected error occurred. Please refresh the page.'
        };

        return messages[context] || messages.default;
    }

    /**
     * Display error to user
     * @param {string} context - Error context
     * @param {string} customMessage - Optional custom message
     */
    static showUserError(context, customMessage = null) {
        const message = customMessage || this.getUserMessage(context);
        
        // You can customize this to show a toast, modal, etc.
        console.error('User Error:', message);
        
        // Example: Could dispatch a custom event for UI components to listen to
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app:error', {
                detail: { context, message }
            }));
        }
    }
}

