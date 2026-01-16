import { TwitchService } from '../../src/services/TwitchService.js';
import { StreamStatsService } from '../../src/services/StreamStatsService.js';
import { StorageService } from '../../src/services/StorageService.js';
import { ErrorHandler } from '../../src/utils/ErrorHandler.js';

/**
 * Shared Goal Widget Logic
 * Handles goal tracking for followers or subscribers with multiple visual styles
 */
export class GoalWidget {
    constructor(config = {}) {
        this.urlParams = new URLSearchParams(window.location.search);
        this.config = this.parseConfig(config);
        
        // State
        this.goalCurrent = 0;
        this.lastKnownValue = 0;
        
        // Services
        this.twitch = null;
        this.streamStats = new StreamStatsService();
        
        // Callbacks for UI updates
        this.onUpdate = config.onUpdate || (() => {});
        this.onMilestone = config.onMilestone || (() => {});
        
        this.isSettingsMode = !window.obsstudio && document.querySelector('.obs-control');
    }

    parseConfig(defaults = {}) {
        return {
            goalType: this.urlParams.get('goalType') || defaults.goalType || 'followers',
            goalTarget: parseInt(this.urlParams.get('goalTarget')) || defaults.goalTarget || 100,
            goalRange: this.urlParams.get('goalRange') || defaults.goalRange || 'all',
            customLabel: this.urlParams.get('customLabel') || defaults.customLabel || '',
            scale: parseInt(this.urlParams.get('scale')) || defaults.scale || 100,
            opacity: parseInt(this.urlParams.get('opacity')) || defaults.opacity || 100,
            color: this.urlParams.get('color') || defaults.color || '#4ade80',
            theme: this.urlParams.get('theme') || defaults.theme || 'default',
            // Display toggles
            showLabel: this.urlParams.get('showLabel') !== 'false',
            showPercentage: this.urlParams.get('showPercentage') !== 'false',
            showNumbers: this.urlParams.get('showNumbers') !== 'false',
            showProgressBar: this.urlParams.get('showProgressBar') !== 'false',
            showRange: this.urlParams.get('showRange') !== 'false'
        };
    }

    async init() {
        try {
            this.twitch = new TwitchService();
            await this.twitch.initialize();
            
            ErrorHandler.info('Goal Widget: Connected to Twitch');
            
            await this.updateGoal();
            setInterval(() => this.updateGoal(), 30000); // Update every 30 seconds
            
        } catch (error) {
            ErrorHandler.handle(error, 'goal_widget_init');
        }
    }

    async updateGoal() {
        try {
            if (!this.twitch.authConfig.channelId && this.twitch.authConfig.username) {
                const userInfo = await this.twitch.api.fetchUserInfo(this.twitch.authConfig.username);
                if (userInfo) {
                    this.twitch.authConfig.channelId = userInfo.id;
                }
            }

            const channelId = this.twitch.authConfig.channelId;
            if (!channelId) return;

            let totalCount = 0;
            
            if (this.config.goalType === 'followers') {
                totalCount = await this.twitch.api.fetchFollowerCount(channelId);
                this.twitch.api.fetchSubscriberCount(channelId).then(subs => {
                    this.streamStats.update(totalCount, subs);
                }).catch(() => {
                    this.streamStats.update(totalCount, this.streamStats.lastKnownTotals.subs);
                });
            } else {
                totalCount = await this.twitch.api.fetchSubscriberCount(channelId);
                this.twitch.api.fetchFollowerCount(channelId).then(followers => {
                    this.streamStats.update(followers, totalCount);
                }).catch(() => {
                    this.streamStats.update(this.streamStats.lastKnownTotals.followers, totalCount);
                });
            }

            // Get relative count based on range
            this.goalCurrent = this.streamStats.getRelativeCount(
                totalCount,
                this.config.goalRange,
                this.config.goalType === 'subs' ? 'subs' : 'followers'
            );
            
            // Check for milestone
            if (this.lastKnownValue > 0 && this.goalCurrent > this.lastKnownValue) {
                this.onMilestone(this.goalCurrent, this.lastKnownValue);
            }
            
            this.lastKnownValue = this.goalCurrent;
            this.onUpdate(this.getDisplayData());
            
        } catch (error) {
            ErrorHandler.handle(error, 'goal_widget_update', { type: this.config.goalType });
        }
    }

    getDisplayData() {
        const percentage = Math.min(100, (this.goalCurrent / this.config.goalTarget) * 100);
        
        return {
            current: this.goalCurrent,
            target: this.config.goalTarget,
            percentage: Math.floor(percentage),
            percentageExact: percentage,
            label: this.getLabel(),
            config: this.config
        };
    }

    getLabel() {
        if (this.config.customLabel) {
            return this.config.customLabel;
        }
        const type = this.config.goalType === 'followers' ? 'Followers' : 'Subscribers';
        const range = (this.config.showRange && this.config.goalRange !== 'all') ? ` (${this.getRangeLabel()})` : '';
        return `${type}${range}`;
    }

    getRangeLabel() {
        switch (this.config.goalRange) {
            case 'day': return 'Today';
            case 'month': return 'This Month';
            case 'session': return 'This Session';
            default: return 'All Time';
        }
    }

    // Settings Management
    loadSettings(storageKey) {
        const saved = StorageService.get(storageKey);
        if (saved) {
            this.config = { ...this.config, ...saved };
        }
    }

    saveSettings(storageKey) {
        StorageService.set(storageKey, this.config);
    }

    updateConfig(key, value) {
        this.config[key] = value;
        if (key === 'goalType' || key === 'goalRange') {
            this.updateGoal();
        } else {
            this.onUpdate(this.getDisplayData());
        }
    }

    copyOBSUrl() {
        const params = new URLSearchParams();
        
        if (this.twitch && this.twitch.authConfig.password) {
            params.append('token', this.twitch.authConfig.password.replace('oauth:', ''));
        }
        if (this.twitch && this.twitch.authConfig.username) {
            params.append('username', this.twitch.authConfig.username);
            params.append('channel', this.twitch.authConfig.username);
        }
        if (this.twitch && this.twitch.authConfig.channelId) {
            params.append('channelId', this.twitch.authConfig.channelId);
        }
        
        Object.entries(this.config).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        });
        
        const baseUrl = window.location.origin + window.location.pathname;
        const fullUrl = `${baseUrl}?${params.toString()}`;
        
        return navigator.clipboard.writeText(fullUrl).then(() => fullUrl);
    }
}
