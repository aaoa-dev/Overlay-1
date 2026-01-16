import { GoalWidget } from './shared/GoalWidget.js';

/**
 * Progress Goal Widget UI
 * Full progress bar display using shared GoalWidget backend
 */
class ProgressGoalUI {
    constructor() {
        this.elements = {
            container: document.getElementById('goal-container'),
            title: document.getElementById('goal-title'),
            current: document.getElementById('goal-current'),
            target: document.getElementById('goal-target'),
            progressBar: document.getElementById('goal-progress-bar'),
            percentage: document.getElementById('goal-percentage')
        };
        
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
            scale: document.getElementById('scale-slider'),
            opacity: document.getElementById('opacity-slider')
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
        // Update values
        this.elements.title.textContent = `🎯 ${data.label}`;
        this.elements.current.textContent = data.current;
        this.elements.target.textContent = data.target;
        this.elements.progressBar.style.width = `${data.percentageExact}%`;
        this.elements.percentage.textContent = `${data.percentage}%`;
        
        // Show/hide elements based on config
        this.elements.title.parentElement.style.display = data.config.showLabel ? 'flex' : 'none';
        this.elements.current.parentElement.style.display = data.config.showNumbers ? 'flex' : 'none';
        this.elements.progressBar.parentElement.style.display = data.config.showProgressBar ? 'block' : 'none';
        this.elements.percentage.style.display = data.config.showPercentage ? 'block' : 'none';
    }

    playMilestoneAnimation() {
                this.elements.current.classList.add('milestone-reached');
                setTimeout(() => this.elements.current.classList.remove('milestone-reached'), 500);
            }
            
    applyStyles() {
        const config = this.goalWidget.config;
        this.elements.container.style.transform = `scale(${config.scale / 100})`;
        this.elements.container.style.opacity = config.opacity / 100;
    }

    initSettingsPanel() {
        this.goalWidget.loadSettings('goalProgressSettings');
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
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        this.inputs.target?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('goalTarget', parseInt(e.target.value) || 100);
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        this.inputs.range?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('goalRange', e.target.value);
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        this.inputs.label?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('customLabel', e.target.value.trim());
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        this.inputs.scale?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('scale', parseInt(e.target.value));
            document.getElementById('scale-value').textContent = `${e.target.value}%`;
            this.applyStyles();
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        this.inputs.opacity?.addEventListener('input', (e) => {
            this.goalWidget.updateConfig('opacity', parseInt(e.target.value));
            document.getElementById('opacity-value').textContent = `${e.target.value}%`;
            this.applyStyles();
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        // Display toggles
        document.getElementById('show-label')?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('showLabel', e.target.checked);
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        document.getElementById('show-numbers')?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('showNumbers', e.target.checked);
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        document.getElementById('show-progress-bar')?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('showProgressBar', e.target.checked);
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        document.getElementById('show-percentage')?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('showPercentage', e.target.checked);
            this.goalWidget.saveSettings('goalProgressSettings');
        });

        document.getElementById('show-range')?.addEventListener('change', (e) => {
            this.goalWidget.updateConfig('showRange', e.target.checked);
            this.goalWidget.saveSettings('goalProgressSettings');
        });
    }

    updateSettingsUI() {
        const config = this.goalWidget.config;
        
        this.inputs.type.value = config.goalType;
        this.inputs.target.value = config.goalTarget;
        this.inputs.range.value = config.goalRange;
        this.inputs.label.value = config.customLabel;
        this.inputs.scale.value = config.scale;
        this.inputs.opacity.value = config.opacity;
        
        document.getElementById('scale-value').textContent = `${config.scale}%`;
        document.getElementById('opacity-value').textContent = `${config.opacity}%`;
        
        // Display toggles
        document.getElementById('show-label').checked = config.showLabel;
        document.getElementById('show-numbers').checked = config.showNumbers;
        document.getElementById('show-progress-bar').checked = config.showProgressBar;
        document.getElementById('show-percentage').checked = config.showPercentage;
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

new ProgressGoalUI();
