import { TwitchService } from '../src/services/TwitchService.js';
import { StorageService } from '../src/services/StorageService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

/**
 * Hype Train Widget
 * Tracks engagement points from subscriptions, bits, and other events
 */
class HypeTrain {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);
        this.config = this.parseConfig();
        
        // State
        this.hypePoints = 0;
        this.hypeLevel = 0;
        this.lastHypeActivity = Date.now();
        
        // Elements
        this.elements = {
            container: document.getElementById('hype-container'),
            levelValue: document.getElementById('hype-level-value'),
            progress: document.getElementById('hype-progress'),
            progressText: document.getElementById('hype-progress-text'),
            current: document.getElementById('hype-current'),
            target: document.getElementById('hype-target')
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
            threshold: parseInt(this.urlParams.get('threshold')) || 100,
            subPoints: parseInt(this.urlParams.get('subPoints')) || 10,
            tier2Points: parseInt(this.urlParams.get('tier2Points')) || 20,
            tier3Points: parseInt(this.urlParams.get('tier3Points')) || 50,
            bitPoints: parseInt(this.urlParams.get('bitPoints')) || 5,
            decayTime: parseInt(this.urlParams.get('decayTime')) || 30,
            scale: parseInt(this.urlParams.get('scale')) || 100,
            opacity: parseInt(this.urlParams.get('opacity')) || 100
        };
    }

    applyConfig() {
        this.elements.container.style.transform = `scale(${this.config.scale / 100})`;
        this.elements.container.style.opacity = this.config.opacity / 100;
        this.elements.target.textContent = `${this.config.threshold} pts`;
    }

    async init() {
        try {
            this.twitch = new TwitchService();
            await this.twitch.initialize();
            
            ErrorHandler.info('Hype Train: Connected to Twitch');
            
            this.setupTwitchListeners();
            
            if (this.config.decayTime > 0) {
                setInterval(() => this.updateDecay(), 1000);
            }
            
        } catch (error) {
            ErrorHandler.handle(error, 'hype_train_init');
        }
    }

    setupTwitchListeners() {
        // Subscriptions
        this.twitch.on('subscription', (channel, username, method, message, tags) => {
            const tier = tags['msg-param-sub-plan'];
            let points = this.config.subPoints;
            
            if (tier === '2000') points = this.config.tier2Points;
            else if (tier === '3000') points = this.config.tier3Points;
            
            this.addPoints(points);
            ErrorHandler.info(`Hype Train: +${points} pts from ${username} sub`);
        });

        // Resubs
        this.twitch.on('resub', (channel, username, months, message, tags, methods) => {
            const tier = tags['msg-param-sub-plan'];
            let points = this.config.subPoints;
            
            if (tier === '2000') points = this.config.tier2Points;
            else if (tier === '3000') points = this.config.tier3Points;
            
            this.addPoints(points);
            ErrorHandler.info(`Hype Train: +${points} pts from ${username} resub`);
        });

        // Gift subs
        this.twitch.on('subgift', (channel, username, streakMonths, recipient, methods, tags) => {
            this.addPoints(this.config.subPoints);
            ErrorHandler.info(`Hype Train: +${this.config.subPoints} pts from ${username} gift`);
        });

        // Bits
        this.twitch.on('cheer', (channel, tags, message) => {
            const bits = parseInt(tags.bits) || 0;
            const points = Math.floor(bits / 100) * this.config.bitPoints;
            if (points > 0) {
                this.addPoints(points);
                ErrorHandler.info(`Hype Train: +${points} pts from ${tags.username} bits`);
            }
        });
    }

    addPoints(points) {
        this.hypePoints += points;
        this.lastHypeActivity = Date.now();
        
        // Check for level up
        const newLevel = Math.floor(this.hypePoints / this.config.threshold);
        if (newLevel > this.hypeLevel) {
            this.hypeLevel = newLevel;
            this.elements.levelValue.classList.add('level-up');
            setTimeout(() => this.elements.levelValue.classList.remove('level-up'), 500);
            ErrorHandler.info(`Hype Train: Level ${this.hypeLevel}!`);
        }
        
        this.updateDisplay();
    }

    updateDecay() {
        if (this.config.decayTime === 0 || this.hypePoints === 0) return;
        
        const timeSinceActivity = (Date.now() - this.lastHypeActivity) / 1000;
        
        if (timeSinceActivity > this.config.decayTime) {
            // Decay 1 point per second after threshold
            const decayAmount = Math.floor(timeSinceActivity - this.config.decayTime);
            this.hypePoints = Math.max(0, this.hypePoints - decayAmount);
            this.lastHypeActivity = Date.now();
            
            // Check for level down
            const newLevel = Math.floor(this.hypePoints / this.config.threshold);
            if (newLevel < this.hypeLevel) {
                this.hypeLevel = newLevel;
            }
            
            this.updateDisplay();
        }
    }

    updateDisplay() {
        const currentLevelPoints = this.hypePoints % this.config.threshold;
        const percentage = (currentLevelPoints / this.config.threshold) * 100;
        
        this.elements.levelValue.textContent = this.hypeLevel;
        this.elements.progress.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${Math.floor(percentage)}%`;
        this.elements.current.textContent = `${currentLevelPoints} pts`;
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

        document.getElementById('hype-threshold')?.addEventListener('input', (e) => {
            this.config.threshold = parseInt(e.target.value) || 100;
            this.elements.target.textContent = `${this.config.threshold} pts`;
            this.saveSettings();
        });

        document.getElementById('sub-points')?.addEventListener('input', (e) => {
            this.config.subPoints = parseInt(e.target.value) || 10;
            this.saveSettings();
        });

        document.getElementById('tier2-points')?.addEventListener('input', (e) => {
            this.config.tier2Points = parseInt(e.target.value) || 20;
            this.saveSettings();
        });

        document.getElementById('tier3-points')?.addEventListener('input', (e) => {
            this.config.tier3Points = parseInt(e.target.value) || 50;
            this.saveSettings();
        });

        document.getElementById('bit-points')?.addEventListener('input', (e) => {
            this.config.bitPoints = parseInt(e.target.value) || 5;
            this.saveSettings();
        });

        document.getElementById('decay-time')?.addEventListener('input', (e) => {
            this.config.decayTime = parseInt(e.target.value) || 0;
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
        document.getElementById('hype-threshold').value = this.config.threshold;
        document.getElementById('sub-points').value = this.config.subPoints;
        document.getElementById('tier2-points').value = this.config.tier2Points;
        document.getElementById('tier3-points').value = this.config.tier3Points;
        document.getElementById('bit-points').value = this.config.bitPoints;
        document.getElementById('decay-time').value = this.config.decayTime;
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
