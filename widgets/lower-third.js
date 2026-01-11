import { TwitchService } from '../src/services/TwitchService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

/**
 * Lower Third Overlay Widget
 * Displays username, stream title, and additional metadata
 */
class LowerThirdWidget {
    constructor() {
        // DOM Elements
        this.container = document.getElementById('lower-third-container');
        this.lowerThird = document.getElementById('lower-third');
        this.usernameEl = document.getElementById('username');
        this.titleEl = document.getElementById('stream-title');
        this.metaEl = document.getElementById('meta-info');
        
        // Settings elements
        this.settingsPanel = document.getElementById('settings-panel');
        this.toggleBtn = document.getElementById('toggle-settings');
        this.resetBtn = document.getElementById('reset-settings');
        this.copyBtn = document.getElementById('copy-obs-url');
        this.testShowBtn = document.getElementById('test-show');
        this.testHideBtn = document.getElementById('test-hide');
        
        // Settings inputs
        this.inputs = {
            style: document.getElementById('setting-style'),
            position: document.getElementById('setting-position'),
            customTitle: document.getElementById('setting-custom-title'),
            meta: document.getElementById('setting-meta'),
            animation: document.getElementById('setting-animation'),
            duration: document.getElementById('setting-duration'),
            interval: document.getElementById('setting-interval'),
            color: document.getElementById('setting-color'),
            opacity: document.getElementById('setting-opacity')
        };
        
        this.manualTriggerBtn = document.getElementById('manual-trigger');
        
        // Parse config from URL
        this.urlParams = new URLSearchParams(window.location.search);
        this.config = this.parseConfig();
        
        // State
        this.twitch = new TwitchService();
        this.isVisible = false;
        this.autoShowTimer = null;
        this.hideTimer = null;
        this.streamData = {
            username: '',
            title: '',
            category: '',
            viewers: 0,
            startedAt: null
        };
        
        this.initUI();
        this.applyStyles();
    }

