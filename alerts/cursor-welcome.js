/**
 * CursorWelcome Alert System
 * Features a Figma-style cursor that slides in and reveals user info on click
 */

import { TwitchService } from '../src/services/TwitchService.js';
import { StorageService } from '../src/services/StorageService.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';
import { MessageHandler } from '../src/handlers/MessageHandler.js';

class CursorWelcomeManager {
    constructor() {
        this.container = document.getElementById('cursorContainer') || document.body;
        this.userData = {};
        this.streamDate = null;
        this.activeCursors = new Set();
        this.animationStates = new Map(); // Track animation state per cursor
        this.spatialGrid = new Map(); // For collision detection optimization
        
        // Debouncing for localStorage writes
        this.saveDebounceTimer = null;
        this.saveDebounceDelay = 1000; // Save max once per second
        this.pendingSave = false;
        
        // Cache SVG template
        this.svgTemplate = document.getElementById('cursorSvgTemplate');
        
        this.loadUserData();
        this.startAnimationLoop();
    }

    /**
     * Load user visit data from StorageService
     */
    loadUserData() {
        try {
            this.userData = StorageService.get(StorageService.KEYS.USER_VISITS, {});
            this.streamDate = StorageService.get(StorageService.KEYS.STREAM_DATE) || new Date().toDateString();

            // Reset if new day (matching alerts.js logic)
            const today = new Date().toDateString();
            if (this.streamDate !== today) {
                this.resetStreamDay();
            }

            ErrorHandler.debug('CursorWelcome: User data loaded', {
                users: Object.keys(this.userData).length,
                date: this.streamDate
            });
        } catch (error) {
            ErrorHandler.handle(error, 'cursor_welcome_load_data');
        }
    }

    /**
     * Reset for new stream day
     */
    resetStreamDay() {
        const today = new Date().toDateString();
        this.streamDate = today;
        Object.keys(this.userData).forEach(username => {
            if (this.userData[username]) {
                this.userData[username].hasChattedThisStream = false;
            }
        });
        this.saveUserData();
    }

    /**
     * Save user visit data to StorageService (debounced)
     */
    saveUserData() {
        this.pendingSave = true;
        
        // Clear existing timer
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        // Schedule save
        this.saveDebounceTimer = setTimeout(() => {
            this.flushSave();
        }, this.saveDebounceDelay);
    }

    /**
     * Force immediate save to localStorage
     */
    flushSave() {
        if (!this.pendingSave) return;
        
        try {
            StorageService.set(StorageService.KEYS.USER_VISITS, this.userData);
            StorageService.set(StorageService.KEYS.STREAM_DATE, this.streamDate);
            this.pendingSave = false;
        } catch (error) {
            ErrorHandler.handle(error, 'cursor_welcome_save_data');
        }
    }

    /**
     * Get a random position with Safe Area and Optimized Collision Detection
     * Uses spatial grid for O(1) neighbor lookups instead of O(n)
     */
    getRandomPosition() {
        const cardWidth = 240;
        const cardHeight = 180;
        const padding = 60;
        
        const safeArea = {
            minX: padding,
            maxX: window.innerWidth - cardWidth - padding,
            minY: padding,
            maxY: window.innerHeight - cardHeight - padding
        };

        if (safeArea.maxX <= safeArea.minX) safeArea.maxX = window.innerWidth - padding;
        if (safeArea.maxY <= safeArea.minY) safeArea.maxY = window.innerHeight - padding;

        const maxAttempts = 10;
        const minDistance = 150;
        const gridSize = 200; // Spatial grid cell size

        for (let i = 0; i < maxAttempts; i++) {
            const candidate = {
                x: safeArea.minX + Math.random() * (safeArea.maxX - safeArea.minX),
                y: safeArea.minY + Math.random() * (safeArea.maxY - safeArea.minY)
            };

            // Check only nearby grid cells
            const gridX = Math.floor(candidate.x / gridSize);
            const gridY = Math.floor(candidate.y / gridSize);
            let tooClose = false;

            // Check current cell and 8 neighboring cells
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const cellKey = `${gridX + dx},${gridY + dy}`;
                    const cellCursors = this.spatialGrid.get(cellKey);
                    
                    if (cellCursors) {
                        for (const pos of cellCursors) {
                            const dist = Math.sqrt(
                                Math.pow(candidate.x - pos.x, 2) + 
                                Math.pow(candidate.y - pos.y, 2)
                            );
                            
                            if (dist < minDistance) {
                                tooClose = true;
                                break;
                            }
                        }
                    }
                    if (tooClose) break;
                }
                if (tooClose) break;
            }

