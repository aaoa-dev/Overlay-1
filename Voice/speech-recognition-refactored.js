/**
 * Speech Recognition Feature (Refactored)
 * Monitors speech and sends commands to Twitch chat when bad words are detected
 */

import { TwitchService } from '../services/TwitchService.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

// Configuration
const CONFIG = {
    badWords: ['fuck', 'shit', 'bitch', 'technically', 'f*ck', 'sh*t', 'b*tch'],
    language: 'en-US',
    continuous: true,
    interimResults: false,
    maxAlternatives: 1,
    reconnectDelay: 3000, // 3 seconds (longer initial delay)
    maxReconnectDelay: 60000, // 60 seconds max (give it more time)
    reconnectMultiplier: 1.3, // Slower exponential backoff
    maxConsecutiveErrors: 10, // Stop after 10 consecutive errors (more forgiving)
    showStatus: true // Set to false to hide status messages
};

// Censored word to command mapping
const CENSORED_MAP = {
    'f*ck': '!fuck',
    'sh*t': '!shit',
    'b*tch': '!bitch'
};

class SpeechRecognitionMonitor {
    constructor(twitchService) {
        this.twitchService = twitchService;
        this.recognition = null;
        this.isActive = false;
        this.statusElement = document.getElementById('status');
        this.currentReconnectDelay = CONFIG.reconnectDelay;
        this.consecutiveErrors = 0;
        this.lastErrorTime = 0;
        this.restartTimeout = null;
    }

    /**
     * Initialize and start speech recognition
     */
    async start() {
        try {
            // Check if speech recognition is supported
            if (!this.isSpeechRecognitionSupported()) {
                throw new Error('Speech recognition is not supported in this browser');
            }

            this.setupRecognition();
            this.recognition.start();
            this.isActive = true;
            
            this.updateStatus('Speech recognition active - listening...', 'success');
            ErrorHandler.info('Speech recognition started');
        } catch (error) {
            ErrorHandler.handle(error, 'speech_recognition_start');
            this.updateStatus(`Failed to start: ${error.message}`, 'error');
            
            // Retry after delay
            setTimeout(() => this.start(), CONFIG.reconnectDelay);
        }
    }

    /**
     * Stop speech recognition
     */
    stop() {
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = null;
        }
        
