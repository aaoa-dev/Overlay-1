import { TwitchService } from '../src/services/TwitchService.js';
import { StreamStatsService } from '../src/services/StreamStatsService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

/**
 * Unified Counter Widget
 * Configurable via URL parameters or UI settings panel
 */
class CounterWidget {
    constructor() {
        this.container = document.getElementById('counter-container');
        this.labelElement = document.getElementById('label');
        this.valueElement = document.getElementById('value');
        
        // Settings elements
        this.settingsPanel = document.getElementById('settings-panel');
        this.toggleBtn = document.getElementById('toggle-settings');
        this.resetBtn = document.getElementById('reset-settings');
        this.copyBtn = document.getElementById('copy-obs-url');
        
        this.inputs = {
            type: document.getElementById('setting-type'),
            range: document.getElementById('setting-range'),
            label: document.getElementById('setting-label'),
            target: document.getElementById('setting-target'),
            color: document.getElementById('setting-color'),
            size: document.getElementById('setting-size-slider'),
            theme: document.getElementById('setting-theme')
        };
        
        this.urlParams = new URLSearchParams(window.location.search);
        this.config = this.parseConfig();
        
        this.twitch = new TwitchService();
        this.streamStats = new StreamStatsService();
        this.lastCount = -1;
        
        this.initUI();
        this.applyStyles();
    }

    parseConfig() {
        const type = this.urlParams.get('type') || 'followers';
        const defaultInterval = type === 'subs' ? 60000 : 30000;
        
        return {
            type,
            range: this.urlParams.get('range') || 'all',
            label: this.urlParams.get('label') || '',
            target: this.urlParams.get('target') || '',
            color: this.urlParams.get('color') || '#ffffff',
            size: this.urlParams.get('size') || '10', // Default 10vw
            theme: this.urlParams.get('theme') || '',
            interval: parseInt(this.urlParams.get('interval')) || defaultInterval
        };
    }

    initUI() {
        // Initialize inputs with current config
        Object.keys(this.inputs).forEach(key => {
            if (this.inputs[key]) {
                this.inputs[key].value = this.config[key];
            }
        });

        // Update color value text
        const colorValue = document.getElementById('color-value');
        if (colorValue) colorValue.textContent = this.config.color.toUpperCase();

        // Update size display
        const sizeDisplay = document.getElementById('size-value');
        if (sizeDisplay) sizeDisplay.textContent = `${this.config.size}vw`;

        // Toggle settings panel
        this.toggleBtn?.addEventListener('click', () => {
            this.settingsPanel.classList.toggle('hidden');
            this.toggleBtn.ariaExpanded = !this.settingsPanel.classList.contains('hidden');
        });

        // Reset settings
        this.resetBtn?.addEventListener('click', () => {
            window.location.search = '';
        });

        // Copy OBS URL
        this.copyBtn?.addEventListener('click', () => this.copyOBSUrl());

        // Listen for input changes
        Object.keys(this.inputs).forEach(key => {
            this.inputs[key]?.addEventListener('input', (e) => {
                this.config[key] = e.target.value;
                if (key === 'color' && colorValue) colorValue.textContent = e.target.value.toUpperCase();
                if (key === 'size' && sizeDisplay) sizeDisplay.textContent = `${e.target.value}vw`;
                
                this.applyStyles();
                this.update(); // Trigger update for source/range changes
            });
        });
    }

    applyStyles() {
        this.container.style.fontSize = `${this.config.size}vw`;
        this.valueElement.style.color = this.config.color;
        
        if (this.config.label) {
            this.labelElement.textContent = this.config.label;
            this.labelElement.style.display = 'block';
        } else {
            this.labelElement.style.display = 'none';
        }
        
        // Reset and apply theme classes
        this.container.className = '';
        if (this.config.theme) {
            this.container.classList.add(`theme-${this.config.theme}`);
        }
    }

    async init() {
        try {
            await this.twitch.initialize();
            await this.update();
            setInterval(() => this.update(), this.config.interval);
        } catch (error) {
            this.valueElement.textContent = 'Error';
            ErrorHandler.handle(error, 'counter_init');
        }
    }

    async update() {
        try {
            if (!this.twitch.authConfig.channelId && this.twitch.authConfig.username) {
                ErrorHandler.info('Fetching channel ID for ' + this.twitch.authConfig.username);
                const userInfo = await this.twitch.api.fetchUserInfo(this.twitch.authConfig.username);
                if (userInfo) {
                    this.twitch.authConfig.channelId = userInfo.id;
                }
            }

            const channelId = this.twitch.authConfig.channelId;
            if (!channelId) return;

            let totalCount = 0;
            
            if (this.config.type === 'followers') {
                totalCount = await this.twitch.api.fetchFollowerCount(channelId);
                this.twitch.api.fetchSubscriberCount(channelId).then(subs => {
                    this.streamStats.update(totalCount, subs);
                }).catch(() => {
                    this.streamStats.update(totalCount, this.streamStats.lastKnownTotals.subs);
                });
            } else {
                totalCount = await this.twitch.api.fetchSubscriberCount(channelId);
                this.twitch.api.fetchFollowerCount(channelId).then(folls => {
                    this.streamStats.update(folls, totalCount);
                }).catch(() => {
                    this.streamStats.update(this.streamStats.lastKnownTotals.followers, totalCount);
                });
            }

            const displayCount = this.streamStats.getRelativeCount(
                totalCount, 
                this.config.range, 
                this.config.type === 'subs' ? 'subs' : 'followers'
            );
            
            if (displayCount !== this.lastCount) {
                let text = displayCount;
                if (this.config.target) {
                    text = `${displayCount}/${this.config.target}`;
                }
                
                this.valueElement.textContent = text;
                
                if (this.lastCount !== -1) {
                    this.valueElement.classList.add('pulse');
                    setTimeout(() => this.valueElement.classList.remove('pulse'), 500);
                }
                this.lastCount = displayCount;
            }
        } catch (error) {
            ErrorHandler.handle(error, 'counter_update', { type: this.config.type });
        }
    }

    copyOBSUrl() {
        const url = new URL(window.location.href);
        const params = new URLSearchParams();
        
        // Add auth data from Twitch service
        if (this.twitch.authConfig.password) {
            params.append('token', this.twitch.authConfig.password.replace('oauth:', ''));
        }
        if (this.twitch.authConfig.username) {
            params.append('username', this.twitch.authConfig.username);
            params.append('channel', this.twitch.authConfig.username);
        }
        if (this.twitch.authConfig.channelId) {
            params.append('channelId', this.twitch.authConfig.channelId);
        }

        // Add current config
        Object.keys(this.config).forEach(key => {
            if (this.config[key] !== '' && key !== 'interval') {
                params.append(key, this.config[key]);
            }
        });

        const finalUrl = `${url.origin}${url.pathname}?${params.toString()}`;
        
        navigator.clipboard.writeText(finalUrl).then(() => {
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
            this.copyBtn.classList.remove('bg-primary', 'hover:shadow-primary/40');
            this.copyBtn.classList.add('bg-green-500', 'hover:shadow-green-500/40');
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
                this.copyBtn.classList.remove('bg-green-500', 'hover:shadow-green-500/40');
                this.copyBtn.classList.add('bg-primary', 'hover:shadow-primary/40');
            }, 2000);
        });
    }
}

const widget = new CounterWidget();
widget.init();
