/**
 * Confetti Overlay System
 * Triggers confetti animations on Twitch events (subs, gift subs, cheers, raids)
 */

import { TwitchService } from '../src/services/TwitchService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

// Rich, diverse color palette
const CONFETTI_COLORS = {
    // Signature color + very diverse rainbow
    sub: ['#9147ff', '#ff3838', '#00d2d3', '#ffd700', '#1dd1a1', '#ff6348', '#5f27cd', '#00d8ff', '#ff9ff3', '#54a0ff', '#48dbfb', '#01a3a4'],
    resub: ['#9147ff', '#ffd700', '#ff3838', '#00d2d3', '#1dd1a1', '#ff6348', '#5f27cd', '#00d8ff', '#ff9ff3', '#54a0ff', '#48dbfb', '#01a3a4'],
    giftsub: ['#ff69b4', '#ffd700', '#ff3838', '#00d2d3', '#1dd1a1', '#ff6348', '#5f27cd', '#00d8ff', '#ff9ff3', '#54a0ff', '#48dbfb', '#01a3a4'],
    cheer: ['#ffd700', '#ff3838', '#00d2d3', '#9147ff', '#1dd1a1', '#ff6348', '#5f27cd', '#00d8ff', '#ff9ff3', '#54a0ff', '#48dbfb', '#01a3a4'],
    bigcheer: ['#ffd700', '#ff8c00', '#ff3838', '#00d2d3', '#1dd1a1', '#ff6348', '#5f27cd', '#00d8ff', '#ff9ff3', '#54a0ff', '#48dbfb', '#01a3a4'],
    raid: ['#ff3838', '#ffd700', '#00d2d3', '#9147ff', '#1dd1a1', '#ff6348', '#5f27cd', '#00d8ff', '#ff9ff3', '#54a0ff', '#48dbfb', '#01a3a4']
};

// Configuration for different event types
const CONFETTI_CONFIG = {
    sub: {
        colors: CONFETTI_COLORS.sub,
        particleCount: 150,
        spread: 70,
        startVelocity: 45,
        gravity: 0.8,
        duration: 3000,
        displayText: '🎉 NEW SUBSCRIBER! 🎉',
        className: 'event-sub'
    },
    resub: {
        colors: CONFETTI_COLORS.resub,
        particleCount: 150,
        spread: 80,
        startVelocity: 50,
        gravity: 0.8,
        duration: 3500,
        displayText: '🎊 RESUB! 🎊',
        className: 'event-sub'
    },
    giftsub: {
        colors: CONFETTI_COLORS.giftsub,
        particleCount: 150,
        spread: 90,
        startVelocity: 55,
        gravity: 0.7,
        duration: 4000,
        displayText: '💝 GIFT SUB! 💝',
        className: 'event-giftsub'
    },
    cheer: {
        colors: CONFETTI_COLORS.cheer,
        particleCount: 80,
        spread: 60,
        startVelocity: 40,
        gravity: 1.2,
        duration: 2500,
        displayText: '⭐ CHEER! ⭐',
        className: 'event-cheer'
    },
    bigcheer: {
        colors: CONFETTI_COLORS.bigcheer,
        particleCount: 200,
        spread: 120,
        startVelocity: 60,
        gravity: 0.5,
        duration: 5000,
        displayText: '💰 BIG CHEER! 💰',
        className: 'event-cheer'
    },
    raid: {
        colors: CONFETTI_COLORS.raid,
        particleCount: 180,
        spread: 100,
        startVelocity: 50,
        gravity: 0.6,
        duration: 4500,
        displayText: '🚀 RAID! 🚀',
        className: 'event-raid'
    }
};

class ConfettiManager {
    constructor(twitchService) {
        this.twitchService = twitchService;
        this.eventQueue = [];
        this.isPlaying = false;
        this.confettiInstance = null;
    }

    /**
     * Initialize confetti with custom canvas
     */
    initConfetti() {
        const canvas = document.getElementById('confettiCanvas');
        if (canvas && typeof confetti !== 'undefined') {
            this.confettiInstance = confetti.create(canvas, {
                resize: true,
                useWorker: true
            });
        } else {
            this.confettiInstance = confetti;
        }
    }

    /**
     * Trigger confetti for a specific event type
     */
    async triggerConfetti(eventType, username = '', additionalInfo = {}) {
        const config = CONFETTI_CONFIG[eventType];
        if (!config) {
            ErrorHandler.warn('Unknown confetti event type', { eventType });
            return;
        }

        // Queue the event
        this.eventQueue.push({ eventType, username, additionalInfo, config });

        // Start processing if not already playing
        if (!this.isPlaying) {
            await this.processQueue();
        }
    }

