/**
 * Sound Board Overlay & Management
 * Plays audio tracks based on chat keywords and commands
 * Handles both overlay display and configuration UI
 */

import { TwitchService } from '../src/services/TwitchService.js';
import { MessageHandler } from '../src/handlers/MessageHandler.js';
import { StorageService } from '../src/services/StorageService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';
import { config } from '../src/config.js';

class SoundBoard {
    constructor() {
        this.cooldowns = new Map();
        this.isOverlay = window.location.search.includes('overlay=true');
        
        // Load config: Storage > Default Config
        this.soundBoardConfig = StorageService.get(StorageService.KEYS.SOUND_BOARD_CONFIG) || 
                               config.settings.SOUND_BOARD || {
            enabled: true,
            volume: 0.5,
            triggers: []
        };

        if (this.isOverlay) {
            document.body.classList.add('overlay-mode');
        }

        ErrorHandler.debug('SoundBoard initialized', { 
            isOverlay: this.isOverlay, 
            config: this.soundBoardConfig 
        });
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.isOverlay) {
            await this.initOverlay();
        } else {
            this.initManagementUI();
        }
    }

    /** --- Overlay Logic --- **/

    async initOverlay() {
        if (!this.soundBoardConfig.enabled) {
            this.updateOverlayStatus('Disabled', 'error');
            return;
        }

        try {
            this.updateOverlayStatus('Connecting...', 'info');

            const twitch = new TwitchService();
            await twitch.initialize({ debug: false });

            const messageHandler = new MessageHandler(twitch);
            messageHandler.registerHandler('sound_triggers', async (channel, tags, message) => {
                this.handleMessage(message);
            });

            messageHandler.start();
            this.updateOverlayStatus('Connected', 'success');

        } catch (error) {
            ErrorHandler.handle(error, 'sound_board_init');
            this.updateOverlayStatus('Error', 'error');
        }
    }

    handleMessage(message) {
        if (!message || !this.soundBoardConfig.enabled) return;

        const msg = message.toLowerCase().trim();
        const words = msg.split(/\s+/);
        
        for (const trigger of this.soundBoardConfig.triggers) {
            const { pattern, sound, type, cooldown } = trigger;
            if (!pattern || !sound) continue;

            const normalizedPattern = pattern.toLowerCase().trim();
            let matched = false;

            if (type === 'command') {
                matched = words[0] === normalizedPattern;
            } else {
                matched = msg.includes(normalizedPattern);
            }

            if (matched) {
                this.playSound(sound, cooldown, pattern, trigger.volume);
            }
        }
    }

    playSound(soundUrl, cooldown, patternId, triggerVolume = null) {
        const now = Date.now();
        const lastPlayed = this.cooldowns.get(patternId) || 0;

        if (cooldown && now - lastPlayed < cooldown) return;

        try {
            const audio = new Audio(soundUrl);
            
            // Priority: Trigger Volume > Global Volume > 0.5
            const finalVolume = triggerVolume !== null ? parseFloat(triggerVolume) : 
                               (this.soundBoardConfig.volume !== undefined ? parseFloat(this.soundBoardConfig.volume) : 0.5);
            
            audio.volume = Math.max(0, Math.min(1, finalVolume));
            
            audio.play().catch(error => {
                if (error.name === 'NotAllowedError') {
                    this.updateOverlayStatus('Click required', 'error');
                }
            });

            if (cooldown) this.cooldowns.set(patternId, now);
        } catch (error) {
            console.error('Playback failed', error);
        }
    }

    updateOverlayStatus(text, type) {
        const el = document.getElementById('overlay-status');
        if (!el) return;
        el.textContent = `Sound Board: ${text}`;
        if (type === 'success') setTimeout(() => el.style.opacity = '0', 3000);
        else el.style.opacity = '1';
    }

    /** --- Management UI Logic --- **/

    initManagementUI() {
        const listEl = document.getElementById('trigger-list');
        const addBtn = document.getElementById('add-trigger');
        const saveBtn = document.getElementById('save-config');
        const volInput = document.getElementById('global-volume');
        const enabledInput = document.getElementById('board-enabled');

        // Set global values
        volInput.value = this.soundBoardConfig.volume;
        enabledInput.value = this.soundBoardConfig.enabled.toString();

        // Render existing triggers
        this.soundBoardConfig.triggers.forEach(t => this.renderTriggerItem(t));

        addBtn.onclick = () => this.renderTriggerItem();
        
        saveBtn.onclick = () => {
            const triggers = [];
            document.querySelectorAll('.trigger-item').forEach(item => {
                const pattern = item.querySelector('.pattern-in').value;
                const sound = item.querySelector('.sound-in').value;
                if (pattern && sound) {
                    triggers.push({
                        pattern,
                        sound,
                        type: item.querySelector('.type-in').value,
                        cooldown: parseInt(item.querySelector('.cooldown-in').value) || 0,
                        volume: parseFloat(item.querySelector('.volume-in').value)
                    });
                }
            });

            this.soundBoardConfig = {
                enabled: enabledInput.value === 'true',
                volume: parseFloat(volInput.value),
                triggers
            };

            StorageService.set(StorageService.KEYS.SOUND_BOARD_CONFIG, this.soundBoardConfig);
            this.showToast('Configuration saved!', 'success');
        };
    }

    renderTriggerItem(data = { pattern: '', sound: '', type: 'command', cooldown: 1000, volume: 1.0 }) {
        const listEl = document.getElementById('trigger-list');
        const div = document.createElement('div');
        div.className = 'trigger-item';
        
        // Ensure volume has a default
        const vol = data.volume !== undefined ? data.volume : 1.0;

        div.innerHTML = `
            <div>
                <label>Trigger</label>
                <input type="text" class="pattern-in" value="${data.pattern}" placeholder="!horn">
            </div>
            <div>
                <label>Sound Path/URL</label>
                <input type="text" class="sound-in" value="${data.sound}" placeholder="C:/sounds/file.mp3">
            </div>
            <div>
                <label>Type</label>
                <select class="type-in">
                    <option value="command" ${data.type === 'command' ? 'selected' : ''}>Cmd</option>
                    <option value="keyword" ${data.type === 'keyword' ? 'selected' : ''}>Key</option>
                </select>
            </div>
            <div>
                <label>CD (ms)</label>
                <input type="number" class="cooldown-in" value="${data.cooldown}" step="100">
            </div>
            <div>
                <label class="volume-label">Volume (${Math.round(vol * 100)}%)</label>
                <input type="range" class="volume-in" value="${vol}" min="0" max="1" step="0.05">
            </div>
            <div>
                <label>Test</label>
                <button class="btn btn-secondary test-sound" style="width: 100%;">Play</button>
            </div>
            <button class="btn btn-danger remove-trigger" style="margin-bottom: 4px; height: 38px;">×</button>
        `;

        // Volume label update
        const volInput = div.querySelector('.volume-in');
        const volLabel = div.querySelector('.volume-label');
        volInput.oninput = (e) => {
            volLabel.textContent = `Volume (${Math.round(e.target.value * 100)}%)`;
        };

        // Test button
        div.querySelector('.test-sound').onclick = () => {
            const soundUrl = div.querySelector('.sound-in').value;
            const volume = parseFloat(volInput.value);
            if (soundUrl) {
                this.playSound(soundUrl, 0, 'test', volume);
            } else {
                this.showToast('Please enter a sound path first', 'error');
            }
        };

        div.querySelector('.remove-trigger').onclick = () => div.remove();
        listEl.appendChild(div);
    }

    showToast(msg, type) {
        const toast = document.getElementById('status');
        toast.textContent = msg;
        toast.style.display = 'block';
        toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
}

// Initialize
const app = new SoundBoard();
app.init();

// Auto-unlock audio on first click
document.body.addEventListener('click', () => {
    // Just a dummy play to unlock audio context
    const a = new Audio();
    a.play().catch(() => {});
}, { once: true });
