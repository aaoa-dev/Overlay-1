import { GoalWidget } from './shared/GoalWidget.js';

/**
 * Minimal Goal Widget UI
 * Compact number display using shared GoalWidget backend
 */
class MinimalGoalUI {
    constructor() {
        this.container = document.getElementById('goal-container');
        this.labelElement = document.getElementById('label');
        this.valueElement = document.getElementById('value');
        
        // Settings elements
        this.settingsPanel = document.getElementById('settings-panel');
        this.toggleBtn = document.getElementById('toggle-settings');
        this.resetBtn = document.getElementById('reset-settings');
        this.copyBtn = document.getElementById('copy-obs-url');
        
        this.inputs = {
            type: document.getElementById('goal-type'),
            target: document.getElementById('goal-target-value'),
            range: document.getElementById('goal-range'),
            label: document.getElementById('custom-label'),
            color: document.getElementById('color-picker'),
            size: document.getElementById('size-slider'),
            theme: document.getElementById('theme-select')
        };
        
        // Create shared goal widget backend
        this.goalWidget = new GoalWidget({
            onUpdate: (data) => this.updateDisplay(data),
            onMilestone: () => this.playMilestoneAnimation()
        });
        
        this.isSettingsMode = this.goalWidget.isSettingsMode;
        
        if (this.isSettingsMode) {
            this.initSettingsPanel();
        }
        
        this.applyStyles();
        this.goalWidget.init();
    }

    updateDisplay(data) {
        let text = data.current;
        if (data.target) {
            text = `${data.current}/${data.target}`;
        }
        
        this.valueElement.textContent = text;
        
        // Show/hide label based on config
        if (data.config.showLabel && data.label) {
            this.labelElement.textContent = data.label;
            this.labelElement.style.display = 'block';
        } else {
            this.labelElement.style.display = 'none';
        }
    }

    playMilestoneAnimation() {
        this.valueElement.classList.add('pulse');
        setTimeout(() => this.valueElement.classList.remove('pulse'), 500);
    }

    applyStyles() {
        const config = this.goalWidget.config;
        
        this.container.style.fontSize = `${config.scale / 10}vw`;
        this.valueElement.style.color = config.color;
        
        // Reset and apply theme classes
        this.container.className = '';
        if (config.theme) {
            this.container.classList.add(`theme-${config.theme}`);
        }
    }

    initSettingsPanel() {
        this.goalWidget.loadSettings('goalMinimalSettings');
        this.setupSettingsListeners();
        this.updateSettingsUI();
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

        // Listen for input changes
        this.inputs.type?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('goalType', e.target.value);
            this.goalWidget.saveSettings('goalMinimalSettings');
        });

        this.inputs.target?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('goalTarget', parseInt(e.target.value) || 100);
            this.goalWidget.saveSettings('goalMinimalSettings');
        });

        this.inputs.range?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('goalRange', e.target.value);
            this.goalWidget.saveSettings('goalMinimalSettings');
        });

        this.inputs.label?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('customLabel', e.target.value);
            this.goalWidget.saveSettings('goalMinimalSettings');
        });

        this.inputs.color?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('color', e.target.value);
            document.getElementById('color-value').textContent = e.target.value.toUpperCase();
            this.applyStyles();
            this.goalWidget.saveSettings('goalMinimalSettings');
        });

        this.inputs.size?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('scale', parseInt(e.target.value) * 10);
            document.getElementById('size-value').textContent = `${e.target.value}vw`;
            this.applyStyles();
            this.goalWidget.saveSettings('goalMinimalSettings');
        });

        this.inputs.theme?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('theme', e.target.value);
            this.applyStyles();
            this.goalWidget.saveSettings('goalMinimalSettings');
        });

        // Display toggles
        document.getElementById('show-label')?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('showLabel', e.target.checked);
            this.goalWidget.saveSettings('goalMinimalSettings');
        });

        document.getElementById('show-range')?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('showRange', e.target.checked);
            this.goalWidget.saveSettings('goalMinimalSettings');
        });
    }

    updateSettingsUI() {
        const config = this.goalWidget.config;
        
        this.inputs.type.value = config.goalType;
        this.inputs.target.value = config.goalTarget;
        this.inputs.range.value = config.goalRange;
        this.inputs.label.value = config.customLabel;
        this.inputs.color.value = config.color;
        this.inputs.size.value = config.scale / 10;
        this.inputs.theme.value = config.theme;
        
        document.getElementById('color-value').textContent = config.color.toUpperCase();
        document.getElementById('size-value').textContent = `${config.scale / 10}vw`;
        
        // Display toggles
        document.getElementById('show-label').checked = config.showLabel;
        document.getElementById('show-range').checked = config.showRange;
    }

    async copyOBSUrl() {
        try {
            const url = await this.goalWidget.copyOBSUrl();
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

new MinimalGoalUI();
