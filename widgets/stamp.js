import { TwitchService } from '../src/services/TwitchService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

class StreamEndStampWidget {
    constructor() {
        // DOM Elements
        this.container = document.getElementById('stamp-container');
        this.userPfp = document.getElementById('user-pfp');
        this.streamCountEl = document.getElementById('stream-count');
        this.studioNameEl = document.getElementById('studio-name');
        this.inspectorNameEl = document.getElementById('inspector-name');
        this.dateEl = document.getElementById('stamp-date');
        this.mainTitleEl = document.getElementById('stamp-main-title');

        // Settings Elements
        this.settingsPanel = document.getElementById('settings-panel');
        this.toggleBtn = document.getElementById('toggle-settings');
        this.resetBtn = document.getElementById('reset-settings');
        this.copyBtn = document.getElementById('copy-obs-url');
        this.testShowBtn = document.getElementById('test-show');
        this.testHideBtn = document.getElementById('test-hide');
        this.manualTriggerBtn = document.getElementById('manual-trigger');
        this.resetColorBtn = document.getElementById('reset-color');

        this.inputs = {
            title: document.getElementById('setting-title'),
            studio: document.getElementById('setting-studio'),
            streamNumber: document.getElementById('setting-stream-number'),
            color: document.getElementById('setting-color'),
            scale: document.getElementById('setting-scale')
        };

        // State
        this.twitch = new TwitchService();
        this.urlParams = new URLSearchParams(window.location.search);
        this.config = this.parseConfig();
        this.isVisible = false;

        this.initUI();
        this.applyStyles();
        this.updateDate();
    }

    parseConfig() {
        const saved = this.loadSettings();
        return {
            title: this.urlParams.get('title') || saved.title || 'AUTHENTIC DESIGN & HELP',
            studio: this.urlParams.get('studio') || saved.studio || 'AAOA STUDIO',
            streamNumber: parseInt(this.urlParams.get('streamNumber')) || saved.streamNumber || 0,
            lastStreamId: saved.lastStreamId || null,
            color: this.urlParams.get('color') || saved.color || '#FF4C3B',
            scale: parseInt(this.urlParams.get('scale')) || saved.scale || 100
        };
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('stamp-settings');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }

    saveSettings() {
        localStorage.setItem('stamp-settings', JSON.stringify(this.config));
    }

    initUI() {
        // Set initial values
        Object.keys(this.inputs).forEach(key => {
            if (this.inputs[key]) {
                this.inputs[key].value = this.config[key];
            }
        });

        const scaleValue = document.getElementById('scale-value');
        if (scaleValue) scaleValue.textContent = `${this.config.scale}%`;

        // Event Listeners
        this.toggleBtn?.addEventListener('click', () => {
            this.settingsPanel.classList.toggle('hidden');
        });

        this.resetBtn?.addEventListener('click', () => {
            localStorage.removeItem('stamp-settings');
            window.location.search = '';
        });

        this.copyBtn?.addEventListener('click', () => this.copyOBSUrl());
        this.testShowBtn?.addEventListener('click', () => this.show());
        this.testHideBtn?.addEventListener('click', () => this.hide());
        this.manualTriggerBtn?.addEventListener('click', () => this.show());

        this.resetColorBtn?.addEventListener('click', () => {
            const defaultColor = '#FF4C3B';
            this.config.color = defaultColor;
            if (this.inputs.color) this.inputs.color.value = defaultColor;
            this.applyStyles();
            this.saveSettings();
        });

        Object.keys(this.inputs).forEach(key => {
            this.inputs[key]?.addEventListener('input', (e) => {
                const val = e.target.type === 'number' || e.target.type === 'range' 
                    ? parseInt(e.target.value) 
                    : e.target.value;
                this.config[key] = val;

                if (key === 'scale' && scaleValue) scaleValue.textContent = `${val}%`;
                
                this.applyStyles();
                this.updateContent();
                this.saveSettings();
            });
        });
    }

    applyStyles() {
        document.documentElement.style.setProperty('--stamp-red', this.config.color);
        const scaleDecimal = this.config.scale / 100;
        this.container.style.transform = `scale(${scaleDecimal})`;
    }

    updateContent() {
        this.mainTitleEl.textContent = this.config.title;
        this.studioNameEl.textContent = this.config.studio;
        this.streamCountEl.textContent = this.config.streamNumber;
        this.inspectorNameEl.textContent = this.twitch.getUsername() || 'STREAMER';
    }

    updateDate() {
        const now = new Date();
        // Match the reference format: D/M/YY
        const day = now.getDate();
        const month = now.getMonth() + 1;
        const year = now.getFullYear().toString().slice(-2);
        this.dateEl.textContent = `${day}/${month}/${year}`;
    }

    async init() {
        try {
            await this.twitch.initialize();
            const username = this.twitch.getUsername();
            
            if (username) {
                const userInfo = await this.twitch.api.fetchUserInfo(username);
                if (userInfo && userInfo.profile_image_url) {
                    this.userPfp.src = userInfo.profile_image_url;
                }
                this.inspectorNameEl.textContent = username.toUpperCase();

                // Auto-increment stream number logic
                await this.handleStreamAutoIncrement();
            }

            this.updateContent();
            ErrorHandler.info('Stamp widget initialized');
        } catch (error) {
            ErrorHandler.handle(error, 'stamp_init');
        }
    }

    async handleStreamAutoIncrement() {
        try {
            const channelId = this.twitch.authConfig.channelId;
            if (!channelId) return;

            // Fetch current stream info
            const streamData = await this.twitch.api.request(`/streams?user_id=${channelId}`);
            const currentStream = streamData.data && streamData.data.length > 0 ? streamData.data[0] : null;

            if (currentStream && currentStream.id !== this.config.lastStreamId) {
                // This is a new stream session we haven't counted yet
                this.config.streamNumber++;
                this.config.lastStreamId = currentStream.id;
                
                // Update input UI if visible
                if (this.inputs.streamNumber) {
                    this.inputs.streamNumber.value = this.config.streamNumber;
                }

                this.saveSettings();
                ErrorHandler.info(`Stream number auto-incremented to ${this.config.streamNumber}`);
            }
        } catch (error) {
            ErrorHandler.handle(error, 'auto_increment');
        }
    }

    show() {
        // No-op: stamp is always visible
    }

    hide() {
        // No-op: stamp is always visible
    }

    copyOBSUrl() {
        const url = new URL(window.location.href);
        const params = new URLSearchParams();
        
        if (this.twitch.authConfig.password) {
            params.append('token', this.twitch.authConfig.password.replace('oauth:', ''));
        }
        if (this.twitch.authConfig.username) {
            params.append('username', this.twitch.authConfig.username);
            params.append('channel', this.twitch.authConfig.username);
        }

        Object.keys(this.config).forEach(key => {
            params.append(key, this.config[key]);
        });

        const finalUrl = `${url.origin}${url.pathname}?${params.toString()}`;
        navigator.clipboard.writeText(finalUrl).then(() => {
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = 'Copied!';
            setTimeout(() => this.copyBtn.textContent = originalText, 2000);
        });
    }
}

const widget = new StreamEndStampWidget();
widget.init();
