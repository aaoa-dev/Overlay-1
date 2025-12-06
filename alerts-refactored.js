/**
 * Alerts System (Refactored)
 * Tracks user visits, displays welcome alerts, and tracks stream stats
 */

import { TwitchService } from './services/TwitchService.js';
import { StorageService } from './services/StorageService.js';
import { StreamStatsService } from './services/StreamStatsService.js';
import { CommandRegistry } from './commands/CommandRegistry.js';
import { MessageHandler } from './handlers/MessageHandler.js';
import { Alert, AlertQueue } from './components/Alert.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

// Configuration
const CONFIG = {
    welcomeCommands: ['!in', '!welcome', '!checkin', '!here'],
    milestones: [10, 50, 100],
    confettiColors: {
        10: ['#4ade80', '#22c55e', '#16a34a'],
        50: ['#C0C0C0', '#E5E4E2', '#FFFFFF'],
        100: ['#FFD700', '#FFA500', '#FFE4B5']
    }
};

class AlertsManager {
    constructor(twitchService, streamStats) {
        this.twitchService = twitchService;
        this.streamStats = streamStats;
        this.alertQueue = new AlertQueue();
        this.userData = {};
        this.streamDate = null;
        
        this.loadUserData();
    }

    /**
     * Load user visit data
     */
    loadUserData() {
        try {
            this.userData = StorageService.get('userVisits', {});
            this.streamDate = StorageService.get('streamDate') || new Date().toDateString();

            // Reset if new day
            const today = new Date().toDateString();
            if (this.streamDate !== today) {
                this.resetStreamDay();
            }

            ErrorHandler.debug('User data loaded', {
                users: Object.keys(this.userData).length,
                date: this.streamDate
            });
        } catch (error) {
            ErrorHandler.handle(error, 'load_user_data');
        }
    }

    /**
     * Save user visit data
     */
    saveUserData() {
        try {
            StorageService.set('userVisits', this.userData);
            StorageService.set('streamDate', this.streamDate);
        } catch (error) {
            ErrorHandler.handle(error, 'save_user_data');
        }
    }

    /**
     * Reset for new stream day
     */
    resetStreamDay() {
        const today = new Date().toDateString();
        this.streamDate = today;
        
        // Reset hasChattedThisStream for all users
        Object.keys(this.userData).forEach(username => {
            this.userData[username].hasChattedThisStream = false;
            this.userData[username].lastUsed = 0;
        });
        
        this.saveUserData();
        ErrorHandler.info('Stream day reset', { date: today });
    }

    /**
     * Handle user visit
     */
    async handleVisit(username, displayName, color, tags) {
        try {
            // Initialize user data if needed
            if (!this.userData[username]) {
                this.userData[username] = {
                    count: 0,
                    lastUsed: 0,
                    hasChattedThisStream: false
                };
            }

            const user = this.userData[username];

            // Check if already chatted this stream
            if (user.hasChattedThisStream) {
                return;
            }

            // Mark as chatted
            user.hasChattedThisStream = true;
            user.count++;
            user.lastUsed = Date.now();
            this.saveUserData();

            // Check for milestone
            const milestoneCount = CONFIG.milestones.includes(user.count) ? user.count : 0;

            // Send chat message
            if (tags['first-msg']) {
                await this.twitchService.say(
                    `Welcome to the channel ${displayName}! Thanks for chatting for the very first time! 🎉`
                );
            } else if (milestoneCount > 0) {
                await this.twitchService.say(
                    `🎉 Amazing! ${displayName} has been here ${milestoneCount} times! Thank you for your continued support! 🎉`
                );
            } else {
                await this.twitchService.say(`Welcome back ${displayName}! 👋`);
            }

            // Queue alert
            const alert = Alert.create(displayName, color, user.count);
            this.alertQueue.add(alert, (alert) => {
                // Trigger confetti for milestones
                if (milestoneCount > 0) {
                    this.triggerConfetti(milestoneCount);
                }
            });

        } catch (error) {
            ErrorHandler.handle(error, 'handle_visit', { username });
        }
    }

    /**
     * Handle welcome command
     */
    async handleWelcomeCommand(username, displayName, color) {
        try {
            // Initialize user data if needed
            if (!this.userData[username]) {
                this.userData[username] = {
                    count: 0,
                    lastUsed: 0
                };
            }

            const user = this.userData[username];
            const now = Date.now();

            // Check 24-hour cooldown
            const hoursSinceLastUse = (now - (user.lastUsed || 0)) / (1000 * 60 * 60);
            if (hoursSinceLastUse < 24) {
                ErrorHandler.debug('Welcome command on cooldown', {
                    username,
                    hoursRemaining: Math.ceil(24 - hoursSinceLastUse)
                });
                return;
            }

            // Update user data
            user.count++;
            user.lastUsed = now;
            this.saveUserData();

            // Send message
            const message = user.count <= 1 
                ? `Welcome ${displayName}!` 
                : `Welcome back ${displayName}!`;
            await this.twitchService.say(message);

            // Queue alert
            const alert = Alert.create(displayName, color, user.count);
            this.alertQueue.add(alert);

        } catch (error) {
            ErrorHandler.handle(error, 'handle_welcome_command', { username });
        }
    }

