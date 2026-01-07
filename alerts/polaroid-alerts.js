import { TwitchService } from '../src/services/TwitchService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';
import { StorageService } from '../src/services/StorageService.js';

class PolaroidAlert {
    constructor(data, options = {}) {
        this.username = data.username;
        this.displayName = data.displayName || data.username;
        this.message = data.message || 'is here!';
        this.profileImageUrl = data.profileImageUrl || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/ce577395-cb31-4e17-bf88-11582170c3d0-profile_image-300x300.png';
        
        this.options = {
            duration: options.duration || 5000,
            activeAlerts: options.activeAlerts || [],
            ...options
        };
        this.targetPos = null;
    }

    /**
     * Show the alert
     */
    async show(container) {
        return new Promise((resolve) => {
            const element = this.create();
            container.appendChild(element);

            // Set initial random position off-screen
            const { startX, startY, startRotate } = this.getRandomOffscreenPosition();
            element.style.transform = `translate(${startX}px, ${startY}px) rotate(${startRotate}deg)`;
            element.style.opacity = '0';

            // Calculate a target position that doesn't overlap with existing active alerts
            this.targetPos = this.calculateTargetPosition();

            // Trigger animation
            setTimeout(() => {
                const endRotate = (Math.random() * 15) - 7.5; // Random tilt
                element.style.opacity = '1';
                element.style.transform = `translate(${this.targetPos.x}px, ${this.targetPos.y}px) rotate(${endRotate}deg) scale(1.1)`;
            }, 100);

            // Wait, then move out
            setTimeout(() => {
                const { startX: endX, startY: endY, startRotate: endRotate } = this.getRandomOffscreenPosition();
                element.style.transform = `translate(${endX}px, ${endY}px) rotate(${endRotate}deg) scale(1)`;
                element.style.opacity = '0';

                setTimeout(() => {
                    element.remove();
                    resolve();
                }, 1500);
            }, this.options.duration);
        });
    }

    calculateTargetPosition() {
        const width = 320;
        const height = 400;
        const padding = 100;
        const maxAttempts = 50;
        
        for (let i = 0; i < maxAttempts; i++) {
            const x = padding + Math.random() * (window.innerWidth - width - padding * 2);
            const y = padding + Math.random() * (window.innerHeight - height - padding * 2);
            
            // Check for overlap with other active alerts
            const overlaps = this.options.activeAlerts.some(alert => {
                if (!alert.targetPos) return false;
                const other = alert.targetPos;
                const buffer = 20; // Allow 20px overlap buffer for a "piled" look
                
                return !(
                    x + width - buffer < other.x || 
                    x + buffer > other.x + width || 
                    y + height - buffer < other.y || 
                    y + buffer > other.y + height
                );
            });

            if (!overlaps) return { x, y };
        }

        // Fallback to random if no perfect spot found after max attempts
        return {
            x: padding + Math.random() * (window.innerWidth - width - padding * 2),
            y: padding + Math.random() * (window.innerHeight - height - padding * 2)
        };
    }

    create() {
        const div = document.createElement('div');
        div.className = 'polaroid';
        
        div.innerHTML = `
            <div class="polaroid-image-wrapper">
                <img src="${this.profileImageUrl}" alt="${this.displayName}">
            </div>
            <div class="caption">${this.displayName} ${this.message}</div>
        `;
        
        return div;
    }

    getRandomOffscreenPosition() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const offset = 500;
        const side = Math.floor(Math.random() * 4);
        
        let x, y;
        if (side === 0) { // Top
            x = Math.random() * (width - 320);
            y = -offset;
        } else if (side === 1) { // Right
            x = width + offset;
            y = Math.random() * (height - 400);
        } else if (side === 2) { // Bottom
            x = Math.random() * (width - 320);
            y = height + offset;
        } else { // Left
            x = -offset;
            y = Math.random() * (height - 400);
        }

        return {
            startX: x,
            startY: y,
            startRotate: (Math.random() * 90) - 45
        };
    }
}

