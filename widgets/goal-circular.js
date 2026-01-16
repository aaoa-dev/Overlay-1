import { GoalWidget } from './shared/GoalWidget.js';

/**
 * Circular Goal Widget UI
 * Minimalist circular badge with centered value using shared GoalWidget backend
 */
class CircularGoalUI {
    constructor() {
        this.elements = {
            container: document.getElementById('goal-container'),
            wrapper: document.querySelector('.circle-wrapper'),
            background: document.getElementById('circle-background'),
            centerValue: document.getElementById('center-value'),
            circularText: document.getElementById('circular-text'),
            circularTextSecondary: document.getElementById('circular-text-secondary')
        };
        
        // Settings elements
        this.settingsPanel = document.getElementById('settings-panel');
        this.toggleBtn = document.getElementById('toggle-settings');
        this.resetBtn = document.getElementById('reset-settings');
        this.copyBtn = document.getElementById('copy-obs-url');
        this.testRotationBtn = document.getElementById('test-rotation');
        
        this.inputs = {
            type: document.getElementById('goal-type'),
            target: document.getElementById('goal-target-value'),
            range: document.getElementById('goal-range'),
            circularText: document.getElementById('circular-text-input'),
            circularTextSecondary: document.getElementById('circular-text-secondary-input'),
            showSecondaryText: document.getElementById('show-secondary-text'),
            gradient: document.getElementById('gradient-select'),
            centerColor: document.getElementById('center-color'),
            textColor: document.getElementById('text-color'),
            centerSize: document.getElementById('center-size-slider'),
            textSize: document.getElementById('text-size-slider'),
            size: document.getElementById('size-slider'),
            opacity: document.getElementById('opacity-slider')
        };
        
        // Initialize defaults
        this.extraConfig = {
            circularText: 'DAILY FOLLOWER GOAL',
            circularTextSecondary: 'TARGET: 100',
            showSecondaryText: true,
            gradient: 'purple',
            centerColor: '#ffffff',
            textColor: '#ffffff',
            centerSize: 5,
            textSize: 1.25,
            circleSize: 400
        };
        
        // Create shared goal widget backend
        this.goalWidget = new GoalWidget({
            onUpdate: (data) => this.updateDisplay(data),
            onMilestone: () => this.playMilestoneAnimation()
        });
        
        this.isSettingsMode = this.goalWidget.isSettingsMode;
        
        // Load saved settings or URL params
        this.loadConfigFromStorage();
        
        if (this.isSettingsMode) {
            this.initSettingsPanel();
        }
        
        this.applyStyles();
        this.applyInitialText();
        this.goalWidget.init();
        this.setupFollowListener();
    }

    updateDisplay(data) {
        // Update center value
        this.elements.centerValue.textContent = data.current;
        
        // Check if we should use custom or auto-generated text
        const isDefaultPrimaryText = this.extraConfig.circularText === 'DAILY FOLLOWER GOAL';
        const isDefaultSecondaryText = this.extraConfig.circularTextSecondary === 'TARGET: 100';
        
        // Update primary circular text
        if (isDefaultPrimaryText) {
            const autoText = this.generateCircularText(data);
            this.elements.circularText.textContent = autoText;
        } else {
            this.elements.circularText.textContent = this.extraConfig.circularText;
        }
        
        // Update secondary circular text
        if (this.extraConfig.showSecondaryText) {
            if (isDefaultSecondaryText) {
                this.elements.circularTextSecondary.textContent = `TARGET: ${data.target}`;
            } else {
                this.elements.circularTextSecondary.textContent = this.extraConfig.circularTextSecondary;
            }
        }
    }

    generateCircularText(data) {
        const type = data.config.goalType === 'followers' ? 'FOLLOWER' : 'SUBSCRIBER';
        const range = data.config.goalRange === 'day' ? 'DAILY' : 
                      data.config.goalRange === 'month' ? 'MONTHLY' :
                      data.config.goalRange === 'session' ? 'SESSION' : '';
        
        return range ? `${range} ${type} GOAL` : `${type} GOAL`;
    }

    playMilestoneAnimation() {
        this.elements.centerValue.classList.add('milestone-reached');
        setTimeout(() => this.elements.centerValue.classList.remove('milestone-reached'), 500);
    }

    playRotationAnimation() {
        this.elements.wrapper.classList.add('rotate-animate');
        setTimeout(() => this.elements.wrapper.classList.remove('rotate-animate'), 3000);
    }

