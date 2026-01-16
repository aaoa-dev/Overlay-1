import { TwitchService } from '../src/services/TwitchService.js';
import { StorageService } from '../src/services/StorageService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

/**
 * Chat Engagement Widget
 * Tracks chat messages, unique chatters, and activity level
 */
class ChatEngagement {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);
        this.config = this.parseConfig();
        
        // State
        this.messagesCount = 0;
        this.chattersSet = new Set();
        this.lastMinuteMessages = [];
        
        // Elements
        this.elements = {
            container: document.getElementById('chat-container'),
            messagesCount: document.getElementById('messages-count'),
            chattersCount: document.getElementById('chatters-count'),
            activityDot: document.getElementById('activity-dot'),
            activityText: document.getElementById('activity-text')
        };
        
        this.twitch = null;
        this.isSettingsMode = !window.obsstudio && document.querySelector('.obs-control');
        
        if (this.isSettingsMode) {
            this.initializeSettingsPanel();
        }
        
        this.applyConfig();
        this.init();
    }

    parseConfig() {
        return {
            activityThreshold: parseInt(this.urlParams.get('activityThreshold')) || 5,
            resetOnStart: this.urlParams.get('resetOnStart') !== 'false',
            scale: parseInt(this.urlParams.get('scale')) || 100,
            opacity: parseInt(this.urlParams.get('opacity')) || 100
        };
    }

    applyConfig() {
        this.elements.container.style.transform = `scale(${this.config.scale / 100})`;
        this.elements.container.style.opacity = this.config.opacity / 100;
    }

    async init() {
        try {
            this.twitch = new TwitchService();
            await this.twitch.initialize();
            
            ErrorHandler.info('Chat Engagement: Connected to Twitch');
            
            this.setupTwitchListeners();
            setInterval(() => this.updateActivity(), 1000);
            
        } catch (error) {
            ErrorHandler.handle(error, 'chat_engagement_init');
        }
    }

    setupTwitchListeners() {
        this.twitch.on('message', (channel, tags, message, self) => {
            if (self) return;
            
            this.messagesCount++;
            this.chattersSet.add(tags.username);
            
            // Track messages for activity calculation
            this.lastMinuteMessages.push(Date.now());
            
            // Clean old messages (older than 1 minute)
            const oneMinuteAgo = Date.now() - 60000;
            this.lastMinuteMessages = this.lastMinuteMessages.filter(time => time > oneMinuteAgo);
            
            this.updateDisplay();
        });
    }

    updateDisplay() {
        this.elements.messagesCount.textContent = this.messagesCount;
        this.elements.messagesCount.classList.add('counter-pulse');
        setTimeout(() => this.elements.messagesCount.classList.remove('counter-pulse'), 300);
        
        this.elements.chattersCount.textContent = this.chattersSet.size;
    }

    updateActivity() {
        const messagesPerMinute = this.lastMinuteMessages.length;
        
        let activityLevel = 'Quiet';
        let activityColor = '#ef4444'; // red
        
        if (messagesPerMinute >= this.config.activityThreshold * 2) {
            activityLevel = 'Very Active';
            activityColor = '#22c55e'; // green
        } else if (messagesPerMinute >= this.config.activityThreshold) {
            activityLevel = 'Active';
            activityColor = '#eab308'; // yellow
        } else if (messagesPerMinute > 0) {
            activityLevel = 'Slow';
            activityColor = '#f97316'; // orange
        }
        
        this.elements.activityText.textContent = activityLevel;
        this.elements.activityDot.style.background = activityColor;
    }

    resetCounters() {
        this.messagesCount = 0;
        this.chattersSet.clear();
        this.lastMinuteMessages = [];
        this.updateDisplay();
        this.updateActivity();
        ErrorHandler.info('Chat Engagement: Counters reset');
    }

    // Settings Panel
    initializeSettingsPanel() {
        this.loadSettings();
        this.setupSettingsListeners();
        this.updateSettingsUI();
    }

    loadSettings() {
        const saved = StorageService.get('chatEngagementSettings');
        if (saved) {
            this.config = { ...this.config, ...saved };
        }
    }

    saveSettings() {
        StorageService.set('chatEngagementSettings', this.config);
    }

    setupSettingsListeners() {
        const panel = document.getElementById('settings-panel');
        const toggleBtn = document.getElementById('toggle-settings');
        const resetBtn = document.getElementById('reset-settings');
        const copyBtn = document.getElementById('copy-obs-url');
        const resetCountersBtn = document.getElementById('reset-counters');
        
        toggleBtn?.addEventListener('click', () => {
            panel.classList.toggle('hidden');
            toggleBtn.ariaExpanded = !panel.classList.contains('hidden');
        });

        resetBtn?.addEventListener('click', () => {
            window.location.search = '';
        });

        copyBtn?.addEventListener('click', () => this.copyOBSUrl());

        resetCountersBtn?.addEventListener('click', () => {
            this.resetCounters();
        });

        document.getElementById('activity-threshold')?.addEventListener('input', (e) => {
            this.config.activityThreshold = parseInt(e.target.value) || 5;
            this.saveSettings();
        });

        document.getElementById('reset-on-start')?.addEventListener('change', (e) => {
            this.config.resetOnStart = e.target.checked;
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
        document.getElementById('activity-threshold').value = this.config.activityThreshold;
        document.getElementById('reset-on-start').checked = this.config.resetOnStart;
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

new ChatEngagement();