            if (!tooClose) return candidate;
        }

        // Fallback: return any valid position
        return {
            x: safeArea.minX + Math.random() * (safeArea.maxX - safeArea.minX),
            y: safeArea.minY + Math.random() * (safeArea.maxY - safeArea.minY)
        };
    }

    /**
     * Add position to spatial grid for collision detection
     */
    addToSpatialGrid(container, x, y) {
        const gridSize = 200;
        const gridX = Math.floor(x / gridSize);
        const gridY = Math.floor(y / gridSize);
        const cellKey = `${gridX},${gridY}`;
        
        if (!this.spatialGrid.has(cellKey)) {
            this.spatialGrid.set(cellKey, []);
        }
        
        this.spatialGrid.get(cellKey).push({ x, y, container });
    }

    /**
     * Remove position from spatial grid
     */
    removeFromSpatialGrid(container) {
        for (const [key, cursors] of this.spatialGrid.entries()) {
            const index = cursors.findIndex(c => c.container === container);
            if (index !== -1) {
                cursors.splice(index, 1);
                if (cursors.length === 0) {
                    this.spatialGrid.delete(key);
                }
                break;
            }
        }
    }

    /**
     * Get a random starting point outside the viewport
     */
    getRandomStartPoint() {
        const sides = ['top', 'bottom', 'left', 'right'];
        const side = sides[Math.floor(Math.random() * sides.length)];
        const offset = 200;

        switch (side) {
            case 'top': return { x: Math.random() * window.innerWidth, y: -offset };
            case 'bottom': return { x: Math.random() * window.innerWidth, y: window.innerHeight + offset };
            case 'left': return { x: -offset, y: Math.random() * window.innerHeight };
            case 'right': return { x: window.innerWidth + offset, y: Math.random() * window.innerHeight };
        }
    }

    /**
     * Animation state machine - runs on requestAnimationFrame loop
     */
    startAnimationLoop() {
        const tick = () => {
            const now = Date.now();
            
            for (const [container, state] of this.animationStates.entries()) {
                if (!state) continue;
                
                switch (state.phase) {
                    case 'slide-in':
                        if (now >= state.nextPhaseTime) {
                            this.transitionToReveal(container, state);
                        }
                        break;
                    
                    case 'revealed':
                        if (now >= state.nextPhaseTime) {
                            this.transitionToExit(container, state);
                        }
                        break;
                    
                    case 'exiting':
                        if (now >= state.nextPhaseTime) {
                            this.transitionToFadeOut(container, state);
                        }
                        break;
                    
                    case 'fading':
                        if (now >= state.nextPhaseTime) {
                            this.removeContainer(container);
                        }
                        break;
                }
            }
            
            requestAnimationFrame(tick);
        };
        
        requestAnimationFrame(tick);
    }

    /**
     * Create and animate a cursor alert (optimized)
     */
    spawn(username, displayName, color, count) {
        const start = this.getRandomStartPoint();
        const end = this.getRandomPosition();
        const userColor = color || '#A259FF';

        const cursorContainer = document.createElement('div');
        cursorContainer.className = 'cursor-container';
        cursorContainer.style.left = `${start.x}px`;
        cursorContainer.style.top = `${start.y}px`;
        cursorContainer.style.setProperty('--user-color', userColor);

        // Clone SVG template instead of innerHTML
        const cursorVisual = document.createElement('div');
        cursorVisual.className = 'cursor-visual';
        
        const cursorInner = document.createElement('div');
        cursorInner.className = 'cursor-visual-inner';
        
        // Clone SVG from template
        const svg = this.svgTemplate.content.cloneNode(true);
        cursorInner.appendChild(svg);
        
        // Create bubble
        const bubble = document.createElement('div');
        bubble.className = 'cursor-bubble';
        bubble.textContent = displayName;
        cursorInner.appendChild(bubble);
        
        cursorVisual.appendChild(cursorInner);
        cursorContainer.appendChild(cursorVisual);
        
        // Create card
        const card = document.createElement('div');
        card.className = 'welcome-card';
        card.innerHTML = `
            <h3>${displayName}</h3>
            <p>${count === 1 ? 'Welcome to the stream!' : 'Welcome back!'}</p>
            <div class="visit-badge">Visit #${count}</div>
        `;
        cursorContainer.appendChild(card);

        // Cache DOM references
        const refs = { cursorVisual, cursorInner, card };

        this.container.appendChild(cursorContainer);
        this.activeCursors.add(cursorContainer);
        this.addToSpatialGrid(cursorContainer, end.x, end.y);

        // Initialize animation state
        const now = Date.now();
        this.animationStates.set(cursorContainer, {
            phase: 'slide-in',
            nextPhaseTime: now + 2500, // 2.4s slide + 100ms buffer
            endPosition: end,
            refs,
            startTime: now
        });

        // Start slide-in
        requestAnimationFrame(() => {
            setTimeout(() => {
                cursorContainer.style.left = `${end.x}px`;
                cursorContainer.style.top = `${end.y}px`;
            }, 50);
        });
    }

    /**
     * Transition to reveal phase (card appears, then cursor quickly exits)
     */
    transitionToReveal(container, state) {
        if (!this.activeCursors.has(container)) return;
        
        state.refs.card.classList.add('visible');
        state.phase = 'revealed';
        // Cursor exits shortly after card reveals (500ms pause to see the card appear)
        state.nextPhaseTime = Date.now() + 500;
    }

    /**
     * Transition to exit phase (cursor slides out, card stays)
     */
    transitionToExit(container, state) {
        if (!this.activeCursors.has(container)) return;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 1600;
        const exitX = Math.cos(angle) * distance;
        const exitY = Math.sin(angle) * distance;

        container.classList.add('cursor-exiting');
        
        state.refs.cursorVisual.style.transform = `translateX(${exitX}px)`;
        state.refs.cursorInner.style.transform = `translateY(${exitY}px)`;
        state.refs.cursorInner.style.opacity = '0';
        
        state.phase = 'exiting';
        // Card stays visible for 3-5 seconds after cursor exits
        state.nextPhaseTime = Date.now() + 2200 + (3000 + Math.random() * 2000);
    }

    /**
     * Transition to fade out phase (card fades out)
     */
    transitionToFadeOut(container, state) {
        if (!this.activeCursors.has(container)) return;
        
        state.refs.card.classList.add('fade-out');
        state.phase = 'fading';
        state.nextPhaseTime = Date.now() + 1200;
    }

    /**
     * Final removal of the entire container
     */
    removeContainer(container) {
        if (!this.activeCursors.has(container)) return;
        
        container.style.opacity = '0';
        
        setTimeout(() => {
            container.remove();
            this.activeCursors.delete(container);
            this.animationStates.delete(container);
            this.removeFromSpatialGrid(container);
        }, 1000);
    }

    /**
     * Handle incoming visit event
     */
    async handleVisit(username, displayName, color, tags) {
        try {
            if (!this.userData[username]) {
                this.userData[username] = {
                    count: 0,
                    lastUsed: 0,
                    hasChattedThisStream: false
                };
            }

            const user = this.userData[username];
            const now = Date.now();

            // Only trigger once per stream for normal messages
            // But if it's a welcome command, we check the 24h cooldown (matching alerts.js)
            const isCommand = tags.isCommand || false;
            
            if (!isCommand && user.hasChattedThisStream) return;
            
            if (isCommand) {
                const hoursSinceLastUse = (now - (user.lastUsed || 0)) / (1000 * 60 * 60);
                if (hoursSinceLastUse < 24) return;
            }

            user.hasChattedThisStream = true;
            user.count++;
            user.lastUsed = now;
            this.saveUserData();

            this.spawn(username, displayName, color, user.count);
        } catch (error) {
            ErrorHandler.handle(error, 'cursor_welcome_handle_visit', { username });
        }
    }
}