    /**
     * Trigger confetti for milestones
     */
    triggerConfetti(milestoneCount) {
        if (typeof confetti === 'undefined') return;

        const colors = CONFIG.confettiColors[milestoneCount] || CONFIG.confettiColors[10];
        const particleCount = milestoneCount >= 100 ? 150 : milestoneCount >= 50 ? 100 : 50;
        const spread = milestoneCount >= 100 ? 70 : milestoneCount >= 50 ? 60 : 45;

        setTimeout(() => {
            confetti({
                particleCount,
                spread,
                origin: { y: 0.6 },
                colors,
                gravity: milestoneCount >= 100 ? 0.5 : 1
            });
        }, 300);
    }

    /**
     * Reset user states (admin command)
     */
    reset() {
        // Reset user chat states
        Object.keys(this.userData).forEach(username => {
            this.userData[username].hasChattedThisStream = false;
            this.userData[username].lastUsed = 0;
        });
        this.saveUserData();

        // Reset stream stats
        this.streamStats.reset();

        ErrorHandler.info('All user states and stream stats reset');
    }

    /**
     * Set alert container
     */
    setContainer(container) {
        this.alertQueue.setContainer(container);
    }
}

/**
 * Initialize the alerts system
 */
async function init() {
    try {
        ErrorHandler.info('Initializing alerts system...');

        // Initialize services
        const twitchService = new TwitchService();
        await twitchService.initialize();

        const streamStats = new StreamStatsService();
        const alertsManager = new AlertsManager(twitchService, streamStats);

        // Set alert container
        const alertContainer = document.getElementById('alertContainer');
        alertsManager.setContainer(alertContainer);

        ErrorHandler.info('Twitch service initialized', {
            channel: twitchService.getChannel(),
            username: twitchService.getUsername()
        });

        // Set up message handler
        const messageHandler = new MessageHandler(twitchService);

        // Handle first messages and returning chatters
        messageHandler.registerHandler('visits', async (channel, tags, message) => {
            const username = tags.username;
            const displayName = tags['display-name'];
            const color = tags.color;

            // Check for first-time or returning chatter
            if (tags['first-msg'] || tags['returning-chatter']) {
                await alertsManager.handleVisit(username, displayName, color, tags);
                return;
            }

            // Check if it's their first message this stream
            const userData = alertsManager.userData[username];
            if (!userData || !userData.hasChattedThisStream) {
                await alertsManager.handleVisit(username, displayName, color, tags);
            }
        });

        // Set up command registry
        const commands = new CommandRegistry(twitchService);

        // Register !reset command
        commands.register('!reset', async (context) => {
            alertsManager.reset();
            await context.reply(`All user states and stream stats have been reset! (Followers: 0, Subs: 0)`);
        }, {
            modOnly: true,
            description: 'Reset all user states and stream stats'
        });

        // Register !stats command
        commands.register(['!stats', '!streamstats'], async (context) => {
            const stats = streamStats.formatStats();
            await context.reply(stats);
        }, {
            cooldown: 30,
            description: 'Show current stream stats'
        });

        // Register welcome commands
        CONFIG.welcomeCommands.forEach(cmd => {
            commands.register(cmd, async (context) => {
                await alertsManager.handleWelcomeCommand(
                    context.username,
                    context.tags['display-name'],
                    context.tags.color
                );
            }, {
                cooldown: 86400, // 24 hours
                description: 'Manually trigger welcome message'
            });
        });

        // Register command handler
        messageHandler.registerHandler('commands', async (channel, tags, message) => {
            if (message.startsWith('!')) {
                await commands.execute(message, tags, channel);
            }
        });

        // Listen for Twitch events for stats tracking
        twitchService.on('subscription', (channel, username, method, message, userstate) => {
            const count = streamStats.incrementSubs();
            ErrorHandler.info('New subscription', { username, total: count });
        });

        twitchService.on('resub', (channel, username, months, message, userstate, methods) => {
            const count = streamStats.incrementSubs();
            ErrorHandler.info('Resubscription', { username, months, total: count });
        });

        twitchService.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
            const count = streamStats.incrementSubs();
            ErrorHandler.info('Gift sub', { from: username, to: recipient, total: count });
        });

        // Start message handling
        messageHandler.start();

        // Make services available globally for debugging
        window.alertsManager = alertsManager;
        window.streamStats = streamStats;

        // Display stats on page
        updateStatsDisplay(streamStats);

        ErrorHandler.info('Alerts system initialized successfully', {
            stats: streamStats.getStats()
        });

    } catch (error) {
        ErrorHandler.handle(error, 'alerts_init');
    }
}

/**
 * Update stats display on page
 */
function updateStatsDisplay(streamStats) {
    const stats = streamStats.getStats();
    const statsDisplay = document.getElementById('statsDisplay');
    
    if (statsDisplay) {
        statsDisplay.innerHTML = `
            <div style="color: white; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 5px; margin: 10px;">
                <strong>📊 Today's Stats:</strong><br>
                Followers: ${stats.followers} | Subs: ${stats.subs}
            </div>
        `;
    }

    // Update every 5 seconds
    setInterval(() => {
        const updatedStats = streamStats.getStats();
        if (statsDisplay) {
            statsDisplay.innerHTML = `
                <div style="color: white; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 5px; margin: 10px;">
                    <strong>📊 Today's Stats:</strong><br>
                    Followers: ${updatedStats.followers} | Subs: ${updatedStats.subs}
                </div>
            `;
        }
    }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { AlertsManager, StreamStatsService };