class PolaroidManager {
    constructor() {
        this.config = this.parseUrlParams();
        this.twitchService = new TwitchService();
        this.container = null;
        this.userCache = new Map();
        this.activeAlerts = []; // Track active alerts for overlap detection
        this.isSettingsMode = !window.obsstudio && document.querySelector('.settings-panel');
    }

    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            enableFollow: params.get('enableFollow') !== 'false',
            enableSub: params.get('enableSub') !== 'false',
            enableResub: params.get('enableResub') !== 'false',
            enableGift: params.get('enableGift') !== 'false',
            enableRaid: params.get('enableRaid') !== 'false',
            enableCheer: params.get('enableCheer') !== 'false',
            duration: parseInt(params.get('duration')) || 5000
        };
    }

    async init() {
        try {
            ErrorHandler.info('Initializing Polaroid Alerts...');
            
            this.loadSettings();

            if (this.isSettingsMode) {
                this.initializeSettingsPanel();
            }

            await this.twitchService.initialize();
            this.container = document.getElementById('alertContainer');

            this.setupEventListeners();
            this.setupTestFunctions();

            ErrorHandler.info('Polaroid Alerts system ready', this.config);
        } catch (error) {
            ErrorHandler.handle(error, 'polaroid_init');
        }
    }

    loadSettings() {
        const saved = StorageService.get('polaroidSettings');
        if (saved) {
            this.config = { ...this.config, ...saved };
        }
    }

    saveSettings() {
        StorageService.set('polaroidSettings', this.config);
    }

    initializeSettingsPanel() {
        const panel = document.getElementById('settings-panel');
        const toggleBtn = document.getElementById('toggle-settings');
        const resetBtn = document.getElementById('reset-settings');
        const copyBtn = document.getElementById('copy-obs-url');

        // Toggle panel
        toggleBtn?.addEventListener('click', () => {
            panel.classList.toggle('hidden');
        });

        // Reset
        resetBtn?.addEventListener('click', () => {
            StorageService.remove('polaroidSettings');
            window.location.reload();
        });

        // Copy OBS URL
        copyBtn?.addEventListener('click', () => this.copyOBSUrl());

        // Settings inputs
        const inputs = {
            'enable-follow': 'enableFollow',
            'enable-sub': 'enableSub',
            'enable-resub': 'enableResub',
            'enable-gift': 'enableGift',
            'enable-raid': 'enableRaid',
            'enable-cheer': 'enableCheer'
        };

        Object.entries(inputs).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) {
                el.checked = this.config[key];
                el.addEventListener('change', (e) => {
                    this.config[key] = e.target.checked;
                    this.saveSettings();
                    this.updateTestButtonVisibility();
                });
            }
        });

        const durationInput = document.getElementById('alert-duration');
        const durationValue = document.getElementById('duration-value');
        if (durationInput) {
            durationInput.value = this.config.duration;
            durationValue.textContent = this.config.duration;
            durationInput.addEventListener('input', (e) => {
                this.config.duration = parseInt(e.target.value);
                durationValue.textContent = this.config.duration;
                this.saveSettings();
            });
        }

        this.updateTestButtonVisibility();
    }

    updateTestButtonVisibility() {
        const mapping = {
            'enableFollow': 'test-follow',
            'enableSub': 'test-sub',
            'enableResub': 'test-resub',
            'enableGift': 'test-gift',
            'enableRaid': 'test-raid',
            'enableCheer': 'test-cheer'
        };

        Object.entries(mapping).forEach(([key, btnId]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.style.display = this.config[key] ? 'inline-flex' : 'none';
            }
        });
    }

    copyOBSUrl() {
        const params = new URLSearchParams();
        
        // Add auth data if available
        const authData = StorageService.getAuthData();
        if (authData.token) params.append('token', authData.token.replace('oauth:', ''));
        if (authData.username) {
            params.append('username', authData.username);
            params.append('channel', authData.username);
        }
        if (authData.channelId) params.append('channelId', authData.channelId);

        // Add config
        Object.entries(this.config).forEach(([key, value]) => {
            params.append(key, value);
        });

        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById('copy-obs-url');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Copied!';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        });
    }

    setupEventListeners() {
        // Subscriptions
        this.twitchService.on('subscription', (channel, username, method, message, userstate) => {
            if (this.config.enableSub) {
                this.queueAlert(username, 'just subscribed!', userstate['display-name']);
            }
        });

        this.twitchService.on('resub', (channel, username, months, message, userstate, methods) => {
            if (this.config.enableResub) {
                this.queueAlert(username, `resubscribed for ${months} months!`, userstate['display-name']);
            }
        });

        this.twitchService.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
            if (this.config.enableGift) {
                this.queueAlert(recipient, `got a gift sub from ${username}!`);
            }
        });

        // Raids
        this.twitchService.on('raided', (channel, username, viewers) => {
            if (this.config.enableRaid) {
                this.queueAlert(username, `is raiding with ${viewers} viewers!`);
            }
        });

        // Cheers
        this.twitchService.on('cheer', (channel, userstate, message) => {
            if (this.config.enableCheer) {
                this.queueAlert(userstate.username, `cheered ${userstate.bits} bits!`, userstate['display-name']);
            }
        });
    }

    async queueAlert(username, message, displayName = null) {
        try {
            // Prevent too many alerts from overwhelming the screen
            if (this.activeAlerts.length >= 10) {
                ErrorHandler.debug('Too many active Polaroid alerts, skipping');
                return;
            }

            const profileImageUrl = await this.getUserProfilePicture(username);
            const alert = new PolaroidAlert({
                username,
                displayName: displayName || username,
                message,
                profileImageUrl
            }, {
                duration: this.config.duration,
                activeAlerts: this.activeAlerts
            });
            
            this.activeAlerts.push(alert);
            await alert.show(this.container);
            
            // Remove from active alerts when done
            this.activeAlerts = this.activeAlerts.filter(a => a !== alert);
        } catch (error) {
            ErrorHandler.handle(error, 'queue_polaroid_alert', { username });
        }
    }

    async getUserProfilePicture(username) {
        if (this.userCache.has(username)) {
            return this.userCache.get(username);
        }

        try {
            if (this.twitchService.api) {
                const userInfo = await this.twitchService.api.fetchUserInfo(username);
                if (userInfo && userInfo.profile_image_url) {
                    this.userCache.set(username, userInfo.profile_image_url);
                    return userInfo.profile_image_url;
                }
            }
        } catch (error) {
            ErrorHandler.debug('Could not fetch user profile picture', { username });
        }

        return 'https://static-cdn.jtvnw.net/user-default-pictures-uv/ce577395-cb31-4e17-bf88-11582170c3d0-profile_image-300x300.png';
    }

    setupTestFunctions() {
        globalThis.testPolaroid = (type) => {
            const tests = {
                follow: { username: 'FollowerUser', message: 'just followed!', enabled: this.config.enableFollow },
                sub: { username: 'SubscriberUser', message: 'just subscribed!', enabled: this.config.enableSub },
                resub: { username: 'ResubUser', message: 'resubscribed for 12 months!', enabled: this.config.enableResub },
                gift: { username: 'LuckyViewer', message: 'got a gift sub from GenerousGiver!', enabled: this.config.enableGift },
                raid: { username: 'RaidLeader', message: 'is raiding with 42 viewers!', enabled: this.config.enableRaid },
                cheer: { username: 'BitDonator', message: 'cheered 1000 bits!', enabled: this.config.enableCheer }
            };

            const data = tests[type] || tests.sub;
            
            if (data.enabled) {
                this.queueAlert(data.username, data.message);
            } else {
                ErrorHandler.info(`Test alert for ${type} skipped (disabled in settings)`);
            }
        };
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const manager = new PolaroidManager();
        manager.init();
    });
} else {
    const manager = new PolaroidManager();
    manager.init();
}

