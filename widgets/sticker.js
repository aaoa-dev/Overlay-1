/**
 * Sticker Overlay
 * Interactive sticker effect triggered by chat messages/commands
 */

import { TwitchService } from '../src/services/TwitchService.js';
import { MessageHandler } from '../src/handlers/MessageHandler.js';
import { StorageService } from '../src/services/StorageService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

class StickerOverlay {
    constructor() {
        this.twitchService = new TwitchService();
        this.messageHandler = null;
        this.settings = this.loadSettings();
        this.activeStickers = [];
        this.imageCache = new Map();
        
        // DOM elements
        this.stickersContainer = document.getElementById('stickers-container');
        this.settingsPanel = document.getElementById('settings-panel');
        this.settingsBtn = document.getElementById('settings-btn');
        this.obsControl = document.querySelector('.obs-control');
        
        // SVG filter elements
        this.pointLight = document.querySelector('fePointLight');
        this.pointLightFlipped = document.getElementById('fePointLightFlipped');
        
        this.init();
    }

    /**
     * Initialize the overlay
     */
    async init() {
        try {
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize Twitch connection
            await this.initTwitch();
            
            // Preload images
            await this.preloadImages();
            
            ErrorHandler.info('Sticker overlay initialized');
        } catch (error) {
            ErrorHandler.handle(error, 'sticker_overlay_init');
        }
    }

    /**
     * Initialize Twitch service and message handler
     */
    async initTwitch() {
        try {
            await this.twitchService.initialize();
            
            if (!this.twitchService.client) {
                throw new Error('Failed to initialize Twitch client');
            }

            // Create message handler
            this.messageHandler = new MessageHandler(this.twitchService);
            
            // Register sticker handler
            this.messageHandler.registerHandler('sticker', 
                (channel, tags, message) => this.handleChatMessage(channel, tags, message),
                { priority: 10 }
            );
            
            // Start listening
            this.messageHandler.start();
            
            ErrorHandler.info('Twitch connection established');
        } catch (error) {
            ErrorHandler.handle(error, 'twitch_init');
        }
    }

    /**
     * Handle incoming chat messages
     */
    handleChatMessage(channel, tags, message) {
        if (!this.settings.rules || this.settings.rules.length === 0) return;
        
        const messageText = message.trim().toLowerCase();
        const isCommand = message.startsWith('!') || message.startsWith('/');
        
        for (const rule of this.settings.rules) {
            if (!rule.trigger) continue;
            
            const triggerText = rule.trigger.toLowerCase();
            const triggerIsCommand = triggerText.startsWith('!') || triggerText.startsWith('/');
            
            let shouldTrigger = false;
            if (triggerIsCommand) {
                // Exact match for commands
                shouldTrigger = isCommand && messageText === triggerText;
            } else {
                // Inclusion match for regular messages
                shouldTrigger = !isCommand && messageText.includes(triggerText);
            }
            
            if (shouldTrigger) {
                this.spawnSticker(rule);
            }
        }
    }

    /**
     * Spawn a new sticker
     */
    spawnSticker(rule = null) {
        // Check max stickers limit
        if (this.activeStickers.length >= this.settings.maxStickers) {
            // Remove oldest sticker
            this.removeSticker(this.activeStickers[0], true);
        }
        
        // Get image from specific rule or random if rule is null (test button)
        let imageData = null;
        if (rule && rule.images && rule.images.length > 0) {
            const randomIndex = Math.floor(Math.random() * rule.images.length);
            imageData = rule.images[randomIndex];
        } else if (!rule && this.settings.rules.length > 0) {
            // Test button logic: pick random rule
            const randomRule = this.settings.rules[Math.floor(Math.random() * this.settings.rules.length)];
            if (randomRule.images && randomRule.images.length > 0) {
                imageData = randomRule.images[Math.floor(Math.random() * randomRule.images.length)];
            }
        }
        
        if (!imageData) {
            ErrorHandler.warn('No images configured for this trigger');
            return;
        }
        
        // Create sticker element
        const sticker = this.createStickerElement(imageData.url, imageData.hasStroke);
        
        // Position randomly
        this.positionSticker(sticker);
        
        // Add to container
        this.stickersContainer.appendChild(sticker);
        this.activeStickers.push(sticker);
        
        // Add showing class for peel tease animation (after peel-on completes)
        setTimeout(() => {
            sticker.classList.add('showing');
        }, 1000);
        
        // Schedule removal (includes peel animation + removal time)
        setTimeout(() => {
            this.removeSticker(sticker);
        }, this.settings.duration * 1000);
    }