/**
 * Initialization logic
 */
async function init() {
    try {
        const twitchService = new TwitchService();
        await twitchService.initialize();

        // Apply global theme settings from URL parameters (StreamElements-style integration)
        const theme = twitchService.authConfig.theme;
        if (theme) {
            if (theme.fontSize) {
                document.documentElement.style.fontSize = `${theme.fontSize}px`;
            }
            if (theme.color) {
                document.documentElement.style.setProperty('--theme-color', theme.color);
            }
        }

        const manager = new CursorWelcomeManager();
        const messageHandler = new MessageHandler(twitchService);

        // Ensure pending saves are flushed before page unload
        window.addEventListener('beforeunload', () => {
            manager.flushSave();
        });

        // Hide preview panel only if explicitly requested via URL param
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('hidePreview')) {
            const previewPanel = document.getElementById('previewPanel');
            if (previewPanel) previewPanel.style.display = 'none';
        }

        // Listen for chat messages to detect visits
        messageHandler.registerHandler('cursor-welcome', async (channel, tags, message) => {
            const username = tags.username;
            const displayName = tags['display-name'];
            const color = tags.color;

            const welcomeCommands = ['!in', '!welcome', '!checkin', '!here'];
            const isWelcomeCommand = welcomeCommands.some(cmd => message.toLowerCase().startsWith(cmd.toLowerCase()));
            
            const isFirstVisit = tags['first-msg'] || tags['returning-chatter'];
            const hasNotChattedYet = !manager.userData[username]?.hasChattedThisStream;

            if (isFirstVisit || hasNotChattedYet || isWelcomeCommand) {
                // Pass a flag if it was a command
                tags.isCommand = isWelcomeCommand;
                await manager.handleVisit(username, displayName, color, tags);
            }
        });

        messageHandler.start();

        // Setup global testing functions for preview buttons
        window.cursorManager = manager;
        window.testCursorAlert = (type) => {
            const testCases = {
                new: { username: 'new_viewer', displayName: 'NewViewer', color: '#10B981', count: 1 },
                returning: { username: 'regular_fan', displayName: 'RegularFan', color: '#3B82F6', count: 42 },
                milestone: { username: 'super_fan', displayName: 'SuperFan', color: '#F59E0B', count: 100 }
            };

            const data = testCases[type] || testCases.new;
            manager.spawn(data.username, data.displayName, data.color, data.count);
        };

        window.resetVisitStates = () => {
            Object.keys(manager.userData).forEach(u => {
                manager.userData[u].hasChattedThisStream = false;
            });
            manager.saveUserData();
            alert('Visit states reset! Next message from anyone will trigger a cursor.');
        };

        ErrorHandler.info('CursorWelcome Alert System Initialized');
    } catch (error) {
        ErrorHandler.handle(error, 'cursor_welcome_init');
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