    parseConfig() {
        // Load saved settings from localStorage
        const saved = this.loadSettings();
        
        return {
            style: this.urlParams.get('style') || saved.style || 'modern',
            position: this.urlParams.get('position') || saved.position || 'bottom-left',
            customTitle: this.urlParams.get('customTitle') || saved.customTitle || '',
            meta: this.urlParams.get('meta') || saved.meta || 'category',
            animation: this.urlParams.get('animation') || saved.animation || 'slide',
            duration: parseInt(this.urlParams.get('duration')) || saved.duration || 8,
            interval: parseInt(this.urlParams.get('interval')) || (saved.interval !== undefined ? saved.interval : 5),
            color: this.urlParams.get('color') || saved.color || '#8b5cf6',
            opacity: parseInt(this.urlParams.get('opacity')) || saved.opacity || 90
        };
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('lower-third-settings');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            ErrorHandler.warn('Failed to load saved settings', e);
            return {};
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('lower-third-settings', JSON.stringify(this.config));
            ErrorHandler.info('Settings saved');
        } catch (e) {
            ErrorHandler.warn('Failed to save settings', e);
        }
    }

    initUI() {
        // Initialize inputs with current config
        Object.keys(this.inputs).forEach(key => {
            if (this.inputs[key]) {
                this.inputs[key].value = this.config[key];
            }
        });

        // Update value displays
        const colorValue = document.getElementById('color-value');
        if (colorValue) colorValue.textContent = this.config.color.toUpperCase();

        const opacityValue = document.getElementById('opacity-value');
        if (opacityValue) opacityValue.textContent = `${this.config.opacity}%`;

        const durationValue = document.getElementById('duration-value');
        if (durationValue) durationValue.textContent = `${this.config.duration}s`;

        const intervalValue = document.getElementById('interval-value');
        if (intervalValue) {
            intervalValue.textContent = this.config.interval === 0 ? 'Off' : `${this.config.interval}m`;
        }

        // Toggle settings panel
        this.toggleBtn?.addEventListener('click', () => {
            this.settingsPanel.classList.toggle('hidden');
            this.toggleBtn.ariaExpanded = !this.settingsPanel.classList.contains('hidden');
        });

        // Reset settings
        this.resetBtn?.addEventListener('click', () => {
            localStorage.removeItem('lower-third-settings');
            window.location.search = '';
        });

        // Copy OBS URL
        this.copyBtn?.addEventListener('click', () => this.copyOBSUrl());

        // Test buttons
        this.testShowBtn?.addEventListener('click', () => this.show());
        this.testHideBtn?.addEventListener('click', () => this.hide());
        
        // Manual trigger button
        this.manualTriggerBtn?.addEventListener('click', () => this.show());

        // Listen for input changes
        Object.keys(this.inputs).forEach(key => {
            this.inputs[key]?.addEventListener('input', (e) => {
                this.config[key] = e.target.type === 'number' || e.target.type === 'range' 
                    ? parseInt(e.target.value) 
                    : e.target.value;
                
                // Update displays
                if (key === 'color' && colorValue) {
                    colorValue.textContent = e.target.value.toUpperCase();
                }
                if (key === 'opacity' && opacityValue) {
                    opacityValue.textContent = `${e.target.value}%`;
                }
                if (key === 'duration' && durationValue) {
                    durationValue.textContent = `${e.target.value}s`;
                }
                if (key === 'interval' && intervalValue) {
                    const val = parseInt(e.target.value);
                    intervalValue.textContent = val === 0 ? 'Off' : `${val}m`;
                    this.setupAutoShow();
                }
                
                this.applyStyles();
                this.saveSettings();
            });
        });
    }

    applyStyles() {
        // Apply position
        this.container.className = `position-${this.config.position}`;
        
        // Apply style
        this.lowerThird.className = `lower-third style-${this.config.style}`;
        
        // Apply animation class
        this.container.classList.add(`animate-${this.config.animation}`);
        
        // Apply colors
        this.lowerThird.style.setProperty('--accent-color', this.config.color);
        
        // Apply opacity to background
        const opacityDecimal = this.config.opacity / 100;
        if (this.config.style === 'gradient') {
            this.lowerThird.style.background = `linear-gradient(135deg, ${this.config.color}, #6366f1)`;
        } else {
            this.lowerThird.style.background = `rgba(0, 0, 0, ${opacityDecimal})`;
        }
    }

    async init() {
        try {
            // Initialize Twitch service
            await this.twitch.initialize();
            
            // Fetch initial stream data
            await this.fetchStreamData();
            
            // Update content
            this.updateContent();
            
            // Setup auto-show if interval is set
            this.setupAutoShow();
            
            // Refresh stream data every 60 seconds
            setInterval(() => this.fetchStreamData(), 60000);
            
            ErrorHandler.info('Lower Third initialized successfully');
        } catch (error) {
            ErrorHandler.handle(error, 'lower_third_init');
            // Show with fallback data
            this.streamData.username = this.twitch.getUsername() || 'Streamer';
            this.streamData.title = 'Live Stream';
            this.updateContent();
        }
    }

    async fetchStreamData() {
        try {
            const username = this.twitch.getUsername();
            if (!username) {
                ErrorHandler.warn('No username available');
                return;
            }

            // Ensure we have channel ID
            if (!this.twitch.authConfig.channelId) {
                const userInfo = await this.twitch.api.fetchUserInfo(username);
                if (userInfo) {
                    this.twitch.authConfig.channelId = userInfo.id;
                }
            }

            const channelId = this.twitch.authConfig.channelId;
            if (!channelId) {
                ErrorHandler.warn('Could not get channel ID');
                return;
            }

            // Fetch stream info
            const streamInfo = await this.fetchStreamInfo(channelId);
            
            if (streamInfo) {
                this.streamData.username = streamInfo.user_name || username;
                this.streamData.title = streamInfo.title || 'Live Stream';
                this.streamData.category = streamInfo.game_name || '';
                this.streamData.viewers = streamInfo.viewer_count || 0;
                this.streamData.startedAt = streamInfo.started_at ? new Date(streamInfo.started_at) : null;
            } else {
                // Fallback if stream is offline or info unavailable
                this.streamData.username = username;
                this.streamData.title = 'Stream Title';
                this.streamData.category = 'Category';
            }

            this.updateContent();
        } catch (error) {
            ErrorHandler.handle(error, 'fetch_stream_data');
        }
    }

    async fetchStreamInfo(channelId) {
        try {
            if (!this.twitch.api) {
                ErrorHandler.warn('API not available');
                return null;
            }

            const data = await this.twitch.api.request(`/streams?user_id=${channelId}`);
            return data.data && data.data.length > 0 ? data.data[0] : null;
        } catch (error) {
            ErrorHandler.handle(error, 'fetch_stream_info', { channelId });
            return null;
        }
    }

    updateContent() {
        // Update username
        this.usernameEl.textContent = this.streamData.username;
        
        // Update title
        let displayTitle = this.streamData.title;
        
        if (this.config.customTitle) {
            // Try to apply as regex pattern to extract from title
            try {
                const regex = new RegExp(this.config.customTitle);
                const match = this.streamData.title.match(regex);
                if (match) {
                    // Use first captured group if exists, otherwise the full match
                    displayTitle = match[1] || match[0];
                } else {
                    // Regex didn't match, use as literal text
                    displayTitle = this.config.customTitle;
                }
            } catch (e) {
                // Invalid regex, use as literal text
                displayTitle = this.config.customTitle;
            }
        }
        
        this.titleEl.textContent = displayTitle;
        
        // Update meta info based on config
        switch (this.config.meta) {
            case 'category':
                this.metaEl.textContent = this.streamData.category || 'Just Chatting';
                this.metaEl.style.display = 'block';
                break;
            case 'viewers':
                this.metaEl.textContent = `${this.streamData.viewers.toLocaleString()} viewers`;
                this.metaEl.style.display = 'block';
                break;
            case 'uptime':
                if (this.streamData.startedAt) {
                    const uptime = this.calculateUptime(this.streamData.startedAt);
                    this.metaEl.textContent = `Live for ${uptime}`;
                    this.metaEl.style.display = 'block';
                } else {
                    this.metaEl.style.display = 'none';
                }
                break;
            case 'none':
                this.metaEl.style.display = 'none';
                break;
        }
    }

    calculateUptime(startedAt) {
        const now = new Date();
        const diff = Math.floor((now - startedAt) / 1000); // seconds
        
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    setupAutoShow() {
        // Clear existing timer
        if (this.autoShowTimer) {
            clearInterval(this.autoShowTimer);
            this.autoShowTimer = null;
        }

        // Setup new timer if interval > 0
        if (this.config.interval > 0) {
            const intervalMs = this.config.interval * 60 * 1000; // Convert minutes to milliseconds
            this.autoShowTimer = setInterval(() => {
                if (!this.isVisible) {
                    this.show();
                }
            }, intervalMs);
            
            ErrorHandler.info(`Auto-show set to ${this.config.interval} minutes`);
        }
    }

    show() {
        if (this.isVisible) {
            ErrorHandler.info('Lower third already visible, skipping');
            return;
        }
        
        // Clear any existing hide timer
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        
        // Update content before showing
        this.updateContent();
        
        // Show the container
        this.container.classList.remove('hidden');
        this.container.classList.remove('hiding');
        this.container.classList.add('showing');
        
        this.isVisible = true;
        
        // Auto-hide after duration
        const durationMs = this.config.duration * 1000;
        ErrorHandler.info(`Lower third shown, will auto-hide in ${this.config.duration}s`);
        
        this.hideTimer = setTimeout(() => {
            ErrorHandler.info('Auto-hide timer triggered');
            this.hide();
        }, durationMs);
    }

    hide() {
        if (!this.isVisible) {
            ErrorHandler.info('Lower third already hidden, skipping');
            return;
        }
        
        ErrorHandler.info('Hiding lower third...');
        
        // Clear the hide timer if it exists
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        
        // Start hide animation
        this.container.classList.remove('showing');
        this.container.classList.add('hiding');
        
        this.isVisible = false;
        
        // Wait for animation to complete before fully hiding
        const animationDuration = 800; // Max animation duration in ms
        setTimeout(() => {
            if (!this.isVisible) { // Double check we haven't shown again
                this.container.classList.add('hidden');
                this.container.classList.remove('hiding');
                ErrorHandler.info('Lower third fully hidden');
            }
        }, animationDuration);
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
            if (this.config[key] !== '') {
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

// Initialize widget
const widget = new LowerThirdWidget();
widget.init();

