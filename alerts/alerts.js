/**
 * Alerts System (Refactored)
 * Tracks user visits, displays welcome alerts, and tracks stream stats
 */

import { TwitchService } from '../src/services/TwitchService.js';
import { StorageService } from '../src/services/StorageService.js';
import { StreamStatsService } from '../src/services/StreamStatsService.js';
import { GlobalCommandBus } from '../src/commands/GlobalCommandBus.js';
import { MessageHandler } from '../src/handlers/MessageHandler.js';
import { Alert, AlertQueue } from '../src/components/Alert.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

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
        this.profilePictureCache = {}; // Cache for profile pictures
        
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
     * Fetch and cache user profile picture
     */
    async getProfilePicture(username) {
        // Check cache first
        if (this.profilePictureCache[username]) {
            return this.profilePictureCache[username];
        }

        // Fetch from API if available
        if (this.twitchService.api) {
            try {
                const userInfo = await this.twitchService.api.fetchUserInfo(username);
                if (userInfo && userInfo.profile_image_url) {
                    this.profilePictureCache[username] = userInfo.profile_image_url;
                    return userInfo.profile_image_url;
                }
            } catch (error) {
                ErrorHandler.debug('Failed to fetch profile picture', { username, error: error.message });
            }
        }

        return null;
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
            if (!this.twitchService.authConfig.noChat) {
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
            }

            // Fetch profile picture
            const profilePictureUrl = await this.getProfilePicture(username);

            // Queue alert
            const alert = Alert.create(displayName, color, user.count, { profilePictureUrl });
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
            if (!this.twitchService.authConfig.noChat) {
                const message = user.count <= 1 
                    ? `Welcome ${displayName}!` 
                    : `Welcome back ${displayName}!`;
                await this.twitchService.say(message);
            }

            // Fetch profile picture
            const profilePictureUrl = await this.getProfilePicture(username);

            // Queue alert
            const alert = Alert.create(displayName, color, user.count, { profilePictureUrl });
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

        // Apply theme settings if available
        const theme = twitchService.authConfig.theme;
        if (theme && theme.fontSize) {
            const style = document.createElement('style');
            style.textContent = `body { font-size: ${theme.fontSize}px !important; }\n`;
            document.head.appendChild(style);
        }

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

            // If it's a welcome command, let the command handler handle it to avoid double greetings
            const isWelcomeCommand = CONFIG.welcomeCommands.some(cmd => message.toLowerCase().startsWith(cmd.toLowerCase()));
            if (isWelcomeCommand) return;

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

        // Set up global command bus
        const commands = new GlobalCommandBus(twitchService);

        // Register !reset command (broadcasts to all widgets)
        commands.register('!reset', async (context) => {
            alertsManager.reset();
            streamStats.reset();
            await context.reply(`All user states and stream stats have been reset! (Followers: 0, Subs: 0)`);
        }, {
            modOnly: true,
            description: 'Reset all user states and stream stats',
            broadcast: true // Notify other widgets
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

        // Define testing functions for the UI buttons (no chat messages sent)
        globalThis.testAlert = (type) => {
            const testUsers = {
                new: { username: 'test_new_user', displayName: 'NewUser123', color: '#ff4444', count: 1 },
                returning: { username: 'test_returning_user', displayName: 'RegularViewer', color: '#4444ff', count: 5 },
                milestone10: { username: 'loyal_fan_10', displayName: 'LoyalFan10', color: '#44ff44', count: 10 },
                milestone50: { username: 'loyal_fan_50', displayName: 'LoyalFan50', color: '#C0C0C0', count: 50 },
                milestone100: { username: 'loyal_fan_100', displayName: 'LoyalFan100', color: '#FFD700', count: 100 }
            };

            const testData = testUsers[type];
            if (!testData) return;

            // Create alert directly without sending chat messages
            const alert = Alert.create(testData.displayName, testData.color, testData.count);
            
            // Add to queue with confetti for milestones
            if (type.startsWith('milestone')) {
                alertsManager.alertQueue.add(alert, () => {
                    alertsManager.triggerConfetti(testData.count);
                });
            } else {
                alertsManager.alertQueue.add(alert);
            }
        };

        globalThis.resetUsedState = () => {
            alertsManager.reset();
            alert('All user states and stats have been reset!');
        };

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