    applyStyles() {
        const config = this.goalWidget.config;
        
        // Apply size and opacity
        const size = this.extraConfig.circleSize;
        this.elements.container.style.width = `${size}px`;
        this.elements.container.style.height = `${size}px`;
        this.elements.container.style.opacity = config.opacity / 100;
        
        // Apply gradient
        this.elements.background.className = `circle-background gradient-${this.extraConfig.gradient}`;
        
        // Apply colors
        this.elements.centerValue.style.color = this.extraConfig.centerColor;
        
        const textElements = document.querySelectorAll('.circular-text');
        textElements.forEach(el => {
            el.style.fill = this.extraConfig.textColor;
        });
        
        // Apply font sizes
        this.elements.centerValue.style.fontSize = `${this.extraConfig.centerSize}rem`;
        
        textElements.forEach(el => {
            el.style.fontSize = `${this.extraConfig.textSize}rem`;
        });
        
        // Show/hide secondary text
        const secondaryTextElement = document.querySelector('.circular-text-secondary');
        if (secondaryTextElement) {
            secondaryTextElement.style.display = this.extraConfig.showSecondaryText ? 'block' : 'none';
        }
    }

    applyInitialText() {
        // Apply saved text values immediately on load
        this.elements.circularText.textContent = this.extraConfig.circularText;
        this.elements.circularTextSecondary.textContent = this.extraConfig.circularTextSecondary;
    }

    setupFollowListener() {
        // Listen for follow events from Twitch
        if (this.goalWidget.twitch) {
            // Hook into Twitch follow events via StreamStatsService
            // Since TwitchService doesn't emit follow events directly, we'll detect them
            // by watching for follower count changes in the goal updates
            this.lastFollowerCount = null;
            
            // Listen to goal updates to detect new follows
            const originalUpdate = this.updateDisplay.bind(this);
            this.updateDisplay = (data) => {
                // Check if this is a follower goal and count increased
                if (data.config.goalType === 'followers' && this.lastFollowerCount !== null) {
                    if (data.current > this.lastFollowerCount) {
                        // New follower detected!
                        this.playRotationAnimation();
                    }
                }
                this.lastFollowerCount = data.current;
                originalUpdate(data);
            };
        }
    }