    /**
     * Create sticker DOM element
     */
    createStickerElement(imageUrl, hasStroke = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'sticker-wrapper';
        
        const container = document.createElement('div');
        container.className = 'sticker-container';
        
        // Main sticker
        const main = document.createElement('div');
        main.className = 'sticker-main';
        
        const lighting = document.createElement('div');
        lighting.className = 'sticker-lighting';
        
        const mainImg = document.createElement('img');
        mainImg.className = hasStroke ? 'sticker-image with-stroke' : 'sticker-image';
        mainImg.src = imageUrl;
        mainImg.draggable = false;
        mainImg.style.width = `${this.settings.stickerSize}px`;
        mainImg.oncontextmenu = () => false;
        
        lighting.appendChild(mainImg);
        main.appendChild(lighting);
        
        // Shadow
        const shadow = document.createElement('div');
        shadow.className = 'shadow';
        
        const shadowFlap = document.createElement('div');
        shadowFlap.className = 'flap';
        
        const shadowImg = document.createElement('img');
        shadowImg.className = hasStroke ? 'shadow-image with-stroke' : 'shadow-image';
        shadowImg.src = imageUrl;
        shadowImg.draggable = false;
        shadowImg.style.width = `${this.settings.stickerSize}px`;
        shadowImg.oncontextmenu = () => false;
        
        shadowFlap.appendChild(shadowImg);
        shadow.appendChild(shadowFlap);
        
        // Flap
        const flap = document.createElement('div');
        flap.className = 'flap';
        
        const flapLighting = document.createElement('div');
        flapLighting.className = 'flap-lighting';
        
        const flapImg = document.createElement('img');
        flapImg.className = hasStroke ? 'flap-image with-stroke' : 'flap-image';
        flapImg.src = imageUrl;
        flapImg.draggable = false;
        flapImg.style.width = `${this.settings.stickerSize}px`;
        flapImg.oncontextmenu = () => false;
        
        flapLighting.appendChild(flapImg);
        flap.appendChild(flapLighting);
        
        // Assemble
        container.appendChild(main);
        container.appendChild(shadow);
        container.appendChild(flap);
        wrapper.appendChild(container);
        
        return wrapper;
    }

    /**
     * Position sticker randomly on screen
     */
    positionSticker(sticker) {
        const margin = 100;
        const maxX = window.innerWidth - this.settings.stickerSize - margin;
        const maxY = window.innerHeight - this.settings.stickerSize - margin;
        
        const x = Math.random() * maxX + margin / 2;
        const y = Math.random() * maxY + margin / 2;
        
        sticker.style.left = `${x}px`;
        sticker.style.top = `${y}px`;
        
        // Random rotation
        const rotation = Math.random() * 60 - 30; // -30 to 30 degrees
        sticker.style.setProperty('--sticker-rotate', `${rotation}deg`);
    }