    /**
     * Process queued confetti events
     */
    async processQueue() {
        if (this.eventQueue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const event = this.eventQueue.shift();
        
        try {
            await this.playConfetti(event);
        } catch (error) {
            ErrorHandler.handle(error, 'play_confetti', { event });
        }

        // Process next event
        setTimeout(() => this.processQueue(), 500);
    }

    /**
     * Play confetti animation - High quality shower effect with color diversity
     */
    async playConfetti(event) {
        const { eventType, username, additionalInfo, config } = event;
        const duration = config.duration || 3000;
        const end = Date.now() + duration;

        ErrorHandler.info('Starting confetti shower', { eventType, username });

        const frame = () => {
            if (Date.now() > end) {
                this.isPlaying = false;
                return;
            }

            // Pick 3-5 random colors from the palette for each burst to ensure variety
            const pickRandomColors = (count = 4) => {
                const shuffled = [...config.colors].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, count);
            };

            // Fire multiple small particles from random spots along the top
            this.confettiInstance({
                particleCount: 3, // Slightly higher for better color distribution
                angle: 270,      // Fall downwards
                spread: 90,
                origin: { x: Math.random(), y: -0.2 }, // Spawning slightly off-screen
                colors: pickRandomColors(5), // Random subset of colors per burst
                startVelocity: 15,
                gravity: 0.7,
                drift: (Math.random() - 0.5) * 2,
                ticks: 400,
                scalar: 0.7 + Math.random() * 0.7, // Random sizes for depth
                zIndex: 9999
            });

            // For bigger events, double the density
            if (eventType === 'bigcheer' || eventType === 'raid' || eventType === 'giftsub') {
                this.confettiInstance({
                    particleCount: 3,
                    angle: 270,
                    spread: 45,
                    origin: { x: Math.random(), y: -0.2 },
                    colors: pickRandomColors(6),
                    startVelocity: 20,
                    gravity: 0.5,
                    drift: (Math.random() - 0.5) * 3,
                    ticks: 500,
                    zIndex: 9999
                });
            }

            requestAnimationFrame(frame);
        };
        
        this.isPlaying = true;
        frame();
        
        // Wait for the duration to finish before resolving the queue item
        await new Promise(resolve => setTimeout(resolve, duration));
    }

    /**
     * fireConfetti is no longer used in the frame-based approach
     */
    fireConfetti() {}

    /**
     * Setup Twitch event listeners
     */
    setupEventListeners() {
        // New subscription
        this.twitchService.on('subscription', (channel, username, method, message, userstate) => {
            ErrorHandler.info('New subscription', { username, method });
            this.triggerConfetti('sub', username, { method, message });
        });

        // Resubscription
        this.twitchService.on('resub', (channel, username, months, message, userstate, methods) => {
            ErrorHandler.info('Resubscription', { username, months });
            this.triggerConfetti('resub', username, { months, message, methods });
        });

        // Gift subscription
        this.twitchService.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
            ErrorHandler.info('Gift subscription', { from: username, to: recipient });
            this.triggerConfetti('giftsub', username, { recipient, streakMonths, methods });
        });

        // Community gift (multiple subs)
        this.twitchService.on('submysterygift', (channel, username, numbOfSubs, methods, userstate) => {
            ErrorHandler.info('Mystery gift subs', { username, count: numbOfSubs });
            // Trigger multiple confetti bursts for community gifts
            for (let i = 0; i < Math.min(numbOfSubs, 5); i++) {
                setTimeout(() => {
                    this.triggerConfetti('giftsub', username, { numbOfSubs });
                }, i * 300);
            }
        });

        // Cheer/Bits
        this.twitchService.on('cheer', (channel, userstate, message) => {
            const bits = parseInt(userstate.bits) || 0;
            const username = userstate['display-name'] || userstate.username;
            ErrorHandler.info('Cheer received', { username, bits });
            
            // Big cheer for 1000+ bits
            const eventType = bits >= 1000 ? 'bigcheer' : 'cheer';
            this.triggerConfetti(eventType, username, { bits, message });
        });

        // Raid
        this.twitchService.on('raided', (channel, username, viewers) => {
            ErrorHandler.info('Raid received', { username, viewers });
            this.triggerConfetti('raid', username, { viewers });
        });
    }
}

/**
 * Initialize the confetti system
 */
async function init() {
    try {
        ErrorHandler.info('Initializing confetti overlay...');

        // Initialize Twitch service
        const twitchService = new TwitchService();
        await twitchService.initialize();

        ErrorHandler.info('Twitch service initialized', {
            channel: twitchService.getChannel(),
            username: twitchService.getUsername()
        });

        // Initialize confetti manager
        const confettiManager = new ConfettiManager(twitchService);
        confettiManager.initConfetti();
        confettiManager.setupEventListeners();

        // Make available globally for debugging
        window.confettiManager = confettiManager;

        // Testing function
        globalThis.testConfetti = (type) => {
            const testUsers = [
                'TestUser123',
                'CoolViewer',
                'StreamFan',
                'GenerousGifter',
                'BigCheerMaster'
            ];
            const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
            
            confettiManager.triggerConfetti(type, randomUser, { 
                test: true,
                bits: type === 'bigcheer' ? 1000 : 100
            });
        };

        ErrorHandler.info('Confetti overlay initialized successfully');

    } catch (error) {
        ErrorHandler.handle(error, 'confetti_init');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { ConfettiManager, CONFETTI_CONFIG };
