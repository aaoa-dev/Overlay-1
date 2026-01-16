import { TwitchService } from '../src/services/TwitchService.js';
import { TwitchEventSub } from '../src/services/TwitchEventSub.js';
import { StorageService } from '../src/services/StorageService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

/**
 * Hype Train Widget
 * Displays real Twitch Hype Train using EventSub API V2
 * 
 * Requirements:
 * - OAuth Scope: channel:read:hype_train
 * - EventSub V2 (V1 deprecated January 15, 2026)
 * 
 * Twitch Hype Train Contribution Values:
 * - Tier 1 Sub: 500 points
 * - Tier 2 Sub: 1000 points
 * - Tier 3 Sub: 2500 points
 * - Bits: 1 bit = 1 point
 * 
 * References:
 * - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
 * - https://dev.twitch.tv/docs/eventsub/eventsub-reference/
 */
class HypeTrain {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);
        this.config = this.parseConfig();
        
        // State
        this.isActive = false;
        this.level = 0;
        this.progress = 0;
        this.goal = 0;
        this.total = 0;
        this.expiresAt = null;
        this.startedAt = null;
        this.cooldownEndsAt = null;
        this.trainType = 'regular'; // regular, golden_kappa, treasure
        this.isSharedTrain = false;
        this.timerInterval = null;
        this.topContributors = [];
        
        // Elements
        this.elements = {
            container: document.getElementById('hype-container'),
            levelValue: document.getElementById('hype-level-value'),
            progress: document.getElementById('hype-progress'),
            progressText: document.getElementById('hype-progress-text'),
            current: document.getElementById('hype-current'),
            target: document.getElementById('hype-target'),
            timer: document.getElementById('hype-timer'),
            status: document.getElementById('hype-status')
        };
        
        this.twitch = null;
        this.eventSub = null;
        this.isSettingsMode = !window.obsstudio && document.querySelector('.obs-control');
        
        if (this.isSettingsMode) {
            this.initializeSettingsPanel();
        }
        
        // Hide widget initially until hype train starts (or we show preview)
        this.elements.container.style.display = 'none';
        
        this.applyConfig();
        this.init();
    }

    parseConfig() {
        return {
            scale: parseInt(this.urlParams.get('scale')) || 100,
            opacity: parseInt(this.urlParams.get('opacity')) || 100,
            showTimer: this.urlParams.get('showTimer') !== 'false',
            showContributors: this.urlParams.get('showContributors') !== 'false',
            autoHide: this.urlParams.get('autoHide') !== 'false'
        };
    }

    applyConfig() {
        this.elements.container.style.transform = `scale(${this.config.scale / 100})`;
        this.elements.container.style.opacity = this.config.opacity / 100;
        
        if (this.elements.timer) {
            this.elements.timer.style.display = this.config.showTimer ? 'block' : 'none';
        }
    }

    async init() {
        try {
            // Initialize Twitch service for authentication
            this.twitch = new TwitchService();
            await this.twitch.initialize();
            
            const authConfig = this.twitch.authConfig;
            
            if (!authConfig.password || !authConfig.channelId) {
                ErrorHandler.warn('Hype Train: Missing authentication or channel ID. Check your global Twitch auth.');
                if (this.isSettingsMode) {
                    // Show test preview in settings mode when not authenticated
                    this.showTestMode();
                } else {
                    this.showError('Connect to Twitch first');
                }
                return;
            }

            const token = authConfig.password.replace('oauth:', '');
            
            // Initialize EventSub
            this.eventSub = new TwitchEventSub(token, authConfig.channelId);
            
            ErrorHandler.info('Hype Train: Connecting to EventSub...');
            await this.eventSub.connect();
            
            // Subscribe to Hype Train events
            ErrorHandler.info('Hype Train: Subscribing to events...');
            const subscriptions = await this.eventSub.subscribeToHypeTrain();
            
            const allSuccess = subscriptions.every(sub => sub.success);
            if (!allSuccess) {
                ErrorHandler.warn('Hype Train: Some subscriptions failed', subscriptions);
            } else {
                ErrorHandler.info('Hype Train: All subscriptions successful');
            }
            
            // Setup event handlers
            this.setupEventHandlers();
            
            ErrorHandler.info('Hype Train: Ready and waiting for events');
            
        } catch (error) {
            ErrorHandler.handle(error, 'hype_train_init');
            if (this.isSettingsMode) {
                this.showTestMode(); // Fall back to test mode on error
            } else {
                this.showError('Failed to connect to Twitch');
            }
        }
    }

    setupEventHandlers() {
        // Hype Train Begin
        this.eventSub.on('channel.hype_train.begin', (event) => {
            ErrorHandler.info('Hype Train: BEGIN', event);
            this.handleHypeTrainBegin(event);
        });

        // Hype Train Progress
        this.eventSub.on('channel.hype_train.progress', (event) => {
            ErrorHandler.info('Hype Train: PROGRESS', event);
            this.handleHypeTrainProgress(event);
        });

        // Hype Train End
        this.eventSub.on('channel.hype_train.end', (event) => {
            ErrorHandler.info('Hype Train: END', event);
            this.handleHypeTrainEnd(event);
        });
    }

    handleHypeTrainBegin(event) {
        this.isActive = true;
        this.level = event.level;
        this.progress = event.progress;
        this.goal = event.goal;
        this.total = event.total;
        this.expiresAt = new Date(event.expires_at);
        this.startedAt = new Date(event.started_at);
        this.trainType = event.type || 'regular'; // V2: regular, golden_kappa, treasure
        this.isSharedTrain = event.is_shared_train || false; // V2: shared train indicator
        this.topContributors = event.top_contributions || [];
        
        this.showWidget();
        this.updateDisplay();
        this.startTimer();
        
        // Log train type for debugging
        if (this.trainType !== 'regular') {
            ErrorHandler.info(`Hype Train: Special type detected - ${this.trainType}`);
        }
        
        // Play entrance animation
        this.elements.container.classList.add('hype-train-enter');
        setTimeout(() => {
            this.elements.container.classList.remove('hype-train-enter');
        }, 500);
    }

    handleHypeTrainProgress(event) {
        if (!this.isActive) {
            // Train might have started before we connected
            this.handleHypeTrainBegin(event);
            return;
        }
        
        const oldLevel = this.level;
        
        this.level = event.level;
        this.progress = event.progress;
        this.goal = event.goal;
        this.total = event.total;
        this.expiresAt = new Date(event.expires_at);
        this.trainType = event.type || 'regular'; // V2 field
        this.isSharedTrain = event.is_shared_train || false; // V2 field
        this.topContributors = event.top_contributions || [];
        
        // Check for level up
        if (this.level > oldLevel) {
            this.playLevelUpAnimation();
        }
        
        this.updateDisplay();
    }

    handleHypeTrainEnd(event) {
        this.isActive = false;
        this.level = event.level;
        this.total = event.total;
        this.cooldownEndsAt = event.cooldown_ends_at ? new Date(event.cooldown_ends_at) : null; // V2 field
        this.trainType = event.type || 'regular'; // V2 field
        this.isSharedTrain = event.is_shared_train || false; // V2 field
        this.topContributors = event.top_contributions || [];
        
        this.stopTimer();
        this.showEndState(event);
        
        // Log cooldown info
        if (this.cooldownEndsAt) {
            const cooldownMinutes = Math.floor((this.cooldownEndsAt - new Date()) / 60000);
            ErrorHandler.info(`Hype Train: Cooldown for ${cooldownMinutes} minutes`);
        }
        
        // Auto-hide after delay
        if (this.config.autoHide && !this.isSettingsMode) {
            setTimeout(() => {
                this.hideWidget();
            }, 10000); // Hide after 10 seconds
        }
    }

    updateDisplay() {
        const percentage = this.goal > 0 ? (this.progress / this.goal) * 100 : 0;
        
        this.elements.levelValue.textContent = this.level;
        this.elements.progress.style.width = `${Math.min(percentage, 100)}%`;
        this.elements.progressText.textContent = `${Math.floor(percentage)}%`;
        this.elements.current.textContent = this.formatPoints(this.progress);
        this.elements.target.textContent = this.formatPoints(this.goal);
        
        if (this.elements.status) {
            this.elements.status.textContent = this.isActive ? 'ACTIVE' : 'ENDED';
            this.elements.status.className = this.isActive ? 'status-active' : 'status-ended';
        }
    }

    formatPoints(points) {
        if (points >= 10000) {
            return `${(points / 1000).toFixed(1)}K`;
        }
        return points.toString();
    }

    startTimer() {
        this.stopTimer();
        
        if (!this.config.showTimer || !this.elements.timer) return;
        
        this.timerInterval = setInterval(() => {
            if (!this.expiresAt) return;
            
            const now = new Date();
            const remaining = Math.max(0, Math.floor((this.expiresAt - now) / 1000));
            
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            
            this.elements.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (remaining === 0) {
                this.stopTimer();
            }
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showWidget() {
        this.elements.container.style.display = 'block';
    }

    hideWidget() {
        this.elements.container.classList.add('hype-train-exit');
        setTimeout(() => {
            this.elements.container.style.display = 'none';
            this.elements.container.classList.remove('hype-train-exit');
        }, 500);
    }

    showEndState(event) {
        if (this.elements.status) {
            this.elements.status.textContent = `COMPLETED - LEVEL ${event.level}`;
            this.elements.status.className = 'status-completed';
        }
        
        if (this.elements.timer) {
            this.elements.timer.textContent = 'ENDED';
        }
        
        // Show final progress as 100%
        this.elements.progress.style.width = '100%';
        this.elements.progressText.textContent = '100%';
    }

    showError(message) {
        if (this.elements.status) {
            this.elements.status.textContent = message;
            this.elements.status.className = 'status-error';
        }
        this.showWidget();
    }

    showTestMode() {
        // Show widget with test data (preview mode when not authenticated)
        this.isActive = true;
        this.level = 3;
        this.progress = 7500;
        this.goal = 10000;
        this.total = 27500;
        this.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        
        this.showWidget();
        this.updateDisplay();
        this.startTimer();
        
        if (this.elements.status) {
            this.elements.status.textContent = 'PREVIEW MODE (Not Connected)';
            this.elements.status.className = 'status-test';
        }
    }

    // Test Methods
    testStartTrain() {
        ErrorHandler.info('Test: Starting fake hype train');
        
        const fakeEvent = {
            level: 1,
            progress: 0,
            goal: 1800, // Realistic goal for level 1 (Easy difficulty)
            total: 0,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            started_at: new Date().toISOString(),
            type: 'regular',
            is_shared_train: false,
            top_contributions: []
        };
        
        this.handleHypeTrainBegin(fakeEvent);
        
        if (this.elements.status) {
            this.elements.status.textContent = '🧪 TEST MODE';
            this.elements.status.className = 'status-test';
        }
    }

    testAddContribution(points) {
        if (!this.isActive) {
            ErrorHandler.warn('Test: Start a train first before adding contributions');
            return;
        }
        
        ErrorHandler.info(`Test: Adding ${points} points`);
        
        // Add points to current progress
        let newProgress = this.progress + points;
        let newLevel = this.level;
        let newGoal = this.goal;
        let newTotal = this.total + points;
        
        // Check if we leveled up
        if (newProgress >= this.goal) {
            newLevel = this.level + 1;
            newProgress = newProgress - this.goal;
            newGoal = this.goal + 500; // Each level increases goal
        }
        
        const fakeEvent = {
            level: newLevel,
            progress: newProgress,
            goal: newGoal,
            total: newTotal,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            started_at: this.startedAt ? this.startedAt.toISOString() : new Date().toISOString(),
            type: this.trainType,
            is_shared_train: this.isSharedTrain,
            top_contributions: this.topContributors
        };
        
        this.handleHypeTrainProgress(fakeEvent);
        
        if (this.elements.status) {
            this.elements.status.textContent = '🧪 TEST MODE';
            this.elements.status.className = 'status-test';
        }
    }

    testLevelUp() {
        if (!this.isActive) {
            ErrorHandler.warn('Test: Start a train first before leveling up');
            return;
        }
        
        ErrorHandler.info('Test: Completing current level');
        
        // Simulate progress that completes the current level
        const fakeEvent = {
            level: this.level + 1,
            progress: 0,
            goal: this.goal + 500, // Each level increases goal
            total: this.total + this.goal,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            started_at: this.startedAt ? this.startedAt.toISOString() : new Date().toISOString(),
            type: this.trainType,
            is_shared_train: this.isSharedTrain,
            top_contributions: this.topContributors
        };
        
        this.handleHypeTrainProgress(fakeEvent);
        
        if (this.elements.status) {
            this.elements.status.textContent = '🧪 TEST MODE';
            this.elements.status.className = 'status-test';
        }
    }

    testEndTrain() {
        if (!this.isActive) {
            ErrorHandler.warn('Test: No active train to end');
            return;
        }
        
        ErrorHandler.info('Test: Ending hype train');
        
        const fakeEvent = {
            level: this.level,
            total: this.total,
            cooldown_ends_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hour cooldown
            type: this.trainType,
            is_shared_train: this.isSharedTrain,
            top_contributions: this.topContributors
        };
        
        this.handleHypeTrainEnd(fakeEvent);
    }

    playLevelUpAnimation() {
        this.elements.levelValue.classList.add('level-up');
        setTimeout(() => {
            this.elements.levelValue.classList.remove('level-up');
        }, 1000);
        
        // Particle effect or other animations could go here
        ErrorHandler.info(`Hype Train: LEVEL UP to ${this.level}!`);
    }

    // Settings Panel
    initializeSettingsPanel() {
        this.loadSettings();
        this.setupSettingsListeners();
        this.updateSettingsUI();
    }

    loadSettings() {
        const saved = StorageService.get('hypeTrainSettings');
        if (saved) {
            this.config = { ...this.config, ...saved };
        }
    }

    saveSettings() {
        StorageService.set('hypeTrainSettings', this.config);
    }

    setupSettingsListeners() {
        const panel = document.getElementById('settings-panel');
        const toggleBtn = document.getElementById('toggle-settings');
        const resetBtn = document.getElementById('reset-settings');
        const copyBtn = document.getElementById('copy-obs-url');
        
        toggleBtn?.addEventListener('click', () => {
            panel.classList.toggle('hidden');
            toggleBtn.ariaExpanded = !panel.classList.contains('hidden');
        });

        resetBtn?.addEventListener('click', () => {
            window.location.search = '';
        });

        copyBtn?.addEventListener('click', () => this.copyOBSUrl());

        // Test buttons
        document.getElementById('test-start-train')?.addEventListener('click', () => {
            this.testStartTrain();
        });

        document.getElementById('test-add-sub')?.addEventListener('click', () => {
            this.testAddContribution(500); // T1 sub
        });

        document.getElementById('test-add-bits')?.addEventListener('click', () => {
            this.testAddContribution(100); // 100 bits
        });

        document.getElementById('test-level-up')?.addEventListener('click', () => {
            this.testLevelUp();
        });

        document.getElementById('test-end-train')?.addEventListener('click', () => {
            this.testEndTrain();
        });

        document.getElementById('show-timer')?.addEventListener('change', (e) => {
            this.config.showTimer = e.target.checked;
            if (this.elements.timer) {
                this.elements.timer.style.display = this.config.showTimer ? 'block' : 'none';
            }
            this.saveSettings();
        });

        document.getElementById('auto-hide')?.addEventListener('change', (e) => {
            this.config.autoHide = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('scale-slider')?.addEventListener('input', (e) => {
            this.config.scale = parseInt(e.target.value);
            document.getElementById('scale-value').textContent = `${e.target.value}%`;
            this.applyConfig();
            this.saveSettings();
        });

        document.getElementById('opacity-slider')?.addEventListener('input', (e) => {
            this.config.opacity = parseInt(e.target.value);
            document.getElementById('opacity-value').textContent = `${e.target.value}%`;
            this.applyConfig();
            this.saveSettings();
        });
    }

    updateSettingsUI() {
        const showTimerCheckbox = document.getElementById('show-timer');
        const autoHideCheckbox = document.getElementById('auto-hide');
        
        if (showTimerCheckbox) showTimerCheckbox.checked = this.config.showTimer;
        if (autoHideCheckbox) autoHideCheckbox.checked = this.config.autoHide;
        
        document.getElementById('scale-slider').value = this.config.scale;
        document.getElementById('scale-value').textContent = `${this.config.scale}%`;
        document.getElementById('opacity-slider').value = this.config.opacity;
        document.getElementById('opacity-value').textContent = `${this.config.opacity}%`;
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
        
        navigator.clipboard.writeText(fullUrl).then(() => {
            const btn = document.getElementById('copy-obs-url');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
            btn.classList.remove('bg-primary', 'hover:shadow-primary/40');
            btn.classList.add('bg-green-500', 'hover:shadow-green-500/40');
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('bg-green-500', 'hover:shadow-green-500/40');
                btn.classList.add('bg-primary', 'hover:shadow-primary/40');
            }, 2000);
        });
    }
}

new HypeTrain();