    /**
     * Remove sticker with peel-off animation
     */
    removeSticker(sticker, immediate = false) {
        if (!sticker || !sticker.parentElement) return;
        
        const index = this.activeStickers.indexOf(sticker);
        if (index > -1) {
            this.activeStickers.splice(index, 1);
        }
        
        if (immediate) {
            sticker.remove();
        } else {
            // Trigger peel-off animation
            sticker.classList.remove('showing');
            sticker.classList.add('removing');
            
            // Remove after animation completes
            setTimeout(() => {
                sticker.remove();
            }, 1200);
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Settings button
        this.settingsBtn.addEventListener('click', () => {
            this.openSettings();
        });
        
        // Close settings
        document.getElementById('close-settings').addEventListener('click', () => {
            this.closeSettings();
        });
        
        // Add rule button
        document.getElementById('add-rule-btn').addEventListener('click', () => {
            this.addRuleUI();
        });
        
        // Save settings
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Test sticker
        document.getElementById('test-sticker').addEventListener('click', () => {
            this.spawnSticker();
        });
        
        // Export settings
        document.getElementById('export-settings').addEventListener('click', () => {
            this.exportSettings();
        });
        
        // Import settings
        document.getElementById('import-settings').addEventListener('click', () => {
            this.importSettings();
        });
        
        // Initialize UI state
        this.updateSettingsUI();
    }

    /**
     * Add a rule UI element
     */
    addRuleUI(ruleData = null) {
        const rulesList = document.getElementById('rules-list');
        const ruleId = ruleData ? ruleData.id : Date.now();
        
        const ruleItem = document.createElement('div');
        ruleItem.className = 'rule-item';
        ruleItem.dataset.id = ruleId;
        
        ruleItem.innerHTML = `
            <div class="rule-header">
                <div class="trigger-input-wrapper">
                    <input type="text" class="rule-trigger" placeholder="Trigger word or !command" value="${ruleData ? ruleData.trigger : ''}">
                </div>
                <button class="btn-remove-rule" title="Remove Rule">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            <div class="rule-images-list">
                <!-- Images will be injected here -->
            </div>
            <button class="btn-add-image">
                <i data-lucide="plus" class="w-3 h-3"></i>
                Add Image
            </button>
        `;
        
        rulesList.appendChild(ruleItem);
        lucide.createIcons();
        
        // Remove rule event
        ruleItem.querySelector('.btn-remove-rule').addEventListener('click', () => {
            ruleItem.remove();
        });
        
        // Add image to rule event
        ruleItem.querySelector('.btn-add-image').addEventListener('click', () => {
            this.addImageToRuleUI(ruleItem);
        });
        
        // Populate existing images if any
        if (ruleData && ruleData.images) {
            ruleData.images.forEach(img => {
                this.addImageItemToRule(ruleItem, img.url, img.hasStroke);
            });
        }
    }

    /**
     * Add image to rule via modal
     */
    addImageToRuleUI(ruleItem) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
        `;
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = `
            background: #1a1a1a;
            padding: 32px;
            border-radius: 24px;
            max-width: 450px;
            width: 90%;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        `;
        
        content.innerHTML = `
            <h3 style="color: white; margin-bottom: 24px; font-size: 1.25rem; font-weight: 700;">Add Sticker Image</h3>
            <div style="margin-bottom: 20px;">
                <label style="color: rgba(255, 255, 255, 0.5); display: block; margin-bottom: 8px; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Image URL</label>
                <input type="text" id="modal-image-url" placeholder="https://example.com/sticker.png" style="width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; color: white;">
            </div>
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px;">
                    <div style="flex: 1; height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
                    <span style="color: rgba(255, 255, 255, 0.3); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Or</span>
                    <div style="flex: 1; height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
                </div>
                <label style="color: rgba(255, 255, 255, 0.5); display: block; margin-bottom: 8px; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Upload from Disk</label>
                <input type="file" id="modal-image-upload" accept="image/*" style="width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.05); border: 1px dashed rgba(255, 255, 255, 0.2); border-radius: 12px; color: white; cursor: pointer;">
                <div id="modal-preview" style="margin-top: 12px; display: flex; justify-content: center;"></div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button id="modal-add" class="btn btn-primary" style="flex: 1; margin-bottom: 0;">Add Image</button>
                <button id="modal-cancel" class="btn btn-secondary" style="flex: 1;">Cancel</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Modal logic
        const urlInputField = content.querySelector('#modal-image-url');
        const fileInput = content.querySelector('#modal-image-upload');
        const preview = content.querySelector('#modal-preview');
        
        let uploadedDataUrl = null;
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                uploadedDataUrl = event.target.result;
                preview.innerHTML = `<img src="${uploadedDataUrl}" style="max-height: 120px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">`;
                // Clear URL input when file is uploaded
                urlInputField.value = '';
            };
            reader.readAsDataURL(file);
        });
        
        // Clear preview when URL is entered
        urlInputField.addEventListener('input', () => {
            if (urlInputField.value.trim()) {
                uploadedDataUrl = null;
                preview.innerHTML = '';
                fileInput.value = '';
            }
        });
        
        content.querySelector('#modal-add').addEventListener('click', () => {
            // Prioritize uploaded file, then URL
            const imageUrl = uploadedDataUrl || urlInputField.value.trim();
            
            if (imageUrl) {
                // Default hasStroke to true
                this.addImageItemToRule(ruleItem, imageUrl, true);
                modal.remove();
            }
        });
        
        content.querySelector('#modal-cancel').addEventListener('click', () => {
            modal.remove();
        });
    }

    /**
     * Add image item to a rule's list
     */
    addImageItemToRule(ruleItem, imageUrl, hasStroke) {
        const imagesList = ruleItem.querySelector('.rule-images-list');
        const item = document.createElement('div');
        item.className = 'rule-image-item';
        item.dataset.url = imageUrl;
        item.dataset.hasStroke = hasStroke;
        
        item.innerHTML = `
            <img src="${imageUrl}" class="rule-image-thumb">
            <div class="rule-image-actions">
                <label class="image-stroke-toggle" title="White Border">
                    <input type="checkbox" ${hasStroke ? 'checked' : ''}>
                    <i data-lucide="frame" class="w-3 h-3"></i>
                </label>
                <button class="btn-remove-image" title="Remove Image">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        imagesList.appendChild(item);
        lucide.createIcons();
        
        // Stroke toggle event
        item.querySelector('.image-stroke-toggle input').addEventListener('change', (e) => {
            item.dataset.hasStroke = e.target.checked;
        });
        
        // Remove image event
        item.querySelector('.btn-remove-image').addEventListener('click', () => {
            item.remove();
        });
    }

    /**
     * Update settings UI from current settings
     */
    updateSettingsUI() {
        document.getElementById('sticker-duration').value = this.settings.duration;
        document.getElementById('sticker-size').value = this.settings.stickerSize;
        document.getElementById('max-stickers').value = this.settings.maxStickers;
        
        const rulesList = document.getElementById('rules-list');
        rulesList.innerHTML = '';
        
        if (this.settings.rules && this.settings.rules.length > 0) {
            this.settings.rules.forEach(rule => {
                this.addRuleUI(rule);
            });
        }
    }

    /**
     * Save settings
     */
    saveSettings() {
        const duration = parseInt(document.getElementById('sticker-duration').value);
        const stickerSize = parseInt(document.getElementById('sticker-size').value);
        const maxStickers = parseInt(document.getElementById('max-stickers').value);
        
        const rules = [];
        const ruleItems = document.querySelectorAll('.rule-item');
        
        ruleItems.forEach(item => {
            const trigger = item.querySelector('.rule-trigger').value.trim();
            const imageItems = item.querySelectorAll('.rule-image-item');
            const images = Array.from(imageItems).map(img => ({
                url: img.dataset.url,
                hasStroke: img.dataset.hasStroke === 'true'
            }));
            
            if (trigger && images.length > 0) {
                rules.push({
                    id: item.dataset.id,
                    trigger,
                    images
                });
            }
        });
        
        this.settings = {
            duration,
            stickerSize,
            maxStickers,
            rules
        };
        
        this.saveSettingsToStorage();
        this.preloadImages();
        
        // Show feedback
        const saveBtn = document.getElementById('save-settings');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Configuration Saved!';
        saveBtn.style.background = '#4caf50';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '';
        }, 2000);
        
        this.closeSettings();
    }

    /**
     * Preload images for better performance
     */
    async preloadImages() {
        const urls = new Set();
        if (this.settings.rules) {
            this.settings.rules.forEach(rule => {
                rule.images.forEach(img => urls.add(img.url));
            });
        }
        
        for (const url of urls) {
            if (!url || this.imageCache.has(url)) continue;
            
            try {
                const img = new Image();
                img.src = url;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                this.imageCache.set(url, img);
            } catch (error) {
                ErrorHandler.warn(`Failed to preload image: ${url}`);
            }
        }
    }

    /**
     * Load settings from storage
     */
    loadSettings() {
        const defaultSettings = {
            duration: 5,
            stickerSize: 200,
            maxStickers: 10,
            rules: [
                {
                    id: 'default',
                    trigger: '!sticker',
                    images: [
                        {
                            url: 'data:image/svg+xml,%3Csvg width=\'206\' height=\'182\' viewBox=\'0 0 206 182\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M161.727 42L162.582 42.0107C166.857 42.116 171.078 43.0092 175.033 44.6475C179.252 46.395 183.086 48.9555 186.315 52.1846C189.544 55.4136 192.105 59.2479 193.853 63.4668C195.6 67.6856 196.5 72.207 196.5 76.7734V122.922H179.407V139.984H133.259V139.983C128.691 139.984 124.168 139.087 119.947 137.34C115.727 135.592 111.892 133.03 108.662 129.8C105.432 126.57 102.871 122.735 101.123 118.515C99.3755 114.294 98.4765 109.771 98.4775 105.203V59.0625H115.578V42H161.727ZM34.3604 53.375L35.4111 54.7139L70.0625 98.8467V53.375H94.1172V123.768C94.1172 138.437 75.5934 144.84 66.5332 133.309V133.308L8.24707 59.082L7.5 58.1309V53.375H34.3604ZM139.562 115.922H172.445V83.0322L139.562 115.922ZM122.54 98.9072L155.385 66.0625H122.54V98.9072Z\' fill=\'black\' stroke=\'white\' stroke-width=\'7\' /%3E%3C/svg%3E',
                            hasStroke: true
                        }
                    ]
                }
            ]
        };
        
        try {
            const stored = localStorage.getItem('stickerOverlaySettings');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Simple migration for old format
                if (!parsed.rules && (parsed.singleImage || parsed.imageList)) {
                    const migratedRule = {
                        id: 'migrated',
                        trigger: parsed.triggerValue || '!sticker',
                        images: []
                    };
                    
                    if (parsed.randomImages && parsed.imageList) {
                        migratedRule.images = parsed.imageList.map(img => 
                            typeof img === 'string' ? { url: img, hasStroke: false } : img
                        );
                    } else if (parsed.singleImage) {
                        migratedRule.images = [{ url: parsed.singleImage, hasStroke: parsed.singleImageStroke || false }];
                    }
                    
                    parsed.rules = [migratedRule];
                }
                return { ...defaultSettings, ...parsed };
            }
        } catch (error) {
            ErrorHandler.warn('Failed to load settings from storage');
        }
        
        return defaultSettings;
    }

    /**
     * Save settings to storage
     */
    saveSettingsToStorage() {
        try {
            localStorage.setItem('stickerOverlaySettings', JSON.stringify(this.settings));
        } catch (error) {
            ErrorHandler.warn('Failed to save settings to storage');
        }
    }

    /**
     * Open settings panel
     */
    openSettings() {
        this.settingsPanel.classList.add('open');
        this.obsControl.classList.add('active');
    }

    /**
     * Close settings panel
     */
    closeSettings() {
        this.settingsPanel.classList.remove('open');
        this.obsControl.classList.remove('active');
    }

    /**
     * Export settings to JSON file
     */
    exportSettings() {
        try {
            const settingsJSON = JSON.stringify(this.settings, null, 2);
            const blob = new Blob([settingsJSON], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `sticker-overlay-settings-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ErrorHandler.info('Settings exported successfully');
        } catch (error) {
            ErrorHandler.handle(error, 'export_settings');
        }
    }

    /**
     * Import settings from JSON file
     */
    importSettings() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const text = await file.text();
                    const imported = JSON.parse(text);
                    
                    // Validate basic structure
                    if (!imported.rules || !Array.isArray(imported.rules)) {
                        throw new Error('Invalid settings file format');
                    }
                    
                    // Update settings
                    this.settings = {
                        duration: imported.duration || 5,
                        stickerSize: imported.stickerSize || 200,
                        maxStickers: imported.maxStickers || 10,
                        rules: imported.rules
                    };
                    
                    // Save to localStorage
                    this.saveSettingsToStorage();
                    
                    // Update UI
                    this.updateSettingsUI();
                    
                    // Preload new images
                    await this.preloadImages();
                    
                    ErrorHandler.info('Settings imported successfully');
                    
                    // Show feedback
                    const importBtn = document.getElementById('import-settings');
                    const originalHTML = importBtn.innerHTML;
                    importBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Imported!';
                    importBtn.style.background = '#4caf50';
                    
                    setTimeout(() => {
                        importBtn.innerHTML = originalHTML;
                        importBtn.style.background = '';
                        lucide.createIcons();
                    }, 2000);
                } catch (error) {
                    ErrorHandler.handle(error, 'import_settings_parse');
                    alert('Failed to import settings. Please check the file format.');
                }
            };
            
            input.click();
        } catch (error) {
            ErrorHandler.handle(error, 'import_settings');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new StickerOverlay();
    });
} else {
    new StickerOverlay();
}