    loadConfigFromStorage() {
        // First, try to load from localStorage
        const saved = StorageService.get('goalCircularSettings');
        if (saved) {
            // Apply saved goal config
            Object.keys(saved).forEach(key => {
                if (key in this.goalWidget.config) {
                    this.goalWidget.config[key] = saved[key];
                }
                if (key in this.extraConfig) {
                    this.extraConfig[key] = saved[key];
                }
            });
        }
        
        // Then, override with URL params if present (for OBS embeds)
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('circularText')) this.extraConfig.circularText = urlParams.get('circularText');
        if (urlParams.has('circularTextSecondary')) this.extraConfig.circularTextSecondary = urlParams.get('circularTextSecondary');
        if (urlParams.has('showSecondaryText')) this.extraConfig.showSecondaryText = urlParams.get('showSecondaryText') !== 'false';
        if (urlParams.has('gradient')) this.extraConfig.gradient = urlParams.get('gradient');
        if (urlParams.has('centerColor')) this.extraConfig.centerColor = urlParams.get('centerColor');
        if (urlParams.has('textColor')) this.extraConfig.textColor = urlParams.get('textColor');
        if (urlParams.has('centerSize')) this.extraConfig.centerSize = parseFloat(urlParams.get('centerSize'));
        if (urlParams.has('textSize')) this.extraConfig.textSize = parseFloat(urlParams.get('textSize'));
        if (urlParams.has('circleSize')) this.extraConfig.circleSize = parseInt(urlParams.get('circleSize'));
    }

    initSettingsPanel() {
        this.setupSettingsListeners();
        this.updateSettingsUI();
    }

    saveSettings() {
        const combined = { ...this.goalWidget.config, ...this.extraConfig };
        StorageService.set('goalCircularSettings', combined);
    }

    setupSettingsListeners() {
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

        // Test rotation animation
        this.testRotationBtn?.addEventListener('click', () => {
            this.playRotationAnimation();
        });

        // Goal configuration
        this.inputs.type?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('goalType', e.target.value);
            this.saveSettings();
        });

        this.inputs.target?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('goalTarget', parseInt(e.target.value) || 100);
            this.saveSettings();
        });

        this.inputs.range?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('goalRange', e.target.value);
            this.saveSettings();
        });

        // Text content
        this.inputs.circularText?.addEventListener('input', (e) => {
            this.extraConfig.circularText = e.target.value.toUpperCase();
            this.elements.circularText.textContent = this.extraConfig.circularText;
            this.saveSettings();
        });

        this.inputs.circularTextSecondary?.addEventListener('input', (e) => {
            this.extraConfig.circularTextSecondary = e.target.value.toUpperCase();
            this.elements.circularTextSecondary.textContent = this.extraConfig.circularTextSecondary;
            this.saveSettings();
        });

        this.inputs.showSecondaryText?.addEventListener('change', (e) => {
            this.extraConfig.showSecondaryText = e.target.checked;
            this.applyStyles();
            this.saveSettings();
        });

        // Colors
        this.inputs.gradient?.addEventListener('change', (e) => {
            this.extraConfig.gradient = e.target.value;
            this.applyStyles();
            this.saveSettings();
        });

        this.inputs.centerColor?.addEventListener('input', (e) => {
            this.extraConfig.centerColor = e.target.value;
            document.getElementById('center-color-value').textContent = e.target.value.toUpperCase();
            this.applyStyles();
            this.saveSettings();
        });

        this.inputs.textColor?.addEventListener('input', (e) => {
            this.extraConfig.textColor = e.target.value;
            document.getElementById('text-color-value').textContent = e.target.value.toUpperCase();
            this.applyStyles();
            this.saveSettings();
        });

        // Typography
        this.inputs.centerSize?.addEventListener('input', (e) => {
            this.extraConfig.centerSize = parseFloat(e.target.value);
            document.getElementById('center-size-value').textContent = `${e.target.value}rem`;
            this.applyStyles();
            this.saveSettings();
        });

        this.inputs.textSize?.addEventListener('input', (e) => {
            this.extraConfig.textSize = parseFloat(e.target.value);
            document.getElementById('text-size-value').textContent = `${e.target.value}rem`;
            this.applyStyles();
            this.saveSettings();
        });

        // Size
        this.inputs.size?.addEventListener('input', (e) => {
            this.extraConfig.circleSize = parseInt(e.target.value);
            document.getElementById('size-value').textContent = `${e.target.value}px`;
            this.applyStyles();
            this.saveSettings();
        });

        this.inputs.opacity?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('opacity', parseInt(e.target.value));
            document.getElementById('opacity-value').textContent = `${e.target.value}%`;
            this.applyStyles();
            this.saveSettings();
        });
    }

    updateSettingsUI() {
        const config = this.goalWidget.config;
        
        this.inputs.type.value = config.goalType;
        this.inputs.target.value = config.goalTarget;
        this.inputs.range.value = config.goalRange;
        this.inputs.circularText.value = this.extraConfig.circularText;
        this.inputs.circularTextSecondary.value = this.extraConfig.circularTextSecondary;
        this.inputs.showSecondaryText.checked = this.extraConfig.showSecondaryText;
        this.inputs.gradient.value = this.extraConfig.gradient;
        this.inputs.centerColor.value = this.extraConfig.centerColor;
        this.inputs.textColor.value = this.extraConfig.textColor;
        this.inputs.centerSize.value = this.extraConfig.centerSize;
        this.inputs.textSize.value = this.extraConfig.textSize;
        this.inputs.size.value = this.extraConfig.circleSize;
        this.inputs.opacity.value = config.opacity;
        
        document.getElementById('center-color-value').textContent = this.extraConfig.centerColor.toUpperCase();
        document.getElementById('text-color-value').textContent = this.extraConfig.textColor.toUpperCase();
        document.getElementById('center-size-value').textContent = `${this.extraConfig.centerSize}rem`;
        document.getElementById('text-size-value').textContent = `${this.extraConfig.textSize}rem`;
        document.getElementById('size-value').textContent = `${this.extraConfig.circleSize}px`;
        document.getElementById('opacity-value').textContent = `${config.opacity}%`;
    }

    async copyOBSUrl() {
        try {
            const params = new URLSearchParams();
            
            // Add auth
            if (this.goalWidget.twitch && this.goalWidget.twitch.authConfig.password) {
                params.append('token', this.goalWidget.twitch.authConfig.password.replace('oauth:', ''));
            }
            if (this.goalWidget.twitch && this.goalWidget.twitch.authConfig.username) {
                params.append('username', this.goalWidget.twitch.authConfig.username);
                params.append('channel', this.goalWidget.twitch.authConfig.username);
            }
            if (this.goalWidget.twitch && this.goalWidget.twitch.authConfig.channelId) {
                params.append('channelId', this.goalWidget.twitch.authConfig.channelId);
            }
            
            // Add goal config
            Object.entries(this.goalWidget.config).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.append(key, value);
                }
            });
            
            // Add extra config
            Object.entries(this.extraConfig).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.append(key, value);
                }
            });
            
            const baseUrl = window.location.origin + window.location.pathname;
            const fullUrl = `${baseUrl}?${params.toString()}`;
            
            await navigator.clipboard.writeText(fullUrl);
            
            const originalHtml = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
            this.copyBtn.classList.remove('bg-primary', 'hover:shadow-primary/40');
            this.copyBtn.classList.add('bg-green-500', 'hover:shadow-green-500/40');
            setTimeout(() => {
                this.copyBtn.innerHTML = originalHtml;
                this.copyBtn.classList.remove('bg-green-500', 'hover:shadow-green-500/40');
                this.copyBtn.classList.add('bg-primary', 'hover:shadow-primary/40');
            }, 2000);
        } catch (error) {
            console.error('Failed to copy URL:', error);
        }
    }
}

// Import StorageService for settings
import { StorageService } from '../src/services/StorageService.js';

new CircularGoalUI();