        if (this.recognition && this.isActive) {
            this.recognition.stop();
            this.isActive = false;
            this.consecutiveErrors = 0;
            this.currentReconnectDelay = CONFIG.reconnectDelay;
            this.updateStatus('Speech recognition stopped', 'info');
            ErrorHandler.info('Speech recognition stopped');
        }
    }

    /**
     * Check if speech recognition is supported
     */
    isSpeechRecognitionSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    /**
     * Set up the speech recognition instance
     */
    setupRecognition() {
        // Clean up existing instance
        if (this.recognition) {
            this.recognition.stop();
        }

        // Create new instance
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configure recognition
        this.recognition.continuous = CONFIG.continuous;
        this.recognition.lang = CONFIG.language;
        this.recognition.interimResults = CONFIG.interimResults;
        this.recognition.maxAlternatives = CONFIG.maxAlternatives;

        // Set up grammar list if available
        if ('webkitSpeechGrammarList' in window || 'SpeechGrammarList' in window) {
            const SpeechGrammarList = window.webkitSpeechGrammarList || window.SpeechGrammarList;
            this.recognition.grammars = new SpeechGrammarList();
        }

        // Set up event handlers
        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onend = () => this.handleEnd();
        this.recognition.onerror = (event) => this.handleError(event);
        this.recognition.onstart = () => this.handleStart();
    }

    /**
     * Handle speech recognition results
     */
    handleResult(event) {
        const result = event.results[event.results.length - 1][0];
        const transcript = result.transcript.toLowerCase();
        const confidence = result.confidence;

        // Reset error counter on successful recognition
        this.consecutiveErrors = 0;
        this.currentReconnectDelay = CONFIG.reconnectDelay;

        ErrorHandler.debug('Speech detected', { transcript, confidence });
        this.updateStatus(`Heard: "${transcript}" (${Math.round(confidence * 100)}%)`, 'info');

        // Check for bad words
        this.checkForBadWords(transcript);
    }

    /**
     * Check transcript for bad words and send commands
     */
    checkForBadWords(transcript) {
        const words = transcript.split(' ');

        CONFIG.badWords.forEach(badWord => {
            words.forEach(word => {
                const normalizedWord = word.trim().toLowerCase();
                const normalizedBadWord = badWord.toLowerCase();

                // Check for exact match or starts with
                if (normalizedWord === normalizedBadWord || 
                    normalizedWord.startsWith(normalizedBadWord)) {
                    this.handleBadWord(badWord);
                }
            });
        });
    }

    /**
     * Handle detected bad word
     */
    async handleBadWord(badWord) {
        try {
            let command;

            // Check if it's a censored word
            if (badWord.includes('*')) {
                command = CENSORED_MAP[badWord] || `!${badWord}`;
            } else {
                command = `!${badWord}`;
            }

            this.updateStatus(`Detected "${badWord}" - sending command: ${command}`, 'warning');
            
            // Send command to Twitch
            await this.twitchService.say(command);
            
            ErrorHandler.info('Command sent', { badWord, command });
        } catch (error) {
            ErrorHandler.handle(error, 'send_command', { badWord });
            this.updateStatus(`Failed to send command: ${error.message}`, 'error');
        }
    }

    /**
     * Handle recognition start
     */
    handleStart() {
        this.updateStatus('Listening...', 'success');
        ErrorHandler.debug('Recognition started');
    }

    /**
     * Handle recognition end
     */
    handleEnd() {
        if (this.isActive) {
            // Check if this is a normal end or error-related
            const now = Date.now();
            const timeSinceLastError = now - this.lastErrorTime;
            
            // If ended shortly after an error, don't restart immediately
            if (timeSinceLastError < 1000) {
                ErrorHandler.debug('Recognition ended after error, using exponential backoff');
                return; // Let the error handler manage the restart
            }
            
            this.updateStatus('Recognition ended - restarting...', 'info');
            ErrorHandler.debug('Recognition ended, restarting');
            
            // Restart with current delay
            this.restartTimeout = setTimeout(() => {
                if (this.isActive) {
                    this.start();
                }
            }, this.currentReconnectDelay);
        }
    }

    /**
     * Handle recognition error
     */
    handleError(event) {
        this.lastErrorTime = Date.now();
        this.consecutiveErrors++;

        const errorMessages = {
            'no-speech': 'No speech detected - still listening',
            'audio-capture': 'No microphone found - check your device',
            'not-allowed': 'Microphone permission denied - please allow access',
            'network': 'Connection to speech service interrupted',
            'aborted': 'Recognition was aborted'
        };

        const message = errorMessages[event.error] || `Error: ${event.error}`;
        
        // Log based on severity
        if (event.error === 'no-speech') {
            ErrorHandler.debug(message);
        } else if (event.error === 'network') {
            ErrorHandler.warn(message, { consecutiveErrors: this.consecutiveErrors });
        } else {
            ErrorHandler.handle(new Error(message), 'speech_recognition_error', {
                error: event.error,
                consecutiveErrors: this.consecutiveErrors
            });
        }

        // Check if we should stop retrying
        if (this.consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
            this.updateStatus(
                `⚠️ Connection unstable (${this.consecutiveErrors} errors). The Web Speech API can be unreliable. Click Start to retry or check your internet connection.`,
                'error'
            );
            this.isActive = false;
            ErrorHandler.warn('Stopped after consecutive errors', {
                errors: this.consecutiveErrors,
                note: 'This is a known limitation of the Web Speech API'
            });
            return;
        }

        // Don't retry for permission errors
        if (event.error === 'not-allowed') {
            this.updateStatus('❌ ' + message, 'error');
            this.isActive = false;
            return;
        }

        // For no-speech errors, just continue
        if (event.error === 'no-speech') {
            this.updateStatus('🎤 Listening... (no speech detected)', 'info');
            return;
        }

        // Display retry message
        const retryIn = Math.round(this.currentReconnectDelay / 1000);
        this.updateStatus(
            `⚠️ ${message} - Retrying in ${retryIn}s... (attempt ${this.consecutiveErrors}/${CONFIG.maxConsecutiveErrors})`,
            'warning'
        );

        // Retry with exponential backoff for network and other errors
        if (this.isActive) {
            if (this.restartTimeout) {
                clearTimeout(this.restartTimeout);
            }

            this.restartTimeout = setTimeout(() => {
                if (this.isActive) {
                    this.start();
                }
            }, this.currentReconnectDelay);

            // Increase delay for next time (exponential backoff)
            this.currentReconnectDelay = Math.min(
                this.currentReconnectDelay * CONFIG.reconnectMultiplier,
                CONFIG.maxReconnectDelay
            );
        }
    }

    /**
     * Update status display
     */
    updateStatus(message, type = 'info') {
        if (!CONFIG.showStatus || !this.statusElement) return;

        this.statusElement.textContent = message;
        
        // Add color based on type
        const colors = {
            success: '#4ade80',
            error: '#ef4444',
            warning: '#fbbf24',
            info: '#60a5fa'
        };
        
        this.statusElement.style.color = colors[type] || colors.info;
        this.statusElement.style.display = 'block';

        // Log to console
        console.log(`[Speech Recognition] ${message}`);
    }
}

/**
 * Initialize the application
 */
async function init() {
    try {
        ErrorHandler.info('Initializing Speech Recognition Monitor...');

        // Check browser support first
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            throw new Error('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        }

        // Initialize Twitch Service
        const twitchService = new TwitchService();
        await twitchService.initialize({
            debug: false
        });

        ErrorHandler.info('Twitch service initialized', {
            channel: twitchService.getChannel(),
            username: twitchService.getUsername()
        });

        // Create and start speech recognition monitor
        const monitor = new SpeechRecognitionMonitor(twitchService);
        await monitor.start();

        // Make monitor available globally for debugging
        window.speechMonitor = monitor;

        // Add stop button handler if it exists
        const stopButton = document.getElementById('stopButton');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                monitor.stop();
            });
        }

        // Add start button handler if it exists
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.addEventListener('click', () => {
                monitor.start();
            });
        }

        ErrorHandler.info('Speech Recognition Monitor ready');

    } catch (error) {
        ErrorHandler.handle(error, 'speech_monitor_init');
        
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = `Initialization failed: ${error.message}`;
            statusElement.style.color = '#ef4444';
            statusElement.style.display = 'block';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for testing
export { SpeechRecognitionMonitor, CONFIG };

